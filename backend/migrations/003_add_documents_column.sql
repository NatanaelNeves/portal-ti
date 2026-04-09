-- Migration: Add documents column to inventory_equipment table
-- This adds the documents column if it doesn't exist
-- Run this on Azure PostgreSQL if the column is missing

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='inventory_equipment' AND column_name='documents'
  ) THEN
    ALTER TABLE inventory_equipment ADD COLUMN documents TEXT;
    RAISE NOTICE 'Added documents column to inventory_equipment';
  ELSE
    RAISE NOTICE 'documents column already exists';
  END IF;
END $$;

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name='inventory_equipment' 
  AND column_name = 'documents';
