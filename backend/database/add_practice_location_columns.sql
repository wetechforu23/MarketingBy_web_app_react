-- Migration: Add practice location columns to clients table
-- Date: 2025-10-17
-- Description: Add practice location coordinates and address fields to clients table

-- Add practice location columns to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS practice_latitude DECIMAL(10,8);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS practice_longitude DECIMAL(11,8);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS practice_address TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS practice_city VARCHAR(100);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS practice_state VARCHAR(50);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS practice_zip_code VARCHAR(10);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_client_practice_location ON clients(practice_latitude, practice_longitude);

-- Update existing clients with default practice locations
-- ProMed Healthcare Associates (Aubrey, TX)
UPDATE clients 
SET 
  practice_latitude = 33.2148,
  practice_longitude = -96.6331,
  practice_address = 'Aubrey, TX',
  practice_city = 'Aubrey',
  practice_state = 'TX',
  practice_zip_code = '76227'
WHERE id = 1 AND name = 'ProMed Healthcare Associates';

-- Align Primary Care (Dallas, TX)
UPDATE clients 
SET 
  practice_latitude = 32.7767,
  practice_longitude = -96.7970,
  practice_address = 'Dallas, TX',
  practice_city = 'Dallas',
  practice_state = 'TX',
  practice_zip_code = '75201'
WHERE id = 67 AND name = 'Align Primary';

-- Show results
SELECT 
  id,
  name,
  practice_city,
  practice_state,
  practice_latitude,
  practice_longitude
FROM clients 
WHERE practice_latitude IS NOT NULL;
