# WeTechForU AI Marketing Platform

A comprehensive healthcare marketing platform built with React frontend and Node.js backend, featuring lead generation, SEO analysis, compliance checking, and automated email marketing.

## 📚 Quick Links

- 📖 **[Directory Structure](DIRECTORY_STRUCTURE.md)** - Organized project structure
- 🔄 **[Git Workflow Guide](GIT_WORKFLOW_GUIDE.md)** - Development workflow (dev → main → deploy)
- 🗄️ **[Local Dev with Prod DB](LOCAL_DEV_WITH_PROD_DB.md)** - Test locally with Heroku database
- 📊 **[API & Database Flow](API_DATABASE_FLOW_DIAGRAM.md)** - Master architecture reference
- 📁 **[Documentation](docs/)** - All feature docs, guides, and references

## 🚀 Quick Start

### Option 1: Local Development with Local Database
```bash
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend
cd frontend
npm run dev

# Visit: http://localhost:5173
```

### Option 2: Local Development with Production Database (Heroku)
```bash
# Quick start script
./start-local-prod-db.sh

# Or manually:
export DATABASE_URL=$(heroku config:get DATABASE_URL --app marketingby-wetechforu)
cd backend && npm start
```

## 🚀 Features

### Core Functionality
- **Lead Generation**: Website scraping and zip code-based lead discovery
- **SEO Analysis**: Basic and comprehensive SEO reports with real API integrations
- **Compliance Checking**: Texas healthcare marketing compliance validation
- **Email Marketing**: Automated email campaigns with Azure/Microsoft Graph integration
- **Calendar Booking**: Appointment scheduling with email notifications
- **Dashboard**: Real-time analytics and lead management

### Technical Features
- **React Frontend**: Modern SPA with TypeScript
- **Node.js Backend**: Express.js with PostgreSQL database
- **Authentication**: Session-based auth with bcrypt/PBKDF2 support
- **API Integrations**: Google APIs, SE Ranking, Azure, ChatGPT
- **Compliance**: HIPAA, Texas state regulations, accessibility checks
- **Testing**: E2E testing with Puppeteer

## 📋 Prerequisites

- Node.js 18+ and npm
- PostgreSQL 12+
- Git

## 🛠️ Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/wetechforu23/MarketingBy_web_app_react.git
cd MarketingBy_web_app_react
```

### 2. Database Setup
```bash
# Create PostgreSQL database
createdb health_clinic_marketing

# Or using psql
psql -U postgres
CREATE DATABASE health_clinic_marketing;
\q
```

### 3. Environment Configuration
```bash
# Copy environment template
cp backend/env.example backend/.env

# Edit the .env file with your configuration
nano backend/.env
```

**Required Environment Variables:**
```env
# Database
DATABASE_URL=postgresql://postgres:password@localhost/health_clinic_marketing

# Server
PORT=3001
JWT_SECRET=your-jwt-secret
SESSION_SECRET=your-session-secret
FRONTEND_URL=http://localhost:5173

# Azure Configuration
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret
AZURE_COMMUNICATION_CONNECTION_STRING=your-connection-string

# Email Configuration
SMTP_SENDER_EMAIL=info@wetechforu.com
REPLY_TO_EMAIL=viral.tarpara@hotmail.com
FROM_NAME=WeTechForU Healthcare Team

# API Keys
GOOGLE_MAPS_API_KEY=your-google-maps-key
GOOGLE_ANALYTICS_API_KEY=your-google-analytics-key
SE_RANKING_API_KEY=your-se-ranking-key
CHATGPT_API_KEY=your-chatgpt-key

# Compliance Settings
TEXAS_COMPLIANCE_ENABLED=true
HIPAA_COMPLIANCE_CHECK=true
```

### 4. Install Dependencies
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Install root dependencies (for E2E testing)
cd ..
npm install
```

### 5. Database Migration
```bash
# Run database migrations (if any)
cd backend
npm run migrate

# Or manually create tables using the SQL files in the database directory
```

### 6. Start Development Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

## 🧪 Testing

### E2E Testing
```bash
# Run the complete E2E test suite
node test-e2e-flow.js
```

The E2E test covers:
- User authentication
- Lead scraping (website and zip code)
- SEO analysis
- Email sending
- Calendar booking
- API endpoint validation

