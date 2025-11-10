-- ==========================================
-- APPOINTMENTS TABLE - Industry Standard Architecture
-- Created: 2025-11-10
-- Purpose: Store appointments created through chat widgets
-- ==========================================

-- Appointments Table
CREATE TABLE IF NOT EXISTS appointments (
    id SERIAL PRIMARY KEY,
    
    -- Widget & Client Information
    widget_id INTEGER REFERENCES widget_configs(id) ON DELETE CASCADE,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    conversation_id INTEGER REFERENCES widget_conversations(id) ON DELETE SET NULL,
    
    -- Customer Information (from form/intro questions)
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50),
    
    -- Appointment Details
    appointment_type VARCHAR(100), -- 'consultation', 'checkup', 'follow-up', 'emergency', etc.
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    appointment_datetime TIMESTAMP NOT NULL, -- Combined date + time for easy querying
    duration_minutes INTEGER DEFAULT 60,
    timezone VARCHAR(50) DEFAULT 'America/New_York',
    
    -- Appointment Status
    status VARCHAR(50) DEFAULT 'scheduled', -- 'scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'
    confirmation_sent BOOLEAN DEFAULT false,
    reminder_sent BOOLEAN DEFAULT false,
    
    -- Additional Information
    reason TEXT, -- Why they need the appointment
    notes TEXT, -- Additional notes from customer
    special_requirements TEXT, -- Accessibility, language preferences, etc.
    
    -- Location Information
    location_type VARCHAR(50) DEFAULT 'in-person', -- 'in-person', 'virtual', 'phone'
    location_address TEXT,
    meeting_link TEXT, -- For virtual appointments
    
    -- Industry-Specific Fields
    insurance_provider VARCHAR(255), -- For healthcare
    insurance_member_id VARCHAR(255), -- For healthcare
    referral_source VARCHAR(255), -- How they found us
    preferred_contact_method VARCHAR(50), -- 'email', 'phone', 'sms'
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50) DEFAULT 'chat_widget', -- 'chat_widget', 'admin', 'api'
    cancelled_at TIMESTAMP,
    cancellation_reason TEXT,
    
    -- Constraints
    CONSTRAINT valid_status CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show', 'rescheduled')),
    CONSTRAINT valid_location_type CHECK (location_type IN ('in-person', 'virtual', 'phone')),
    CONSTRAINT valid_contact_method CHECK (preferred_contact_method IN ('email', 'phone', 'sms', 'whatsapp') OR preferred_contact_method IS NULL)
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_appointments_widget_id ON appointments(widget_id);
CREATE INDEX IF NOT EXISTS idx_appointments_client_id ON appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_conversation_id ON appointments(conversation_id);
CREATE INDEX IF NOT EXISTS idx_appointments_customer_email ON appointments(customer_email);
CREATE INDEX IF NOT EXISTS idx_appointments_datetime ON appointments(appointment_datetime);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);

-- Appointment History/Changes Table (for audit trail)
CREATE TABLE IF NOT EXISTS appointment_history (
    id SERIAL PRIMARY KEY,
    appointment_id INTEGER REFERENCES appointments(id) ON DELETE CASCADE,
    changed_by VARCHAR(100), -- 'system', 'admin', 'customer'
    change_type VARCHAR(50), -- 'created', 'updated', 'cancelled', 'confirmed', 'rescheduled'
    old_value JSONB,
    new_value JSONB,
    change_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_appointment_history_appointment_id ON appointment_history(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointment_history_created_at ON appointment_history(created_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_appointments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_appointments_updated_at
    BEFORE UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION update_appointments_updated_at();

-- Comments
COMMENT ON TABLE appointments IS 'Stores appointments created through chat widgets, organized by widget, client, and industry';
COMMENT ON COLUMN appointments.appointment_type IS 'Type of appointment (consultation, checkup, follow-up, etc.) - industry-specific';
COMMENT ON COLUMN appointments.status IS 'Current status: scheduled, confirmed, completed, cancelled, no_show, rescheduled';
COMMENT ON COLUMN appointments.location_type IS 'in-person, virtual, or phone appointment';
COMMENT ON COLUMN appointments.insurance_provider IS 'Healthcare-specific: insurance provider name';
COMMENT ON COLUMN appointments.insurance_member_id IS 'Healthcare-specific: insurance member ID';

