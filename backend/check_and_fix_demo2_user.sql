-- ============================================
-- Check and Fix Demo2 User Assignment
-- ============================================

-- 1. First, let's see all clients to verify Demo2 exists
SELECT id, client_name, email, website_url, is_active
FROM clients
ORDER BY id;

-- 2. Check the Demo2 user we created
SELECT id, email, username, role, client_id, is_active, created_at
FROM users
WHERE email LIKE '%demo2%' OR email LIKE '%abc%';

-- 3. Find Demo2 client specifically
SELECT id, client_name, email, website_url
FROM clients
WHERE client_name ILIKE '%demo%' OR id = 199;

-- ============================================
-- FIX: If the user is assigned to wrong client
-- ============================================
-- Uncomment and run this if needed:

-- UPDATE users 
-- SET client_id = 199  -- Demo2's client ID
-- WHERE email = 'demo2@abc.com';

-- 4. Verify the fix
SELECT u.id, u.email, u.role, u.client_id, c.client_name
FROM users u
LEFT JOIN clients c ON u.client_id = c.id
WHERE u.email = 'demo2@abc.com';

