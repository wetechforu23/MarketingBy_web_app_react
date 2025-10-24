-- Add missing columns to widget_conversations table
-- Run this migration to fix the 500 error on conversations page

ALTER TABLE widget_conversations 
ADD COLUMN IF NOT EXISTS human_response_count INTEGER DEFAULT 0;

ALTER TABLE widget_conversations 
ADD COLUMN IF NOT EXISTS last_message TEXT;

ALTER TABLE widget_conversations 
ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMP;

ALTER TABLE widget_conversations 
ADD COLUMN IF NOT EXISTS handoff_requested BOOLEAN DEFAULT false;

ALTER TABLE widget_conversations 
ADD COLUMN IF NOT EXISTS handoff_requested_at TIMESTAMP;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON widget_conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_handoff ON widget_conversations(handoff_requested) WHERE handoff_requested = true;

-- Update existing records
UPDATE widget_conversations SET human_response_count = 0 WHERE human_response_count IS NULL;
UPDATE widget_conversations SET handoff_requested = false WHERE handoff_requested IS NULL;

-- Success message
SELECT 'Migration complete: Added missing columns to widget_conversations' AS status;

