-- Migration: Add latitude/longitude columns to leads table
-- Date: 2025-10-17
-- Description: Add coordinates for lead density heatmap visualization

-- Add coordinate columns to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS geocoded_at TIMESTAMP;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS geocoding_status VARCHAR(20) DEFAULT 'pending' CHECK (geocoding_status IN ('pending', 'completed', 'failed'));

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_leads_coordinates ON leads(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_leads_geocoding_status ON leads(geocoding_status);

-- Show current leads that need geocoding
SELECT 
  id, 
  company, 
  address, 
  city, 
  state, 
  zip_code,
  geocoding_status
FROM leads 
WHERE latitude IS NULL 
ORDER BY created_at DESC;
