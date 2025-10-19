-- Add country column to leads table for Google Analytics lead capture
-- Date: 2025-10-19
-- Purpose: Support Google Analytics visitor tracking with country information

ALTER TABLE leads ADD COLUMN IF NOT EXISTS country VARCHAR(100);

-- Add index for country lookups
CREATE INDEX IF NOT EXISTS idx_leads_country ON leads(country);

-- Comment
COMMENT ON COLUMN leads.country IS 'Country of the lead (from Google Analytics visitor data)';

