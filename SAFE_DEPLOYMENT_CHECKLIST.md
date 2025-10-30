# Safe Deployment Checklist - Facebook Token Auto-Conversion

## Phase 1: Local Testing (REQUIRED BEFORE MERGE)

### Step 1: Checkout Feature Branch
```bash
cd "C:\Users\raman\OneDrive\Desktop\wetechfor u\main app\MarketingBy_web_app_react"
git checkout feature/Facebook-Connect-Integration
```

### Step 2: Start Backend with Stage Server + Dev Database
```bash
cd backend
npm start
```

**Verify:**
- [ ] Backend starts without errors
- [ ] Connects to stage server + dev database
- [ ] No TypeScript compilation errors

### Step 3: Start Frontend
```bash
cd frontend
npm run dev
```

**Verify:**
- [ ] Frontend starts on localhost
- [ ] No console errors
- [ ] Can access the app

### Step 4: Test OAuth Method (Method 1)
1. [ ] Navigate to a client
2. [ ] Go to Facebook Connect page
3. [ ] Click "Connect with Facebook OAuth"
4. [ ] Complete OAuth flow
5. [ ] Select a page
6. [ ] **Check backend console logs** for:
   ```
   🔍 Checking page token expiry...
   📋 Token type: PAGE
   ⏰ Token expires at: ...
   ⏳ Hours until expiry: ...
   🔄 Step 1: Processing page token...
   ✅ Successfully exchanged for long-lived token (or already long-lived)
   💾 Step 3: Upserting credentials to database...
   ✅ Credentials stored successfully
   ```
7. [ ] Connection succeeds
8. [ ] Verify in database:
   ```sql
   SELECT client_id, credentials->>'page_id', credentials->>'page_name', updated_at
   FROM client_credentials 
   WHERE service_type = 'facebook' 
   ORDER BY updated_at DESC LIMIT 5;
   ```

### Step 5: Test Manual Token Method (Method 2)
1. [ ] Disconnect Facebook (if connected)
2. [ ] Navigate to Facebook Connect page
3. [ ] Paste a Facebook token (user or page token)
4. [ ] Click "Process Token"
5. [ ] Select a page from the list
6. [ ] **Check backend console logs** for token processing
7. [ ] Connection succeeds
8. [ ] Verify in database (same query as above)

### Step 6: Test Existing Functionality
1. [ ] Fetch Facebook analytics data
2. [ ] View Facebook posts
3. [ ] Check Facebook insights
4. [ ] Verify no existing features are broken

**IF ALL TESTS PASS ✅ → Proceed to Phase 2**
**IF ANY TEST FAILS ❌ → Fix issues before merging**

---

## Phase 2: Safe Merge to Main

### Step 1: Update Local Main Branch
```bash
git checkout main
git pull origin main
```

**Verify:**
- [ ] No merge conflicts
- [ ] Main is up to date

### Step 2: Create Backup Branch
```bash
git checkout -b backup/pre-facebook-token-merge
git push origin backup/pre-facebook-token-merge
```

**Why:** Safety net to rollback if needed

### Step 3: Merge Feature Branch
```bash
git checkout main
git merge feature/Facebook-Connect-Integration --no-ff
```

**Verify:**
- [ ] No merge conflicts
- [ ] All files merged cleanly

### Step 4: Run Linter & Tests
```bash
# Backend
cd backend
npm run build

# Frontend
cd ../frontend
npm run build
```

**Verify:**
- [ ] No TypeScript errors
- [ ] No build errors
- [ ] All linting passes

### Step 5: Test Merged Code Locally
```bash
# Start backend
cd backend
npm start

# Start frontend (new terminal)
cd frontend
npm run dev
```

**Quick Smoke Test:**
- [ ] Backend starts without errors
- [ ] Frontend starts without errors
- [ ] Can login to the app
- [ ] Facebook Connect page loads
- [ ] No console errors

**IF ALL CHECKS PASS ✅ → Proceed to Phase 3**
**IF ANY CHECK FAILS ❌ → Revert merge: `git reset --hard HEAD~1`**

---

## Phase 3: Push to GitHub Main

### Step 1: Push to GitHub
```bash
git push origin main
```

**Verify on GitHub:**
- [ ] Commit appears in main branch
- [ ] No CI/CD failures (if configured)
- [ ] All files are present

### Step 2: Create Git Tag (Optional but Recommended)
```bash
git tag -a v1.0-facebook-token-auto-conversion -m "Add automatic token conversion"
git push origin v1.0-facebook-token-auto-conversion
```

**Why:** Easy rollback reference point

---

## Phase 4: Safe Heroku Deployment

### Step 1: Verify Heroku App Status
```bash
heroku apps:info --app marketingby-wetechforu-b67c6bd0bf6b
```

