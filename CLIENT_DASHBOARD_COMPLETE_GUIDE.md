# 🎯 Client Dashboard - Complete Setup Guide

**Last Updated:** October 29, 2025  
**Version:** 2.0 - Rebuilt with Real Data Only

---

## 📋 Overview

This guide covers the **complete client dashboard system** that displays real data from your database. No mock data is used.

### Features
- ✅ Real-time client metrics (leads, SEO, analytics, social media)
- ✅ Company profile display
- ✅ Connected services status
- ✅ Recent reports
- ✅ Beautiful, modern UI
- ✅ Comprehensive error handling
- ✅ Detailed logging for debugging

---

## 🏗️ Architecture

### Frontend
- **Component:** `frontend/src/pages/ClientDashboardNew.tsx`
- **Router:** `frontend/src/router/index.tsx` & `frontend/src/components/SmartDashboard.tsx`
- **API Client:** Uses `http` from `frontend/src/api/http.ts`

### Backend
- **Route:** `backend/src/routes/clientDashboard.ts`
- **Endpoint:** `GET /api/client-dashboard/overview`
- **Auth:** Requires `requireAuth` middleware (session-based)

### Database Tables Used
- `clients` - Client information
- `leads` - Lead statistics
- `seo_audits` - SEO scores
- `analytics_data` - Website traffic
- `facebook_page_metrics` - Social media metrics
- `client_credentials` - Connected services
- `lead_seo_reports` - Reports
- `blogs` - Blog posts
- `social_media_content` - Content library

---

## 🚀 Setup Instructions

### Step 1: Create a Client (if not exists)

1. Log in as **Super Admin** (info@wetechforu.com)
2. Go to **Client Management** → **Add New Client**
3. Fill in client details:
   ```
   Client Name: Demo2
   Email: demo2@example.com
   Website: https://demo2.com
   Industry: Healthcare
   ```
4. Note the **Client ID** (e.g., 199)

### Step 2: Create a User for the Client

**Option A: Via Super Admin Dashboard (RECOMMENDED)**

1. Log in as **Super Admin**
2. Go to **Users** → **Add New User**
3. Fill in user details:
   ```
   Email: demo2@abc.com
   Password: Demo@2025
   Role: client_admin
   Assigned Client: Demo2 (ID: 199)
   First Name: Demo2
   Last Name: Admin
   Status: Active
   ```
4. Click **Save**

**Option B: Via SQL Script**

Run this in your database:
```sql
INSERT INTO users (email, password_hash, username, role, client_id, is_active, created_at, updated_at, first_name, last_name)
VALUES (
  'demo2@abc.com', 
  '$2a$10$rqGX4BxZK7XhF.yvGZJ8D.CQhL6TqF3vqG5J8D.CQhL6TqF3vqG5J8D.a', 
  'Demo2 Client Admin', 
  'client_admin', 
  199,  -- Demo2's client ID
  true, 
  NOW(), 
  NOW(), 
  'Demo2', 
  'Admin'
);
```

### Step 3: Verify Setup

Run the verification script:
```bash
cd backend
node check_demo2_user.js
```

This will show:
- ✅ Demo2 client details
- ✅ User details
- ✅ Correct client assignment
- ⚠️ Warnings if anything is misconfigured

### Step 4: Test Login

1. Log out from Super Admin
2. Go to login page
3. Enter credentials:
   ```
   Email: demo2@abc.com
   Password: Demo@2025
   ```
4. You should see the **Client Dashboard** with real data!

---

## 🔍 Troubleshooting

### Issue 1: "Dashboard Data Not Available"

**Symptoms:**
- Yellow warning box appears
- "Your client account is not fully set up" message

**Causes & Solutions:**

1. **User not assigned to correct client**
   ```bash
   # Check assignment
   cd backend
   node check_demo2_user.js
   ```
   
   **Fix:** Edit user in Super Admin dashboard and select correct client

2. **User has no client_id in session**
   - Check backend logs for "Client ID not found in session"
   - **Fix:** Log out and log back in

3. **Client doesn't exist in database**
   ```sql
   SELECT id, client_name FROM clients WHERE id = 199;
   ```
   - **Fix:** Create the client first

### Issue 2: "User not found" during login

**Cause:** User doesn't exist in database

**Solution:**
```bash
cd backend
node create_demo2_user.js
```

### Issue 3: Wrong Client Data Showing

**Symptom:** Dashboard shows data for different client (e.g., Client 201 instead of Demo2)

**Cause:** User is assigned to wrong client_id

**Solution:**
1. Log in as Super Admin
2. Go to **Users** → Find the demo2 user
3. **Edit** → Change **Assigned Client** to "Demo2"
4. **Save**
5. Log out and log back in as demo2 user

### Issue 4: Session Not Persisting

