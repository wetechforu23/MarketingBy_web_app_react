-- Add inactivity reminder toggle to widget_configs
-- Version: v378
-- Date: 2025-11-07

-- Add column to enable/disable inactivity reminders
ALTER TABLE widget_configs
ADD COLUMN IF NOT EXISTS enable_inactivity_reminders BOOLEAN DEFAULT true;

-- Set default to true for all existing widgets
UPDATE widget_configs
SET enable_inactivity_reminders = true
WHERE enable_inactivity_reminders IS NULL;

-- Disable for wetechforu client (name contains 'wetechforu' or similar)
UPDATE widget_configs wc
SET enable_inactivity_reminders = false
FROM clients c
WHERE wc.client_id = c.id
  AND (
    LOWER(c.name) LIKE '%wetechforu%'
    OR LOWER(c.name) LIKE '%we tech for u%'
    OR c.id IN (
      SELECT id FROM clients 
      WHERE LOWER(name) LIKE '%wetechforu%'
      OR LOWER(name) LIKE '%we tech for u%'
    )
  );

-- Add comment
COMMENT ON COLUMN widget_configs.enable_inactivity_reminders IS 'Enable inactivity reminders for agents via WhatsApp (default: true)';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_widget_configs_inactivity_reminders 
ON widget_configs(enable_inactivity_reminders) 
WHERE enable_inactivity_reminders = true;

