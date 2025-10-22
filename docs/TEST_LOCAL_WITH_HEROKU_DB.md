# 🧪 Test Locally with Heroku PostgreSQL Database

**Goal**: Run your local backend code with production Heroku database

---

## 📋 **Step-by-Step Instructions**

### **Step 1: Get Heroku Database URL**

1. Go to: https://dashboard.heroku.com/apps/marketingby-wetechforu
2. Click **"Resources"** tab
3. Click **"Heroku Postgres"** addon
4. Click **"Settings"** → **"View Credentials"**
5. Copy the **"URI"** value

**Example URI**:
```
postgres://u8abc:p456def@ec2-54-123-456-78.compute-1.amazonaws.com:5432/d9xyz
```

---

### **Step 2: Update Local .env File**

Open `backend/.env` and update the `DATABASE_URL`:

```env
# OLD (local database)
DATABASE_URL=postgresql://postgres:password@localhost:5432/health_clinic_marketing

# NEW (Heroku database) - Replace with your actual Heroku URI
DATABASE_URL=postgres://u8abc:p456def@ec2-54-123-456-78.compute-1.amazonaws.com:5432/d9xyz?ssl=true
```

**⚠️ Important**: Add `?ssl=true` at the end if not already there!

---

### **Step 3: Run Database Migration**

This adds the new columns to Heroku database:

```bash
cd backend

# Install pg library if not already installed
npm install

# Run migration
node -e "
const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const sql = fs.readFileSync('database/update_facebook_posts_metrics.sql', 'utf8');

pool.query(sql)
  .then(() => {
    console.log('✅ Migration successful!');
    pool.end();
  })
  .catch(err => {
    console.error('❌ Migration failed:', err.message);
    pool.end();
  });
"
```

**Or use this simpler command**:

```bash
# From project root
node backend/database/run-migration.js
```

---

### **Step 4: Start Local Backend**

```bash
cd backend
npm run dev
```

**Expected Output**:
```
🚀 Server running on port 3001
✅ Connected to Heroku PostgreSQL database
```

---

### **Step 5: Test the New Features**

Now you can test with real production data:

#### **Test Page Views**
```bash
# Sync Facebook data
curl -X POST http://localhost:3001/api/facebook/sync/1

# Check page views
curl http://localhost:3001/api/facebook/overview/1
```

#### **Test Top Performing Posts**
```bash
curl http://localhost:3001/api/facebook/analytics/top-posts/1?limit=5
```

#### **Test Recent Posts**
```bash
curl http://localhost:3001/api/facebook/posts/1?limit=10
```

---

### **Step 6: Verify Data in Database**

You can check if the migration worked:

```sql
-- Check if new columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'facebook_posts' 
AND column_name IN ('post_reach', 'post_clicks', 'post_video_views');

-- Should return:
-- post_reach       | integer
-- post_clicks      | integer  
-- post_video_views | integer
```

---

## 🔄 **Frontend Testing**

With backend running on `localhost:3001` connected to Heroku database:

1. Start frontend:
   ```bash
   cd frontend
   npm run dev
   ```

2. Open: http://localhost:5173

3. Go to Client Management → Social Media tab

4. Click **"Sync Facebook Data"**

5. Check if:
   - ✅ Page views show numbers (not 0)
   - ✅ Posts have view counts
   - ✅ Top posts appear with metrics
   - ✅ Recent posts show full data

---

## ⚠️ **Important Notes**

### **SSL Connection**
Heroku requires SSL. If you get connection errors, make sure:

```env
# In .env file
DATABASE_URL=postgres://...?ssl=true

# OR add sslmode
DATABASE_URL=postgres://...?sslmode=require
```

### **Safety**
✅ Testing on production database is safe (only reading data)  
✅ Migration only **adds** columns (doesn't delete anything)  
⚠️ Be careful with UPDATE/DELETE operations

### **Revert to Local Database**
When done testing, change `.env` back to:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/health_clinic_marketing
```

---

## 🐛 **Troubleshooting**

### **Error: "no pg_hba.conf entry for host"**
**Solution**: Add `?ssl=true` to DATABASE_URL

### **Error: "column already exists"**
**Solution**: Migration already ran. You're good to go!

### **Error: "permission denied"**
**Solution**: Your Heroku database user might not have permissions. Check credentials.

### **Connection timeout**
**Solution**: Check if Heroku database URL is correct and accessible.

---

## ✅ **Success Checklist**

- [ ] Got Heroku database URL from dashboard
- [ ] Updated `backend/.env` with Heroku URL
- [ ] Added `?ssl=true` to the URL
- [ ] Ran database migration successfully
- [ ] Started local backend (no connection errors)
- [ ] Tested API endpoints with curl
- [ ] Synced Facebook data
- [ ] Verified page views show numbers
- [ ] Verified posts have metrics (views, reach, clicks)

---

**Once testing is complete, let me know and we can deploy to Heroku!** 🚀

