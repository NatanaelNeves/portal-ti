-- Migration: Allow NULL in registered_by fields
-- These fields should be optional since some operations may be done by external users

ALTER TABLE equipment_movements 
ALTER COLUMN registered_by_id DROP NOT NULL;

ALTER TABLE responsibility_terms 
ALTER COLUMN issued_by_id DROP NOT NULL;

-- Update existing NULLs to have a system default if needed
UPDATE equipment_movements 
SET registered_by_name = 'Sistema'
WHERE registered_by_name IS NULL;

UPDATE responsibility_terms 
SET issued_by_name = 'Sistema'
WHERE issued_by_name IS NULL;
