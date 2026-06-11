-- Migration: Add requester_name column to tickets table
-- Purpose: Store the name typed by the user at ticket creation time,
--          independent of what is stored in public_users. This fixes two issues:
--            1. Users who type a different name than the one stored in the system
--            2. Two different people sharing the same email address

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tickets' AND column_name = 'requester_name'
  ) THEN
    ALTER TABLE tickets ADD COLUMN requester_name VARCHAR(255);
  END IF;
END
$$;
