-- Blood Inventory Restructure Migration
-- Matches the test.json structure with blood_group, components, and batches

-- Drop old table if exists (backup data first in production!)
-- DROP TABLE IF EXISTS public.blood_stock;

-- 1. Blood Bank Details (extends hospital profile)
CREATE TABLE IF NOT EXISTS public.blood_bank_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  license_number text NOT NULL,
  bank_type text NOT NULL DEFAULT 'PRIVATE' CHECK (bank_type IN ('GOVERNMENT', 'PRIVATE', 'NGO', 'CHARITABLE')),
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(hospital_id)
);

-- 2. Blood Inventory Summary (per blood group)
CREATE TABLE IF NOT EXISTS public.blood_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blood_bank_id uuid NOT NULL REFERENCES blood_bank_details(id) ON DELETE CASCADE,
  blood_group text NOT NULL CHECK (blood_group IN ('A_POSITIVE', 'A_NEGATIVE', 'B_POSITIVE', 'B_NEGATIVE', 'AB_POSITIVE', 'AB_NEGATIVE', 'O_POSITIVE', 'O_NEGATIVE')),
  rh_factor text NOT NULL CHECK (rh_factor IN ('+', '-')),
  total_units_available integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(blood_bank_id, blood_group)
);

-- 3. Blood Components (PRBC, FFP, RDP, etc.)
CREATE TABLE IF NOT EXISTS public.blood_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id uuid NOT NULL REFERENCES blood_inventory(id) ON DELETE CASCADE,
  type_code text NOT NULL CHECK (type_code IN ('PRBC', 'FFP', 'RDP', 'SDP', 'CRYO', 'WB', 'PC')),
  display_name text NOT NULL,
  available_units integer DEFAULT 0,
  processing_charge numeric(10,2) NOT NULL DEFAULT 0,
  currency text DEFAULT 'INR',
  is_govt_capped boolean DEFAULT false,
  is_available boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. Blood Batches (individual batch tracking)
CREATE TABLE IF NOT EXISTS public.blood_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  component_id uuid NOT NULL REFERENCES blood_components(id) ON DELETE CASCADE,
  batch_id text NOT NULL UNIQUE,
  quantity integer NOT NULL DEFAULT 1,
  expiry_date date NOT NULL,
  status text NOT NULL DEFAULT 'FRESH' CHECK (status IN ('FRESH', 'STABLE', 'NEAR_EXPIRY', 'CRITICAL_STOCK', 'URGENT_DISPOSAL', 'EXPIRED', 'USED')),
  collection_date date,
  donor_id text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Component type reference table
CREATE TABLE IF NOT EXISTS public.component_types (
  code text PRIMARY KEY,
  display_name text NOT NULL,
  description text,
  default_price numeric(10,2),
  shelf_life_days integer,
  storage_temp text
);

-- Insert default component types
INSERT INTO public.component_types (code, display_name, description, default_price, shelf_life_days, storage_temp) VALUES
  ('WB', 'Whole Blood', 'Complete blood with all components', 1050, 35, '2-6°C'),
  ('PRBC', 'Packed Red Blood Cells', 'Concentrated red blood cells', 1550, 42, '2-6°C'),
  ('FFP', 'Fresh Frozen Plasma', 'Plasma frozen within 8 hours of collection', 400, 365, '-25°C or below'),
  ('RDP', 'Random Donor Platelets', 'Platelets from random donors', 400, 5, '20-24°C with agitation'),
  ('SDP', 'Single Donor Platelets', 'Platelets from single apheresis donor', 15000, 5, '20-24°C with agitation'),
  ('CRYO', 'Cryoprecipitate', 'Clotting factors from plasma', 500, 365, '-25°C or below'),
  ('PC', 'Platelet Concentrate', 'Concentrated platelets', 1200, 5, '20-24°C with agitation')
ON CONFLICT (code) DO NOTHING;

-- Enable RLS
ALTER TABLE public.blood_bank_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.component_types ENABLE ROW LEVEL SECURITY;

-- RLS Policies for blood_bank_details
CREATE POLICY "Hospitals can view own blood bank details" ON public.blood_bank_details
  FOR SELECT USING (hospital_id = auth.uid());

CREATE POLICY "Hospitals can manage own blood bank details" ON public.blood_bank_details
  FOR ALL USING (hospital_id = auth.uid());

-- RLS Policies for blood_inventory
CREATE POLICY "Public can view active inventory" ON public.blood_inventory
  FOR SELECT USING (is_active = true);

