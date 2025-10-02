# WeTechForU Healthcare Marketing Platform - Developer Guide

## 📋 Current Status (Reverted Code)

**Last Commit:** `e399cbb Fix email tracking model imports - use correct class names`  
**Working Tree:** Clean (all new development work stashed)  
**Server Port:** 5017 (dedicated port)  
**Environment:** All `.env` settings preserved  

---

## 🚀 Quick Start for New Developer

### 1. Clone and Setup
```bash
git clone <repository-url>
cd WeTechForU-Healthcare-Marketing-Platform
```

### 2. Environment Setup
```bash
# Copy environment file (already configured)
cp .env.example .env

# Install dependencies
pip install -r requirements.txt
```

### 3. Database Setup
```bash
# Create database tables (already created in production)
python3 -c "
from app import create_app, db
app = create_app()
with app.app_context():
    db.create_all()
    print('✅ Database tables created successfully')
"
```

### 4. Start Development Server
```bash
# Use dedicated port 5017
python3 -c "
import sys; sys.path.append('.')
from app import create_app
app = create_app()
print('🚀 Starting WeTechForU Healthcare Marketing Platform on http://localhost:5017')
app.run(host='0.0.0.0', port=5017, debug=True)
"
```

---

## ✅ Currently Working Features

### Core Functionality
- **✅ User Authentication** - Login/logout system
- **✅ Admin Portal** - Dashboard with user management
- **✅ Lead Management** - CRUD operations for leads
- **✅ Client Management** - Client portal and management
- **✅ Email Tracking** - Email open/click tracking
- **✅ SEO Audit System** - Basic SEO analysis
- **✅ Campaign Management** - Marketing campaign tracking
- **✅ Subscription System** - Plan and feature management
- **✅ Google Ads Integration** - OAuth and campaign management
- **✅ Communication System** - Client communication tracking

### Available Routes
```
✅ /auth/login - User authentication
✅ /admin/ - Admin dashboard
✅ /leads - Lead management
✅ /clients - Client management
✅ /campaigns - Campaign management
✅ /seo_audit - SEO analysis
✅ /analytics - Marketing analytics
✅ /subscription-plans - Subscription management
```

---

## 📦 Stashed Development Work

**Stash Name:** "New development work from last 4 days - dedicated port setup, testing bot, compliance features, etc."

### Major Features in Stash
1. **🤖 Testing Bot System**
   - Automated flow testing
   - Issue detection and fixing
   - Comprehensive test reporting

2. **📋 Compliance Management**
   - HIPAA compliance pages
   - GDPR compliance features
   - Legal compliance checking

3. **🔍 Lead Scraping Service**
   - Website scraping with contact extraction
   - Compliance-first scraping approach
   - Elite 360 Health integration

4. **📅 Calendar Integration**
   - Appointment booking system
   - Google Calendar integration
   - Appointment management

5. **📧 Enhanced Email System**
   - Branded email templates
   - Basic and detailed SEO emails
   - Email tracking improvements

6. **💳 Stripe Integration**
   - Billing and subscription management
   - Invoice generation
   - Payment processing

7. **🎨 UI/UX Improvements**
   - Static left navigation
   - WeTechForU branding
   - Brand colors and styling

### To Restore Stashed Work
```bash
# View stash contents
git stash show stash@{0} --name-only

# Apply stash (when ready to continue development)
git stash pop

# Or apply without removing from stash
git stash apply stash@{0}
```

---

## 🗄️ Database Schema (Current Tables)

### Core Tables (Created & Working)
```sql
-- User Management
users (id, email, password_hash, is_admin, created_at, updated_at)

-- Client Management  
clients (id, name, email, phone, company, industry, status, created_at, updated_at)

-- Lead Management
leads (id, name, email, phone, company, industry_category_id, industry_subcategory_id, 
       source, status, notes, created_at, updated_at)

-- Industry Classification
industry_categories (id, name, description)
industry_subcategories (id, name, category_id, description)
search_keywords (id, keyword, category_id, subcategory_id)

-- SEO & Marketing
seo_audits (id, client_id, url, score, issues, recommendations, created_at)
campaigns (id, name, client_id, type, status, budget, start_date, end_date)
communications (id, client_id, type, subject, content, sent_at, status)
marketing_performance (id, campaign_id, metric, value, date, notes)

-- Keyword Analysis
keyword_analyses (id, client_id, keyword, volume, difficulty, position, created_at)
competitor_analyses (id, client_id, competitor_url, analysis_data, created_at)
keyword_recommendations (id, client_id, keyword, recommendation_type, priority, created_at)

-- Subscription System
subscription_plans (id, name, description, price, billing_cycle, features)
features (id, name, description, category)
plan_features (id, plan_id, feature_id, included)
client_subscriptions (id, client_id, plan_id, status, start_date, end_date)
feature_usage (id, client_id, feature_id, usage_count, last_used)

-- Google Ads Integration
client_google_ads (id, client_id, account_id, refresh_token, status, created_at)

-- Email & Communication
email_templates (id, name, subject, content, type, created_at)
email_tracking (id, email_id, recipient_email, opened_at, clicked_at, status)
communications (id, client_id, type, subject, content, sent_at, status)

-- Content & Approval
content_approvals (id, client_id, content_type, content, status, approved_at, approved_by)
```

