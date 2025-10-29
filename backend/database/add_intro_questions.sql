-- Add intro questions configuration to widget_configs table
-- This allows each widget to collect custom information from visitors

ALTER TABLE widget_configs
ADD COLUMN IF NOT EXISTS intro_flow_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS intro_questions JSONB DEFAULT '[
  {"id": "first_name", "question": "What is your first name?", "type": "text", "required": true, "order": 1},
  {"id": "last_name", "question": "What is your last name?", "type": "text", "required": true, "order": 2},
  {"id": "email", "question": "What is your email address?", "type": "email", "required": true, "order": 3},
  {"id": "phone", "question": "What is your phone number?", "type": "tel", "required": false, "order": 4},
  {"id": "contact_method", "question": "How would you like us to contact you?", "type": "select", "options": ["Email", "Phone Call", "Text Message"], "required": true, "order": 5},
  {"id": "services", "question": "What services are you interested in?", "type": "textarea", "required": false, "order": 6}
]'::jsonb;

-- Add column to track if intro was completed for a conversation
ALTER TABLE widget_conversations
ADD COLUMN IF NOT EXISTS intro_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS intro_data JSONB DEFAULT '{}'::jsonb;

-- Index for better performance
CREATE INDEX IF NOT EXISTS idx_widget_conversations_intro_completed ON widget_conversations(intro_completed);

COMMENT ON COLUMN widget_configs.intro_flow_enabled IS 'Whether to show intro questions before main chat';
COMMENT ON COLUMN widget_configs.intro_questions IS 'Array of questions to ask visitors initially';
COMMENT ON COLUMN widget_conversations.intro_completed IS 'Whether visitor completed intro questions';
COMMENT ON COLUMN widget_conversations.intro_data IS 'Collected intro information from visitor';
