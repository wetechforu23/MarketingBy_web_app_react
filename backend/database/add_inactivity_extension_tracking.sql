-- Add inactivity extension tracking columns
-- Version: v354
-- Date: 2025-11-02

-- Add columns for tracking agent and visitor activity separately
ALTER TABLE widget_conversations
ADD COLUMN IF NOT EXISTS last_agent_activity_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS last_visitor_activity_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS extension_reminders_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS visitor_extension_reminders_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS extension_granted_until TIMESTAMP;

-- Initialize activity timestamps from last_activity_at (if column exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'widget_conversations' AND column_name = 'last_activity_at') THEN
    UPDATE widget_conversations
    SET 
      last_agent_activity_at = COALESCE(last_activity_at, updated_at),
      last_visitor_activity_at = COALESCE(last_activity_at, updated_at)
    WHERE (last_agent_activity_at IS NULL OR last_visitor_activity_at IS NULL);
  ELSE
    -- If last_activity_at doesn't exist, use updated_at or created_at
    UPDATE widget_conversations
    SET 
      last_agent_activity_at = COALESCE(updated_at, created_at),
      last_visitor_activity_at = COALESCE(updated_at, created_at)
    WHERE (last_agent_activity_at IS NULL OR last_visitor_activity_at IS NULL);
  END IF;
END $$;

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_conversations_agent_activity ON widget_conversations(last_agent_activity_at);
CREATE INDEX IF NOT EXISTS idx_conversations_visitor_activity ON widget_conversations(last_visitor_activity_at);
CREATE INDEX IF NOT EXISTS idx_conversations_extension_until ON widget_conversations(extension_granted_until);

-- Add comments
COMMENT ON COLUMN widget_conversations.last_agent_activity_at IS 'Last time agent sent a message (for inactivity tracking)';
COMMENT ON COLUMN widget_conversations.last_visitor_activity_at IS 'Last time visitor sent a message (for inactivity tracking)';
COMMENT ON COLUMN widget_conversations.extension_reminders_count IS 'Number of extension reminders sent to agent';
COMMENT ON COLUMN widget_conversations.visitor_extension_reminders_count IS 'Number of extension reminders sent to visitor';
COMMENT ON COLUMN widget_conversations.extension_granted_until IS 'Timestamp until which conversation is extended';

