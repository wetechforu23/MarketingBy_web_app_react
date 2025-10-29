-- Add session management and status tracking
-- Version: v353
-- Date: 2025-10-25

-- Add conversation status and activity tracking
ALTER TABLE widget_conversations
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'closed', 'inactive')),
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS closed_by VARCHAR(50), -- 'user', 'agent', 'system', 'auto'
ADD COLUMN IF NOT EXISTS close_reason VARCHAR(255),
ADD COLUMN IF NOT EXISTS inactivity_minutes INTEGER DEFAULT 0;

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_conversations_status ON widget_conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_last_activity ON widget_conversations(last_activity_at);

-- Update existing conversations to have last_activity_at
UPDATE widget_conversations
SET last_activity_at = updated_at
WHERE last_activity_at IS NULL;

-- Function to auto-close inactive conversations
CREATE OR REPLACE FUNCTION close_inactive_conversations()
RETURNS INTEGER AS $$
DECLARE
  closed_count INTEGER;
BEGIN
  -- Close conversations inactive for 15+ minutes
  WITH updated AS (
    UPDATE widget_conversations
    SET 
      status = 'inactive',
      closed_at = CURRENT_TIMESTAMP,
      closed_by = 'auto',
      close_reason = 'Inactive for 15+ minutes',
      inactivity_minutes = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - last_activity_at))/60
    WHERE status = 'active'
      AND last_activity_at < CURRENT_TIMESTAMP - INTERVAL '15 minutes'
      AND message_count > 0
    RETURNING id
  )
  SELECT COUNT(*) INTO closed_count FROM updated;
  
  RETURN closed_count;
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON COLUMN widget_conversations.status IS 'Conversation status: active (ongoing), closed (user/agent ended), inactive (auto-closed due to inactivity)';
COMMENT ON COLUMN widget_conversations.last_activity_at IS 'Last message timestamp for inactivity tracking';
COMMENT ON COLUMN widget_conversations.inactivity_minutes IS 'Minutes of inactivity before auto-close';

-- Show current active conversations
SELECT 
  id,
  visitor_name,
  message_count,
  status,
  EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - last_activity_at))/60 as minutes_inactive,
  created_at
FROM widget_conversations
WHERE widget_id = 7
  AND created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
ORDER BY last_activity_at DESC
LIMIT 10;

