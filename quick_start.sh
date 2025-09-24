#!/bin/bash

# WeTechForU Healthcare Marketing Platform - Quick Start Script
# This script sets up the development environment quickly

echo "🏥 WeTechForU Healthcare Marketing Platform - Quick Start"
echo "========================================================"

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.9+ first."
    exit 1
fi

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed. Please install PostgreSQL first."
    exit 1
fi

echo "✅ Python 3 and PostgreSQL are installed"

# Create virtual environment
echo "📦 Creating virtual environment..."
python3 -m venv venv

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📚 Installing dependencies..."
pip install -r requirements.txt

# Copy environment template
echo "⚙️  Setting up environment configuration..."
if [ ! -f .env ]; then
    cp config/env.example .env
    echo "📝 Created .env file from template. Please edit it with your configuration."
else
    echo "✅ .env file already exists"
fi

# Check if database exists
echo "🗄️  Checking database..."
if psql -lqt | cut -d \| -f 1 | grep -qw health_clinic_marketing; then
    echo "✅ Database 'health_clinic_marketing' already exists"
else
    echo "📊 Creating database..."
    createdb health_clinic_marketing
    echo "✅ Database created successfully"
fi

# Initialize database schema
echo "🔧 Initializing database schema..."
python scripts/init_database.py

echo ""
echo "🎉 Setup Complete!"
echo "=================="
echo ""
echo "Next steps:"
echo "1. Edit .env file with your configuration:"
echo "   nano .env"
echo ""
echo "2. Start the application:"
echo "   python main.py"
echo ""
echo "3. Access the platform:"
echo "   Admin Portal: http://localhost:9000/admin"
echo "   Client Portal: http://localhost:9000/customer"
echo ""
echo "4. Default login credentials:"
echo "   Admin: admin@wetechforu.com / admin123"
echo "   Customer: customer@wetechforu.com / customer123"
echo ""
echo "📚 For detailed setup instructions, see:"
echo "   - README.md"
echo "   - docs/SETUP_GUIDE.md"
echo "   - NEXT_STEPS.md"
echo ""
echo "🚀 Happy coding!"
