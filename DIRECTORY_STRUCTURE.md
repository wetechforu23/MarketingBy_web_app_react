# 📁 Project Directory Structure

## Overview
This document explains the organized structure of the MarketingBy Web App project.

---

## 📂 Root Directory

```
MarketingBy_web_app_react/
├── 📄 README.md                        # Main project documentation
├── 📄 GIT_WORKFLOW_GUIDE.md           # Git workflow and branching strategy
├── 📄 LOCAL_DEV_WITH_PROD_DB.md       # Guide for local testing with Heroku DB
├── 📄 API_DATABASE_FLOW_DIAGRAM.md    # Master reference for architecture & flows
│
├── 📦 Package Files
│   ├── package.json                    # Root package (Heroku deployment config)
│   ├── package-lock.json
│   ├── app.json                        # Heroku app configuration
│   └── Procfile                        # Heroku process commands
│
├── 🔧 Configuration
│   └── deploy.sh                       # Deployment script
│
├── 📚 docs/                            # All documentation
│   ├── API_DATABASE_FLOW_DIAGRAM.md
│   ├── DEPLOYMENT_GUIDE.md
│   ├── SETUP_GUIDE.md
│   ├── LEAD_ASSIGNMENT_COMPLETE.md
│   ├── FACEBOOK_*.md                   # Facebook integration docs
│   ├── SEO_*.md                        # SEO feature docs
│   ├── STRIPE_*.md                     # Payment integration docs
│   └── [all other documentation]
│
├── 🧪 scripts/                         # Utility and test scripts
│   ├── check_facebook_credentials.js
│   ├── test-facebook-db.js
│   ├── test-facebook-page-views.js
│   ├── test-facebook-token.js
│   ├── convert-to-page-token.js
│   └── facebook-token-tester.html
│
├── 🖥️  backend/                        # Backend Node.js application
│   ├── src/                            # Source code
│   │   ├── server.ts                   # Main server file
│   │   ├── config/                     # Configuration files
│   │   │   └── database.ts
│   │   ├── routes/                     # API routes
│   │   │   ├── api.ts
│   │   │   ├── content.ts
│   │   │   ├── approvals.ts
│   │   │   ├── posts.ts
│   │   │   ├── users.ts
│   │   │   ├── tasks.ts
│   │   │   ├── emailPreferences.ts
│   │   │   └── smsPreferences.ts
│   │   ├── services/                   # Business logic
│   │   │   ├── facebookService.ts
│   │   │   ├── contentManagementService.ts
│   │   │   ├── approvalWorkflowService.ts
│   │   │   ├── socialMediaPostingService.ts
│   │   │   ├── seoAnalysisService.ts
│   │   │   ├── analyticsDataService.ts
│   │   │   └── [50+ service files]
│   │   ├── middleware/                 # Express middleware
│   │   │   └── auth.ts
│   │   ├── utils/                      # Utility functions
│   │   │   └── clientFilter.ts
│   │   └── types/                      # TypeScript types
│   │       └── session.ts
│   │
│   ├── database/                       # Database migrations & scripts
│   │   ├── add_social_media_content_tables.sql
│   │   ├── add_email_preferences.sql
│   │   ├── add_sms_preferences.sql
│   │   ├── add_user_permissions.sql
│   │   ├── add_seo_configurations.sql
│   │   ├── facebook_tables.sql
│   │   ├── check_facebook_status.sql
│   │   └── [27+ migration files]
│   │
│   ├── credentials/                    # API credentials (ignored by git)
│   │   └── wetechforu-marketing-platform-*.json
│   │
│   ├── dist/                           # Compiled TypeScript (ignored)
│   ├── node_modules/                   # Dependencies (ignored)
│   ├── package.json                    # Backend dependencies
│   ├── package-lock.json
│   ├── tsconfig.json                   # TypeScript config
│   ├── env.example                     # Example environment variables
│   └── setup-database.sql              # Initial database setup
│
└── 🎨 frontend/                        # React frontend application
    ├── src/                            # Source code
    │   ├── main.tsx                    # Entry point
    │   ├── App.tsx                     # Main app component
    │   │
    │   ├── api/                        # API client
    │   │   └── http.ts                 # Axios configuration
    │   │
    │   ├── components/                 # Reusable components
    │   │   ├── RoleBasedNav.tsx
    │   │   ├── PermissionsEditor.tsx
    │   │   ├── EmailComposer.tsx
    │   │   ├── LeadHeatmap.tsx
    │   │   └── home/                   # Home page components
    │   │       ├── Header.tsx
    │   │       ├── HeroSection.tsx
    │   │       ├── ServicesGrid.tsx
    │   │       ├── PricingSection.tsx
    │   │       └── [more components]
    │   │
    │   ├── pages/                      # Page components
    │   │   ├── Login.tsx
    │   │   ├── Dashboard.tsx
    │   │   ├── ClientManagementDashboard.tsx
    │   │   ├── ContentLibrary.tsx
    │   │   ├── ContentEditor.tsx
    │   │   ├── ApprovalQueue.tsx
    │   │   ├── SEODashboard.tsx
    │   │   ├── Settings.tsx
    │   │   ├── Unsubscribe.tsx
    │   │   └── home/
    │   │       └── HomePage.tsx
    │   │
    │   ├── layouts/                    # Layout components
    │   │   └── AppLayout.tsx
    │   │
    │   ├── router/                     # React Router config
    │   │   └── index.tsx
    │   │
    │   ├── theme/                      # Theme & styles
    │   │   └── theme.css
    │   │
    │   └── assets/                     # Static assets
    │       └── react.svg
    │
    ├── public/                         # Public assets
    │   ├── logo.png
    │   ├── wetechforu_Ai_Marketing_logo_transparent.png
    │   └── vite.svg
    │
    ├── dist/                           # Build output (ignored)
    ├── node_modules/                   # Dependencies (ignored)
    ├── index.html                      # HTML template
    ├── package.json                    # Frontend dependencies
    ├── package-lock.json
    ├── vite.config.ts                  # Vite configuration
    ├── tsconfig.json                   # TypeScript config
    └── eslint.config.js                # ESLint config
```

