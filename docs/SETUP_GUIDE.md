# WeTechForU Healthcare Marketing Platform - Setup Guide

## 🚀 Quick Start

### Prerequisites

- Python 3.9 or higher
- PostgreSQL 12 or higher
- Git
- Virtual environment (recommended)

### 1. Clone and Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/WeTechForU-Healthcare-Marketing-Platform.git
cd WeTechForU-Healthcare-Marketing-Platform

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Database Setup

```bash
# Create PostgreSQL database
createdb health_clinic_marketing

# Initialize database schema
python scripts/init_database.py
```

### 3. Environment Configuration

```bash
# Copy environment template
cp config/env.example .env

# Edit .env with your configuration
nano .env
```

### 4. Run the Application

```bash
# Start the development server
python main.py

# Access the platform
# Admin Portal: http://localhost:9000/admin
# Client Portal: http://localhost:9000/customer
```

## 🔧 Configuration

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/db` |
| `SECRET_KEY` | Flask secret key | `your-secret-key-here` |
| `AZURE_CLIENT_ID` | Azure app registration client ID | `12345678-1234-1234-1234-123456789012` |
| `AZURE_CLIENT_SECRET` | Azure app registration secret | `your-azure-secret` |
| `AZURE_TENANT_ID` | Azure tenant ID | `12345678-1234-1234-1234-123456789012` |
| `SMTP_SENDER_EMAIL` | Business email for sending | `info@yourdomain.com` |

### Optional Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `FLASK_PORT` | Port to run the application | `9000` |
| `DEBUG` | Enable debug mode | `false` |
| `BASE_URL` | Base URL for the application | `http://localhost:9000` |

## 📊 Features Overview

### Email Tracking System
- Real-time email open tracking
- Click-through rate monitoring
- Secure OTP-based report access
- Comprehensive engagement analytics

### SEO Analysis
- Advanced SEO scoring algorithm
- Competitor analysis
- Keyword research and suggestions
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

# Run with coverage
python -m pytest --cov=app tests/

# Run specific test file
python -m pytest tests/test_models.py
```

## 🚀 Deployment

### Docker Deployment

```bash
# Build and run with docker-compose
docker-compose up -d

# View logs
docker-compose logs -f web
```

### Production Deployment

1. **Server Setup**
   ```bash
   # Install dependencies
   sudo apt update
   sudo apt install python3-pip postgresql nginx
   
   # Create application user
   sudo useradd -m -s /bin/bash wetechforu
   ```

2. **Database Setup**
   ```bash
   # Create production database
   sudo -u postgres createdb health_clinic_marketing_prod
   
   # Create application user
   sudo -u postgres createuser wetechforu
   sudo -u postgres psql -c "ALTER USER wetechforu PASSWORD 'secure_password';"
   sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE health_clinic_marketing_prod TO wetechforu;"
   ```

3. **Application Deployment**
   ```bash
   # Clone repository
   git clone https://github.com/yourusername/WeTechForU-Healthcare-Marketing-Platform.git
   cd WeTechForU-Healthcare-Marketing-Platform
   
   # Install dependencies
   pip3 install -r requirements.txt
   
   # Configure environment
   cp config/env.example .env
   # Edit .env with production values
   
   # Initialize database
   python scripts/init_database.py
   ```

4. **Nginx Configuration**
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;
       
       location / {
           proxy_pass http://127.0.0.1:9000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

5. **Systemd Service**
   ```ini
   [Unit]
   Description=WeTechForU Healthcare Marketing Platform
   After=network.target

   [Service]
   User=wetechforu
   WorkingDirectory=/home/wetechforu/WeTechForU-Healthcare-Marketing-Platform
   Environment=PATH=/home/wetechforu/WeTechForU-Healthcare-Marketing-Platform/venv/bin
   ExecStart=/home/wetechforu/WeTechForU-Healthcare-Marketing-Platform/venv/bin/python main.py
   Restart=always

   [Install]
   WantedBy=multi-user.target
   ```

## 🔒 Security Considerations

### Data Protection
- All sensitive data is encrypted at rest
- HTTPS is required for production
- API keys are stored securely
- Regular security audits

### Compliance
- HIPAA compliance for healthcare data
- GDPR compliance for EU users
- Regular compliance reviews
- Data retention policies

### Access Control
- Role-based access control
- Multi-factor authentication
- Session management
- Audit logging

## 📈 Monitoring and Maintenance

### Health Checks
- Application health endpoint: `/health`
- Database connectivity checks
- Email service status
- API endpoint monitoring

### Logging
- Application logs in `logs/` directory
- Error tracking and alerting
- Performance monitoring
- User activity logging

### Backup Strategy
- Daily database backups
- Configuration file backups
- Log file rotation
- Disaster recovery plan

## 🆘 Troubleshooting

### Common Issues

1. **Database Connection Error**
   ```bash
   # Check PostgreSQL status
   sudo systemctl status postgresql
   
   # Test connection
   psql -h localhost -U postgres -d health_clinic_marketing
   ```

2. **Email Service Not Working**
   ```bash
   # Check Azure credentials
   python -c "from app.services.azure_email_service import AzureEmailService; print(AzureEmailService().is_configured)"
   ```

3. **Port Already in Use**
   ```bash
   # Find process using port 9000
   lsof -i :9000
   
   # Kill process
   kill -9 <PID>
   ```

### Getting Help

- Check the logs in `logs/` directory
- Review the documentation in `docs/`
- Create an issue on GitHub
- Contact support: healthcare@wetechforu.com

## 📚 Additional Resources

- [API Documentation](API_DOCUMENTATION.md)
- [Database Schema](DATABASE_SCHEMA.md)
- [Email Configuration](EMAIL_SETUP.md)
- [Security Guide](SECURITY_GUIDE.md)
- [Deployment Guide](DEPLOYMENT_GUIDE.md)
