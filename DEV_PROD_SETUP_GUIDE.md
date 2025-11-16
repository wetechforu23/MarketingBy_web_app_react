# 🚀 Dev/Prod Setup Guide - Cost-Effective Solution

## 💰 **Cost Breakdown (Best Option)**

### **Option 1: Free Dev + Paid Prod (RECOMMENDED)**
- **Dev Server**: Free Heroku dyno (hobby) = **$0/month**
- **Dev Database**: Free PostgreSQL (hobby-dev) = **$0/month**
- **Prod Server**: Basic dyno = **$7/month** (or free if you can use hobby)
- **Prod Database**: Essential-0 PostgreSQL = **$5/month**
- **Total**: **$5-12/month** (same or slightly more than current)

### **Option 2: Both Paid (More Reliable)**
- **Dev Server**: Basic dyno = **$7/month**
- **Dev Database**: Essential-0 PostgreSQL = **$5/month**
- **Prod Server**: Basic dyno = **$7/month**
- **Prod Database**: Essential-0 PostgreSQL = **$5/month**
- **Total**: **$24/month**

### **Option 3: Use Heroku Pipelines (FREE Feature)**
- **Heroku Pipelines**: FREE (organizes dev/staging/prod)
- **Dev App**: Can use free tier = **$0/month**
- **Prod App**: Keep current = **$5/month**
- **Total**: **$5/month** (same as now!)

---

## ✅ **RECOMMENDED: Option 1 (Free Dev + Paid Prod)**

### **Why This is Best:**
1. ✅ **Minimal Cost**: Only pay for production ($5/month)
2. ✅ **Dev Testing**: Free tier is perfect for development
3. ✅ **Separate Environments**: Clean separation of dev/prod
4. ✅ **Heroku Pipelines**: FREE feature to manage both apps

---

## 📋 **Step-by-Step Setup**

### **Step 1: Create Dev Heroku App (FREE)**

```bash
# Create dev app (free tier)
heroku create marketingby-wetechforu-dev

# Add free PostgreSQL database
heroku addons:create heroku-postgresql:hobby-dev --app marketingby-wetechforu-dev

# Set environment to development
heroku config:set NODE_ENV=development --app marketingby-wetechforu-dev
heroku config:set PORT=3001 --app marketingby-wetechforu-dev
```

### **Step 2: Create Heroku Pipeline (FREE)**

```bash
# Create pipeline
heroku pipelines:create marketingby-wetechforu \
  --stage production \
  --app marketingby-wetechforu-b67c6bd0bf6b

# Add dev app to pipeline
heroku pipelines:add marketingby-wetechforu \
  --stage development \
  --app marketingby-wetechforu-dev
```

### **Step 3: Set Up Git Branches**

```bash
# Create dev branch
git checkout -b dev

# Push dev branch to GitHub
git push origin dev

# Set up Heroku remotes
heroku git:remote -a marketingby-wetechforu-dev -r dev
heroku git:remote -a marketingby-wetechforu-b67c6bd0bf6b -r prod
```

### **Step 4: Configure Environment Variables**

```bash
# Copy production config to dev (then modify as needed)
heroku config --app marketingby-wetechforu-b67c6bd0bf6b > prod-config.txt

# Set dev-specific configs
heroku config:set NODE_ENV=development --app marketingby-wetechforu-dev
heroku config:set DATABASE_URL=$(heroku config:get DATABASE_URL --app marketingby-wetechforu-dev) --app marketingby-wetechforu-dev
```

---

## 🔄 **Workflow: Dev → Prod**

### **Daily Development:**

```bash
# Work on dev branch
git checkout dev
git pull origin dev

# Make changes...
git add .
git commit -m "feat: New feature"
git push origin dev

# Deploy to dev server
./deploy-dev.sh
```

### **Testing on Dev:**

1. Test on: `https://marketingby-wetechforu-dev.herokuapp.com`
2. Check logs: `heroku logs --tail --app marketingby-wetechforu-dev`
3. Test database changes
4. Verify all features work

### **Deploy to Production (After Testing):**

```bash
# Merge dev to main
git checkout main
git pull origin main
git merge dev
git push origin main

# Deploy to production
./deploy-prod.sh
```

