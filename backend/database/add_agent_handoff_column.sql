-- ============================================
-- Add Agent Handoff Column to Conversations
-- ============================================
-- Version: 1.0
-- Date: 2025-10-24
-- Description: Track when an agent takes over conversation from bot

-- Add agent_handoff column (indicates agent is actively handling conversation)
ALTER TABLE widget_conversations 
ADD COLUMN IF NOT EXISTS agent_handoff BOOLEAN DEFAULT false;

-- Add index for querying conversations needing agent attention
CREATE INDEX IF NOT EXISTS idx_widget_conversations_agent_handoff 
ON widget_conversations(agent_handoff);

-- Add last_human_response_at for tracking agent activity
ALTER TABLE widget_conversations 
ADD COLUMN IF NOT EXISTS last_human_response_at TIMESTAMP;

-- Create index for finding active agent conversations
CREATE INDEX IF NOT EXISTS idx_widget_conversations_last_human_response 
ON widget_conversations(last_human_response_at);

COMMENT ON COLUMN widget_conversations.agent_handoff IS 'TRUE when agent has taken over conversation, bot stops responding';
COMMENT ON COLUMN widget_conversations.last_human_response_at IS 'Timestamp of most recent agent reply';

