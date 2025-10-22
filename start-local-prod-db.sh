#!/bin/bash

# 🚀 Start Local Development with Production Database
# This script starts your local backend connected to Heroku production database

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 MarketingBy - Local Dev with Production Database"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if Heroku CLI is installed
if ! command -v heroku &> /dev/null; then
    echo "❌ Error: Heroku CLI is not installed"
    echo "📦 Install it from: https://devcenter.heroku.com/articles/heroku-cli"
    exit 1
fi

# Check if logged in to Heroku
if ! heroku auth:whoami &> /dev/null; then
    echo "❌ Error: Not logged into Heroku"
    echo "🔐 Run: heroku login"
    exit 1
fi

echo "⚠️  WARNING: You are about to connect to PRODUCTION database!"
echo "📊 Any changes will affect LIVE data."
echo ""
read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Aborted."
    exit 0
fi

echo ""
echo "📡 Fetching Heroku config vars..."

# Get DATABASE_URL from Heroku
export DATABASE_URL=$(heroku config:get DATABASE_URL --app marketingby-wetechforu)

if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: Could not fetch DATABASE_URL from Heroku"
    exit 1
fi

# Get other config vars
export SESSION_SECRET=$(heroku config:get SESSION_SECRET --app marketingby-wetechforu)
export ENCRYPTION_KEY=$(heroku config:get ENCRYPTION_KEY --app marketingby-wetechforu)

# Set local development vars
export PORT=3000
export NODE_ENV=development
export FRONTEND_URL=http://localhost:5173

echo "✅ Environment variables loaded successfully"
echo ""
echo "📊 Configuration:"
echo "   - Database: Connected to Heroku Postgres"
echo "   - Backend Port: 3000"
echo "   - Frontend URL: http://localhost:5173"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔴 LIVE PRODUCTION DATABASE - BE CAREFUL!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Starting backend server..."
echo ""

# Navigate to backend and start
cd backend
npm start

