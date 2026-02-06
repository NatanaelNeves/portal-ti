-- Migration: Add responsibility_terms fields for new features
-- This script adds the necessary columns to the responsibility_terms table

-- Add new columns if they don't exist
ALTER TABLE responsibility_terms 
ADD COLUMN IF NOT EXISTS responsible_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS responsible_cpf VARCHAR(20),
ADD COLUMN IF NOT EXISTS responsible_position VARCHAR(255),
ADD COLUMN IF NOT EXISTS responsible_department VARCHAR(255),
ADD COLUMN IF NOT EXISTS equipment_details JSONB,
ADD COLUMN IF NOT EXISTS accessories JSONB,
ADD COLUMN IF NOT EXISTS signature_date DATE,
ADD COLUMN IF NOT EXISTS return_reason VARCHAR(50),
ADD COLUMN IF NOT EXISTS reason_other TEXT,
ADD COLUMN IF NOT EXISTS received_by VARCHAR(255),
ADD COLUMN IF NOT EXISTS equipment_condition VARCHAR(50),
ADD COLUMN IF NOT EXISTS checklist JSONB,
ADD COLUMN IF NOT EXISTS damage_description TEXT,
ADD COLUMN IF NOT EXISTS witness_name VARCHAR(255);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_responsibility_terms_equipment_id 
ON responsibility_terms(equipment_id);

CREATE INDEX IF NOT EXISTS idx_responsibility_terms_status 
ON responsibility_terms(status);

CREATE INDEX IF NOT EXISTS idx_responsibility_terms_responsible_name 
ON responsibility_terms(responsible_name);
