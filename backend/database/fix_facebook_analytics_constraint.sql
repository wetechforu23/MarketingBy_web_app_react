-- Fix Facebook Analytics Unique Constraint
-- Date: 2025-10-23
-- Purpose: Add UNIQUE constraint on client_id to support ON CONFLICT clause

-- Step 1: Remove any duplicate rows (keep only the most recent one per client)
DELETE FROM facebook_analytics a
USING facebook_analytics b
WHERE a.id < b.id 
AND a.client_id = b.client_id;

-- Step 2: Drop existing constraint if it exists
ALTER TABLE facebook_analytics 
DROP CONSTRAINT IF EXISTS facebook_analytics_client_id_key;

-- Step 3: Add unique constraint on client_id
-- This allows ON CONFLICT (client_id) DO UPDATE to work properly
ALTER TABLE facebook_analytics 
ADD CONSTRAINT facebook_analytics_client_id_key UNIQUE (client_id);

-- Verify
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  -- Check for remaining duplicates
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT client_id 
    FROM facebook_analytics 
    GROUP BY client_id 
    HAVING COUNT(*) > 1
  ) dups;
  
  IF duplicate_count > 0 THEN
    RAISE EXCEPTION '❌ Still have % duplicate client_ids!', duplicate_count;
  END IF;
  
  RAISE NOTICE '✅ Removed duplicate rows from facebook_analytics';
  RAISE NOTICE '✅ Added UNIQUE constraint on facebook_analytics(client_id)';
  RAISE NOTICE '   This fixes: ON CONFLICT (client_id) DO UPDATE';
END $$;

