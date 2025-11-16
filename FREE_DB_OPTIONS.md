# 🆓 Free Database Options for Dev Environment

Since Heroku no longer offers free PostgreSQL, here are **FREE alternatives** for your dev database:

## ✅ **Best Free Options:**

### **1. Supabase (RECOMMENDED)**
- **Cost**: FREE (500MB storage, 2GB bandwidth)
- **Features**: Full PostgreSQL, REST API, Real-time
- **Setup**: 5 minutes
- **URL**: https://supabase.com

**Setup Steps:**
1. Sign up at https://supabase.com
2. Create new project
3. Get connection string from Settings → Database
4. Set as `DATABASE_URL` in dev Heroku app

### **2. Neon (RECOMMENDED)**
- **Cost**: FREE (3GB storage, serverless)
- **Features**: Full PostgreSQL, branching, auto-scaling
- **Setup**: 5 minutes
- **URL**: https://neon.tech

**Setup Steps:**
1. Sign up at https://neon.tech
2. Create new project
3. Get connection string from dashboard
4. Set as `DATABASE_URL` in dev Heroku app

### **3. Railway**
- **Cost**: FREE (with $5 credit/month)
- **Features**: Full PostgreSQL, easy setup
- **URL**: https://railway.app

### **4. Render**
- **Cost**: FREE (90 days, then $7/month)
- **Features**: Full PostgreSQL
- **URL**: https://render.com

---

## 🚀 **Quick Setup: Supabase (Recommended)**

### **Step 1: Create Supabase Project**
1. Go to https://supabase.com
2. Sign up (free)
3. Click "New Project"
4. Name: `marketingby-dev`
5. Database Password: (save this!)
6. Region: Choose closest
7. Click "Create new project"

### **Step 2: Get Connection String**
1. Go to Settings → Database
2. Scroll to "Connection string"
3. Copy "URI" connection string
4. Format: `postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres`

### **Step 3: Set in Heroku Dev App**
```bash
heroku config:set DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" \
  --app marketingby-wetechforu-dev
```

### **Step 4: Run Migrations**
```bash
# Connect to dev database and run migrations
heroku run "cd backend && psql \$DATABASE_URL -f setup-database.sql" \
  --app marketingby-wetechforu-dev
```

---

## 🚀 **Quick Setup: Neon (Alternative)**

### **Step 1: Create Neon Project**
1. Go to https://neon.tech
2. Sign up (free)
3. Click "Create Project"
4. Name: `marketingby-dev`
5. Click "Create"

### **Step 2: Get Connection String**
1. In project dashboard, click "Connection Details"
2. Copy connection string
3. Format: `postgresql://[USER]:[PASSWORD]@[HOST]/[DATABASE]?sslmode=require`

### **Step 3: Set in Heroku Dev App**
```bash
heroku config:set DATABASE_URL="postgresql://[USER]:[PASSWORD]@[HOST]/[DATABASE]?sslmode=require" \
  --app marketingby-wetechforu-dev
```

---

## 💰 **Cost Comparison**

| Option | Dev DB Cost | Prod DB Cost | Total |
|--------|------------|--------------|-------|
| **Heroku Essential-0 (both)** | $5/month | $5/month | **$10/month** |
| **Supabase Dev + Heroku Prod** | FREE | $5/month | **$5/month** ✅ |
| **Neon Dev + Heroku Prod** | FREE | $5/month | **$5/month** ✅ |

**Winner**: Use free external DB for dev = **$5/month total** (same as current!)

---

## ⚙️ **Updated Setup Script**

If you want to use free external DB, you can:

1. **Skip database in setup script** (choose 'n' when prompted)
2. **Set up Supabase/Neon manually** (5 minutes)
3. **Set DATABASE_URL in Heroku dev app**

Or use Heroku Essential-0 for dev ($5/month) = $10/month total.

---

## ✅ **Recommendation**

**Use Supabase for Dev Database:**
- ✅ FREE forever (500MB is plenty for dev)
- ✅ Full PostgreSQL compatibility
- ✅ Easy setup (5 minutes)
- ✅ Same features as Heroku Postgres
- ✅ **Total cost: $5/month** (same as current!)

**Keep Heroku Essential-0 for Prod:**
- ✅ Reliable and managed
- ✅ Same as current setup
- ✅ $5/month

