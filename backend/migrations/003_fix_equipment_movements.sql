-- Migration: Fix equipment_movements table columns
-- Ensure all required columns exist for movements tracking

-- Add missing columns if they don't exist
ALTER TABLE equipment_movements 
ADD COLUMN IF NOT EXISTS from_user_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS to_user_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS from_location VARCHAR(255),
ADD COLUMN IF NOT EXISTS from_unit VARCHAR(100),
ADD COLUMN IF NOT EXISTS to_location VARCHAR(255),
ADD COLUMN IF NOT EXISTS to_unit VARCHAR(100),
ADD COLUMN IF NOT EXISTS from_department VARCHAR(255),
ADD COLUMN IF NOT EXISTS to_department VARCHAR(255),
ADD COLUMN IF NOT EXISTS registered_by_name VARCHAR(255);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_movements_equipment ON equipment_movements(equipment_id);
CREATE INDEX IF NOT EXISTS idx_movements_date ON equipment_movements(movement_date);
CREATE INDEX IF NOT EXISTS idx_movements_type ON equipment_movements(movement_type);