**Symptoms:**
- Dashboard loads but immediately shows error
- Session expires quickly

**Check:**
```javascript
// In browser console
console.log(document.cookie);
// Should show: marketingby.sid=...
```

**Solution:**
- Clear browser cookies
- Log out and log in again
- Check that backend session middleware is configured correctly

---

## 📊 Understanding the Dashboard

### Key Metrics Cards

1. **Total Leads**
   - Counts from `leads` table
   - Shows: Total, This Month, Converted

2. **SEO Score**
   - Latest from `seo_audits` table
   - Shows: Overall score /100

3. **Website Visitors**
   - From `analytics_data` table
   - Shows: Total users, page views (last 30 days)

4. **Facebook Followers**
   - From `facebook_page_metrics` table
   - Shows: Latest follower count, engagement

### Company Profile
- Displays client information from `clients` table
- Shows: Name, Industry, Email, Phone, Website

### Connected Services
- Checks `client_credentials` table
- Shows status for:
  - Google Analytics
  - Facebook
  - Google Search Console
  - Google Tag Manager

### Recent Reports
- Lists latest 5 reports from `lead_seo_reports` table
- Shows: Report name, type, date generated

---

## 🔧 Development

### Adding New Metrics

1. **Backend** (`backend/src/routes/clientDashboard.ts`):
   ```typescript
   // Add new query
   const newMetricResult = await pool.query(
     `SELECT * FROM your_table WHERE client_id = $1`,
     [clientId]
   );
   
   // Add to response
   dashboardData.metrics.newMetric = newMetricResult.rows[0];
   ```

2. **Frontend** (`frontend/src/pages/ClientDashboardNew.tsx`):
   ```typescript
   // Update interface
   interface DashboardData {
     metrics: {
       newMetric: { /* ... */ };
     };
   }
   
   // Add to UI
   <div>
     <h3>New Metric</h3>
     <p>{data.metrics.newMetric.value}</p>
   </div>
   ```

### Debugging Tips

**Frontend Logs:**
Open browser console to see:
```
📊 [FRONTEND] Fetching REAL dashboard data...
✅ [FRONTEND] Dashboard data received successfully!
📦 [FRONTEND] Response data: {...}
```

**Backend Logs:**
Check terminal/console for:
```
📊 [BACKEND] Client Dashboard Overview Request
🔍 [BACKEND] Session Data: {...}
✅ [BACKEND] Dashboard overview compiled successfully!
```

**Database Queries:**
Enable query logging in backend if needed:
```typescript
pool.on('query', (query) => {
  console.log('SQL:', query.text, query.values);
});
```

---

## 📝 Files Modified

### Frontend
- ✅ `frontend/src/pages/ClientDashboardNew.tsx` - Main dashboard component
- ✅ `frontend/src/router/index.tsx` - Routing configuration
- ✅ `frontend/src/components/SmartDashboard.tsx` - Role-based router

### Backend
- ✅ `backend/src/routes/clientDashboard.ts` - API endpoints (NEW)
- ✅ `backend/src/server.ts` - Added route registration
- ✅ `backend/src/routes/auth.ts` - Sets clientId in session

### Scripts
- ✅ `backend/check_demo2_user.js` - Verification script (NEW)
- ✅ `backend/create_demo2_user.js` - User creation script (NEW)
- ✅ `backend/check_and_fix_demo2_user.sql` - SQL helper (NEW)

---

## ✅ Testing Checklist

- [ ] Can create client via Super Admin dashboard
- [ ] Can create user and assign to client
- [ ] User can log in with correct credentials
- [ ] Dashboard loads without errors
- [ ] All metric cards display real data
- [ ] Company profile shows correct information
- [ ] Connected services show accurate status
- [ ] Reports section displays (or shows "No reports" if empty)
- [ ] Logout works correctly
- [ ] Can log back in after logout

---

## 🆘 Quick Fixes

### Reset Everything
```bash
# 1. Delete the user
psql $DATABASE_URL -c "DELETE FROM users WHERE email = 'demo2@abc.com';"

# 2. Recreate user
cd backend
node create_demo2_user.js

# 3. Verify
node check_demo2_user.js

# 4. Clear browser data
# In browser: Settings → Clear browsing data → Cookies

# 5. Try login again
```

### Force Correct Client Assignment
```sql
-- Run this if user is assigned to wrong client
UPDATE users 
SET client_id = 199  -- Demo2's client ID
WHERE email = 'demo2@abc.com';
```

---

## 📞 Support

If you continue to experience issues:

1. **Check backend logs** - Look for errors with [BACKEND] prefix
2. **Check frontend console** - Look for errors with [FRONTEND] prefix
3. **Run verification script** - `node check_demo2_user.js`
4. **Verify database** - Ensure client and user exist
5. **Clear sessions** - Log out, clear cookies, log in again

---

**End of Guide**

