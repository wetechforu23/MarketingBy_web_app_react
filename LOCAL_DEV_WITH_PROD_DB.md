# 🚀 Local Development with Heroku Production Database

## Overview
This guide shows you how to run your application locally while connected to the Heroku production database.

⚠️ **IMPORTANT WARNING:**
- You'll be working with LIVE production data
- Any changes will affect real users
- Use this carefully for testing and debugging only
- Consider creating a staging database for safer testing

---

## 📋 Prerequisites

1. Heroku CLI installed
2. Logged into Heroku
3. Access to `marketingby-wetechforu` app

---

## 🔑 Step 1: Get Heroku Database URL

### Option A: Via Heroku CLI (Recommended)

```bash
heroku config:get DATABASE_URL --app marketingby-wetechforu
```

This will output something like:
```
postgres://username:password@host:5432/database
```

### Option B: Via Heroku Dashboard

1. Go to: https://dashboard.heroku.com/apps/marketingby-wetechforu
2. Click **"Settings"** tab
3. Click **"Reveal Config Vars"**
4. Copy the `DATABASE_URL` value

---

## 🛠️ Step 2: Create Local Environment File

Create a file named `.env.local` in the `backend/` directory:

```bash
cd /Users/viraltarpara/Desktop/github_viral/MarketingBy_web_app_react/backend
```

Create `.env.local` with this content:

```env
# Production Heroku Database
DATABASE_URL=postgres://your-username:your-password@host:5432/database

# Session Secret (get from Heroku)
SESSION_SECRET=your-session-secret

# Encryption Key (get from Heroku)
ENCRYPTION_KEY=your-encryption-key

# Port for local backend
PORT=3000

# Node Environment
NODE_ENV=development

# Frontend URL
FRONTEND_URL=http://localhost:5173
```

**Get all values from Heroku:**
```bash
heroku config --app marketingby-wetechforu
```

---

## 🚀 Step 3: Run Backend with Production Database

### Method 1: Using .env.local file

```bash
cd /Users/viraltarpara/Desktop/github_viral/MarketingBy_web_app_react/backend

# Install dotenv-cli if not installed
npm install -g dotenv-cli

# Run with .env.local
dotenv -e .env.local npm start
```

### Method 2: Export environment variable directly

```bash
cd /Users/viraltarpara/Desktop/github_viral/MarketingBy_web_app_react/backend

# Export DATABASE_URL (replace with your actual URL)
export DATABASE_URL="postgres://username:password@host:5432/database"
export SESSION_SECRET="your-session-secret"
export ENCRYPTION_KEY="your-encryption-key"

# Start backend
npm start
```

### Method 3: One-liner command

```bash
cd /Users/viraltarpara/Desktop/github_viral/MarketingBy_web_app_react/backend

DATABASE_URL="postgres://..." SESSION_SECRET="..." npm start
```

---

## 🎨 Step 4: Run Frontend

Open a **new terminal window**:

```bash
cd /Users/viraltarpara/Desktop/github_viral/MarketingBy_web_app_react/frontend
npm run dev
```

Frontend will run on: http://localhost:5173

---

## ✅ Step 5: Verify Connection

1. Open http://localhost:5173
2. Try logging in
3. Check backend terminal for connection logs:

```
✅ Database connected successfully
🚀 Server running on port 3000
```

---

## 📊 Step 6: Access Production Data

Now you can:
- ✅ View real client data
- ✅ Test with actual Facebook integrations
- ✅ See real leads and analytics
- ✅ Debug production issues locally

---

## 🔒 Security Best Practices

