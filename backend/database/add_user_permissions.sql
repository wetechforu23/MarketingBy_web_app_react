-- ============================================================================
-- USER PERMISSIONS SYSTEM
-- Date: October 11, 2025
-- Purpose: Add granular permissions and user management features
-- ============================================================================

-- Add missing columns (some may already exist)
ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS team_type VARCHAR(50);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_permissions ON users USING GIN(permissions);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login);
CREATE INDEX IF NOT EXISTS idx_users_created_by ON users(created_by);

-- Add comments
COMMENT ON COLUMN users.permissions IS 'JSONB object storing user permissions: {leads: {view, add, edit, delete}, users: {manage}, reports: {view, generate}, clients: {manage}}';
COMMENT ON COLUMN users.is_active IS 'Whether user account is active/enabled';
COMMENT ON COLUMN users.last_login IS 'Last login timestamp';
COMMENT ON COLUMN users.must_change_password IS 'Force password change on next login';
COMMENT ON COLUMN users.created_by IS 'User ID who created this user account';
COMMENT ON COLUMN users.updated_at IS 'Last update timestamp';

-- ============================================================================
-- MIGRATE EXISTING USERS
-- ============================================================================

-- Migrate is_admin users to super_admin role (if is_admin column exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='is_admin') THEN
    UPDATE users 
    SET role = 'super_admin', team_type = 'wetechforu'
    WHERE is_admin = true AND (role IS NULL OR role = '');
  END IF;
END $$;

-- Ensure info@wetechforu.com is super_admin
UPDATE users 
SET role = 'super_admin', team_type = 'wetechforu'
WHERE email = 'info@wetechforu.com' AND (role IS NULL OR role = '' OR role != 'super_admin');

-- Set default role for users without role
UPDATE users 
SET role = 'client_user'
WHERE role IS NULL OR role = '';

-- ============================================================================
-- DEFAULT PERMISSIONS BY ROLE
-- ============================================================================

-- Super Admin (WeTechForU)
UPDATE users SET permissions = '{
  "leads": {"view": true, "add": true, "edit": true, "delete": true, "assign": true},
  "users": {"view": true, "add": true, "edit": true, "delete": true},
  "reports": {"view": true, "generate": true, "export": true},
  "clients": {"view": true, "add": true, "edit": true, "delete": true},
  "seo": {"basic": true, "comprehensive": true},
  "email": {"send": true, "templates": true}
}'::jsonb
WHERE role = 'super_admin' AND (permissions = '{}' OR permissions IS NULL);

-- WeTechForU Developer
UPDATE users SET permissions = '{
  "leads": {"view": true, "add": true, "edit": true, "delete": false, "assign": true},
  "users": {"view": true, "add": false, "edit": false, "delete": false},
  "reports": {"view": true, "generate": true, "export": true},
  "clients": {"view": true, "add": false, "edit": false, "delete": false},
  "seo": {"basic": true, "comprehensive": true},
  "email": {"send": true, "templates": false}
}'::jsonb
WHERE role = 'wtfu_developer' AND (permissions = '{}' OR permissions IS NULL);

-- WeTechForU Sales
UPDATE users SET permissions = '{
  "leads": {"view": true, "add": true, "edit": true, "delete": false, "assign": false},
  "users": {"view": false, "add": false, "edit": false, "delete": false},
  "reports": {"view": true, "generate": false, "export": true},
  "clients": {"view": true, "add": false, "edit": false, "delete": false},
  "seo": {"basic": true, "comprehensive": false},
  "email": {"send": true, "templates": false}
}'::jsonb
WHERE role = 'wtfu_sales' AND (permissions = '{}' OR permissions IS NULL);

-- WeTechForU Manager
UPDATE users SET permissions = '{
  "leads": {"view": true, "add": true, "edit": true, "delete": true, "assign": true},
  "users": {"view": true, "add": true, "edit": true, "delete": false},
  "reports": {"view": true, "generate": true, "export": true},
  "clients": {"view": true, "add": false, "edit": true, "delete": false},
  "seo": {"basic": true, "comprehensive": true},
  "email": {"send": true, "templates": true}
}'::jsonb
WHERE role = 'wtfu_manager' AND (permissions = '{}' OR permissions IS NULL);

-- WeTechForU Project Manager
UPDATE users SET permissions = '{
  "leads": {"view": true, "add": true, "edit": true, "delete": false, "assign": true},
  "users": {"view": true, "add": false, "edit": false, "delete": false},
  "reports": {"view": true, "generate": true, "export": true},
  "clients": {"view": true, "add": false, "edit": false, "delete": false},
  "seo": {"basic": true, "comprehensive": true},
  "email": {"send": true, "templates": false}
}'::jsonb
WHERE role = 'wtfu_project_manager' AND (permissions = '{}' OR permissions IS NULL);

-- Client Admin
UPDATE users SET permissions = '{
  "leads": {"view": true, "add": false, "edit": false, "delete": false, "assign": false},
  "users": {"view": true, "add": true, "edit": true, "delete": false},
  "reports": {"view": true, "generate": false, "export": true},
  "clients": {"view": false, "add": false, "edit": false, "delete": false},
  "seo": {"basic": false, "comprehensive": false},
  "email": {"send": false, "templates": false}
}'::jsonb
WHERE role = 'client_admin' AND (permissions = '{}' OR permissions IS NULL);

-- Client User
UPDATE users SET permissions = '{
  "leads": {"view": true, "add": false, "edit": false, "delete": false, "assign": false},
  "users": {"view": false, "add": false, "edit": false, "delete": false},
  "reports": {"view": true, "generate": false, "export": false},
  "clients": {"view": false, "add": false, "edit": false, "delete": false},
  "seo": {"basic": false, "comprehensive": false},
  "email": {"send": false, "templates": false}
}'::jsonb
WHERE role = 'client_user' AND (permissions = '{}' OR permissions IS NULL);

-- Set all existing users as active
UPDATE users SET is_active = true WHERE is_active IS NULL;

-- Set must_change_password to false for existing users
UPDATE users SET must_change_password = false WHERE must_change_password IS NULL;

-- ============================================================================
-- USER ACTIVITY LOG TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_activity_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL, -- 'login', 'logout', 'password_change', 'profile_update', 'lead_view', etc.
  resource_type VARCHAR(50), -- 'lead', 'user', 'report', 'client', etc.
  resource_id INTEGER, -- ID of the resource affected
  ip_address VARCHAR(50),
  user_agent TEXT,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for activity log
CREATE INDEX IF NOT EXISTS idx_user_activity_log_user_id ON user_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_action ON user_activity_log(action);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_created_at ON user_activity_log(created_at);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_resource ON user_activity_log(resource_type, resource_id);

COMMENT ON TABLE user_activity_log IS 'Audit trail of all user actions in the system';
COMMENT ON COLUMN user_activity_log.action IS 'Type of action performed';
COMMENT ON COLUMN user_activity_log.resource_type IS 'Type of resource affected (lead, user, report, etc.)';
COMMENT ON COLUMN user_activity_log.resource_id IS 'ID of the resource affected';
COMMENT ON COLUMN user_activity_log.details IS 'Additional JSON details about the action';

-- ============================================================================
-- COMPLETED: User permissions schema is now ready!
-- ============================================================================

