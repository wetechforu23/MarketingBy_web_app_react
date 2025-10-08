#!/bin/bash

# MarketingBy Healthcare Platform - Heroku Deployment Script
echo "🚀 Starting Heroku deployment for MarketingBy Healthcare Platform..."

# Check if Heroku CLI is installed
if ! command -v heroku &> /dev/null; then
    echo "❌ Heroku CLI is not installed. Please install it first:"
    echo "   https://devcenter.heroku.com/articles/heroku-cli"
    exit 1
fi

# Check if logged in to Heroku
if ! heroku auth:whoami &> /dev/null; then
    echo "🔐 Please login to Heroku first:"
    heroku login
fi

# Create new Heroku app
echo "📱 Creating new Heroku app..."
heroku create marketingby-healthcare-platform

# Add PostgreSQL database
echo "🗄️ Adding PostgreSQL database (Essential plan - $5/month)..."
heroku addons:create heroku-postgresql:essential-0 --app marketingby-healthcare-platform

# Set environment variables
echo "⚙️ Setting environment variables..."
heroku config:set NODE_ENV=production --app marketingby-healthcare-platform
heroku config:set PORT=3001 --app marketingby-healthcare-platform

# Set up buildpack
echo "🔧 Setting up Node.js buildpack..."
heroku buildpacks:set heroku/nodejs --app marketingby-healthcare-platform

# Deploy to Heroku
echo "🚀 Deploying to Heroku..."
git push heroku main

# Run database migrations
echo "🗄️ Setting up database..."
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

echo "✅ Deployment completed!"
echo "🌐 Your app is available at: https://marketingby-healthcare-platform.herokuapp.com"
echo "📊 View logs: heroku logs --tail --app marketingby-healthcare-platform"
echo "⚙️ Manage app: https://dashboard.heroku.com/apps/marketingby-healthcare-platform"
