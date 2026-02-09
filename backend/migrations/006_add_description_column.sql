-- Migration: Add description column to inventory_equipment
-- This column was defined in schema but missing in actual database

ALTER TABLE inventory_equipment 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Create index for searching
CREATE INDEX IF NOT EXISTS idx_equipment_description ON inventory_equipment USING gin(to_tsvector('portuguese', coalesce(description,'')));