### Manual Testing
1. **Login**: Use `test@test.com` / `password`
2. **Leads**: Test website and zip code scraping
3. **SEO**: Generate basic and comprehensive reports
4. **Calendar**: Book appointments and test email notifications

## 📁 Project Structure

```
MarketingBy_web_app_react/
├── backend/                 # Node.js backend
│   ├── src/
│   │   ├── config/         # Database and app configuration
│   │   ├── middleware/     # Authentication and validation
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic services
│   │   └── server.ts       # Main server file
│   ├── env.example         # Environment variables template
│   └── package.json
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── api/            # API client
│   │   └── main.tsx        # App entry point
│   └── package.json
├── test-e2e-flow.js        # E2E testing script
└── README.md
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Leads Management
- `GET /api/leads` - Get all leads
- `POST /api/scrape-website-leads` - Scrape leads from website
- `POST /api/scrape-zipcode-leads` - Scrape leads by zip code
- `DELETE /api/leads/:id` - Delete lead

### SEO Analysis
- `POST /api/seo/analyze` - Basic SEO analysis
- `POST /api/seo/generate-report` - Comprehensive SEO report
- `GET /api/seo/reports` - Get SEO reports

### Compliance
- `GET /api/compliance-settings` - Get compliance settings
- `POST /api/compliance-check` - Check compliance for action
- `GET /api/compliance/available-slots` - Get available calendar slots

### Calendar
- `POST /api/compliance/schedule-appointment` - Schedule appointment
- `GET /api/compliance/appointments` - Get appointments

## 🏥 Compliance Features

### Texas Healthcare Marketing Compliance
- **HIPAA Compliance**: Data handling and privacy checks
- **State Regulations**: Texas Medical Board rules validation
- **Accessibility**: WCAG 2.1 AA compliance checks
- **Data Privacy**: GDPR/CCPA compliance validation
- **Marketing Rules**: FDA/FTC healthcare advertising guidelines

### Compliance Checks Include:
- Website scraping permissions
- Email marketing compliance
- Data retention policies
- Privacy policy requirements
- Accessibility standards
- Healthcare marketing disclaimers

## 📧 Email Integration

### Supported Email Services
1. **Microsoft Graph API** (Primary)
2. **Azure Communication Services** (Secondary)
3. **SMTP** (Fallback)

### Email Templates
- Basic SEO reports
- Comprehensive SEO analysis
- Calendar invitations
- Lead notifications

## 🔐 Security Features

- Session-based authentication
- Password hashing (bcrypt/PBKDF2)
- CORS protection
- Helmet security headers
- Input validation and sanitization
- SQL injection prevention

## 🚀 Deployment

### Production Environment
1. Set up production database
2. Configure environment variables
3. Build frontend: `cd frontend && npm run build`
4. Start backend: `cd backend && npm start`
5. Serve static files from `frontend/dist`

### Docker Deployment (Optional)
```bash
# Build and run with Docker Compose
docker-compose up -d
```

## 📊 Monitoring & Analytics

- Real-time lead tracking
- SEO performance metrics
- Email delivery analytics
- Compliance audit logs
- User activity monitoring

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is proprietary software. All rights reserved.

## 🆘 Support

For support and questions:
- Email: viral.tarpara@hotmail.com
- Documentation: See API_DATABASE_FLOW_DIAGRAM.md
- Issues: Create GitHub issues for bugs

## 🔄 Recent Updates

### v2.0.0 - React/Node.js Migration
- ✅ Complete migration from Flask to React/Node.js
- ✅ Added comprehensive compliance checking
- ✅ Implemented lead scraping with website and zip code
- ✅ Added Microsoft Graph API integration
- ✅ Created E2E testing framework
- ✅ Enhanced SEO analysis with real APIs
- ✅ Added calendar booking system
- ✅ Implemented state-specific compliance rules

### Key Improvements
- Modern React frontend with TypeScript
- Scalable Node.js backend with Express
- Comprehensive compliance validation
- Real-time lead generation
- Automated email marketing
- Professional SEO reporting
- Calendar integration
- E2E testing coverage

---

**WeTechForU AI Marketing Platform** - Your Partner in Healthcare Digital Marketing Success# Puppeteer buildpack configured
