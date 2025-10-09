-- Migration: Add new columns for enhanced scraping
-- Date: 2025-10-09
-- Description: Add google_place_id, google_rating, geo_latitude, geo_longitude, and company columns

-- Add new columns to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS google_place_id VARCHAR(255);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS google_rating DECIMAL(2,1);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS geo_latitude DECIMAL(10,8);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS geo_longitude DECIMAL(11,8);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS company VARCHAR(255);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_lead_google_place_id ON leads(google_place_id);
CREATE INDEX IF NOT EXISTS idx_lead_geo_location ON leads(geo_latitude, geo_longitude);
CREATE INDEX IF NOT EXISTS idx_lead_company ON leads(company);

-- Update existing leads: copy clinic_name to company if company is null
UPDATE leads SET company = clinic_name WHERE company IS NULL AND clinic_name IS NOT NULL;

-- Show results
SELECT 
  COUNT(*) as total_leads,
  COUNT(google_place_id) as with_place_id,
  COUNT(geo_latitude) as with_geo_location,
  COUNT(company) as with_company
FROM leads;

