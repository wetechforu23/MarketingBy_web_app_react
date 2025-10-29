-- Migration: Convert facebook_analytics to time-series (daily tracking)
-- Date: 2025-10-24
-- Purpose: Store one entry per client per day to track historical trends

-- Step 1: Add metric_date column if it doesn't exist
ALTER TABLE facebook_analytics 
  ADD COLUMN IF NOT EXISTS metric_date DATE DEFAULT CURRENT_DATE;

-- Step 2: Backfill metric_date for existing rows (set to today)
UPDATE facebook_analytics 
SET metric_date = CURRENT_DATE 
WHERE metric_date IS NULL;

-- Step 3: Make metric_date NOT NULL
ALTER TABLE facebook_analytics 
  ALTER COLUMN metric_date SET NOT NULL;

-- Step 4: Drop old unique constraint on client_id (if exists)
ALTER TABLE facebook_analytics 
  DROP CONSTRAINT IF EXISTS facebook_analytics_client_id_key;

-- Step 5: Add new unique constraint on (client_id, metric_date)
-- This ensures one entry per client per day
ALTER TABLE facebook_analytics 
  ADD CONSTRAINT facebook_analytics_unique_client_date 
  UNIQUE(client_id, metric_date);

-- Step 6: Create index for fast date-based queries
CREATE INDEX IF NOT EXISTS idx_facebook_analytics_client_date 
  ON facebook_analytics(client_id, metric_date DESC);

-- Step 7: Create index for date range queries
CREATE INDEX IF NOT EXISTS idx_facebook_analytics_date 
  ON facebook_analytics(metric_date DESC);

-- Comments
COMMENT ON COLUMN facebook_analytics.metric_date IS 'Date of the metrics (one entry per client per day)';
COMMENT ON CONSTRAINT facebook_analytics_unique_client_date ON facebook_analytics IS 'Ensures one entry per client per day';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Migration complete: facebook_analytics now supports daily time-series tracking';
  RAISE NOTICE '📊 Structure: One entry per client per day';
  RAISE NOTICE '🔄 UPSERT behavior: Updates if same client_id + metric_date exists';
END $$;

