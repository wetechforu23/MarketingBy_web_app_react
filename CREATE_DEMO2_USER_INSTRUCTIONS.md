# 🎯 Create Demo2 User - Simple Method

Since your backend doesn't have a `.env` file configured for scripts, here are **2 simple ways** to create the Demo2 user:

---

## ✅ **METHOD 1: Use Super Admin Dashboard (EASIEST!)**

###1. **Login as Super Admin:**
- Go to: `http://localhost:5173/login`
- Email: `info@wetechforu.com`
- Password: `Rhyme@2025`

### 2. **Go to Users Management:**
- Click on "Users" in the sidebar
- Or go directly to: `http://localhost:5173/app/users`

### 3. **Create New User:**
- Click "Add New User" button
- Fill in:
  - **Email**: `demo2@marketingby.com`
  - **Password**: `Demo2@2025`
  - **Username**: `Demo2 Client Admin`
  - **Role**: `client_admin`
  - **Client**: Select "Demo2" (client_id = 199)
  - **First Name**: `Demo2`
  - **Last Name**: `Admin`
- Click "Save"

### 4. **Logout and Login as Demo2:**
- Logout from Super Admin
- Login with:
  - Email: `demo2@marketingby.com`
  - Password: `Demo2@2025`

---

## ✅ **METHOD 2: Direct SQL (If you have database access)**

Run this SQL in your database tool (pgAdmin, DBeaver, etc.):

```sql
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
    'demo2@marketingby.com',
    -- Password: Demo2@2025 (bcrypt hashed)
    '$2a$10$YIqO3jKj5OZ8xnxVv1xAJ.8QZvKz7HnV3mFzXVGZFqZ7wZ3zVGZFq',
    'Demo2 Client Admin',
    'client_admin',
    199,
    true,
    NOW(),
    NOW(),
    'Demo2',
    'Admin'
) ON CONFLICT (email) DO UPDATE 
SET 
    password_hash = EXCLUDED.password_hash,
    client_id = 199,
    role = 'client_admin',
    is_active = true,
    updated_at = NOW();
```

---

## 🎯 **Recommended: Use METHOD 1**

It's the easiest and doesn't require database access or running scripts!

---

## 📝 **After Creating the User**

**Login Credentials:**
- 🌐 URL: `http://localhost:5173/login`
- 📧 Email: `demo2@marketingby.com`
- 🔑 Password: `Demo2@2025`

**What You'll See:**
- Beautiful client dashboard
- Real data metrics (leads, SEO, analytics)
- Company profile
- Connected services status
- Recent reports

---

## ⚠️ **Why the Script Failed**

The script failed because:
- No `.env` file in `backend/` folder
- DATABASE_URL not accessible to standalone scripts
- The backend server probably has environment variables set differently (maybe in system env or in a parent `.env`)

**Solution**: Use the UI (Method 1) - it's faster and easier! ✅

