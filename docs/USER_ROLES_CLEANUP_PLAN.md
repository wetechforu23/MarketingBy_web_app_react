# 🎯 User Roles & Code Cleanup Implementation Plan

**Date**: October 11, 2025  
**Status**: ✅ Users Cleaned - Only info@wetechforu.com remains  
**Next Steps**: Implement new role structure + Clean up codebase

---

## ✅ **COMPLETED**

1. ✅ **Cleaned Users Table**
   - Deleted all users except: `info@wetechforu.com` (ID: 3)
   - Current role: `super_admin`
   - This user has full system access

---

## 📋 **YOUR REQUESTED ROLE STRUCTURE**

### **WeTechForU Users** (Your Team - Manage Leads):
- `super_admin` - info@wetechforu.com (YOU) - Full system access
- `wtfu_developer` - Developers (e.g., Sagar) who manage leads
- `wtfu_sales` - Sales team managing leads
- `wtfu_manager` - Managers
- `wtfu_project_manager` - Project managers

### **Client Users** (Separate Portal):
- `client_admin` - Client's admin (manages their portal only)
- `client_user` - Client's staff (limited access)

### **Key Requirements**:
1. **Lead Assignment**: Only assign to WeTechForU users (`wtfu_*` roles)
2. **Portal Separation**: Clients never see WeTechForU data
3. **User Addition**:
   - Super admin can add both WeTechForU users AND client users
   - Client admins can only add client users to their own portal

---

## 🔧 **IMPLEMENTATION STEPS** (To Do)

### **Phase 1: Database Schema Updates**

```sql
-- 1. Update users table to support new roles
ALTER TABLE users ADD COLUMN IF NOT EXISTS team_type VARCHAR(50);
-- team_type values: 'wetechforu' or 'client'

-- 2. Update existing super_admin
UPDATE users SET team_type = 'wetechforu' WHERE id = 3;

-- 3. Add role column check constraint
ALTER TABLE users ADD CONSTRAINT check_role 
CHECK (role IN (
  'super_admin',
  'wtfu_developer', 'wtfu_sales', 'wtfu_manager', 'wtfu_project_manager',
  'client_admin', 'client_user'
));

-- 4. Create index for performance
CREATE INDEX idx_users_team_type ON users(team_type);
CREATE INDEX idx_users_role ON users(role);
```

### **Phase 2: Backend API Updates**

**File**: `backend/src/routes/api.ts`

```typescript
// Update GET /users endpoint to filter by team_type
app.get('/users', requireAuth, async (req, res) => {
  try {
    const user = req.session.user;
    
    let query = 'SELECT id, username, email, role, team_type, client_id FROM users WHERE 1=1';
    const params: any[] = [];
    
    // Filter based on user role
    if (user.role === 'super_admin') {
      // Super admin sees all users
      query += ' ORDER BY team_type, role, username';
    } else if (user.role.startsWith('wtfu_')) {
      // WeTechForU users see only WeTechForU team
      query += ' AND team_type = $1 ORDER BY role, username';
      params.push('wetechforu');
    } else if (user.role.startsWith('client_')) {
      // Client users see only their own client users
      query += ' AND client_id = $1 ORDER BY role, username';
      params.push(user.client_id);
    }
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});
```

**File**: `backend/src/routes/leadAssignment.ts`

```typescript
// Update to only show WeTechForU users for assignment
app.get('/api/lead-assignment/team-members', requireAuth, async (req, res) => {
  try {
    // Only return WeTechForU team members (no client users)
    const result = await pool.query(`
      SELECT id, username, email, role 
      FROM users 
      WHERE team_type = 'wetechforu' 
      AND role != 'super_admin'
      ORDER BY username
    `);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching team members:', err);
    res.status(500).json({ error: 'Failed to fetch team members' });
  }
});
```

### **Phase 3: Frontend Updates**

**File**: `frontend/src/pages/Leads.tsx`

Update the `fetchTeamMembers` function:

