-- Add business hours and AI training settings to widget_configs
-- Version: v358
-- Date: 2025-10-26

-- Add business hours and AI training columns
ALTER TABLE widget_configs
ADD COLUMN IF NOT EXISTS business_hours JSONB DEFAULT '{"monday": {"open": "09:00", "close": "17:00", "enabled": true}, "tuesday": {"open": "09:00", "close": "17:00", "enabled": true}, "wednesday": {"open": "09:00", "close": "17:00", "enabled": true}, "thursday": {"open": "09:00", "close": "17:00", "enabled": true}, "friday": {"open": "09:00", "close": "17:00", "enabled": true}, "saturday": {"open": "10:00", "close": "14:00", "enabled": false}, "sunday": {"open": "10:00", "close": "14:00", "enabled": false}}',
ADD COLUMN IF NOT EXISTS timezone VARCHAR(100) DEFAULT 'America/New_York',
ADD COLUMN IF NOT EXISTS agent_response_time VARCHAR(100) DEFAULT 'within 24 hours',
ADD COLUMN IF NOT EXISTS out_of_hours_message TEXT DEFAULT 'Thank you for reaching out! Our team is currently offline. We''ll get back to you during business hours.',
ADD COLUMN IF NOT EXISTS widget_specific_llm_key TEXT, -- Encrypted LLM key specific to this widget/bot
ADD COLUMN IF NOT EXISTS widget_training_notes TEXT, -- Custom training notes for this specific bot
ADD COLUMN IF NOT EXISTS last_trained_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS training_data_version INTEGER DEFAULT 1;

-- Add unread message tracking
ALTER TABLE widget_conversations
ADD COLUMN IF NOT EXISTS unread_agent_messages INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS unread_visitor_messages INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_read_by_agent_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS last_read_by_visitor_at TIMESTAMP;

-- Create index for efficient unread queries
CREATE INDEX IF NOT EXISTS idx_conversations_unread_agent ON widget_conversations(unread_agent_messages) WHERE unread_agent_messages > 0;
CREATE INDEX IF NOT EXISTS idx_conversations_unread_visitor ON widget_conversations(unread_visitor_messages) WHERE unread_visitor_messages > 0;

-- Add session summary tracking
ALTER TABLE widget_conversations
ADD COLUMN IF NOT EXISTS pages_visited JSONB DEFAULT '[]', -- Array of {url, title, time_spent}
ADD COLUMN IF NOT EXISTS session_summary TEXT, -- AI-generated summary of conversation
ADD COLUMN IF NOT EXISTS summary_sent_at TIMESTAMP;

-- Comments
COMMENT ON COLUMN widget_configs.business_hours IS 'Business hours configuration for agent availability';
COMMENT ON COLUMN widget_configs.timezone IS 'Timezone for business hours (e.g., America/New_York)';
COMMENT ON COLUMN widget_configs.agent_response_time IS 'Expected agent response time message';
COMMENT ON COLUMN widget_configs.widget_specific_llm_key IS 'Encrypted LLM API key specific to this widget (for individual bot training)';
COMMENT ON COLUMN widget_configs.widget_training_notes IS 'Custom training instructions/context for this specific bot';
COMMENT ON COLUMN widget_conversations.pages_visited IS 'Array of pages visited during this session';
COMMENT ON COLUMN widget_conversations.session_summary IS 'AI-generated summary of the conversation';

-- Show current widgets
SELECT 
  id,
  widget_name,
  client_id,
  enable_email_notifications,
  notification_email,
  timezone,
  agent_response_time
FROM widget_configs
WHERE is_active = true
ORDER BY created_at DESC
LIMIT 10;

