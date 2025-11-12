-- ==========================================
-- CLIENT CONTACTS DIRECTORY
-- ==========================================
-- Each client has their own directory of contacts
-- Clients can create, update, delete their contacts
-- ==========================================

-- Client Contacts Table
CREATE TABLE IF NOT EXISTS client_contacts (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    
    -- Contact Information
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(20) NOT NULL, -- E.164 format: +1234567890
    phone_formatted VARCHAR(255), -- Formatted display: (123) 456-7890
    
    -- Additional Details
    company VARCHAR(255),
    job_title VARCHAR(255),
    department VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    zip_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'United States',
    
    -- Contact Metadata
    tags TEXT[], -- Array of tags for categorization
    notes TEXT,
    source VARCHAR(100), -- 'manual', 'import', 'widget', 'lead', etc.
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'inactive', 'archived'
    
    -- Communication Preferences
    preferred_contact_method VARCHAR(50) DEFAULT 'phone', -- 'phone', 'email', 'sms', 'whatsapp'
    do_not_call BOOLEAN DEFAULT false,
    do_not_email BOOLEAN DEFAULT false,
    do_not_sms BOOLEAN DEFAULT false,
    
    -- Statistics
    total_calls INTEGER DEFAULT 0,
    total_texts INTEGER DEFAULT 0,
    total_emails INTEGER DEFAULT 0,
    last_contacted_at TIMESTAMP,
    last_called_at TIMESTAMP,
    last_texted_at TIMESTAMP,
    last_emailed_at TIMESTAMP,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE(client_id, phone) -- One phone per client
);

-- Client Contact Groups (for organizing contacts)
CREATE TABLE IF NOT EXISTS client_contact_groups (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(7), -- Hex color for UI
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(client_id, name)
);

-- Contact to Group Mapping (Many-to-Many)
CREATE TABLE IF NOT EXISTS client_contact_group_members (
    id SERIAL PRIMARY KEY,
    contact_id INTEGER REFERENCES client_contacts(id) ON DELETE CASCADE,
    group_id INTEGER REFERENCES client_contact_groups(id) ON DELETE CASCADE,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(contact_id, group_id)
);

-- Contact Communication History
CREATE TABLE IF NOT EXISTS client_contact_communications (
    id SERIAL PRIMARY KEY,
    contact_id INTEGER REFERENCES client_contacts(id) ON DELETE CASCADE,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    initiated_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    
    -- Communication Details
    type VARCHAR(50) NOT NULL, -- 'call', 'sms', 'email', 'whatsapp'
    direction VARCHAR(20) NOT NULL, -- 'outbound', 'inbound'
    status VARCHAR(50) NOT NULL, -- 'initiated', 'completed', 'failed', 'no-answer', 'busy'
    
    -- Call Details (if type = 'call')
    call_sid VARCHAR(255), -- Twilio Call SID
    duration_seconds INTEGER,
    recording_url TEXT,
    transcription_text TEXT,
    
    -- Message Details (if type = 'sms' or 'whatsapp')
    message_sid VARCHAR(255), -- Twilio Message SID
    message_body TEXT,
    message_status VARCHAR(50), -- 'sent', 'delivered', 'read', 'failed'
    
    -- Email Details (if type = 'email')
    email_subject TEXT,
    email_body TEXT,
    email_status VARCHAR(50), -- 'sent', 'delivered', 'opened', 'clicked', 'bounced'
    
    -- Metadata
    notes TEXT,
    tags TEXT[],
    
    -- Timestamps
    initiated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_client_contacts_client_id ON client_contacts(client_id);
CREATE INDEX IF NOT EXISTS idx_client_contacts_phone ON client_contacts(phone);
CREATE INDEX IF NOT EXISTS idx_client_contacts_email ON client_contacts(email);
CREATE INDEX IF NOT EXISTS idx_client_contacts_status ON client_contacts(status);
CREATE INDEX IF NOT EXISTS idx_client_contacts_created_at ON client_contacts(created_at);

CREATE INDEX IF NOT EXISTS idx_contact_groups_client_id ON client_contact_groups(client_id);
CREATE INDEX IF NOT EXISTS idx_contact_group_members_contact_id ON client_contact_group_members(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_group_members_group_id ON client_contact_group_members(group_id);

CREATE INDEX IF NOT EXISTS idx_contact_communications_contact_id ON client_contact_communications(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_communications_client_id ON client_contact_communications(client_id);
CREATE INDEX IF NOT EXISTS idx_contact_communications_type ON client_contact_communications(type);
CREATE INDEX IF NOT EXISTS idx_contact_communications_initiated_at ON client_contact_communications(initiated_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_client_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_client_contacts_updated_at
    BEFORE UPDATE ON client_contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_client_contacts_updated_at();

CREATE TRIGGER trigger_update_contact_groups_updated_at
    BEFORE UPDATE ON client_contact_groups
    FOR EACH ROW
    EXECUTE FUNCTION update_client_contacts_updated_at();

-- Create default "All Contacts" group for each existing client
INSERT INTO client_contact_groups (client_id, name, description, is_default, color)
SELECT id, 'All Contacts', 'Default group for all contacts', true, '#4682B4'
FROM clients
WHERE NOT EXISTS (
    SELECT 1 FROM client_contact_groups WHERE client_id = clients.id AND is_default = true
);

COMMENT ON TABLE client_contacts IS 'Client contact directory - each client manages their own contacts';
COMMENT ON TABLE client_contact_groups IS 'Contact groups for organizing contacts';
COMMENT ON TABLE client_contact_group_members IS 'Many-to-many mapping of contacts to groups';
COMMENT ON TABLE client_contact_communications IS 'Communication history for each contact';