```typescript
// Fetch only WeTechForU team members for assignment
const fetchTeamMembers = async () => {
  try {
    const response = await http.get('/lead-assignment/team-members');
    setTeamMembers(response.data || []);
    console.log(`✅ Loaded ${response.data.length} WeTechForU team members`);
  } catch (err) {
    console.error('Failed to fetch team members:', err);
  }
};
```

Update assignment dropdown display:

```tsx
<option key={user.id} value={user.id}>
  {lead.assigned_to === user.id ? '✅ ' : '👤 '}
  {user.username} ({getRoleLabel(user.role)})
</option>
```

Add role label helper:

```typescript
const getRoleLabel = (role: string): string => {
  const labels: { [key: string]: string } = {
    'super_admin': 'Super Admin',
    'wtfu_developer': 'Developer',
    'wtfu_sales': 'Sales',
    'wtfu_manager': 'Manager',
    'wtfu_project_manager': 'Project Manager',
    'client_admin': 'Client Admin',
    'client_user': 'Client User'
  };
  return labels[role] || role;
};
```

---

## 🧹 **CODE CLEANUP TASKS**

### **1. Remove Duplicate Folders**

```bash
# Delete duplicate backend and frontend folders
rm -rf "backend 2"
rm -rf "frontend 2"
rm -rf "frontend 3"
rm -rf "docs 2"
rm -rf node_modules  # Root node_modules (not needed)
```

### **2. Remove Unused Server Files**

```bash
cd backend/src
# Keep only server.ts, remove all variants
rm -f server-clean.ts server-real.ts server-real-backup.ts server-simple.ts server-with-seo.ts

cd ../../backend/dist
# Remove compiled variants
rm -f server-clean.* server-real.* server-real-backup.* server-simple.* server-with-seo.*
```

### **3. Remove Unused Test/Migration Scripts**

```bash
# From project root
rm -f add-email-credentials.js
rm -f add-missing-keys.js
rm -f check-stripe-prices.js
rm -f fix-stripe-default-prices.js
rm -f migrate-keys-to-heroku.js
rm -f setup-stripe-products.js
rm -f test-custom-domain.sh
rm -f test-e2e-flow.js
rm -f test-stripe-direct.js
rm -f sync-heroku-schema.sql
```

### **4. Organize Documentation**

```bash
# Create docs folder if it doesn't exist
mkdir -p docs

# Move all .md files to docs/ (except README.md)
mv API_DATABASE_FLOW_DIAGRAM.md docs/
mv ASSIGNMENT_UI_PATCH.tsx docs/
mv AZURE_EMAIL_SETUP_COMPLETE.md docs/
mv CUSTOM_DOMAIN_SETUP.md docs/
mv DATABASE_SCHEMA_SYNC_REPORT.md docs/
mv DEPLOYMENT_COMPLETE.md docs/
mv DEPLOYMENT_GUIDE.md docs/
mv DNS_SETUP_INSTRUCTIONS.md docs/
mv ENCRYPTED_CREDENTIALS_REFERENCE.md docs/
mv HOME_PAGE_UPDATES.md docs/
mv LEAD_ASSIGNMENT_COMPLETE.md docs/
mv LEAD_ASSIGNMENT_STATUS.md docs/
mv LEAD_ASSIGNMENT_UI_GUIDE.md docs/
mv LEGAL_PAGES_COMPLETE.md docs/
mv LOGO_AND_BUTTON_FIXES.md docs/
mv NETLIFY_DEPLOYMENT_GUIDE.md docs/
mv SEO_TESTING_GUIDE.md docs/
mv SESSION_COMPLETE_SUMMARY.md docs/
mv SIGNUP_FINAL_STATUS.md docs/
mv SIGNUP_FIX.md docs/
mv SIGNUP_FIXES.md docs/
mv STRIPE_COMPLETE_SUCCESS.md docs/
mv STRIPE_PRODUCTS_CONFIGURATION.md docs/
mv SUBSCRIPTION_DEPLOYMENT_GUIDE.md docs/
mv USER_ROLES_CLEANUP_PLAN.md docs/
```

### **5. Remove Unnecessary Files**

