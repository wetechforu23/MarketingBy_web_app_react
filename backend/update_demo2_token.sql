-- Update Facebook Access Token for Demo-2 (Client 199)
-- Replace 'YOUR_NEW_PAGE_ACCESS_TOKEN' with actual token from Facebook

SELECT 
    id, 
    client_id, 
    platform, 
    page_id, 
    SUBSTRING(access_token, 1, 20) || '...' as token_preview
FROM client_credentials 
WHERE client_id = 199 AND platform = 'facebook';

-- To update the token, run this query after getting a new token:
/*
UPDATE client_credentials 
SET 
    access_token = 'YOUR_NEW_PAGE_ACCESS_TOKEN_HERE',
    updated_at = NOW()
WHERE client_id = 199 AND platform = 'facebook';
*/

-- Verify the update:
-- SELECT * FROM client_credentials WHERE client_id = 199 AND platform = 'facebook';

