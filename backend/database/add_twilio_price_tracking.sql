-- ================================================
-- ADD TWILIO PRICE TRACKING TO WHATSAPP MESSAGES
-- ================================================
-- Add columns to store actual prices from Twilio API responses
-- This enables accurate billing based on real Twilio charges

ALTER TABLE whatsapp_messages
ADD COLUMN IF NOT EXISTS twilio_price DECIMAL(10, 4),
ADD COLUMN IF NOT EXISTS twilio_price_unit VARCHAR(10) DEFAULT 'USD';

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_price ON whatsapp_messages(twilio_price);

COMMENT ON COLUMN whatsapp_messages.twilio_price IS 'Actual price charged by Twilio for this message (from API response)';
COMMENT ON COLUMN whatsapp_messages.twilio_price_unit IS 'Currency unit for twilio_price (typically USD)';

-- Update whatsapp_usage to track actual costs separately
ALTER TABLE whatsapp_usage
ADD COLUMN IF NOT EXISTS actual_cost_today DECIMAL(10, 4) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS actual_cost_this_month DECIMAL(10, 4) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS total_actual_cost DECIMAL(10, 2) DEFAULT 0.00;

COMMENT ON COLUMN whatsapp_usage.actual_cost_today IS 'Actual cost from Twilio API (sum of twilio_price from messages)';
COMMENT ON COLUMN whatsapp_usage.actual_cost_this_month IS 'Actual cost this month from Twilio API';
COMMENT ON COLUMN whatsapp_usage.total_actual_cost IS 'Total actual cost from Twilio API (all time)';

-- Backfill: Calculate actual costs from existing messages
DO $$
BEGIN
  UPDATE whatsapp_usage wu
  SET 
    actual_cost_this_month = COALESCE((
      SELECT SUM(wm.twilio_price)
      FROM whatsapp_messages wm
      WHERE wm.client_id = wu.client_id
        AND wm.widget_id = wu.widget_id
        AND wm.twilio_price IS NOT NULL
        AND DATE_TRUNC('month', wm.sent_at) = DATE_TRUNC('month', CURRENT_DATE)
    ), 0),
    total_actual_cost = COALESCE((
      SELECT SUM(wm.twilio_price)
      FROM whatsapp_messages wm
      WHERE wm.client_id = wu.client_id
        AND wm.widget_id = wu.widget_id
        AND wm.twilio_price IS NOT NULL
    ), 0)
  WHERE EXISTS (
    SELECT 1 FROM whatsapp_messages wm
    WHERE wm.client_id = wu.client_id
      AND wm.widget_id = wu.widget_id
      AND wm.twilio_price IS NOT NULL
  );
END $$;