```bash
# Remove duplicate cookie files
rm -f cookies.txt
rm -f backend/cookies2.txt
rm -f backend/cookies3.txt
rm -f backend/test_cookies.txt

# Remove log files (they regenerate)
rm -f backend/backend.log
rm -f frontend/frontend.log

# Remove netlify config (not using Netlify anymore)
rm -f frontend/_redirects
rm -f frontend/netlify.toml

# Remove JSON key file (should be in encrypted DB only)
# IMPORTANT: Make sure it's backed up securely first!
# rm -f wetechforu-marketing-platform-10460ab2b357.json
```

### **6. Clean Backend Dist Folder**

```bash
cd backend
# Remove everything except server.* and essential folders
find dist -type f ! -name 'server.js' ! -name 'server.d.ts' ! -name 'server.js.map' ! -name 'server.d.ts.map' -path '*/dist/*' ! -path '*/dist/config/*' ! -path '*/dist/middleware/*' ! -path '*/dist/routes/*' ! -path '*/dist/services/*' ! -path '*/dist/types/*' ! -path '*/dist/public/*' -delete
```

---

## 📁 **FINAL FOLDER STRUCTURE**

```
MarketingBy_web_app_react/
├── backend/
│   ├── database/           # SQL migrations
│   ├── dist/               # Compiled TypeScript
│   │   ├── config/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── types/
│   │   ├── public/         # Frontend build
│   │   └── server.js       # Main server
│   ├── node_modules/
│   ├── src/
│   │   ├── config/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── types/
│   │   └── server.ts       # Main server source
│   ├── env.example
│   ├── package.json
│   ├── setup-database.sql
│   └── tsconfig.json
├── docs/                   # All documentation
│   ├── API_DATABASE_FLOW_DIAGRAM.md
│   ├── DEPLOYMENT_GUIDE.md
│   ├── LEAD_ASSIGNMENT_COMPLETE.md
│   ├── USER_ROLES_CLEANUP_PLAN.md
│   └── ... (all other .md files)
├── frontend/
│   ├── dist/               # Vite build output
│   ├── node_modules/
│   ├── public/
│   │   ├── logo.png
│   │   └── wetechforu_Ai_Marketing_logo_transparent.png
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── layouts/
│   │   ├── pages/
│   │   ├── router/
│   │   ├── theme/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
├── app.json                # Heroku config
├── deploy.sh               # Deployment script
├── package.json            # Root package.json
├── Procfile                # Heroku Procfile
└── README.md               # Project README
```

---

## 🚀 **TESTING CHECKLIST**

After implementing changes:

1. ✅ **Test Login**: info@wetechforu.com should login as super_admin
2. ✅ **Test Leads Page**: Assignment dropdown shows only WeTechForU users
3. ✅ **Add Test Users**: Create users with different roles:
   - Add a `wtfu_developer` user
   - Add a `client_admin` user with `client_id`
   - Add a `client_user` user
4. ✅ **Test Lead Assignment**: Should only show wtfu_* users in dropdown
5. ✅ **Test User Management**: Super admin can add both types of users
6. ✅ **Test Client Portal**: Client admin sees only their users
7. ✅ **Verify Cleanup**: Check no duplicate folders exist
8. ✅ **Check Documentation**: All .md files in docs/ folder

---

## ⚠️ **IMPORTANT NOTES**

1. **Backup First**: Before making database changes, backup the Heroku database
2. **Test Locally**: Test all changes locally before deploying to Heroku
3. **Migration Script**: Create a proper SQL migration script for the role changes
4. **User Addition UI**: Will need to create/update user management pages for adding new users
5. **Permissions**: Add middleware to check `team_type` and `role` for all routes

---

## 📝 **NEXT SESSION TASKS**

1. Create database migration script
2. Update backend APIs for new role structure
3. Update frontend to use new role labels
4. Clean up duplicate folders
5. Move documentation to docs/
6. Test everything thoroughly
7. Deploy to Heroku
8. Update master document (API_DATABASE_FLOW_DIAGRAM.md)

---

**This plan provides a complete roadmap for implementing your role structure and cleaning up the codebase safely!**

