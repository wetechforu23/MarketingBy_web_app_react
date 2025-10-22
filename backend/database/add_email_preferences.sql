-- Email Preferences and Unsubscribe Management
-- This table stores user email preferences, unsubscribe status, and pause periods

CREATE TABLE IF NOT EXISTS email_preferences (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    
    -- Preference flags
    educational_content BOOLEAN DEFAULT true,
    product_updates BOOLEAN DEFAULT true,
    events BOOLEAN DEFAULT true,
    monthly_digest BOOLEAN DEFAULT false,
    
    -- Unsubscribe management
    is_unsubscribed BOOLEAN DEFAULT false,
    unsubscribed_at TIMESTAMP,
    pause_until TIMESTAMP,
    
    -- Tracking
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Indexes
    CONSTRAINT email_lowercase CHECK (email = LOWER(email))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_preferences_email ON email_preferences(email);
CREATE INDEX IF NOT EXISTS idx_email_preferences_unsubscribed ON email_preferences(is_unsubscribed);
CREATE INDEX IF NOT EXISTS idx_email_preferences_pause_until ON email_preferences(pause_until);

-- Comments
COMMENT ON TABLE email_preferences IS 'Stores email marketing preferences, unsubscribe status, and pause periods for recipients';
COMMENT ON COLUMN email_preferences.educational_content IS 'Opt-in for educational healthcare marketing content';
COMMENT ON COLUMN email_preferences.product_updates IS 'Opt-in for product news and updates';
COMMENT ON COLUMN email_preferences.events IS 'Opt-in for events and webinars';
COMMENT ON COLUMN email_preferences.monthly_digest IS 'Opt-in for monthly digest only (reduces frequency)';
COMMENT ON COLUMN email_preferences.is_unsubscribed IS 'Complete unsubscribe from all marketing emails';
COMMENT ON COLUMN email_preferences.pause_until IS 'Temporary pause emails until this date';

