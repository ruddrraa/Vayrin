-- Add hospital info columns directly to blood_bank_details for easier querying
-- This denormalizes the data but makes Blood Logistics queries much simpler

-- Add new columns
ALTER TABLE blood_bank_details 
ADD COLUMN IF NOT EXISTS hospital_name TEXT,
ADD COLUMN IF NOT EXISTS hospital_city TEXT,
ADD COLUMN IF NOT EXISTS hospital_address TEXT,
ADD COLUMN IF NOT EXISTS hospital_phone TEXT;

-- Update existing records from profiles
UPDATE blood_bank_details bbd
SET 
  hospital_name = p.name,
  hospital_city = p.city,
  hospital_address = p.address,
  hospital_phone = p.phone
FROM profiles p
WHERE bbd.hospital_id = p.id;

-- Create function to sync hospital info when profile is updated
CREATE OR REPLACE FUNCTION sync_hospital_info_to_blood_bank()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE blood_bank_details
  SET 
    hospital_name = NEW.name,
    hospital_city = NEW.city,
    hospital_address = NEW.address,
    hospital_phone = NEW.phone,
    last_updated = NOW()
  WHERE hospital_id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-sync when profile is updated
DROP TRIGGER IF EXISTS trigger_sync_hospital_info ON profiles;
CREATE TRIGGER trigger_sync_hospital_info
  AFTER UPDATE OF name, city, address, phone ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_hospital_info_to_blood_bank();

-- Also sync when blood_bank_details is created
CREATE OR REPLACE FUNCTION populate_hospital_info_on_create()
RETURNS TRIGGER AS $$
BEGIN
  SELECT name, city, address, phone
  INTO NEW.hospital_name, NEW.hospital_city, NEW.hospital_address, NEW.hospital_phone
  FROM profiles
  WHERE id = NEW.hospital_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_populate_hospital_info ON blood_bank_details;
CREATE TRIGGER trigger_populate_hospital_info
  BEFORE INSERT ON blood_bank_details
  FOR EACH ROW
  EXECUTE FUNCTION populate_hospital_info_on_create();

-- Create index for city-based queries
CREATE INDEX IF NOT EXISTS idx_blood_bank_city ON blood_bank_details(hospital_city);
CREATE INDEX IF NOT EXISTS idx_blood_bank_name ON blood_bank_details(hospital_name);
