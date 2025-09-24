# WeTechForU Healthcare Marketing Platform

A comprehensive AI-powered healthcare marketing automation platform built with Python/Flask, PostgreSQL, and advanced email tracking capabilities.

## 🏥 Features

- **AI-Powered Client Management & CRM**
- **Intelligent SEO Audit & Optimization**
- **Multi-Industry Lead Discovery**
- **Automated Campaign Management**
- **Content Approval Workflow**
- **Real-time Analytics Dashboard**
- **Advanced Email Tracking System**
- **Keyword Research & Competitor Analysis**
- **Healthcare Compliance (HIPAA/GDPR)**

## 🚀 Quick Start

### Prerequisites

- Python 3.9+
- PostgreSQL 12+
- Node.js (for frontend assets)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/WeTechForU-Healthcare-Marketing-Platform.git
   cd WeTechForU-Healthcare-Marketing-Platform
   ```

2. **Create virtual environment**
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Setup environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Initialize database**
   ```bash
   python scripts/init_database.py
   ```

6. **Run the application**
   ```bash
   python main.py
   ```

7. **Access the platform**
   - Admin Portal: http://localhost:9000/admin
   - Client Portal: http://localhost:9000/customer
   - API Documentation: http://localhost:9000/api/docs

## 📁 Project Structure

```
WeTechForU-Healthcare-Marketing-Platform/
├── app/                    # Main application code
│   ├── models/            # Database models
│   ├── routes/            # API routes and views
│   ├── services/          # Business logic services
│   └── utils/             # Utility functions
├── config/                # Configuration files
├── database/              # Database scripts and migrations
├── docs/                  # Documentation
├── scripts/               # Utility scripts
├── static/                # Static assets (CSS, JS, images)
├── templates/             # HTML templates
├── tests/                 # Test files
├── main.py               # Application entry point
├── requirements.txt      # Python dependencies
└── README.md            # This file
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file with the following variables:

```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/health_clinic_marketing

# Flask
SECRET_KEY=your-secret-key-here
FLASK_PORT=9000
BASE_URL=http://localhost:9000

# Azure Email Service
AZURE_CLIENT_ID=your-azure-client-id
AZURE_CLIENT_SECRET=your-azure-client-secret
AZURE_TENANT_ID=your-azure-tenant-id
SMTP_SENDER_EMAIL=your-email@domain.com

# Google APIs
GOOGLE_MAPS_API_KEY=your-google-maps-api-key
GOOGLE_PLACES_API_KEY=your-google-places-api-key

# Other APIs
GODADDY_API_KEY=your-godaddy-api-key
GODADDY_API_SECRET=your-godaddy-api-secret
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
```

## 📊 Key Features

### Email Tracking System
- Real-time email open tracking
- Click-through rate monitoring
- Secure OTP-based report access
- Comprehensive engagement analytics

### SEO Analysis
- Advanced SEO scoring
- Competitor analysis
- Keyword research
- Technical SEO recommendations

### Lead Management
- Multi-source lead generation
- Automated lead scoring
- CRM integration
- Follow-up automation

### Healthcare Compliance
- HIPAA-compliant data handling
- GDPR compliance features
- Secure data encryption
- Audit trail logging

## 🧪 Testing

```bash
# Run all tests
python -m pytest tests/

# Run specific test categories
python -m pytest tests/test_models.py
python -m pytest tests/test_routes.py
python -m pytest tests/test_services.py
```

## 📈 API Documentation

The platform provides a comprehensive REST API:

- **Authentication**: JWT-based authentication
- **Lead Management**: CRUD operations for leads
- **Email Campaigns**: Campaign creation and tracking
- **SEO Analysis**: Website analysis and reporting
- **Analytics**: Real-time performance metrics

## 🚀 Deployment

### Docker Deployment

```bash
# Build the image
docker build -t wetechforu-marketing .

# Run with docker-compose
docker-compose up -d
```

### Production Deployment

1. Set up PostgreSQL database
2. Configure environment variables
3. Run database migrations
4. Deploy with Gunicorn or similar WSGI server
5. Set up reverse proxy (Nginx)
6. Configure SSL certificates

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Email: healthcare@wetechforu.com
- Documentation: [docs.wetechforu.com](https://docs.wetechforu.com)
- Issues: [GitHub Issues](https://github.com/yourusername/WeTechForU-Healthcare-Marketing-Platform/issues)

## 🏆 Acknowledgments

- Built with Flask and SQLAlchemy
- Email tracking powered by Azure Graph API
- SEO analysis using BeautifulSoup and custom algorithms
- Frontend built with Bootstrap 5
- Icons by Font Awesome

---

**WeTechForU Healthcare Marketing Platform** - Empowering healthcare practices with AI-driven marketing automation.