### ✅ DO:
- Use `.env.local` file (it's in .gitignore)
- Test read-only operations first
- Take database backups before major changes
- Use this for debugging only
- Log out of production accounts when done

### ❌ DON'T:
- Don't commit `.env.local` to Git
- Don't share database credentials
- Don't delete production data
- Don't test destructive operations
- Don't leave connections open overnight

---

## 🗄️ Database Backup (Recommended)

Before making any changes, backup the production database:

```bash
# Create a backup
heroku pg:backups:capture --app marketingby-wetechforu

# Download the backup
heroku pg:backups:download --app marketingby-wetechforu
```

This creates a `latest.dump` file you can restore if needed.

---

## 🧪 Testing Workflow

```bash
# Terminal 1 - Backend with Prod DB
cd backend
export DATABASE_URL="postgres://..."
npm start

# Terminal 2 - Frontend
cd frontend
npm run dev

# Terminal 3 - Monitor Heroku Logs (optional)
heroku logs --tail --app marketingby-wetechforu
```

---

## 🔍 Database Queries

You can also connect directly to the database for queries:

```bash
# Connect to Heroku database
heroku pg:psql --app marketingby-wetechforu

# Run queries
SELECT * FROM clients LIMIT 5;
SELECT * FROM leads WHERE status = 'new' LIMIT 10;
\dt  # List all tables
\q   # Quit
```

---

## 🛡️ Alternative: Use Staging Database

For safer testing, consider creating a staging database:

```bash
# 1. Create a new Heroku app for staging
heroku create marketingby-staging --remote staging

# 2. Add Heroku Postgres
heroku addons:create heroku-postgresql:mini --app marketingby-staging

# 3. Copy production data to staging
heroku pg:copy marketingby-wetechforu::DATABASE_URL DATABASE_URL --app marketingby-staging

# 4. Use staging DB locally
heroku config:get DATABASE_URL --app marketingby-staging
```

Now use the staging database URL for local development!

---

## 🚨 Common Issues

### Issue 1: Connection Timeout
```
Error: connect ETIMEDOUT
```
**Solution:** Check if your IP is whitelisted, or try again (Heroku DB accepts all IPs by default)

### Issue 2: SSL Error
```
Error: self signed certificate
```
**Solution:** Add `?sslmode=require` to DATABASE_URL or update connection config:

```typescript
// backend/src/config/database.ts
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});
```

### Issue 3: Permission Denied
```
Error: permission denied for table clients
```
**Solution:** Make sure you're using the correct DATABASE_URL with admin credentials

---

## 📝 Quick Commands Reference

```bash
# Get DB URL
heroku config:get DATABASE_URL --app marketingby-wetechforu

# View all config vars
heroku config --app marketingby-wetechforu

# Connect to DB directly
heroku pg:psql --app marketingby-wetechforu

# Check DB info
heroku pg:info --app marketingby-wetechforu

# View recent logs
heroku logs --tail --app marketingby-wetechforu

# Create backup
heroku pg:backups:capture --app marketingby-wetechforu

# List backups
heroku pg:backups --app marketingby-wetechforu
```

---

## 🎯 Complete Setup Script

Save this as `start-local-with-prod.sh`:

```bash
#!/bin/bash

echo "🚀 Starting local development with production database..."

# Get DATABASE_URL from Heroku
export DATABASE_URL=$(heroku config:get DATABASE_URL --app marketingby-wetechforu)
export SESSION_SECRET=$(heroku config:get SESSION_SECRET --app marketingby-wetechforu)
export ENCRYPTION_KEY=$(heroku config:get ENCRYPTION_KEY --app marketingby-wetechforu)
export PORT=3000
export NODE_ENV=development

echo "✅ Environment variables loaded"
echo "📊 Using production database: Connected"

# Start backend
cd backend
npm start
```

Make it executable:
```bash
chmod +x start-local-with-prod.sh
./start-local-with-prod.sh
```

---

## 🎓 Summary

**To run locally with production database:**

1. **Get DATABASE_URL**: `heroku config:get DATABASE_URL --app marketingby-wetechforu`
2. **Export it**: `export DATABASE_URL="postgres://..."`
3. **Start Backend**: `cd backend && npm start`
4. **Start Frontend**: `cd frontend && npm run dev`
5. **Visit**: http://localhost:5173

**Always remember:** You're working with LIVE data! 🔴

---

**Last Updated:** October 22, 2025

