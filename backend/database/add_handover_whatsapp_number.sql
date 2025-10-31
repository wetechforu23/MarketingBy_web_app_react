-- ================================================
-- ADD HANDOVER WHATSAPP NUMBER
-- ================================================
-- Add field to store client's WhatsApp number for receiving handover notifications
-- When a visitor requests an agent, notification is sent to this number
-- ================================================

ALTER TABLE widget_configs
ADD COLUMN IF NOT EXISTS handover_whatsapp_number VARCHAR(50);

COMMENT ON COLUMN widget_configs.handover_whatsapp_number IS 'Client WhatsApp number to receive agent handover notifications (e.g., +14155551234 or whatsapp:+14155551234)';

