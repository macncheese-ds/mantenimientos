-- ============================================================================
-- Migration V2: Add serial_number to machines, photos always required
-- Run against database: mantenimientos
-- ============================================================================

USE mantenimientos;

-- Add serial_number column to machines
ALTER TABLE machines ADD COLUMN IF NOT EXISTS serial_number VARCHAR(100) AFTER name;

-- Set all tasks to require photos (no longer optional)
UPDATE maintenance_tasks SET requires_photo = TRUE WHERE requires_photo = FALSE;

-- Add index on serial_number
ALTER TABLE machines ADD INDEX IF NOT EXISTS idx_serial (serial_number);
