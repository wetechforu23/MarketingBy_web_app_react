-- ============================================================================
-- FIX CONVERTED LEADS: Move client_id to converted_to_client_id
-- ============================================================================
-- Date: October 27, 2025
-- Purpose: Fix converted business leads that were incorrectly using client_id
--          instead of converted_to_client_id
--
-- Background:
-- - client_id is for PATIENT LEADS (leads that belong TO a client)
-- - converted_to_client_id is for BUSINESS LEADS (leads converted FROM lead TO client)
--
-- This migration fixes leads with status='converted' that have client_id set
-- by moving that value to converted_to_client_id and clearing client_id
-- ============================================================================

BEGIN;

-- Find and fix converted leads that have client_id set (should be converted_to_client_id)
UPDATE leads
SET 
  converted_to_client_id = client_id,
  client_id = NULL
WHERE 
  status = 'converted' 
  AND client_id IS NOT NULL
  AND converted_to_client_id IS NULL;

-- Log the fix
DO $$
DECLARE
  fixed_count INTEGER;
BEGIN
  GET DIAGNOSTICS fixed_count = ROW_COUNT;
  RAISE NOTICE '✅ Fixed % converted leads: moved client_id to converted_to_client_id', fixed_count;
END $$;

COMMIT;

-- Verification query (run after migration)
-- SELECT 
--   id,
--   company,
--   email,
--   status,
--   client_id AS should_be_null,
--   converted_to_client_id AS should_have_value
-- FROM leads
-- WHERE status = 'converted'
-- ORDER BY created_at DESC;

