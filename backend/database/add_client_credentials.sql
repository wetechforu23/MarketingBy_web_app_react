-- Create client_credentials table for storing OAuth tokens and service configurations
CREATE TABLE IF NOT EXISTS client_credentials (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    service_type VARCHAR(50) NOT NULL, -- 'google_analytics', 'google_search_console', 'facebook', etc.
    credentials JSONB NOT NULL, -- Store OAuth tokens, property IDs, site URLs, etc.
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(client_id, service_type)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_client_credentials_client_id ON client_credentials(client_id);
CREATE INDEX IF NOT EXISTS idx_client_credentials_service_type ON client_credentials(service_type);
CREATE INDEX IF NOT EXISTS idx_client_credentials_active ON client_credentials(is_active);

-- Add comments
COMMENT ON TABLE client_credentials IS 'Stores OAuth tokens and service configurations for each client';
COMMENT ON COLUMN client_credentials.service_type IS 'Type of service: google_analytics, google_search_console, facebook, etc.';
COMMENT ON COLUMN client_credentials.credentials IS 'JSON object containing OAuth tokens, property IDs, site URLs, and other service-specific data';
