-- Add enable_multiple_whatsapp_chats column to widget_configs
-- This allows agents to chat with multiple users simultaneously via WhatsApp

ALTER TABLE widget_configs 
ADD COLUMN IF NOT EXISTS enable_multiple_whatsapp_chats BOOLEAN DEFAULT false;

COMMENT ON COLUMN widget_configs.enable_multiple_whatsapp_chats IS 'If true, allows agent to chat with multiple users simultaneously via WhatsApp. Agent must prefix replies with #conversation_id to specify which conversation.';
