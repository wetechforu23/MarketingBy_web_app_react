-- Add per-client WhatsApp handover Content SID to widget_configs
ALTER TABLE widget_configs
ADD COLUMN IF NOT EXISTS whatsapp_handover_content_sid TEXT;

COMMENT ON COLUMN widget_configs.whatsapp_handover_content_sid IS 'Twilio Content SID for WhatsApp handover template (per client/widget)';