**Verify:**
- [ ] App is running
- [ ] No ongoing maintenance

### Step 2: Create Heroku Backup (CRITICAL)
```bash
# Backup database
heroku pg:backups:capture --app marketingby-wetechforu-b67c6bd0bf6b

# Verify backup created
heroku pg:backups --app marketingby-wetechforu-b67c6bd0bf6b
```

**Why:** Can restore database if something goes wrong

### Step 3: Check Current Heroku Logs
```bash
heroku logs --tail --app marketingby-wetechforu-b67c6bd0bf6b
```

**Verify:**
- [ ] No critical errors
- [ ] App is healthy

### Step 4: Deploy to Heroku
```bash
git push heroku main
```

**Watch the deployment:**
- [ ] Build succeeds
- [ ] No dependency errors
- [ ] Backend starts successfully

### Step 5: Monitor Heroku Logs During Deployment
```bash
heroku logs --tail --app marketingby-wetechforu-b67c6bd0bf6b
```

**Watch for:**
- ✅ "Server started on port..."
- ✅ "Database connected successfully"
- ❌ Any error messages

### Step 6: Verify Deployment
```bash
# Open the app
heroku open --app marketingby-wetechforu-b67c6bd0bf6b

# Check app health
curl https://marketingby-wetechforu-b67c6bd0bf6b.herokuapp.com/health
```

**Manual Verification:**
1. [ ] Login to production app
2. [ ] Navigate to a client
3. [ ] Go to Facebook Connect page
4. [ ] Test OAuth connection (Method 1)
5. [ ] Test Manual Token (Method 2)
6. [ ] Verify existing Facebook connections still work
7. [ ] Check Heroku logs for token conversion messages

---

## Phase 5: Post-Deployment Monitoring

### Monitor for 30 Minutes
```bash
heroku logs --tail --app marketingby-wetechforu-b67c6bd0bf6b
```

**Watch for:**
- [ ] No unexpected errors
- [ ] Token conversion logs appear when connecting
- [ ] Users can connect Facebook successfully
- [ ] Existing connections still fetch data

### Check Database
```bash
heroku pg:psql --app marketingby-wetechforu-b67c6bd0bf6b
```

```sql
-- Verify new connections are storing data correctly
SELECT client_id, service_type, 
       credentials->>'page_id', 
       credentials->>'page_name', 
       updated_at
FROM client_credentials 
WHERE service_type = 'facebook' 
ORDER BY updated_at DESC 
LIMIT 10;
```

---

## 🚨 Rollback Plan (If Something Goes Wrong)

### Option 1: Rollback Code on Heroku
```bash
# Rollback to previous release
heroku rollback --app marketingby-wetechforu-b67c6bd0bf6b

# Verify rollback
heroku releases --app marketingby-wetechforu-b67c6bd0bf6b
```

### Option 2: Rollback Git Main Branch
```bash
# Checkout backup branch
git checkout backup/pre-facebook-token-merge

# Force push to main (BE CAREFUL!)
git checkout main
git reset --hard backup/pre-facebook-token-merge
git push origin main --force

# Deploy rollback to Heroku
git push heroku main --force
```

### Option 3: Restore Database (Only if database corrupted)
```bash
# List backups
heroku pg:backups --app marketingby-wetechforu-b67c6bd0bf6b

# Restore from backup
heroku pg:backups:restore <backup-id> --app marketingby-wetechforu-b67c6bd0bf6b
```

---

## ✅ Success Criteria

Deployment is successful when:
- [ ] App is accessible at production URL
- [ ] Login works
- [ ] Facebook OAuth connection works
- [ ] Manual token connection works
- [ ] Existing Facebook connections still work
- [ ] Analytics data fetches successfully
- [ ] No errors in Heroku logs
- [ ] Database shows long-lived tokens being stored
- [ ] Token conversion logs appear in console

---

## 📞 Emergency Contacts

If deployment fails:
1. Check Heroku logs immediately
2. Run rollback commands above
3. Notify team of issue
4. Review error logs for root cause

---

## 📝 Post-Deployment Tasks

After successful deployment:
- [ ] Update API_DATABASE_FLOW_DIAGRAM.md with version entry
- [ ] Mark PR as merged and deployed
- [ ] Close related issues on GitHub
- [ ] Notify team of successful deployment
- [ ] Monitor for 24 hours for any issues
- [ ] Document any lessons learned

---

## 🎯 Summary

**Total Time Estimate:** 30-60 minutes
**Risk Level:** LOW (no DDL changes, backward compatible)
**Rollback Time:** < 5 minutes

**Key Safety Features:**
1. ✅ Backup branch created
2. ✅ Database backup created
3. ✅ No DDL changes
4. ✅ Multiple testing phases
5. ✅ Clear rollback plan
6. ✅ Post-deployment monitoring

