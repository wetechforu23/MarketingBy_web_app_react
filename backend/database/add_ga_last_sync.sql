-- Add ga_last_sync_at column to track last Google Analytics sync time
-- This prevents fetching duplicate data from Google Analytics

ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS ga_last_sync_at TIMESTAMP;

COMMENT ON COLUMN clients.ga_last_sync_at IS 'Last time Google Analytics data was synced for lead capture';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_clients_ga_last_sync 
ON clients(ga_last_sync_at) 
WHERE ga_last_sync_at IS NOT NULL;

-- Show updated schema
\d clients;

