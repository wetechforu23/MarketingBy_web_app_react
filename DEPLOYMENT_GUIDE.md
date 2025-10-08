# 🚀 MarketingBy Healthcare Platform - Heroku Deployment Guide

## 📋 **Deployment Options Summary**

### **Option 1: Create New Heroku App (Recommended)**
- **Cost**: $5/month (PostgreSQL Essential plan)
- **Benefits**: Clean deployment, fresh database, latest code
- **Time**: ~15 minutes

### **Option 2: Update Existing App**
- **Cost**: Depends on current plan
- **Benefits**: Keep existing data, same URL
- **Time**: ~10 minutes

## 🎯 **Recommended: Create New App**

### **Step 1: Login to Heroku**
```bash
heroku login
```

### **Step 2: Create New App**
```bash
# Create new app
heroku create marketingby-healthcare-platform

# Add PostgreSQL database (Essential plan - $5/month)
heroku addons:create heroku-postgresql:essential-0 --app marketingby-healthcare-platform
```

### **Step 3: Set Environment Variables**
```bash
# Core settings
heroku config:set NODE_ENV=production --app marketingby-healthcare-platform
heroku config:set PORT=3001 --app marketingby-healthcare-platform
heroku config:set FRONTEND_URL=https://marketingby-healthcare-platform.herokuapp.com --app marketingby-healthcare-platform

# Security
heroku config:set JWT_SECRET=your-super-secret-jwt-key-change-in-production --app marketingby-healthcare-platform
heroku config:set SESSION_SECRET=your-super-secret-session-key-change-in-production --app marketingby-healthcare-platform

# Azure Email (use your existing values from .env)
heroku config:set AZURE_COMMUNICATION_CONNECTION_STRING=your-azure-communication-connection-string --app marketingby-healthcare-platform
heroku config:set AZURE_EMAIL_FROM_ADDRESS=noreply@wetechforu.com --app marketingby-healthcare-platform
heroku config:set AZURE_EMAIL_FROM_NAME="WeTechForU AI Marketing" --app marketingby-healthcare-platform

# Azure App Credentials (use your existing values)
heroku config:set AZURE_CLIENT_ID=your-azure-client-id --app marketingby-healthcare-platform
heroku config:set AZURE_CLIENT_SECRET=your-azure-client-secret --app marketingby-healthcare-platform
heroku config:set AZURE_TENANT_ID=your-azure-tenant-id --app marketingby-healthcare-platform
heroku config:set AZURE_SUBSCRIPTION_ID=your-azure-subscription-id --app marketingby-healthcare-platform

# Google APIs (use your existing values)
heroku config:set GOOGLE_API_KEY=your-google-api-key --app marketingby-healthcare-platform
heroku config:set GOOGLE_SEARCH_ENGINE_ID=your-google-search-engine-id --app marketingby-healthcare-platform
heroku config:set GOOGLE_ANALYTICS_API_KEY=your-google-analytics-api-key --app marketingby-healthcare-platform

# SEO APIs (use your existing values)
heroku config:set SERANKING_API_KEY=your-seranking-api-key --app marketingby-healthcare-platform
heroku config:set SERANKING_USERNAME=your-seranking-username --app marketingby-healthcare-platform
heroku config:set SERANKING_PASSWORD=your-seranking-password --app marketingby-healthcare-platform

# Compliance
heroku config:set TEXAS_COMPLIANCE_API_KEY=your-texas-compliance-api-key --app marketingby-healthcare-platform
heroku config:set HIPAA_COMPLIANCE_CHECK=true --app marketingby-healthcare-platform

# Notifications
heroku config:set NOTIFICATION_EMAIL=viral.tarpara@hotmail.com --app marketingby-healthcare-platform
heroku config:set ADMIN_EMAIL=viral.tarpara@hotmail.com --app marketingby-healthcare-platform
```

### **Step 4: Deploy**
```bash
# Deploy to Heroku
git push heroku main

# Or use the deployment script
./deploy.sh
```

### **Step 5: Setup Database**
```bash
# Run database setup
heroku run "cd backend && node -e \"
const { Pool } = require('pg');
const fs = require('fs');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function setupDatabase() {
  try {
    const sql = fs.readFileSync('setup-database.sql', 'utf8');
    await pool.query(sql);
    console.log('✅ Database setup completed successfully');
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
  } finally {
    await pool.end();
  }
}

setupDatabase();
\"" --app marketingby-healthcare-platform
```

## 🔧 **Environment Variables from Your Local .env**

Copy these values from your local `.env` file to Heroku config vars:

```bash
# Get your current .env values
cat backend/.env

# Then set them in Heroku (replace with actual values)
heroku config:set AZURE_COMMUNICATION_CONNECTION_STRING="your-actual-value" --app marketingby-healthcare-platform
heroku config:set AZURE_CLIENT_ID="your-actual-value" --app marketingby-healthcare-platform
# ... continue for all your API keys
```

## 📊 **Cost Breakdown**

- **Heroku App**: Free (Basic plan)
- **PostgreSQL Database**: $5/month (Essential plan)
- **Total**: $5/month

## 🌐 **After Deployment**

Your app will be available at:
- **URL**: `https://marketingby-healthcare-platform.herokuapp.com`
- **Dashboard**: `https://dashboard.heroku.com/apps/marketingby-healthcare-platform`

## 🔍 **Monitoring & Logs**

```bash
# View logs
heroku logs --tail --app marketingby-healthcare-platform

# Check app status
heroku ps --app marketingby-healthcare-platform

# View config vars
heroku config --app marketingby-healthcare-platform
```

## 🚨 **Important Notes**

1. **Database**: Heroku Postgres will automatically provide `DATABASE_URL`
2. **Secrets**: Never commit your `.env` file to Git
3. **Frontend**: Currently only backend is deployed; frontend needs separate hosting
4. **SSL**: Heroku provides free SSL certificates
5. **Scaling**: Can upgrade to higher plans as needed

## 🔄 **Frontend Deployment Options**

For the React frontend, consider:
1. **Vercel** (Free tier available)
2. **Netlify** (Free tier available)
3. **Heroku** (Separate app, $7/month)
4. **GitHub Pages** (Free for public repos)

## 📞 **Support**

If you encounter issues:
1. Check Heroku logs: `heroku logs --tail --app marketingby-healthcare-platform`
2. Verify environment variables: `heroku config --app marketingby-healthcare-platform`
3. Test database connection: `heroku run bash --app marketingby-healthcare-platform`
