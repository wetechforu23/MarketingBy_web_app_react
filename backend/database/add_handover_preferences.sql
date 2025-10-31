-- Agent Handover Preferences System
-- Allows visitors to choose how they want to be contacted when requesting agent help

-- Add handover preference columns to widget_configs
ALTER TABLE widget_configs
ADD COLUMN IF NOT EXISTS enable_handover_choice BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS handover_options JSONB DEFAULT '{"portal": true, "whatsapp": false, "email": true, "phone": false, "webhook": false}'::jsonb,
ADD COLUMN IF NOT EXISTS default_handover_method VARCHAR(50) DEFAULT 'portal',
ADD COLUMN IF NOT EXISTS webhook_url TEXT,
ADD COLUMN IF NOT EXISTS webhook_secret TEXT,
ADD COLUMN IF NOT EXISTS sms_twilio_configured BOOLEAN DEFAULT false;

COMMENT ON COLUMN widget_configs.enable_handover_choice IS 'Allow visitors to choose their preferred contact method';
COMMENT ON COLUMN widget_configs.handover_options IS 'Available handover methods: portal, whatsapp, email, phone, webhook';
COMMENT ON COLUMN widget_configs.default_handover_method IS 'Default method if visitor does not choose';
COMMENT ON COLUMN widget_configs.webhook_url IS 'URL to send handover data to client system';
COMMENT ON COLUMN widget_configs.webhook_secret IS 'Secret for webhook authentication';
COMMENT ON COLUMN widget_configs.sms_twilio_configured IS 'Whether Twilio SMS is configured (uses same credentials as WhatsApp)';

-- Add handover choice to conversations
ALTER TABLE widget_conversations
ADD COLUMN IF NOT EXISTS preferred_contact_method VARCHAR(50) DEFAULT 'portal',
ADD COLUMN IF NOT EXISTS contact_method_details JSONB,
ADD COLUMN IF NOT EXISTS webhook_notified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS webhook_notified_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS sms_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS sms_sent_at TIMESTAMP;

COMMENT ON COLUMN widget_conversations.preferred_contact_method IS 'Visitor chosen contact method: portal, whatsapp, email, phone, webhook';
COMMENT ON COLUMN widget_conversations.contact_method_details IS 'Additional details (phone number, email, etc.)';
COMMENT ON COLUMN widget_conversations.webhook_notified IS 'Whether webhook was successfully triggered';
COMMENT ON COLUMN widget_conversations.sms_sent IS 'Whether SMS notification was sent';

-- Create handover_requests table for tracking all handover attempts
CREATE TABLE IF NOT EXISTS handover_requests (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER REFERENCES widget_conversations(id) ON DELETE CASCADE,
  widget_id INTEGER REFERENCES widget_configs(id) ON DELETE CASCADE,
  client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Handover details
  requested_method VARCHAR(50) NOT NULL, -- portal, whatsapp, email, phone, webhook
  visitor_name VARCHAR(255),
  visitor_email VARCHAR(255),
  visitor_phone VARCHAR(50),
  visitor_message TEXT,
  
  -- Status tracking
  status VARCHAR(50) DEFAULT 'pending', -- pending, notified, failed, completed
  notification_sent BOOLEAN DEFAULT false,
  notification_sent_at TIMESTAMP,
  error_message TEXT,
  
  -- Webhook specific
  webhook_url TEXT,
  webhook_response_code INTEGER,
  webhook_response_body TEXT,
  webhook_retry_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_handover_requests_conversation ON handover_requests(conversation_id);
CREATE INDEX IF NOT EXISTS idx_handover_requests_widget ON handover_requests(widget_id);
CREATE INDEX IF NOT EXISTS idx_handover_requests_client ON handover_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_handover_requests_status ON handover_requests(status);
CREATE INDEX IF NOT EXISTS idx_handover_requests_method ON handover_requests(requested_method);

COMMENT ON TABLE handover_requests IS 'Track all agent handover requests and their notification status';

-- Create handover_analytics view
CREATE OR REPLACE VIEW handover_analytics AS
SELECT 
  w.id as widget_id,
  w.widget_name,
  c.id as client_id,
  c.name as client_name,
  hr.requested_method,
  COUNT(*) as total_requests,
  COUNT(*) FILTER (WHERE hr.status = 'completed') as completed_requests,
  COUNT(*) FILTER (WHERE hr.status = 'failed') as failed_requests,
  COUNT(*) FILTER (WHERE hr.notification_sent = true) as notifications_sent,
  AVG(EXTRACT(EPOCH FROM (hr.completed_at - hr.created_at))/60) as avg_response_time_minutes,
  MAX(hr.created_at) as last_request_at
FROM handover_requests hr
JOIN widget_configs w ON w.id = hr.widget_id
JOIN clients c ON c.id = hr.client_id
WHERE hr.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY w.id, w.widget_name, c.id, c.name, hr.requested_method
ORDER BY total_requests DESC;

COMMENT ON VIEW handover_analytics IS 'Analytics for agent handover requests by method (last 30 days)';

-- Function to auto-update handover_requests.updated_at
CREATE OR REPLACE FUNCTION update_handover_requests_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_handover_requests_timestamp
BEFORE UPDATE ON handover_requests
FOR EACH ROW
EXECUTE FUNCTION update_handover_requests_timestamp();

-- Sample handover options for existing widgets (keep current behavior as default)
UPDATE widget_configs
SET 
  enable_handover_choice = true,
  handover_options = '{"portal": true, "whatsapp": false, "email": true, "phone": false, "webhook": false}'::jsonb,
  default_handover_method = 'portal'
WHERE enable_handover_choice IS NULL;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON handover_requests TO PUBLIC;
GRANT USAGE, SELECT ON SEQUENCE handover_requests_id_seq TO PUBLIC;
GRANT SELECT ON handover_analytics TO PUBLIC;

