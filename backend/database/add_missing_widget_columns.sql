-- Add missing columns for HIPAA and other settings
-- Run this migration: heroku pg:psql < backend/database/add_missing_widget_columns.sql

ALTER TABLE widget_configs
ADD COLUMN IF NOT EXISTS enable_hipaa BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS detect_sensitive_data BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS emergency_keywords BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS emergency_contact TEXT DEFAULT 'Call 911 or visit nearest ER',
ADD COLUMN IF NOT EXISTS webhook_url TEXT,
ADD COLUMN IF NOT EXISTS webhook_secret TEXT;

COMMENT ON COLUMN widget_configs.enable_hipaa IS 'Display HIPAA disclaimer before chatting';
COMMENT ON COLUMN widget_configs.detect_sensitive_data IS 'Detect and block sensitive information (SSN, credit cards, etc.)';
COMMENT ON COLUMN widget_configs.emergency_keywords IS 'Detect emergency keywords and display emergency contact';
COMMENT ON COLUMN widget_configs.emergency_contact IS 'Emergency contact message shown when emergency keywords detected';
COMMENT ON COLUMN widget_configs.webhook_url IS 'Webhook URL for agent handoff';
COMMENT ON COLUMN widget_configs.webhook_secret IS 'Secret for webhook HMAC signature';

