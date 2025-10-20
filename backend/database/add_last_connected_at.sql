-- Add last_connected_at column to client_credentials table
-- Date: 2025-10-20
-- Purpose: Track when each credential was last connected/updated

ALTER TABLE client_credentials 
ADD COLUMN IF NOT EXISTS last_connected_at TIMESTAMP;

-- Add index for last_connected_at lookups
CREATE INDEX IF NOT EXISTS idx_client_credentials_last_connected 
ON client_credentials(last_connected_at);

-- Comment
COMMENT ON COLUMN client_credentials.last_connected_at IS 'Timestamp when the credential was last connected or updated';