---

## 🚀 Heroku Deployment Guide

### 1. Prerequisites
```bash
# Install Heroku CLI
# Download from: https://devcenter.heroku.com/articles/heroku-cli

# Login to Heroku
heroku login

# Add Heroku remote
heroku git:remote -a wetechforu-marketing
```

### 2. Environment Variables Setup
```bash
# Set all environment variables in Heroku
heroku config:set FLASK_APP=app
heroku config:set FLASK_ENV=production
heroku config:set SECRET_KEY=your-secret-key
heroku config:set DATABASE_URL=your-postgres-url
heroku config:set GOOGLE_ADS_CLIENT_ID=your-client-id
heroku config:set GOOGLE_ADS_CLIENT_SECRET=your-client-secret
heroku config:set EMAIL_SERVICE_API_KEY=your-email-api-key
# ... (add all variables from .env file)
```

### 3. Database Setup
```bash
# Create database tables on Heroku
heroku run python3 -c "
from app import create_app, db
app = create_app()
with app.app_context():
    db.create_all()
    print('✅ Database tables created successfully')
"
```

### 4. Deploy to Heroku
```bash
# Deploy current code
git add .
git commit -m "Deploy current working version"
git push heroku main

# Or deploy specific branch
git push heroku dev:main
```

### 5. Verify Deployment
```bash
# Check app status
heroku ps

# View logs
heroku logs --tail

# Open app
heroku open
```

---

## 🔄 Development Workflow

### Current Branch Strategy
- **`main`** - Production-ready code (current reverted state)
- **`dev`** - Development branch with stashed features

### Recommended Workflow
```bash
# 1. Create feature branch from current state
git checkout -b feature/new-feature-name

# 2. Apply stashed work if needed
git stash apply stash@{0}

# 3. Make changes and commit
git add .
git commit -m "Add new feature"

# 4. Push and create PR
git push origin feature/new-feature-name
```

---

## 📊 API Flow & Database Relationships

### Current API Endpoints
```
Authentication:
  POST /auth/login
  POST /auth/logout
  GET /auth/profile

Admin:
  GET /admin/
  GET /admin/users
  POST /admin/users
  PUT /admin/users/<id>
  DELETE /admin/users/<id>

Leads:
  GET /leads
  POST /leads
  GET /leads/<id>
  PUT /leads/<id>
  DELETE /leads/<id>

Clients:
  GET /clients
  POST /clients
  GET /clients/<id>
  PUT /clients/<id>
  DELETE /clients/<id>

Campaigns:
  GET /campaigns
  POST /campaigns
  GET /campaigns/<id>
  PUT /campaigns/<id>

SEO:
  GET /seo_audit
  POST /seo_audit
  GET /analytics

Subscriptions:
  GET /subscription-plans
  POST /subscription-plans
  GET /billing/invoices
```

---

## 🔧 Troubleshooting

### Common Issues

1. **Port 5017 Already in Use**
```bash
# Kill process on port 5017
lsof -ti :5017 | xargs kill -9
```

2. **Database Connection Issues**
```bash
# Check database URL in .env
# Ensure PostgreSQL is running
# Verify credentials
```

3. **Missing Dependencies**
```bash
# Reinstall requirements
pip install -r requirements.txt --force-reinstall
```

4. **Template Not Found Errors**
```bash
# Check template files exist
# Verify template paths in routes
# Clear Flask cache
```

### Development Tips

1. **Always use port 5017** for consistency
2. **Check .env file** before starting server
3. **Use debug mode** for development
4. **Monitor logs** for errors
5. **Test all routes** after changes

---

## 📞 Support & Contact

- **Lead Developer:** [Your Name]
- **Email:** [Your Email]
- **Project:** WeTechForU Healthcare Marketing Platform
- **Repository:** [GitHub URL]
- **Heroku App:** wetechforu-marketing

---

## 📝 Next Steps

1. **Review current working features**
2. **Test all existing functionality**
3. **Apply stashed work when ready**
4. **Continue development from stashed features**
5. **Deploy to Heroku when stable**

---

*Last Updated: October 2, 2025*  
*Version: 1.0 (Reverted State)*
