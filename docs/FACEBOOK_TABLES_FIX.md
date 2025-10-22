# 🔧 Facebook Tables Fix - Quick Setup Guide

## 🎯 Problem
Facebook analytics showing all zeros because the `facebook_analytics` and `facebook_posts` tables don't exist in your database.

## ✅ Solution
Run the SQL script to create the missing tables.

---

## 📋 Method 1: Heroku CLI (Quickest)

```bash
cd "C:\Users\raman\OneDrive\Desktop\wetechfor u\main app\MarketingBy_web_app_react"
heroku pg:psql -a marketingby-wetechforu < backend/database/create_facebook_tables.sql
```

**OR run the migration script:**
```bash
heroku run node backend/database/create-facebook-tables.js -a marketingby-wetechforu
```

---

## 📋 Method 2: Heroku Dashboard

### Step 1: Access Database
1. Go to: https://dashboard.heroku.com/apps/marketingby-wetechforu
2. Click **"Resources"** tab
3. Click **"Heroku Postgres"**
4. Click **"Settings"** → **"View Credentials"**

### Step 2: Use Dataclips
1. Go to: https://data.heroku.com/dataclips
2. Click **"Create New Dataclip"**
3. Select your database: `marketingby-wetechforu`
4. **Copy and paste the SQL below:**

```sql
-- Create Facebook Analytics Tables

-- 1. Facebook Analytics Table (Page-level metrics)
CREATE TABLE IF NOT EXISTS facebook_analytics (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  page_views INTEGER DEFAULT 0,
  followers INTEGER DEFAULT 0,
  engagement INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  engagement_rate DECIMAL(5,2) DEFAULT 0,
  synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_facebook_analytics_client_id ON facebook_analytics(client_id);
CREATE INDEX IF NOT EXISTS idx_facebook_analytics_synced_at ON facebook_analytics(synced_at DESC);

-- 2. Facebook Posts Table (Post-level metrics)
CREATE TABLE IF NOT EXISTS facebook_posts (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  post_id VARCHAR(255) UNIQUE NOT NULL,
  message TEXT,
  created_time TIMESTAMP NOT NULL,
  post_type VARCHAR(50),
  post_impressions INTEGER DEFAULT 0,
  post_reach INTEGER DEFAULT 0,
  post_clicks INTEGER DEFAULT 0,
  post_engaged_users INTEGER DEFAULT 0,
  post_video_views INTEGER DEFAULT 0,
  reactions_like INTEGER DEFAULT 0,
  reactions_love INTEGER DEFAULT 0,
  reactions_haha INTEGER DEFAULT 0,
  reactions_wow INTEGER DEFAULT 0,
  reactions_sad INTEGER DEFAULT 0,
  reactions_angry INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_facebook_posts_client_id ON facebook_posts(client_id);
CREATE INDEX IF NOT EXISTS idx_facebook_posts_created_time ON facebook_posts(created_time DESC);
CREATE INDEX IF NOT EXISTS idx_facebook_posts_engagement ON facebook_posts(post_engaged_users DESC);
CREATE INDEX IF NOT EXISTS idx_facebook_posts_impressions ON facebook_posts(post_impressions DESC);
```

5. Click **"Run"** or **"Execute"**
6. You should see success messages

---

## 📋 Method 3: pgAdmin or Any PostgreSQL Client

Use the credentials from Heroku Dashboard:
- Host: `cduf3or326qj7m.cluster-czrs8kj4isg7.us-east-1.rds.amazonaws.com`
- Database: `dfkco05sfrm6d1`
- User: `u6jiliov4itlpd`
- Password: `p8cb462eac52ccb92d2602ce07f0e64f54fd267b1e250307a8d4276cbb73d8fab`
- Port: `5432`
- SSL Mode: `require`

Then run the SQL script from `backend/database/create_facebook_tables.sql`

---

## ✅ Verify Tables Created

Run this query to check:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'facebook%';
```

You should see:
- `facebook_analytics`
- `facebook_posts`

---

## 🎉 After Tables Are Created

1. **Refresh your application** at: https://marketingby.wetechforu.com
2. **Navigate to Social Media Analytics**
3. **Click "Sync Facebook Data"** button
4. **Wait 5-10 seconds** for the sync to complete
5. **Refresh the page** - You should now see your Facebook metrics!

---

## 🔍 Troubleshooting

### Still showing zeros after sync?

**Check the credentials:**
```sql
SELECT 
  client_id,
  service_type,
  credentials->>'page_id' as page_id,
  LENGTH(credentials->>'access_token') as token_length
FROM client_credentials 
WHERE service_type = 'facebook';
```

**Expected result:**
- `client_id`: 1 (or your client ID)
- `service_type`: facebook
- `page_id`: 744651835408507
- `token_length`: ~196 characters

**Check if data was stored:**
```sql
-- Check analytics data
SELECT * FROM facebook_analytics WHERE client_id = 1 ORDER BY synced_at DESC LIMIT 5;

-- Check posts data
SELECT 
  post_id, 
  message, 
  post_impressions, 
  post_reach,
  created_time 
FROM facebook_posts 
WHERE client_id = 1 
ORDER BY created_time DESC 
LIMIT 10;
```

---

## 📞 Need Help?

If you're still having issues:
1. Check backend logs: `heroku logs --tail -a marketingby-wetechforu`
2. Look for Facebook API errors
3. Verify your Facebook Page ID and Access Token are valid
4. Ensure your Facebook Access Token has the required permissions:
   - `pages_show_list`
   - `pages_read_engagement`
   - `pages_read_user_content`
   - `read_insights`

---

## 📁 Files Reference

- **SQL Script**: `backend/database/create_facebook_tables.sql`
- **Migration Runner**: `backend/database/create-facebook-tables.js`
- **Facebook Service**: `backend/src/services/facebookService.ts`
- **API Routes**: `backend/src/routes/api.ts`

---

**Last Updated**: October 21, 2025  
**Status**: Ready to deploy ✅

