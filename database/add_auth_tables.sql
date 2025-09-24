-- Authentication and User Management Tables
-- Add to existing health_clinic_marketing database

-- Users table (for admin team and client access)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    phone VARCHAR(20),
    role VARCHAR(50) NOT NULL DEFAULT 'user', -- admin, manager, user, client
    status VARCHAR(50) DEFAULT 'active', -- active, inactive, suspended
    company_id UUID REFERENCES companies(id), -- For admin users
    client_id UUID REFERENCES clients(id), -- For client portal access
    last_login_at TIMESTAMP,
    login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP,
    email_verified BOOLEAN DEFAULT false,
    email_verification_token VARCHAR(100),
    password_reset_token VARCHAR(100),
    password_reset_expires TIMESTAMP,
    two_factor_enabled BOOLEAN DEFAULT false,
    two_factor_secret VARCHAR(100),
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Sessions table (for session management)
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Permissions table (granular permissions)
CREATE TABLE user_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    permission_name VARCHAR(100) NOT NULL, -- view_clients, edit_campaigns, run_audits, etc.
    resource_type VARCHAR(50), -- client, campaign, audit, lead
    resource_id UUID, -- Specific resource ID (optional)
    granted_by UUID REFERENCES users(id),
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    UNIQUE(user_id, permission_name, resource_type, resource_id)
);

-- Client Portal Access table (what clients can see)
CREATE TABLE client_portal_access (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    access_level VARCHAR(50) DEFAULT 'read', -- read, write, admin
    allowed_sections TEXT[] DEFAULT ARRAY['dashboard', 'reports', 'seo_audits'], -- Array of allowed sections
    custom_permissions JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Client Reports table (generated reports for client portal)
CREATE TABLE client_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    report_type VARCHAR(50) NOT NULL, -- seo_summary, campaign_performance, monthly_report
    report_name VARCHAR(200) NOT NULL,
    report_data JSONB NOT NULL,
    file_path VARCHAR(500), -- Path to PDF report
    file_url VARCHAR(500), -- Public URL for client access
    report_period_start DATE,
    report_period_end DATE,
    generated_by UUID REFERENCES users(id),
    is_public BOOLEAN DEFAULT false, -- Can client access without login
    access_token VARCHAR(100), -- For public access
    viewed_at TIMESTAMP,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit Trail for Security
CREATE TABLE security_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL, -- login, logout, failed_login, password_change, etc.
    resource_type VARCHAR(50), -- user, client, campaign, etc.
    resource_id UUID,
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN DEFAULT true,
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- API Keys table (for client API access)
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    key_name VARCHAR(100) NOT NULL,
    api_key VARCHAR(100) UNIQUE NOT NULL,
    api_secret VARCHAR(100),
    permissions TEXT[] DEFAULT ARRAY['read'], -- read, write, admin
    rate_limit INTEGER DEFAULT 1000, -- requests per hour
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications table (for system notifications)
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id), -- For client-specific notifications
    notification_type VARCHAR(50) NOT NULL, -- seo_audit_complete, campaign_alert, etc.
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    data JSONB, -- Additional notification data
    is_read BOOLEAN DEFAULT false,
    priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);
CREATE INDEX idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX idx_client_portal_access_client_id ON client_portal_access(client_id);
CREATE INDEX idx_client_reports_client_id ON client_reports(client_id);
CREATE INDEX idx_security_logs_user_id ON security_logs(user_id);
CREATE INDEX idx_security_logs_action ON security_logs(action);
CREATE INDEX idx_api_keys_api_key ON api_keys(api_key);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- Insert default admin user (password: admin123 - CHANGE THIS!)
-- Password hash for 'admin123' using werkzeug
INSERT INTO users (username, email, password_hash, first_name, last_name, role, status, email_verified)
VALUES (
    'admin',
    'admin@wetechforu.com',
    'pbkdf2:sha256:600000$8Rxk0Fqf$5c9e3a7a9b8f2d4e6c1a3b5d7f9e2c4a6b8d0f2e4c6a8b0d2f4e6c8a0b2d4f6e',
    'Admin',
    'User',
    'admin',
    'active',
    true
) ON CONFLICT (email) DO NOTHING;

-- Insert default permissions for roles
INSERT INTO user_permissions (user_id, permission_name, granted_by, granted_at)
SELECT 
    u.id,
    perm.permission_name,
    u.id,
    CURRENT_TIMESTAMP
FROM users u
CROSS JOIN (
    VALUES 
    ('view_dashboard'),
    ('manage_clients'),
    ('manage_leads'),
    ('run_seo_audits'),
    ('manage_campaigns'),
    ('view_analytics'),
    ('manage_users'),
    ('system_admin')
) AS perm(permission_name)
WHERE u.role = 'admin'
ON CONFLICT (user_id, permission_name, resource_type, resource_id) DO NOTHING;

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_client_portal_access_updated_at BEFORE UPDATE ON client_portal_access FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_client_reports_updated_at BEFORE UPDATE ON client_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


