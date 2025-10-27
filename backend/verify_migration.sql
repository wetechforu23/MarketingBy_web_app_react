-- Verify facebook_analytics migration was successful
-- Run this in pgAdmin to confirm everything is working

-- Check 1: Verify metric_date column exists
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'facebook_analytics' 
ORDER BY ordinal_position;

-- Check 2: Verify new unique constraint exists
SELECT 
  constraint_name,
  constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'facebook_analytics';

-- Check 3: View current data structure
SELECT 
  client_id,
  metric_date,
  page_views,
  followers,
  engagement,
  synced_at
FROM facebook_analytics
ORDER BY client_id, metric_date DESC
LIMIT 10;

-- Check 4: Count rows per client
SELECT 
  client_id,
  COUNT(*) as total_days,
  MIN(metric_date) as first_date,
  MAX(metric_date) as latest_date
FROM facebook_analytics
GROUP BY client_id
ORDER BY client_id;

-- Check 5: Verify indexes
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'facebook_analytics';

