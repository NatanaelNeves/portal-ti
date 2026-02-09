-- Migration: Ensure all inventory_equipment columns exist
-- This adds missing columns to the inventory_equipment table if they don't exist

-- Add type column (for equipment type like Mouse, Keyboard, etc)
ALTER TABLE inventory_equipment 
ADD COLUMN IF NOT EXISTS type VARCHAR(100);

-- Add other potentially missing columns
ALTER TABLE inventory_equipment 
ADD COLUMN IF NOT EXISTS current_responsible_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS ram VARCHAR(50),
ADD COLUMN IF NOT EXISTS physical_condition VARCHAR(50) DEFAULT 'good';

-- Update existing records that might not have type set
UPDATE inventory_equipment 
SET type = 'Notebook' 
WHERE category = 'NOTEBOOK' AND (type IS NULL OR type = '');

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_equipment_type ON inventory_equipment(type);
CREATE INDEX IF NOT EXISTS idx_equipment_status ON inventory_equipment(current_status);
CREATE INDEX IF NOT EXISTS idx_equipment_unit ON inventory_equipment(current_unit);
CREATE INDEX IF NOT EXISTS idx_equipment_responsible ON inventory_equipment(current_responsible_id);
