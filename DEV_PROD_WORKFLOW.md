# 🔄 Dev/Prod Workflow Guide (Option 1)

## ✅ **Setup Complete: Dev = Duplicate of Prod**

Your dev environment is now a **complete duplicate** of production:
- ✅ Same database schema (Essential-0 PostgreSQL)
- ✅ Same integrations (Twilio, Azure, Google APIs)
- ✅ Same credentials (all copied from prod)
- ✅ Separate databases (dev data won't affect prod)

**Cost**: $10/month ($5 dev + $5 prod)

---

## 🚀 **Daily Development Workflow**

### **Step 1: Work on Dev Branch**
```bash
# Switch to dev branch
git checkout dev
git pull origin dev

# Make your changes...
# Edit files, add features, fix bugs

# Commit changes
git add .
git commit -m "feat: New feature description"
git push origin dev
```

### **Step 2: Deploy to Dev Server**
```bash
# Deploy to dev
./deploy-dev.sh
```

**Dev URL**: `https://marketingby-wetechforu-dev-6745c97bc199.herokuapp.com`

### **Step 3: Test on Dev**
1. ✅ Test all features
2. ✅ Check logs: `heroku logs --tail --app marketingby-wetechforu-dev`
3. ✅ Test database changes
4. ✅ Test integrations (Twilio, Azure, etc.)
5. ✅ Verify everything works

### **Step 4: Deploy to Production (After Testing)**
```bash
# Merge dev to main
git checkout main
git pull origin main
git merge dev
git push origin main

# Deploy to production
./deploy-prod.sh
```

**Prod URL**: `https://marketingby.wetechforu.com`

---

## 🗄️ **Database Migration Workflow**

### **When You Add New Tables/Columns:**

1. **Create Migration File:**
   ```bash
   # Create new migration file
   touch backend/database/add_new_feature.sql
   ```

2. **Test Migration on Dev:**
   ```bash
   # Run migration on dev
   heroku pg:psql --app marketingby-wetechforu-dev < backend/database/add_new_feature.sql
   ```

3. **Test Application:**
   - Deploy to dev: `./deploy-dev.sh`
   - Test all features
   - Verify database changes work

4. **Deploy to Production:**
   ```bash
   # After testing, run on prod
   heroku pg:psql --app marketingby-wetechforu-b67c6bd0bf6b < backend/database/add_new_feature.sql
   
   # Then deploy code
   ./deploy-prod.sh
   ```

---

## 🔄 **Sync Database Schema (If Needed)**

If you need to sync dev database schema from production:

```bash
./sync-dev-database.sh
```

This will:
- Run all migrations on dev database
- Ensure dev has same schema as prod
- Skip errors for existing objects (normal)

---

## 📋 **Environment Variables**

### **Dev Environment:**
- `NODE_ENV=development`
- `DATABASE_URL` = Dev database (separate from prod)
- All other configs = **Same as production** (Twilio, Azure, Google, etc.)

### **Prod Environment:**
- `NODE_ENV=production`
- `DATABASE_URL` = Prod database
- All integrations = Production credentials

---

## ⚠️ **Important Notes**

1. **Same Integrations**: Dev uses same Twilio, Azure, Google API keys as prod
   - ✅ Good: Easy testing with real services
   - ⚠️  Note: Dev usage counts toward API quotas

2. **Separate Databases**: 
   - Dev database is completely separate
   - Dev data won't affect production
   - Safe to test database changes

3. **Cost**: 
   - Dev: $5/month (Essential-0 PostgreSQL)
   - Prod: $5/month (Essential-0 PostgreSQL)
   - Total: $10/month

4. **Workflow**:
   - Always develop in dev first
   - Test thoroughly on dev
   - Only deploy to prod after testing

---

## 🎯 **Quick Reference**

### **Git Branches:**
- `dev` - Development branch (deploys to dev server)
- `main` - Production branch (deploys to prod server)

### **Deployment:**
- `./deploy-dev.sh` - Deploy dev branch to dev server
- `./deploy-prod.sh` - Deploy main branch to prod server

### **Database:**
- `./sync-dev-database.sh` - Sync dev schema from prod
- `heroku pg:psql --app marketingby-wetechforu-dev` - Connect to dev DB
- `heroku pg:psql --app marketingby-wetechforu-b67c6bd0bf6b` - Connect to prod DB

### **Logs:**
- `heroku logs --tail --app marketingby-wetechforu-dev` - Dev logs
- `heroku logs --tail --app marketingby-wetechforu-b67c6bd0bf6b` - Prod logs

### **URLs:**
- Dev: `https://marketingby-wetechforu-dev-6745c97bc199.herokuapp.com`
- Prod: `https://marketingby.wetechforu.com`

---

## ✅ **Checklist Before Deploying to Prod**

- [ ] All changes tested on dev server
- [ ] All features working correctly
- [ ] Database migrations tested on dev
- [ ] No errors in dev logs
- [ ] Code reviewed and committed
- [ ] Merged dev branch to main
- [ ] Ready for production deployment

---

## 🎉 **You're All Set!**

Your dev/prod workflow is ready:
1. Develop on `dev` branch
2. Deploy to dev server
3. Test thoroughly
4. Merge to `main` and deploy to prod

**Total Cost**: $10/month (dev $5 + prod $5)

