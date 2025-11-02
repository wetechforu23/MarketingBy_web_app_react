#!/bin/bash
# Run inactivity extension tracking migration

cat << 'SQL' | heroku pg:psql -a marketingby-wetechforu
-- Add inactivity extension tracking columns
ALTER TABLE widget_conversations
ADD COLUMN IF NOT EXISTS last_agent_activity_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS last_visitor_activity_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS extension_reminders_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS visitor_extension_reminders_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS extension_granted_until TIMESTAMP;

-- Initialize activity timestamps
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
    UPDATE widget_conversations
    SET 
      last_agent_activity_at = COALESCE(updated_at, created_at),
      last_visitor_activity_at = COALESCE(updated_at, created_at)
    WHERE (last_agent_activity_at IS NULL OR last_visitor_activity_at IS NULL);
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_conversations_agent_activity ON widget_conversations(last_agent_activity_at);
CREATE INDEX IF NOT EXISTS idx_conversations_visitor_activity ON widget_conversations(last_visitor_activity_at);
CREATE INDEX IF NOT EXISTS idx_conversations_extension_until ON widget_conversations(extension_granted_until);
SQL

