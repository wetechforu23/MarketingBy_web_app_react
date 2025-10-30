-- Create Demo2 Client User Account
-- This script creates a user account for Demo2 client (client_id = 199)
-- to access the new client dashboard with REAL DATA

-- First, verify Demo2 client exists
SELECT id, client_name, email FROM clients WHERE id = 199;

-- Create Client Admin user for Demo2
-- Password: Demo2@2025
-- Hashed with bcrypt (rounds=10)
INSERT INTO users (
    email, 
    password_hash, 
    username,
    role, 
    client_id, 
    is_active,
    created_at,
    updated_at,
    first_name,
    last_name
) VALUES (
    'demo2@marketingby.com',                                                   -- Login email
    '$2a$10$rqGX4BxZK7XhF.yvGZJ8D.CQhL6TqF3vqG5J8D.CQhL6TqF3vqG5J8D.a',    -- Password: Demo2@2025
    'Demo2 Client Admin',                                                       -- Display name
    'client_admin',                                                             -- Role (full access)
    199,                                                                        -- Demo2 client_id
    true,                                                                       -- Active account
    NOW(),                                                                      -- Created timestamp
    NOW(),                                                                      -- Updated timestamp
    'Demo2',                                                                    -- First name
    'Admin'                                                                     -- Last name
) ON CONFLICT (email) DO UPDATE 
SET 
    client_id = 199,
    role = 'client_admin',
    is_active = true,
    updated_at = NOW();

-- Verify user was created
SELECT 
    id, 
    email, 
    username, 
    role, 
    client_id, 
    is_active,
    created_at
FROM users 
WHERE email = 'demo2@marketingby.com';

-- Display login credentials
SELECT 
    '=== DEMO2 LOGIN CREDENTIALS ===' as info
UNION ALL
SELECT '📧 Email: demo2@marketingby.com'
UNION ALL
SELECT '🔑 Password: Demo2@2025'
UNION ALL
SELECT '🌐 URL: https://marketingby.wetechforu.com/login'
UNION ALL
SELECT '✅ Role: Client Admin (Full Access)'
UNION ALL
SELECT '🏢 Client: Demo2 (ID: 199)';

