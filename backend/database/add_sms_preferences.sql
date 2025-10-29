-- SMS/Text Message Preferences and Unsubscribe Management
-- This table stores user SMS preferences and unsubscribe status

CREATE TABLE IF NOT EXISTS sms_preferences (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(20) UNIQUE NOT NULL,
    
    -- Preference flags
    promotional BOOLEAN DEFAULT false,
    appointment_reminders BOOLEAN DEFAULT true,
    urgent_updates BOOLEAN DEFAULT true,
    
    -- Unsubscribe management
    is_unsubscribed BOOLEAN DEFAULT false,
    unsubscribed_at TIMESTAMP,
    
    -- Tracking
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraint to store only digits
    CONSTRAINT phone_digits_only CHECK (phone ~ '^[0-9]+$')
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sms_preferences_phone ON sms_preferences(phone);
CREATE INDEX IF NOT EXISTS idx_sms_preferences_unsubscribed ON sms_preferences(is_unsubscribed);

-- Comments
COMMENT ON TABLE sms_preferences IS 'Stores SMS/text message preferences and unsubscribe status for recipients';
COMMENT ON COLUMN sms_preferences.phone IS 'Phone number (digits only, normalized)';
COMMENT ON COLUMN sms_preferences.promotional IS 'Opt-in for promotional offers and discounts';
COMMENT ON COLUMN sms_preferences.appointment_reminders IS 'Opt-in for appointment and service reminders';
COMMENT ON COLUMN sms_preferences.urgent_updates IS 'Opt-in for urgent, time-sensitive updates';
COMMENT ON COLUMN sms_preferences.is_unsubscribed IS 'Complete unsubscribe from all text messages';

