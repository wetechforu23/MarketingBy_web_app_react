-- Facebook Data Diagnostic Query
-- Run this on your Heroku PostgreSQL database to check Facebook integration status

-- 1. Check all clients
SELECT 
    c.id,
    c.name,
    c.is_active,
    CASE 
        WHEN cc.credentials IS NOT NULL THEN '✅ Connected'
        ELSE '❌ Not Connected'
    END as facebook_status,
    cc.credentials->>'page_id' as page_id
FROM clients c
LEFT JOIN client_credentials cc ON c.id = cc.client_id AND cc.service_type = 'facebook';

-- 2. Check Facebook analytics data
SELECT 
    client_id,
    page_views,
    followers,
    reach,
    impressions,
    engagement_rate,
    synced_at
FROM facebook_analytics
ORDER BY synced_at DESC
LIMIT 10;

-- 3. Check Facebook posts count by client
SELECT 
    client_id,
    COUNT(*) as total_posts,
    SUM(post_impressions) as total_impressions,
    SUM(post_reach) as total_reach,
    SUM(post_clicks) as total_clicks,
    MAX(created_time) as last_post_date
FROM facebook_posts
GROUP BY client_id;

-- 4. Check if client_credentials table has Facebook entries
SELECT 
    client_id,
    service_type,
    created_at,
    updated_at,
    CASE 
        WHEN credentials->>'access_token' IS NOT NULL THEN '✅ Has Access Token'
        ELSE '❌ No Access Token'
    END as token_status
FROM client_credentials
WHERE service_type = 'facebook';

