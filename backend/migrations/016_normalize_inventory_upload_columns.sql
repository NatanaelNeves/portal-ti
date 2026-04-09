-- Migration: normalize upload-related columns in inventory_equipment
-- Purpose: keep photos/documents storage compatible with API serialization logic

ALTER TABLE inventory_equipment
ADD COLUMN IF NOT EXISTS photos TEXT,
ADD COLUMN IF NOT EXISTS documents TEXT;

DO $$
BEGIN
  -- Legacy environments may have photos as TEXT[]; convert to JSON string in TEXT column.
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'inventory_equipment'
      AND column_name = 'photos'
      AND data_type = 'ARRAY'
  ) THEN
    ALTER TABLE inventory_equipment
      ALTER COLUMN photos TYPE TEXT
      USING CASE
        WHEN photos IS NULL THEN NULL
        ELSE to_json(photos)::text
      END;
  END IF;
END
$$;
