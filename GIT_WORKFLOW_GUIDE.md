# Git Development Workflow Guide

## 📋 Overview
This guide ensures all changes are tested locally before deployment to production.

**Branch Strategy:**
- `dev` - Development branch (test here first)
- `main` - Production branch (deploy to Heroku)

---

## 🔄 Step-by-Step Workflow

### 1️⃣ Start New Work (Switch to Dev Branch)

```bash
cd /Users/viraltarpara/Desktop/github_viral/MarketingBy_web_app_react
git checkout dev
git pull origin dev
```

**What this does:**
- Switches to the `dev` branch
- Pulls latest changes from GitHub to stay in sync

---

### 2️⃣ Make Your Changes

Edit files in your code editor (VSCode, Cursor, etc.)

Example changes:
- Add new features
- Fix bugs
- Update styling
- Add new pages

---

### 3️⃣ Test Locally

**Option A: Test with Local Server**
```bash
# Terminal 1 - Start Backend
cd backend
npm start

# Terminal 2 - Start Frontend
cd frontend
npm run dev
```

Open: http://localhost:5173

**Option B: Test with Heroku Database**
```bash
# Terminal 1 - Backend with Heroku DB
cd backend
export DATABASE_URL="your-heroku-db-url"
npm start

# Terminal 2 - Frontend
cd frontend
npm run dev
```

**✅ Test Everything:**
- Click all buttons
- Submit all forms
- Check console for errors
- Test on mobile view (responsive design)
- Verify database changes (if any)

---

### 4️⃣ Commit to Dev Branch

Once local testing is complete:

```bash
cd /Users/viraltarpara/Desktop/github_viral/MarketingBy_web_app_react
git add -A
git status  # Review what changed
git commit -m "descriptive message about changes"
```

**Good Commit Messages:**
- `feat: Add email preference management`
- `fix: Resolve login button color issue`
- `style: Update unsubscribe page to match brand colors`
- `docs: Add Git workflow guide`

---

### 5️⃣ Push to Dev Branch

```bash
git push origin dev
```

**What this does:**
- Pushes your changes to GitHub's `dev` branch
- Creates a backup of your work
- Allows team review (if applicable)

---

### 6️⃣ Merge Dev → Main (After Testing)

Once you're confident everything works:

```bash
# Switch to main branch
git checkout main

# Pull latest main (stay in sync)
git pull origin main

# Merge dev into main
git merge dev

# Review the merge
git status
```

**Expected output:**
```
Updating abc123..def456
Fast-forward
 file1.tsx | 10 ++++------
 file2.tsx | 25 +++++++++++++++++++++++
 2 files changed, 29 insertions(+), 6 deletions(-)
```

---

### 7️⃣ Push to Main Branch

```bash
git push origin main
```

---

### 8️⃣ Deploy to Heroku

**Since `git push heroku main` has network issues, use Manual Deploy:**

1. Go to: https://dashboard.heroku.com/apps/marketingby-wetechforu
2. Click **"Deploy"** tab
3. Scroll to **"Manual deploy"** section
4. Select branch: **main**
5. Click **"Deploy Branch"**
6. Wait for build to complete (2-3 minutes)
7. Click **"View"** to test live site

**OR if network is working:**
```bash
git push heroku main
```

---

### 9️⃣ Verify Production

After deployment:

✅ Visit: https://marketingby.wetechforu.com
✅ Test critical features
✅ Check Heroku logs for errors:

```bash
heroku logs --tail --app marketingby-wetechforu
```

---

### 🔟 Return to Dev Branch

After successful deployment, switch back to dev for next work:

```bash
git checkout dev
```

---

## 📊 Quick Reference Commands

| Task | Command |
|------|---------|
| Check current branch | `git branch` |
| Switch to dev | `git checkout dev` |
| Switch to main | `git checkout main` |
| Pull latest changes | `git pull origin <branch>` |
| Check status | `git status` |
| Stage all changes | `git add -A` |
| Commit changes | `git commit -m "message"` |
| Push to GitHub | `git push origin <branch>` |
| Merge dev → main | `git checkout main && git merge dev` |
| View commit history | `git log --oneline -10` |

---

## 🚨 Common Scenarios

### Scenario 1: Need to Switch Branches But Have Uncommitted Changes

```bash
# Save your work temporarily
git stash

# Switch branches
git checkout main

# Come back and restore
git checkout dev
git stash pop
```

---

### Scenario 2: Made Changes on Main by Mistake

```bash
# Stash the changes
git stash

# Switch to dev
git checkout dev

# Apply the changes
git stash pop

# Commit normally
git add -A
git commit -m "message"
git push origin dev
```

---

### Scenario 3: Merge Conflicts

If `git merge dev` shows conflicts:

```bash
# Git will mark conflicts in files like:
<<<<<<< HEAD
main branch code
=======
dev branch code
>>>>>>> dev

# Fix conflicts manually in your editor
# Remove conflict markers (<<<, ===, >>>)
# Keep the correct code

# After fixing:
git add -A
git commit -m "merge: Resolve conflicts from dev"
git push origin main
```

---

### Scenario 4: Need to Undo Last Commit (Not Pushed Yet)

```bash
# Keep changes but undo commit
git reset --soft HEAD~1

# OR completely discard changes
git reset --hard HEAD~1
```

---

## 🎯 Best Practices

### ✅ DO:
- Always work on `dev` branch first
- Test thoroughly before merging to `main`
- Write descriptive commit messages
- Pull before starting new work (`git pull origin dev`)
- Commit frequently (small, logical chunks)
- Review `git status` before committing

### ❌ DON'T:
- Don't commit directly to `main` for new features
- Don't push untested code to `main`
- Don't commit sensitive data (API keys, passwords)
- Don't force push (`git push --force`) unless absolutely necessary
- Don't work without committing for days

---

## 🔐 Security Reminders

**NEVER commit these to Git:**
- `.env` files with real credentials
- Database passwords
- API keys
- Access tokens
- Client sensitive data

**These files are already in .gitignore:**
- `.env`
- `node_modules/`
- `dist/`
- `.DS_Store`

---

## 📞 Need Help?

**Check what branch you're on:**
```bash
git branch
# * indicates current branch
```

**See recent commits:**
```bash
git log --oneline -5
```

**See what files changed:**
```bash
git status
git diff
```

---

## 🎓 Summary Workflow (Quick Version)

```bash
# 1. Start work
git checkout dev
git pull origin dev

# 2. Make changes (edit files)

# 3. Test locally
npm start  # or npm run dev

# 4. Commit to dev
git add -A
git commit -m "description"
git push origin dev

# 5. Merge to main (after testing)
git checkout main
git pull origin main
git merge dev
git push origin main

# 6. Deploy to Heroku (manual via dashboard)

# 7. Return to dev
git checkout dev
```

---

**Current Status:**
✅ `dev` and `main` branches are synced
✅ Latest code: Brand-consistent unsubscribe page
✅ You are currently on: `dev` branch
✅ Ready for new development work!

---

**Last Updated:** October 22, 2025

