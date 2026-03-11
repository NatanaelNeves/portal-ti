-- Migration: Add department and category columns to tickets table
-- Purpose: Support multi-department ticket routing (TI + Administrativo)

DO $$
BEGIN
  -- Add department column (default 'ti' for backward compatibility)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tickets' AND column_name = 'department'
  ) THEN
    ALTER TABLE tickets ADD COLUMN department VARCHAR(50) NOT NULL DEFAULT 'ti';
  END IF;

  -- Add category column (for administrative categories like 'copia_chave', 'apoio_evento', etc.)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tickets' AND column_name = 'category'
  ) THEN
    ALTER TABLE tickets ADD COLUMN category VARCHAR(100);
  END IF;
END
$$;

-- Index for efficient department filtering
CREATE INDEX IF NOT EXISTS idx_tickets_department ON tickets(department);

-- Ensure all existing tickets default to 'ti' department
UPDATE tickets SET department = 'ti' WHERE department IS NULL;
