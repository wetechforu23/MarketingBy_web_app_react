-- ==========================================
-- EMAIL NOTIFICATION SETTINGS FOR WIDGETS
-- Date: October 27, 2025
-- Version: v368
-- ==========================================

-- Add email notification configuration columns to widget_configs
ALTER TABLE widget_configs
ADD COLUMN IF NOT EXISTS visitor_engagement_minutes INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS notify_new_conversation BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_agent_handoff BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_daily_summary BOOLEAN DEFAULT false;

-- Add comments for documentation
COMMENT ON COLUMN widget_configs.visitor_engagement_minutes IS 'Send email alert after visitor stays X minutes on site (0 = disabled)';
COMMENT ON COLUMN widget_configs.notify_new_conversation IS 'Send email when new conversation starts';
COMMENT ON COLUMN widget_configs.notify_agent_handoff IS 'Send urgent email when agent handoff requested';
COMMENT ON COLUMN widget_configs.notify_daily_summary IS 'Send daily summary report (future feature)';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_widget_configs_visitor_engagement ON widget_configs(visitor_engagement_minutes) WHERE visitor_engagement_minutes > 0;
CREATE INDEX IF NOT EXISTS idx_widget_configs_notify_new ON widget_configs(notify_new_conversation) WHERE notify_new_conversation = true;
CREATE INDEX IF NOT EXISTS idx_widget_configs_notify_handoff ON widget_configs(notify_agent_handoff) WHERE notify_agent_handoff = true;

-- Update existing widgets to use default values
UPDATE widget_configs
SET 
  visitor_engagement_minutes = 5,
  notify_new_conversation = true,
  notify_agent_handoff = true,
  notify_daily_summary = false
WHERE visitor_engagement_minutes IS NULL;

-- Output confirmation
DO $$
BEGIN
  RAISE NOTICE 'Email notification settings columns added successfully!';
  RAISE NOTICE 'Columns: visitor_engagement_minutes, notify_new_conversation, notify_agent_handoff, notify_daily_summary';
  RAISE NOTICE 'All existing widgets updated with default values';
END $$;