---

## 📝 **Deployment Scripts**

### **`deploy-dev.sh`** - Deploy to Dev Server
```bash
#!/bin/bash
echo "🚀 Deploying to DEV server..."
git push dev dev:main
echo "✅ Dev deployment complete!"
echo "🌐 Dev URL: https://marketingby-wetechforu-dev.herokuapp.com"
```

### **`deploy-prod.sh`** - Deploy to Prod Server
```bash
#!/bin/bash
echo "🚀 Deploying to PRODUCTION server..."
git push prod main:main
echo "✅ Production deployment complete!"
echo "🌐 Prod URL: https://marketingby.wetechforu.com"
```

---

## 🗄️ **Database Strategy**

### **Option A: Separate Databases (Recommended)**
- **Dev DB**: Free hobby-dev (10,000 rows max) - Perfect for testing
- **Prod DB**: Essential-0 ($5/month) - Full production data
- **Benefit**: Clean separation, no risk to prod data

### **Option B: Shared Database (NOT Recommended)**
- Use same database for dev/prod
- **Risk**: Dev changes can break production
- **Cost**: Same ($5/month)
- **Not recommended** for safety

---

## 🔐 **Environment Variables**

### **Dev Environment:**
```bash
NODE_ENV=development
DATABASE_URL=<dev-database-url>
BACKEND_URL=https://marketingby-wetechforu-dev.herokuapp.com
FRONTEND_URL=https://marketingby.wetechforu.com
```

### **Prod Environment:**
```bash
NODE_ENV=production
DATABASE_URL=<prod-database-url>
BACKEND_URL=https://marketingby-wetechforu-b67c6bd0bf6b.herokuapp.com
FRONTEND_URL=https://marketingby.wetechforu.com
```

---

## 📊 **Heroku Pipeline Dashboard**

Once set up, you can:
1. View both apps in Heroku Dashboard → Pipelines
2. Promote from dev to prod with one click
3. See deployment status for both environments
4. Manage releases and rollbacks

---

## 💡 **Cost Optimization Tips**

1. **Use Free Tier for Dev**: Hobby dyno + hobby-dev database = $0
2. **Scale Down When Not Testing**: Pause dev dyno when not in use
3. **Use Heroku Pipelines**: FREE feature, no extra cost
4. **Monitor Usage**: Check Heroku dashboard for actual costs

---

## ⚠️ **Important Notes**

1. **Free Tier Limitations:**
   - Dev app sleeps after 30 minutes of inactivity
   - First request after sleep takes ~10 seconds
   - Perfect for development/testing

2. **Database Limits (Free Tier):**
   - 10,000 rows max
   - 20 connections max
   - 1GB storage
   - Perfect for dev/testing

3. **Production:**
   - Keep current setup (Essential-0 PostgreSQL)
   - Can upgrade dyno if needed ($7/month for Basic)

---

## 🚀 **Quick Start Commands**

```bash
# 1. Create dev app
heroku create marketingby-wetechforu-dev

# 2. Add free database
heroku addons:create heroku-postgresql:hobby-dev --app marketingby-wetechforu-dev

# 3. Create pipeline
heroku pipelines:create marketingby-wetechforu \
  --stage production \
  --app marketingby-wetechforu-b67c6bd0bf6b

# 4. Add dev to pipeline
heroku pipelines:add marketingby-wetechforu \
  --stage development \
  --app marketingby-wetechforu-dev

# 5. Set up git remotes
heroku git:remote -a marketingby-wetechforu-dev -r dev
heroku git:remote -a marketingby-wetechforu-b67c6bd0bf6b -r prod

# 6. Create dev branch
git checkout -b dev
git push origin dev

# 7. Deploy to dev
git push dev dev:main
```

---

## ✅ **Summary**

**Best Choice**: Free Dev + Paid Prod
- **Cost**: $5/month (same as now!)
- **Dev**: Free tier (perfect for testing)
- **Prod**: Current setup (Essential-0)
- **Pipelines**: FREE feature to manage both

**Total Monthly Cost**: **$5/month** (same as current!)

