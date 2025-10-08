-- Encrypted Credentials Management Tables
-- This script creates tables for secure credential storage and management

-- Encrypted Credentials Table
CREATE TABLE IF NOT EXISTS encrypted_credentials (
    id SERIAL PRIMARY KEY,
    service_name VARCHAR(100) NOT NULL,
    environment VARCHAR(50) NOT NULL,
    credential_type VARCHAR(50) NOT NULL,
    encrypted_value TEXT NOT NULL,
    encryption_key_id VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true
);

-- Credential Access Logs Table
CREATE TABLE IF NOT EXISTS credential_access_logs (
    id SERIAL PRIMARY KEY,
    credential_id INTEGER NOT NULL REFERENCES encrypted_credentials(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    access_type VARCHAR(50) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    success BOOLEAN NOT NULL,
    error_message TEXT
);

-- Platform Settings Table (if not exists)
CREATE TABLE IF NOT EXISTS platform_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type VARCHAR(50) DEFAULT 'string',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_encrypted_credentials_service ON encrypted_credentials(service_name);
CREATE INDEX IF NOT EXISTS idx_encrypted_credentials_environment ON encrypted_credentials(environment);
CREATE INDEX IF NOT EXISTS idx_encrypted_credentials_active ON encrypted_credentials(is_active);
CREATE INDEX IF NOT EXISTS idx_encrypted_credentials_service_env ON encrypted_credentials(service_name, environment);
CREATE INDEX IF NOT EXISTS idx_encrypted_credentials_expires ON encrypted_credentials(expires_at);

CREATE INDEX IF NOT EXISTS idx_credential_access_logs_credential ON credential_access_logs(credential_id);
CREATE INDEX IF NOT EXISTS idx_credential_access_logs_user ON credential_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_credential_access_logs_date ON credential_access_logs(accessed_at);
CREATE INDEX IF NOT EXISTS idx_credential_access_logs_success ON credential_access_logs(success);

CREATE INDEX IF NOT EXISTS idx_platform_settings_key ON platform_settings(setting_key);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_encrypted_credentials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION update_platform_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
CREATE TRIGGER update_encrypted_credentials_updated_at
    BEFORE UPDATE ON encrypted_credentials
    FOR EACH ROW
    EXECUTE FUNCTION update_encrypted_credentials_updated_at();

CREATE TRIGGER update_platform_settings_updated_at
    BEFORE UPDATE ON platform_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_platform_settings_updated_at();

-- Insert default platform settings
INSERT INTO platform_settings (setting_key, setting_value, setting_type, description) VALUES
('credential_encryption_enabled', 'true', 'boolean', 'Enable credential encryption'),
('credential_access_logging', 'true', 'boolean', 'Enable credential access logging'),
('credential_expiration_warning_days', '30', 'integer', 'Days before expiration to send warning'),
('max_credential_access_logs', '1000', 'integer', 'Maximum number of access logs to keep per credential'),
('default_credential_environment', 'production', 'string', 'Default environment for new credentials')
ON CONFLICT (setting_key) DO NOTHING;

-- Insert sample encrypted credentials (these are encrypted with a default key)
-- In production, these should be replaced with real encrypted values
INSERT INTO encrypted_credentials (
    service_name, environment, credential_type, encrypted_value, encryption_key_id, is_active
) VALUES
('google_maps', 'production', 'api_key', '{"encrypted":"sample_encrypted_value","iv":"sample_iv","tag":"sample_tag"}', 'default_key_id', true),
('microsoft_graph', 'production', 'client_id', '{"encrypted":"sample_encrypted_value","iv":"sample_iv","tag":"sample_tag"}', 'default_key_id', true),
('microsoft_graph', 'production', 'client_secret', '{"encrypted":"sample_encrypted_value","iv":"sample_iv","tag":"sample_tag"}', 'default_key_id', true),
('microsoft_graph', 'production', 'tenant_id', '{"encrypted":"sample_encrypted_value","iv":"sample_iv","tag":"sample_tag"}', 'default_key_id', true)
ON CONFLICT DO NOTHING;
