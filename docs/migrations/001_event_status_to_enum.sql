-- Migration: Convert EventStatus from smallint to enum
-- Date: 2025-10-18
-- Description: Changes event.status column from numeric (0,1,2) to string enum ('DRAFT','PUBLISHED','ARCHIVED')

-- Step 1: Add a temporary column with the enum type
CREATE TYPE event_status_enum AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
ALTER TABLE event ADD COLUMN status_temp event_status_enum;

-- Step 2: Migrate existing data
UPDATE event SET status_temp =
  CASE
    WHEN status = 0 THEN 'DRAFT'::event_status_enum
    WHEN status = 1 THEN 'PUBLISHED'::event_status_enum
    WHEN status = 2 THEN 'ARCHIVED'::event_status_enum
  END;

-- Step 3: Drop old column and rename new column
ALTER TABLE event DROP COLUMN status;
ALTER TABLE event RENAME COLUMN status_temp TO status;

-- Step 4: Set default and NOT NULL constraint
ALTER TABLE event ALTER COLUMN status SET DEFAULT 'DRAFT'::event_status_enum;
ALTER TABLE event ALTER COLUMN status SET NOT NULL;

-- Step 5: Recreate index if it exists
DROP INDEX IF EXISTS idx_event_status;
CREATE INDEX idx_event_status ON event(status);
