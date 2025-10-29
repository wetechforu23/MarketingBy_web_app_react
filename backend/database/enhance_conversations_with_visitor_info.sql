-- ============================================
-- Enhance Conversations with Visitor Info & Agent Tracking
-- ============================================
-- Version: 1.0
-- Date: 2025-10-24
-- Description: Add visitor information and agent tracking to conversations

-- Add visitor info columns to widget_conversations (if they don't exist)
DO $$ 
BEGIN
    -- Add visitor_name if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='widget_conversations' AND column_name='visitor_name') THEN
        ALTER TABLE widget_conversations ADD COLUMN visitor_name VARCHAR(255);
    END IF;

    -- Add visitor_email if not exists  
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='widget_conversations' AND column_name='visitor_email') THEN
        ALTER TABLE widget_conversations ADD COLUMN visitor_email VARCHAR(255);
    END IF;

    -- Add visitor_phone if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='widget_conversations' AND column_name='visitor_phone') THEN
        ALTER TABLE widget_conversations ADD COLUMN visitor_phone VARCHAR(50);
    END IF;

    -- Add visitor_session_id for linking to tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='widget_conversations' AND column_name='visitor_session_id') THEN
        ALTER TABLE widget_conversations ADD COLUMN visitor_session_id VARCHAR(255);
    END IF;
END $$;

-- Add agent info columns to widget_messages (if they don't exist)
DO $$ 
BEGIN
    -- Add agent_name for human responses
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='widget_messages' AND column_name='agent_name') THEN
        ALTER TABLE widget_messages ADD COLUMN agent_name VARCHAR(255);
    END IF;

    -- Add agent_user_id to link to users table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='widget_messages' AND column_name='agent_user_id') THEN
        ALTER TABLE widget_messages ADD COLUMN agent_user_id INTEGER;
    END IF;
END $$;

-- Create index on visitor_email for faster searches
CREATE INDEX IF NOT EXISTS idx_widget_conversations_visitor_email 
ON widget_conversations(visitor_email);

-- Create index on visitor_session_id for linking to tracking
CREATE INDEX IF NOT EXISTS idx_widget_conversations_visitor_session 
ON widget_conversations(visitor_session_id);

-- Create index on agent_user_id for finding agent responses
CREATE INDEX IF NOT EXISTS idx_widget_messages_agent_user 
ON widget_messages(agent_user_id);

-- Update existing conversations to set default visitor name
UPDATE widget_conversations 
SET visitor_name = 'Anonymous Visitor'
WHERE visitor_name IS NULL OR visitor_name = '';

COMMENT ON COLUMN widget_conversations.visitor_name IS 'Name of the visitor (collected via chat or session)';
COMMENT ON COLUMN widget_conversations.visitor_email IS 'Email of the visitor (optional, collected via chat)';
COMMENT ON COLUMN widget_conversations.visitor_phone IS 'Phone number of the visitor (optional, collected via chat)';
COMMENT ON COLUMN widget_conversations.visitor_session_id IS 'Links to widget_visitor_sessions.session_id for tracking';
COMMENT ON COLUMN widget_messages.agent_name IS 'Name of the agent who sent this human response';
COMMENT ON COLUMN widget_messages.agent_user_id IS 'User ID from users table who sent this response';

