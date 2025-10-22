# 🎯 User Management System - Complete Design

**Date**: October 11, 2025  
**Feature**: Comprehensive User Management for Multi-Tenant System

---

## 📋 **YOUR REQUIREMENTS**

### User Management Location:
- Left Panel → System Management → **Users** (tree item)

### Add User Form Fields:
1. ✅ Username
2. ✅ Email
3. ✅ Temporary Password
4. ✅ User Type: `WeTechForU` or `Client`
5. ✅ If Client → Select Client from dropdown
6. ✅ Role Selection:
   - **WeTechForU Roles**: super_admin, wtfu_developer, wtfu_sales, wtfu_manager, wtfu_project_manager
   - **Client Roles**: client_admin, client_user
7. ✅ Permissions (Checkboxes):
   - View Leads
   - Add Leads
   - Edit Leads
   - Delete Leads
   - Manage Users (for admins)
   - View Reports
   - Generate Reports
   - Manage Clients (super_admin only)

### User List Features:
- View all users (super_admin sees all, client_admin sees only their client users)
- Edit user details
- Disable/Enable user
- Delete user
- Reset password
- View user activity log

---

## 🗄️ **DATABASE SCHEMA**

### 1. Add Permissions Columns to `users` Table:
```sql
-- Add permission flags to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT true;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_permissions ON users USING GIN(permissions);

-- Comments
COMMENT ON COLUMN users.permissions IS 'JSONB object storing user permissions: {leads: {view, add, edit, delete}, users: {manage}, reports: {view, generate}, clients: {manage}}';
COMMENT ON COLUMN users.is_active IS 'Whether user account is active/enabled';
COMMENT ON COLUMN users.last_login IS 'Last login timestamp';
COMMENT ON COLUMN users.must_change_password IS 'Force password change on next login';
```

### 2. Permissions JSON Structure:
```json
{
  "leads": {
    "view": true,
    "add": true,
    "edit": true,
    "delete": false,
    "assign": true
  },
  "users": {
    "view": true,
    "add": false,
    "edit": false,
    "delete": false
  },
  "reports": {
    "view": true,
    "generate": false,
    "export": true
  },
  "clients": {
    "view": false,
    "add": false,
    "edit": false,
    "delete": false
  },
  "seo": {
    "basic": true,
    "comprehensive": false
  },
  "email": {
    "send": true,
    "templates": false
  }
}
```

### 3. Default Permissions by Role:

#### Super Admin (WeTechForU):
```json
{
  "leads": {"view": true, "add": true, "edit": true, "delete": true, "assign": true},
  "users": {"view": true, "add": true, "edit": true, "delete": true},
  "reports": {"view": true, "generate": true, "export": true},
  "clients": {"view": true, "add": true, "edit": true, "delete": true},
  "seo": {"basic": true, "comprehensive": true},
  "email": {"send": true, "templates": true}
}
```

#### WeTechForU Developer:
```json
{
  "leads": {"view": true, "add": true, "edit": true, "delete": false, "assign": true},
  "users": {"view": true, "add": false, "edit": false, "delete": false},
  "reports": {"view": true, "generate": true, "export": true},
  "clients": {"view": true, "add": false, "edit": false, "delete": false},
  "seo": {"basic": true, "comprehensive": true},
  "email": {"send": true, "templates": false}
}
```

#### WeTechForU Sales:
```json
{
  "leads": {"view": true, "add": true, "edit": true, "delete": false, "assign": false},
  "users": {"view": false, "add": false, "edit": false, "delete": false},
  "reports": {"view": true, "generate": false, "export": true},
  "clients": {"view": true, "add": false, "edit": false, "delete": false},
  "seo": {"basic": true, "comprehensive": false},
  "email": {"send": true, "templates": false}
}
```

#### Client Admin:
```json
{
  "leads": {"view": true, "add": false, "edit": false, "delete": false, "assign": false},
  "users": {"view": true, "add": true, "edit": true, "delete": false},
  "reports": {"view": true, "generate": false, "export": true},
  "clients": {"view": false, "add": false, "edit": false, "delete": false},
  "seo": {"basic": false, "comprehensive": false},
  "email": {"send": false, "templates": false}
}
```

#### Client User:
```json
{
  "leads": {"view": true, "add": false, "edit": false, "delete": false, "assign": false},
  "users": {"view": false, "add": false, "edit": false, "delete": false},
  "reports": {"view": true, "generate": false, "export": false},
  "clients": {"view": false, "add": false, "edit": false, "delete": false},
  "seo": {"basic": false, "comprehensive": false},
  "email": {"send": false, "templates": false}
}
```

---

## 🎨 **UI DESIGN**

### Navigation Update:
```
└── System Management ▼
    ├── Dashboard
    ├── Users ← NEW
    └── Settings
```

### Users Page Layout:
```
┌─────────────────────────────────────────────────────────────┐
│  👥 User Management                                         │
├─────────────────────────────────────────────────────────────┤
│  [+ Add User]  [🔍 Search...]  [Filter: All Users ▼]       │
├─────────────────────────────────────────────────────────────┤
│  ☑ │ Name        │ Email              │ Role    │ Type    │ Status  │ Actions │
│  ☐ │ John Doe    │ john@wetechforu... │ Dev     │ WTF     │ Active  │ [⚙️] [🔒] │
│  ☐ │ Jane Smith  │ jane@clinic.com    │ Admin   │ Client  │ Active  │ [⚙️] [🔒] │
│  ☐ │ Bob Wilson  │ bob@wetechforu...  │ Sales   │ WTF     │ Inactive│ [⚙️] [🔒] │
└─────────────────────────────────────────────────────────────┘
```

