-- Migration: Add acquisition-related fields to inventory_equipment
-- These fields were defined in schema but may not exist in actual database

ALTER TABLE inventory_equipment 
ADD COLUMN IF NOT EXISTS acquisition_date DATE,
ADD COLUMN IF NOT EXISTS purchase_value DECIMAL(12, 2),
ADD COLUMN IF NOT EXISTS warranty_expiration DATE,
ADD COLUMN IF NOT EXISTS invoice_file VARCHAR(500),
ADD COLUMN IF NOT EXISTS photos TEXT[],
ADD COLUMN IF NOT EXISTS qr_code VARCHAR(255);

-- Add indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_equipment_acquisition_date ON inventory_equipment(acquisition_date);
CREATE INDEX IF NOT EXISTS idx_equipment_warranty ON inventory_equipment(warranty_expiration);