---

## 📝 Directory Purposes

### Root Level

| File/Folder | Purpose |
|-------------|---------|
| `README.md` | Main project overview and quick start |
| `GIT_WORKFLOW_GUIDE.md` | Git branching and deployment workflow |
| `LOCAL_DEV_WITH_PROD_DB.md` | How to test locally with Heroku database |
| `API_DATABASE_FLOW_DIAGRAM.md` | Master reference document (single source of truth) |
| `Procfile` | Heroku deployment process definition |
| `app.json` | Heroku app metadata and configuration |

### `/docs/`
All project documentation, organized by feature:
- Architecture documents
- Feature implementation guides
- Integration documentation (Facebook, Stripe, etc.)
- Deployment guides
- Historical records and migration notes

### `/scripts/`
Utility scripts and testing tools:
- Database testing scripts
- Facebook API testing
- Token conversion tools
- Credential verification scripts

### `/backend/`
Node.js/TypeScript backend application:
- **`src/`** - All source code
  - **`routes/`** - API endpoint definitions
  - **`services/`** - Business logic and external API integrations
  - **`middleware/`** - Express middleware (auth, error handling)
  - **`config/`** - Configuration files
  - **`utils/`** - Helper functions
  - **`types/`** - TypeScript type definitions
- **`database/`** - SQL migration files
- **`credentials/`** - API keys and service accounts (gitignored)

### `/frontend/`
React/TypeScript frontend application:
- **`src/`** - All source code
  - **`pages/`** - Full page components
  - **`components/`** - Reusable UI components
  - **`layouts/`** - Layout wrappers
  - **`router/`** - Route configuration
  - **`api/`** - API client setup (Axios)
  - **`theme/`** - Global styles
  - **`assets/`** - Images, icons, etc.
- **`public/`** - Static files served directly

---

## 🔒 Security Notes

### Files NEVER Committed to Git:
- `.env` and `.env.*` files
- `backend/credentials/` folder
- `*.key`, `*.pem`, `*.crt` files
- Service account JSON files (except examples)
- `node_modules/` directories
- Build outputs (`dist/`, `build/`)

### Sensitive Information Storage:
- **Local development**: `.env.local` files in respective folders
- **Production**: Heroku Config Vars
- **API credentials**: Database `client_credentials` table (encrypted)

---

## 📊 File Counts (Approximate)

- **Documentation**: 40+ markdown files
- **Backend Services**: 50+ TypeScript service files
- **Database Migrations**: 30+ SQL files
- **Frontend Pages**: 30+ React page components
- **Frontend Components**: 20+ reusable components
- **API Routes**: 13+ route files

---

## 🛠️ Development Workflow

### Local Development:
```bash
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### Testing with Heroku Database:
```bash
# See: LOCAL_DEV_WITH_PROD_DB.md
export DATABASE_URL="postgres://..."
cd backend && npm start
```

### Deployment:
```bash
# Follow: GIT_WORKFLOW_GUIDE.md
git checkout dev
# [make changes, test locally]
git commit && git push origin dev
git checkout main && git merge dev
git push origin main
# Deploy via Heroku Dashboard
```

---

## 📦 Package Management

### Root Level (`package.json`):
- Used by Heroku for deployment
- Defines build and start commands for production

### Backend (`backend/package.json`):
- Express, TypeScript, PostgreSQL, AWS SDK, etc.
- Development dependencies for TypeScript compilation

### Frontend (`frontend/package.json`):
- React, Vite, Axios, React Router, etc.
- Development dependencies for bundling

---

## 🔄 Build Process

### Development:
- Backend: TypeScript → JavaScript (on-the-fly with `ts-node`)
- Frontend: Vite dev server with hot reload

### Production:
- Backend: TypeScript compiled to `backend/dist/`
- Frontend: React bundled to `frontend/dist/`
- Heroku: Serves frontend static files from backend Express

---

## 📚 Documentation Organization

All documentation moved to `/docs/` except:
- `README.md` (project overview - stays at root)
- `GIT_WORKFLOW_GUIDE.md` (frequently used - stays at root)
- `LOCAL_DEV_WITH_PROD_DB.md` (frequently used - stays at root)
- `API_DATABASE_FLOW_DIAGRAM.md` (master reference - stays at root)

---

## 🧹 Cleanup Completed

### Moved to `/docs/`:
- All Facebook integration documentation
- All feature implementation guides
- All deployment and setup guides
- Historical records and status updates

### Moved to `/scripts/`:
- All test scripts (`.js` files)
- Facebook token testers
- Utility scripts

### Moved to `/backend/database/`:
- Loose SQL files from root

### Moved to `/backend/credentials/`:
- Google service account keys
- Other API credentials

### Removed:
- Duplicate logo files
- Unused `cookies.txt` files
- Nested `backend/backend/` directory
- Temporary test files

---

## 🎯 Quick Navigation

| Task | Command |
|------|---------|
| View documentation | `ls docs/` |
| Run test scripts | `cd scripts && node test-*.js` |
| View database migrations | `ls backend/database/*.sql` |
| Start development | See "Development Workflow" above |
| Deploy to production | Follow `GIT_WORKFLOW_GUIDE.md` |

---

**Last Updated:** October 22, 2025  
**Maintained by:** Development Team