### Add/Edit User Modal:
```
┌─────────────────────────────────────────────────────────────┐
│  ➕ Add New User                                       [✕]   │
├─────────────────────────────────────────────────────────────┤
│  Basic Information                                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Username: [________________]                        │   │
│  │ Email:    [________________]                        │   │
│  │ Temp Pass:[________________] [🔄 Generate]          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  User Type & Role                                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ User Type: ◉ WeTechForU Team  ○ Client User        │   │
│  │                                                     │   │
│  │ [If WeTechForU]                                    │   │
│  │ Role: [Super Admin ▼]                              │   │
│  │   - Super Admin                                    │   │
│  │   - Developer                                      │   │
│  │   - Sales                                          │   │
│  │   - Manager                                        │   │
│  │   - Project Manager                                │   │
│  │                                                     │   │
│  │ [If Client]                                        │   │
│  │ Select Client: [Align Primary Care ▼]             │   │
│  │ Role: ◉ Client Admin  ○ Client User               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Permissions                                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📋 Leads Management                                 │   │
│  │  ☑ View Leads    ☑ Add Leads    ☑ Edit Leads      │   │
│  │  ☐ Delete Leads  ☑ Assign Leads                    │   │
│  │                                                     │   │
│  │ 👥 User Management                                  │   │
│  │  ☑ View Users    ☐ Add Users    ☐ Edit Users      │   │
│  │  ☐ Delete Users                                    │   │
│  │                                                     │   │
│  │ 📊 Reports                                          │   │
│  │  ☑ View Reports  ☐ Generate Reports ☑ Export      │   │
│  │                                                     │   │
│  │ 🏢 Client Management (Super Admin Only)            │   │
│  │  ☑ View Clients  ☑ Add Clients  ☑ Edit Clients    │   │
│  │  ☐ Delete Clients                                  │   │
│  │                                                     │   │
│  │ 🔍 SEO Features                                     │   │
│  │  ☑ Basic SEO     ☑ Comprehensive SEO               │   │
│  │                                                     │   │
│  │ 📧 Email Features                                   │   │
│  │  ☑ Send Emails   ☐ Manage Templates                │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Account Settings                                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ☑ Account Active                                   │   │
│  │ ☑ Must Change Password on First Login             │   │
│  │ ☐ Send Welcome Email                               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [Cancel]                                  [Create User]   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 **BACKEND API ENDPOINTS**

### User Management APIs:
```typescript
// Get all users (filtered by role)
GET /api/users
// super_admin: see all users
// client_admin: see only their client's users

// Get single user
GET /api/users/:id

// Create new user
POST /api/users
Body: {
  username, email, password, role, team_type, 
  client_id?, permissions, is_active, must_change_password
}

// Update user
PUT /api/users/:id
Body: { ...user fields, permissions }

// Delete user
DELETE /api/users/:id

// Toggle user active status
PATCH /api/users/:id/toggle-active

// Reset user password
POST /api/users/:id/reset-password
Body: { new_password }

// Get available clients (for client user creation)
GET /api/users/clients
// Returns list of clients for dropdown

// Get role-based default permissions
GET /api/users/permissions/defaults/:role
// Returns default permission set for role
```

---

## 🎯 **IMPLEMENTATION PLAN**

### Phase 1: Database (5 min)
1. Add permissions, is_active, last_login, must_change_password columns
2. Add indexes
3. Create default permission templates

### Phase 2: Backend APIs (15 min)
1. Create user management routes
2. Add permission validation middleware
3. Implement CRUD operations
4. Add role-based filtering

### Phase 3: Frontend Components (20 min)
1. Add "Users" to navigation
2. Create Users page
3. Create Add/Edit User modal
4. Create permission checkbox groups
5. Add user list table with actions

### Phase 4: Permission Enforcement (10 min)
1. Update all routes to check permissions
2. Add frontend permission checks
3. Hide/show UI elements based on permissions

### Phase 5: Testing (10 min)
1. Test super_admin can manage all users
2. Test client_admin can manage only their users
3. Test permissions work correctly
4. Deploy to Heroku

**Total Time**: ~60 minutes

---

## 🚀 **NEXT STEPS**

1. **Review this design** - Make sure it matches your vision
2. **Approve implementation** - Let me know if you want any changes
3. **I'll implement everything** - Database → Backend → Frontend
4. **Test together** - Verify everything works
5. **Deploy to production** - Push to Heroku

---

## 💡 **KEY FEATURES**

✅ **Role-Based Access Control (RBAC)**  
✅ **Granular Permissions**  
✅ **Multi-Tenant Support**  
✅ **WeTechForU vs Client Separation**  
✅ **User Activity Tracking**  
✅ **Temporary Passwords**  
✅ **Account Enable/Disable**  
✅ **Audit Trail**  

---

**Ready to implement? Say "yes" and I'll start building this comprehensive user management system!** 🚀

