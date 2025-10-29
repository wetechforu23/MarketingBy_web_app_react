-- ============================================================================
-- DUPLICATE MANAGEMENT & MULTI-LOCATION SUPPORT
-- ============================================================================
-- Date: October 27, 2025
-- Purpose: Handle duplicate emails by supporting multiple locations per client
--          and proper duplicate detection/management
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Add parent_client_id for multi-location support
-- ============================================================================
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS parent_client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS location_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS is_primary_location BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_clients_parent_client_id ON clients(parent_client_id);
CREATE INDEX IF NOT EXISTS idx_clients_email_lower ON clients(LOWER(email));

COMMENT ON COLUMN clients.parent_client_id IS 'Links additional locations to main client record';
COMMENT ON COLUMN clients.location_name IS 'Name of this specific location (e.g., "Downtown Office", "North Branch")';
COMMENT ON COLUMN clients.is_primary_location IS 'True for the main/original location';

-- ============================================================================
-- 2. Add duplicate tracking for leads
-- ============================================================================
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS duplicate_of_lead_id INTEGER REFERENCES leads(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS duplicate_checked_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS duplicate_resolution VARCHAR(50) CHECK (duplicate_resolution IN ('merged', 'separate', 'ignored', 'pending'));

CREATE INDEX IF NOT EXISTS idx_leads_duplicate_of ON leads(duplicate_of_lead_id);
CREATE INDEX IF NOT EXISTS idx_leads_email_lower ON leads(LOWER(email));

COMMENT ON COLUMN leads.duplicate_of_lead_id IS 'If this is a duplicate, links to original lead';
COMMENT ON COLUMN leads.duplicate_resolution IS 'How duplicate was handled: merged, separate, ignored, pending';

-- ============================================================================
-- 3. Create duplicate detection log table
-- ============================================================================
CREATE TABLE IF NOT EXISTS duplicate_detections (
  id SERIAL PRIMARY KEY,
  entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('lead', 'client')),
  entity_id INTEGER NOT NULL,
  duplicate_entity_id INTEGER NOT NULL,
  match_field VARCHAR(50) NOT NULL, -- 'email', 'phone', 'website', etc.
  match_value TEXT NOT NULL,
  detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP,
  resolution_action VARCHAR(50) CHECK (resolution_action IN ('merged_location', 'created_separate', 'cancelled', 'ignored')),
  resolved_by INTEGER REFERENCES users(id),
  resolution_notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_duplicate_detections_entity ON duplicate_detections(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_duplicate_detections_match ON duplicate_detections(match_field, match_value);

-- ============================================================================
-- 4. Function to find duplicate leads by email
-- ============================================================================
CREATE OR REPLACE FUNCTION find_duplicate_leads(
  p_email TEXT,
  p_exclude_lead_id INTEGER DEFAULT NULL
)
RETURNS TABLE (
  id INTEGER,
  company VARCHAR,
  email VARCHAR,
  phone VARCHAR,
  status VARCHAR,
  created_at TIMESTAMP,
  converted_to_client_id INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.company,
    l.email,
    l.phone,
    l.status,
    l.created_at,
    l.converted_to_client_id
  FROM leads l
  WHERE LOWER(l.email) = LOWER(p_email)
    AND (p_exclude_lead_id IS NULL OR l.id != p_exclude_lead_id)
  ORDER BY l.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. Function to find duplicate clients by email
-- ============================================================================
CREATE OR REPLACE FUNCTION find_duplicate_clients(
  p_email TEXT,
  p_exclude_client_id INTEGER DEFAULT NULL
)
RETURNS TABLE (
  id INTEGER,
  client_name VARCHAR,
  email VARCHAR,
  phone VARCHAR,
  location_name VARCHAR,
  parent_client_id INTEGER,
  is_primary_location BOOLEAN,
  created_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.client_name,
    c.email,
    c.phone,
    c.location_name,
    c.parent_client_id,
    c.is_primary_location,
    c.created_at
  FROM clients c
  WHERE LOWER(c.email) = LOWER(p_email)
    AND (p_exclude_client_id IS NULL OR c.id != p_exclude_client_id)
    AND c.is_active = true
  ORDER BY c.is_primary_location DESC, c.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. Function to create client with location (handles duplicates)
-- ============================================================================
CREATE OR REPLACE FUNCTION create_client_with_location(
  p_client_name VARCHAR,
  p_email VARCHAR,
  p_phone VARCHAR,
  p_location_name VARCHAR DEFAULT NULL,
  p_parent_client_id INTEGER DEFAULT NULL,
  p_address TEXT DEFAULT NULL,
  p_city VARCHAR DEFAULT NULL,
  p_state VARCHAR DEFAULT NULL,
  p_zip_code VARCHAR DEFAULT NULL,
  p_website VARCHAR DEFAULT NULL
)
RETURNS TABLE (
  client_id INTEGER,
  is_new_client BOOLEAN,
  is_additional_location BOOLEAN,
  parent_id INTEGER
) AS $$
DECLARE
  v_client_id INTEGER;
  v_parent_id INTEGER;
  v_is_new BOOLEAN;
  v_is_additional BOOLEAN;
BEGIN
  -- If parent_client_id provided, this is an additional location
  IF p_parent_client_id IS NOT NULL THEN
    INSERT INTO clients (
      client_name, email, phone, location_name, parent_client_id,
      is_primary_location, practice_address, practice_city, 
      practice_state, practice_zip_code, website, is_active, created_at
    ) VALUES (
      p_client_name, p_email, p_phone, p_location_name, p_parent_client_id,
      false, p_address, p_city, p_state, p_zip_code, p_website, true, NOW()
    ) RETURNING id INTO v_client_id;
    
    v_parent_id := p_parent_client_id;
    v_is_new := false;
    v_is_additional := true;
  ELSE
    -- New primary client
    INSERT INTO clients (
      client_name, email, phone, location_name, parent_client_id,
      is_primary_location, practice_address, practice_city, 
      practice_state, practice_zip_code, website, is_active, created_at
    ) VALUES (
      p_client_name, p_email, p_phone, p_location_name, NULL,
      true, p_address, p_city, p_state, p_zip_code, p_website, true, NOW()
    ) RETURNING id INTO v_client_id;
    
    v_parent_id := v_client_id;
    v_is_new := true;
    v_is_additional := false;
  END IF;
  
  RETURN QUERY SELECT v_client_id, v_is_new, v_is_additional, v_parent_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. Verification queries
-- ============================================================================

-- Find all clients with same email
-- SELECT email, COUNT(*), STRING_AGG(client_name || ' (' || id || ')', ', ') as clients
-- FROM clients
-- GROUP BY email
-- HAVING COUNT(*) > 1;

-- Find all multi-location clients
-- SELECT 
--   p.id as parent_id,
--   p.client_name as parent_name,
--   p.email,
--   COUNT(c.id) as location_count,
--   STRING_AGG(c.location_name || ' (ID: ' || c.id || ')', ', ') as locations
-- FROM clients p
-- LEFT JOIN clients c ON c.parent_client_id = p.id
-- WHERE p.is_primary_location = true
-- GROUP BY p.id, p.client_name, p.email
-- HAVING COUNT(c.id) > 0;

COMMIT;

RAISE NOTICE '✅ Duplicate management tables and functions created successfully';
RAISE NOTICE '📋 New features:';
RAISE NOTICE '   - Multi-location support for clients (parent_client_id)';
RAISE NOTICE '   - Duplicate detection logging';
RAISE NOTICE '   - Helper functions: find_duplicate_leads(), find_duplicate_clients()';
RAISE NOTICE '   - Smart creation: create_client_with_location()';

