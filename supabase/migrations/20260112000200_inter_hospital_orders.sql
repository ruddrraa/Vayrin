-- Inter-Hospital Blood Orders Table
-- For hospitals to request blood from other hospitals

CREATE TABLE IF NOT EXISTS public.inter_hospital_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Requesting Hospital (who needs blood)
  requesting_hospital_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  requesting_hospital_name text NOT NULL,
  
  -- Supplying Hospital (who has blood)
  supplying_hospital_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  supplying_hospital_name text NOT NULL,
  
  -- Blood Component Details
  component_id uuid REFERENCES blood_components(id) ON DELETE SET NULL,
  component_name text NOT NULL,
  blood_group text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  price_per_unit numeric(10,2) NOT NULL DEFAULT 0,
  total_amount numeric(10,2) NOT NULL DEFAULT 0,
  
  -- Order Status
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED')),
  
  -- Additional Info
  notes text,
  urgency text DEFAULT 'NORMAL' CHECK (urgency IN ('NORMAL', 'URGENT', 'CRITICAL')),
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.inter_hospital_orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Hospitals can view orders where they are either requester or supplier
CREATE POLICY "Hospitals can view own orders" ON public.inter_hospital_orders
  FOR SELECT USING (
    requesting_hospital_id = auth.uid() OR supplying_hospital_id = auth.uid()
  );

-- Hospitals can create orders (as requester)
CREATE POLICY "Hospitals can create orders" ON public.inter_hospital_orders
  FOR INSERT WITH CHECK (requesting_hospital_id = auth.uid());

-- Requesting hospital can cancel their pending orders
CREATE POLICY "Requesters can update own pending orders" ON public.inter_hospital_orders
  FOR UPDATE USING (
    requesting_hospital_id = auth.uid() AND status IN ('PENDING', 'IN_TRANSIT')
  );

-- Supplying hospital can approve/reject/update orders to them
CREATE POLICY "Suppliers can update orders to them" ON public.inter_hospital_orders
  FOR UPDATE USING (
    supplying_hospital_id = auth.uid()
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE inter_hospital_orders;

-- Create indexes
CREATE INDEX idx_inter_orders_requesting ON inter_hospital_orders(requesting_hospital_id);
CREATE INDEX idx_inter_orders_supplying ON inter_hospital_orders(supplying_hospital_id);
CREATE INDEX idx_inter_orders_status ON inter_hospital_orders(status);
CREATE INDEX idx_inter_orders_created ON inter_hospital_orders(created_at DESC);

-- Function to update timestamp on status change
CREATE OR REPLACE FUNCTION update_inter_order_timestamp()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER inter_order_updated
  BEFORE UPDATE ON public.inter_hospital_orders
  FOR EACH ROW EXECUTE FUNCTION update_inter_order_timestamp();
