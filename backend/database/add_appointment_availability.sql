-- ==========================================
-- APPOINTMENT AVAILABILITY & CALENDAR SYSTEM
-- Created: 2025-11-10
-- Purpose: Manage team member availability and calendar integration
-- Industry Standard: No hardcoded configurations
-- ==========================================

-- Team Members/Staff Table (for appointment scheduling)
CREATE TABLE IF NOT EXISTS team_members (
    id SERIAL PRIMARY KEY,
    widget_id INTEGER REFERENCES widget_configs(id) ON DELETE CASCADE,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    
    -- Member Information
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    role VARCHAR(100), -- 'doctor', 'dentist', 'lawyer', 'advisor', 'agent', etc.
    title VARCHAR(100), -- 'Dr.', 'Attorney', 'Advisor', etc.
    
    -- Calendar Integration
    calendar_type VARCHAR(50), -- 'google', 'outlook', 'ical', 'manual'
    calendar_id VARCHAR(255), -- External calendar ID
    calendar_url TEXT, -- iCal feed URL
    calendar_credentials JSONB, -- Encrypted calendar credentials
    
    -- Availability Settings
    timezone VARCHAR(50) DEFAULT 'America/New_York',
    default_duration_minutes INTEGER DEFAULT 60,
    buffer_time_minutes INTEGER DEFAULT 15, -- Time between appointments
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_available_for_booking BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Weekly Availability Schedule (Recurring)
CREATE TABLE IF NOT EXISTS member_availability (
    id SERIAL PRIMARY KEY,
    member_id INTEGER REFERENCES team_members(id) ON DELETE CASCADE,
    
    -- Day of Week (0=Sunday, 1=Monday, ..., 6=Saturday)
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    
    -- Time Slots
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    
    -- Availability Type
    availability_type VARCHAR(50) DEFAULT 'available', -- 'available', 'unavailable', 'limited'
    max_appointments INTEGER, -- Max appointments for this slot (if limited)
    
    -- Recurring Pattern
    is_recurring BOOLEAN DEFAULT true,
    valid_from DATE, -- Start date for recurring pattern
    valid_until DATE, -- End date for recurring pattern (NULL = indefinite)
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Blocked Time Slots (One-time or recurring blocks)
CREATE TABLE IF NOT EXISTS blocked_time_slots (
    id SERIAL PRIMARY KEY,
    member_id INTEGER REFERENCES team_members(id) ON DELETE CASCADE,
    widget_id INTEGER REFERENCES widget_configs(id) ON DELETE CASCADE,
    
    -- Block Details
    block_type VARCHAR(50) DEFAULT 'one_time', -- 'one_time', 'recurring', 'holiday'
    block_title VARCHAR(255),
    block_reason TEXT,
    
    -- Time Range
    start_datetime TIMESTAMP NOT NULL,
    end_datetime TIMESTAMP NOT NULL,
    
    -- Recurring Pattern (if block_type = 'recurring')
    recurrence_pattern VARCHAR(50), -- 'daily', 'weekly', 'monthly', 'yearly'
    recurrence_end_date DATE, -- When recurring block ends (NULL = indefinite)
    
    -- Applies To
    applies_to_all_members BOOLEAN DEFAULT false, -- If true, blocks all members
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_datetime_range CHECK (end_datetime > start_datetime)
);

-- Calendar Sync Log (Track calendar synchronization)
CREATE TABLE IF NOT EXISTS calendar_sync_logs (
    id SERIAL PRIMARY KEY,
    member_id INTEGER REFERENCES team_members(id) ON DELETE CASCADE,
    
    -- Sync Details
    sync_type VARCHAR(50), -- 'full', 'incremental', 'manual'
    sync_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'success', 'failed'
    sync_started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sync_completed_at TIMESTAMP,
    
    -- Results
    events_synced INTEGER DEFAULT 0,
    events_created INTEGER DEFAULT 0,
    events_updated INTEGER DEFAULT 0,
    events_deleted INTEGER DEFAULT 0,
    errors JSONB, -- Array of error messages
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_team_members_widget_id ON team_members(widget_id);
CREATE INDEX IF NOT EXISTS idx_team_members_client_id ON team_members(client_id);
CREATE INDEX IF NOT EXISTS idx_team_members_active ON team_members(is_active, is_available_for_booking);

CREATE INDEX IF NOT EXISTS idx_member_availability_member_id ON member_availability(member_id);
CREATE INDEX IF NOT EXISTS idx_member_availability_day ON member_availability(day_of_week);
CREATE INDEX IF NOT EXISTS idx_member_availability_active ON member_availability(member_id, day_of_week, is_recurring);

CREATE INDEX IF NOT EXISTS idx_blocked_slots_member_id ON blocked_time_slots(member_id);
CREATE INDEX IF NOT EXISTS idx_blocked_slots_widget_id ON blocked_time_slots(widget_id);
CREATE INDEX IF NOT EXISTS idx_blocked_slots_datetime ON blocked_time_slots(start_datetime, end_datetime);
CREATE INDEX IF NOT EXISTS idx_blocked_slots_all_members ON blocked_time_slots(applies_to_all_members, start_datetime, end_datetime);

CREATE INDEX IF NOT EXISTS idx_calendar_sync_member_id ON calendar_sync_logs(member_id);
CREATE INDEX IF NOT EXISTS idx_calendar_sync_status ON calendar_sync_logs(sync_status, sync_started_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_team_members_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_team_members_updated_at
    BEFORE UPDATE ON team_members
    FOR EACH ROW
    EXECUTE FUNCTION update_team_members_updated_at();

CREATE OR REPLACE FUNCTION update_member_availability_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_member_availability_updated_at
    BEFORE UPDATE ON member_availability
    FOR EACH ROW
    EXECUTE FUNCTION update_member_availability_updated_at();

CREATE OR REPLACE FUNCTION update_blocked_slots_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_blocked_slots_updated_at
    BEFORE UPDATE ON blocked_time_slots
    FOR EACH ROW
    EXECUTE FUNCTION update_blocked_slots_updated_at();

-- Comments
COMMENT ON TABLE team_members IS 'Team members/staff who can be booked for appointments';
COMMENT ON TABLE member_availability IS 'Recurring weekly availability schedule for team members';
COMMENT ON TABLE blocked_time_slots IS 'Blocked time slots (holidays, time off, etc.)';
COMMENT ON TABLE calendar_sync_logs IS 'Log of calendar synchronization events';
COMMENT ON COLUMN team_members.calendar_type IS 'Type of calendar integration: google, outlook, ical, manual';
COMMENT ON COLUMN member_availability.day_of_week IS '0=Sunday, 1=Monday, ..., 6=Saturday';
COMMENT ON COLUMN blocked_time_slots.applies_to_all_members IS 'If true, this block applies to all team members for this widget';

