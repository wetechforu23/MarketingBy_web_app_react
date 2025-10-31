-- ================================================================
-- UPDATE FACEBOOK PAGE ACCESS TOKENS FOR ALL CLIENTS
-- Generated: October 23, 2025
-- These tokens are long-lived (valid for ~60 days)
-- ================================================================

-- CLIENT 1: ProMed Healthcare Associates
-- Page: 744651835408507 (45 followers)
INSERT INTO client_credentials (client_id, service_type, credentials, created_at, updated_at)
VALUES (
  1,
  'facebook',
  jsonb_build_object(
    'page_id', '744651835408507',
    'access_token', 'EAAVlGna8NrIBP8gCxgZCq1FPIpcZAWa3JoxGsKHwAeZA8YORCMrXfC9DVVX5wLX2Qj5kKMdBZB98xaO4KJF3a3ffXuYuATDdWJhhaMZCBjltn0WOf1K3mEbdMAvNTjLDigqjWIDPGr8nASms5M6eumMmq8HyR6rTmyLQbu3ZCJjhVYjZCMnGTAKuReuBgLoAKoLfHr9MAZDZD'
  ),
  NOW(),
  NOW()
)
ON CONFLICT (client_id, service_type)
DO UPDATE SET
  credentials = jsonb_build_object(
    'page_id', '744651835408507',
    'access_token', 'EAAVlGna8NrIBP8gCxgZCq1FPIpcZAWa3JoxGsKHwAeZA8YORCMrXfC9DVVX5wLX2Qj5kKMdBZB98xaO4KJF3a3ffXuYuATDdWJhhaMZCBjltn0WOf1K3mEbdMAvNTjLDigqjWIDPGr8nASms5M6eumMmq8HyR6rTmyLQbu3ZCJjhVYjZCMnGTAKuReuBgLoAKoLfHr9MAZDZD'
  ),
  updated_at = NOW();

-- CLIENT 67: Align Primary Care
-- Page: 796845933511707
INSERT INTO client_credentials (client_id, service_type, credentials, created_at, updated_at)
VALUES (
  67,
  'facebook',
  jsonb_build_object(
    'page_id', '796845933511707',
    'access_token', 'EAAVlGna8NrIBPzXKf6ZBGBiNKg7TZAgHV6GxsBDb9S23F4IVd5lFZAlCPrlyGCRZBpKCSHZBuP5uTi4YjRZByoceK9wTMpieDz1qIZC6yyZA5azuHd8dZBEf9NxfMCi3vkHyTAUggzcGTzZAUznhqSnVlvE4FAtajfpi4AwnZCCZClxZBb7GtoJEvVszql4RnZA2hqKJR7D82N8gZDZD'
  ),
  NOW(),
  NOW()
)
ON CONFLICT (client_id, service_type)
DO UPDATE SET
  credentials = jsonb_build_object(
    'page_id', '796845933511707',
    'access_token', 'EAAVlGna8NrIBPzXKf6ZBGBiNKg7TZAgHV6GxsBDb9S23F4IVd5lFZAlCPrlyGCRZBpKCSHZBuP5uTi4YjRZByoceK9wTMpieDz1qIZC6yyZA5azuHd8dZBEf9NxfMCi3vkHyTAUggzcGTzZAUznhqSnVlvE4FAtajfpi4AwnZCCZClxZBb7GtoJEvVszql4RnZA2hqKJR7D82N8gZDZD'
  ),
  updated_at = NOW();

-- CLIENT 105: Wetechforu (My Business)
-- Page: 323404977516387 (33 followers)
INSERT INTO client_credentials (client_id, service_type, credentials, created_at, updated_at)
VALUES (
  105,
  'facebook',
  jsonb_build_object(
    'page_id', '323404977516387',
    'access_token', 'EAAVlGna8NrIBP508y1CyZANd5ph5HBVvyu49ySLWOixq6Hq3rnyryFFGGWtmfQ35uLEXZCiqSNkRn7NNYpKHJZBDjHmsaZApZBDjioNvseEGH64O12k6BZCeJvGbyK24K1vC3XymUGjMwHKwlsGi5DDqUCR9YHYvOuFbNiRDhLfMpKfZBsyAPkXiCvG6VjCe6dWkcKZCIwZDZD'
  ),
  NOW(),
  NOW()
)
ON CONFLICT (client_id, service_type)
DO UPDATE SET
  credentials = jsonb_build_object(
    'page_id', '323404977516387',
    'access_token', 'EAAVlGna8NrIBP508y1CyZANd5ph5HBVvyu49ySLWOixq6Hq3rnyryFFGGWtmfQ35uLEXZCiqSNkRn7NNYpKHJZBDjHmsaZApZBDjioNvseEGH64O12k6BZCeJvGbyK24K1vC3XymUGjMwHKwlsGi5DDqUCR9YHYvOuFbNiRDhLfMpKfZBsyAPkXiCvG6VjCe6dWkcKZCIwZDZD'
  ),
  updated_at = NOW();

-- CLIENT (OPTIONAL): CAREpitome
-- Page: 775169725669760 (66 followers)
-- Uncomment if you want to add this page to a client
/*
INSERT INTO client_credentials (client_id, service_type, credentials, created_at, updated_at)
VALUES (
  YOUR_CLIENT_ID, -- Replace with actual client ID
  'facebook',
  jsonb_build_object(
    'page_id', '775169725669760',
    'access_token', 'EAAVlGna8NrIBP0impZCLfxMSeux8V5Hm7Cd0eMfEU5mZCEMliuz2sjZCaScqfmLM9nzRaFljgP1WDT7WqGGvMCuX0tQpOwFsrR6gBYGkoJ5n01DuqsrKRmPhGZBg3ada5jLZBBmJf6ZCH8cv5putyRmTj8zUaHneZByRZAtGZBYsv7Q6ZC37YbCZADd7H8wRRMIwQkv4eHAuAZDZD'
  ),
  NOW(),
  NOW()
)
ON CONFLICT (client_id, service_type)
DO UPDATE SET
  credentials = jsonb_build_object(
    'page_id', '775169725669760',
    'access_token', 'EAAVlGna8NrIBP0impZCLfxMSeux8V5Hm7Cd0eMfEU5mZCEMliuz2sjZCaScqfmLM9nzRaFljgP1WDT7WqGGvMCuX0tQpOwFsrR6gBYGkoJ5n01DuqsrKRmPhGZBg3ada5jLZBBmJf6ZCH8cv5putyRmTj8zUaHneZByRZAtGZBYsv7Q6ZC37YbCZADd7H8wRRMIwQkv4eHAuAZDZD'
  ),
  updated_at = NOW();
*/

-- ================================================================
-- VERIFY THE UPDATES
-- ================================================================
SELECT 
  c.id,
  c.name,
  cc.service_type,
  cc.credentials->>'page_id' as page_id,
  LEFT(cc.credentials->>'access_token', 30) || '...' as token_preview,
  cc.updated_at
FROM clients c
LEFT JOIN client_credentials cc ON c.id = cc.client_id AND cc.service_type = 'facebook'
WHERE c.id IN (1, 67, 105)
ORDER BY c.id;

