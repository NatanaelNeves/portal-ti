-- Migration: Fix code column naming in inventory_equipment
-- Rename 'code' to 'internal_code' if it exists

DO $$
BEGIN
    -- Check if 'code' column exists and 'internal_code' doesn't
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='inventory_equipment' AND column_name='code'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='inventory_equipment' AND column_name='internal_code'
    ) THEN
        ALTER TABLE inventory_equipment RENAME COLUMN code TO internal_code;
    END IF;
    
    -- If both exist (shouldn't happen but just in case), drop the old one
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='inventory_equipment' AND column_name='code'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='inventory_equipment' AND column_name='internal_code'
    ) THEN
        UPDATE inventory_equipment 
        SET internal_code = code 
        WHERE internal_code IS NULL;
        
        ALTER TABLE inventory_equipment DROP COLUMN code;
    END IF;
END$$;

-- Ensure internal_code has appropriate constraints
ALTER TABLE inventory_equipment 
    ALTER COLUMN internal_code SET NOT NULL;

-- Create unique constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'inventory_equipment_internal_code_key'
    ) THEN
        ALTER TABLE inventory_equipment 
            ADD CONSTRAINT inventory_equipment_internal_code_key UNIQUE (internal_code);
    END IF;
END$$;
