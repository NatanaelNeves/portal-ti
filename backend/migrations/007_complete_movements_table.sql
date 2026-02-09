-- Migration: Complete equipment_movements table structure
-- Add remaining columns that match the schema definition

ALTER TABLE equipment_movements 
ADD COLUMN IF NOT EXISTS term_id UUID REFERENCES responsibility_terms(id),
ADD COLUMN IF NOT EXISTS movement_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS from_user_id UUID REFERENCES internal_users(id),
ADD COLUMN IF NOT EXISTS to_user_id UUID REFERENCES internal_users(id),
ADD COLUMN IF NOT EXISTS reason TEXT,
ADD COLUMN IF NOT EXISTS condition_before VARCHAR(50),
ADD COLUMN IF NOT EXISTS condition_after VARCHAR(50),
ADD COLUMN IF NOT EXISTS registered_by_id UUID REFERENCES internal_users(id);

-- Generate movement numbers for existing records (if any)
UPDATE equipment_movements 
SET movement_number = 'MOV-' || LPAD(CAST(CAST(RANDOM() * 99999 AS INT) AS TEXT), 5, '0')
WHERE movement_number IS NULL;

-- Create additional indexes
CREATE INDEX IF NOT EXISTS idx_movements_term ON equipment_movements(term_id);
CREATE INDEX IF NOT EXISTS idx_movements_from_user ON equipment_movements(from_user_id);
CREATE INDEX IF NOT EXISTS idx_movements_to_user ON equipment_movements(to_user_id);
