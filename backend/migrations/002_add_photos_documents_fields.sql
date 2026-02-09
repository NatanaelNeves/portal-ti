-- Add photos and documents columns to inventory_equipment table

ALTER TABLE inventory_equipment 
ADD COLUMN IF NOT EXISTS photos TEXT,
ADD COLUMN IF NOT EXISTS documents TEXT;

COMMENT ON COLUMN inventory_equipment.photos IS 'JSON array of photo URLs';
COMMENT ON COLUMN inventory_equipment.documents IS 'JSON array of document objects with metadata';