CREATE POLICY "Hospitals can manage own inventory" ON public.blood_inventory
  FOR ALL USING (
    blood_bank_id IN (SELECT id FROM blood_bank_details WHERE hospital_id = auth.uid())
  );

-- RLS Policies for blood_components
CREATE POLICY "Public can view available components" ON public.blood_components
  FOR SELECT USING (is_available = true);

CREATE POLICY "Hospitals can manage own components" ON public.blood_components
  FOR ALL USING (
    inventory_id IN (
      SELECT bi.id FROM blood_inventory bi
      JOIN blood_bank_details bbd ON bi.blood_bank_id = bbd.id
      WHERE bbd.hospital_id = auth.uid()
    )
  );

-- RLS Policies for blood_batches
CREATE POLICY "Public can view non-expired batches" ON public.blood_batches
  FOR SELECT USING (status NOT IN ('EXPIRED', 'USED'));

CREATE POLICY "Hospitals can manage own batches" ON public.blood_batches
  FOR ALL USING (
    component_id IN (
      SELECT bc.id FROM blood_components bc
      JOIN blood_inventory bi ON bc.inventory_id = bi.id
      JOIN blood_bank_details bbd ON bi.blood_bank_id = bbd.id
      WHERE bbd.hospital_id = auth.uid()
    )
  );

-- Component types are public read
CREATE POLICY "Anyone can view component types" ON public.component_types
  FOR SELECT USING (true);

-- Function to auto-update batch status based on expiry
CREATE OR REPLACE FUNCTION update_batch_status()
RETURNS trigger AS $$
BEGIN
  IF NEW.expiry_date < CURRENT_DATE THEN
    NEW.status := 'EXPIRED';
  ELSIF NEW.expiry_date <= CURRENT_DATE + INTERVAL '2 days' THEN
    NEW.status := 'URGENT_DISPOSAL';
  ELSIF NEW.expiry_date <= CURRENT_DATE + INTERVAL '7 days' THEN
    NEW.status := 'NEAR_EXPIRY';
  ELSIF NEW.quantity <= 2 THEN
    NEW.status := 'CRITICAL_STOCK';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER batch_status_check
  BEFORE INSERT OR UPDATE ON public.blood_batches
  FOR EACH ROW EXECUTE FUNCTION update_batch_status();

-- Function to recalculate component units
CREATE OR REPLACE FUNCTION recalculate_component_units()
RETURNS trigger AS $$
BEGIN
  UPDATE blood_components
  SET available_units = (
    SELECT COALESCE(SUM(quantity), 0)
    FROM blood_batches
    WHERE component_id = COALESCE(NEW.component_id, OLD.component_id)
    AND status NOT IN ('EXPIRED', 'USED')
  ),
  updated_at = now()
  WHERE id = COALESCE(NEW.component_id, OLD.component_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_component_units
  AFTER INSERT OR UPDATE OR DELETE ON public.blood_batches
  FOR EACH ROW EXECUTE FUNCTION recalculate_component_units();

-- Function to recalculate inventory totals
CREATE OR REPLACE FUNCTION recalculate_inventory_units()
RETURNS trigger AS $$
BEGIN
  UPDATE blood_inventory
  SET total_units_available = (
    SELECT COALESCE(SUM(available_units), 0)
    FROM blood_components
    WHERE inventory_id = (
      SELECT inventory_id FROM blood_components WHERE id = COALESCE(NEW.id, OLD.id)
    )
    AND is_available = true
  ),
  updated_at = now()
  WHERE id = (
    SELECT inventory_id FROM blood_components WHERE id = COALESCE(NEW.id, OLD.id)
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_inventory_units
  AFTER INSERT OR UPDATE OR DELETE ON public.blood_components
  FOR EACH ROW EXECUTE FUNCTION recalculate_inventory_units();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE blood_bank_details;
ALTER PUBLICATION supabase_realtime ADD TABLE blood_inventory;
ALTER PUBLICATION supabase_realtime ADD TABLE blood_components;
ALTER PUBLICATION supabase_realtime ADD TABLE blood_batches;

-- Create indexes for performance
CREATE INDEX idx_blood_inventory_blood_bank ON blood_inventory(blood_bank_id);
CREATE INDEX idx_blood_inventory_blood_group ON blood_inventory(blood_group);
CREATE INDEX idx_blood_components_inventory ON blood_components(inventory_id);
CREATE INDEX idx_blood_components_type ON blood_components(type_code);
CREATE INDEX idx_blood_batches_component ON blood_batches(component_id);
CREATE INDEX idx_blood_batches_status ON blood_batches(status);
CREATE INDEX idx_blood_batches_expiry ON blood_batches(expiry_date);
