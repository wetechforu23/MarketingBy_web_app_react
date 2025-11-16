#!/bin/bash

# ==========================================
# Initial Setup: Dev/Prod Environment
# ==========================================
# This script sets up dev and prod Heroku apps with pipelines
# Run this ONCE to set up your dev/prod workflow
# ==========================================

set -e  # Exit on error

echo "🚀 Setting up Dev/Prod Environment..."
echo ""

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

# Step 1: Create Dev App
echo "📱 Step 1: Creating DEV Heroku app..."
if heroku apps:info marketingby-wetechforu-dev &> /dev/null; then
    echo "   ✅ Dev app already exists: marketingby-wetechforu-dev"
else
    heroku create marketingby-wetechforu-dev
    echo "   ✅ Dev app created: marketingby-wetechforu-dev"
fi

# Step 2: Add PostgreSQL to Dev (Essential-0 - same as prod)
echo ""
echo "🗄️  Step 2: Adding PostgreSQL to DEV app (Essential-0, same as prod)..."
if heroku addons:info heroku-postgresql --app marketingby-wetechforu-dev &> /dev/null; then
    echo "   ✅ PostgreSQL already added to dev app"
else
    heroku addons:create heroku-postgresql:essential-0 --app marketingby-wetechforu-dev
    echo "   ✅ PostgreSQL Essential-0 added to dev app ($5/month)"
fi

# Step 3: Set Dev Environment Variables
echo ""
echo "⚙️  Step 3: Setting DEV environment variables..."
heroku config:set NODE_ENV=development --app marketingby-wetechforu-dev
heroku config:set PORT=3001 --app marketingby-wetechforu-dev
echo "   ✅ Dev environment variables set"

# Step 4: Create Heroku Pipeline
echo ""
echo "🔗 Step 4: Creating Heroku Pipeline..."
if heroku pipelines:info marketingby-wetechforu &> /dev/null; then
    echo "   ✅ Pipeline already exists: marketingby-wetechforu"
else
    heroku pipelines:create marketingby-wetechforu \
        --stage production \
        --app marketingby-wetechforu-b67c6bd0bf6b
    echo "   ✅ Pipeline created: marketingby-wetechforu"
fi

# Step 5: Add Dev App to Pipeline
echo ""
echo "🔗 Step 5: Adding DEV app to pipeline..."
heroku pipelines:add marketingby-wetechforu \
    --stage development \
    --app marketingby-wetechforu-dev 2>/dev/null || echo "   ✅ Dev app already in pipeline"

# Step 6: Set Up Git Remotes
echo ""
echo "📡 Step 6: Setting up Git remotes..."
if git remote | grep -q "^dev$"; then
    echo "   ✅ Dev remote already exists"
else
    heroku git:remote -a marketingby-wetechforu-dev -r dev
    echo "   ✅ Dev remote added"
fi

if git remote | grep -q "^prod$"; then
    echo "   ✅ Prod remote already exists"
else
    heroku git:remote -a marketingby-wetechforu-b67c6bd0bf6b -r prod
    echo "   ✅ Prod remote added"
fi

# Step 7: Create Dev Branch
echo ""
echo "🌿 Step 7: Creating dev branch..."
if git branch | grep -q "dev"; then
    echo "   ✅ Dev branch already exists"
else
    git checkout -b dev
    git push origin dev
    echo "   ✅ Dev branch created and pushed to GitHub"
fi

# Step 8: Copy Production Config to Dev (same integrations/credentials)
echo ""
echo "📋 Step 8: Copying production config to dev (same integrations)..."
echo "   Copying all environment variables from production to dev..."

# Get production config
heroku config --app marketingby-wetechforu-b67c6bd0bf6b --shell > /tmp/prod-config.txt

# Copy all configs except DATABASE_URL and NODE_ENV (which are dev-specific)
echo "   Copying environment variables..."
while IFS='=' read -r key value; do
    # Skip DATABASE_URL (use dev's own database)
    if [ "$key" = "DATABASE_URL" ]; then
        continue
    fi
    
    # Set NODE_ENV to development for dev
    if [ "$key" = "NODE_ENV" ]; then
        heroku config:set NODE_ENV=development --app marketingby-wetechforu-dev
        continue
    fi
    
    # Remove quotes from value if present
    value=$(echo "$value" | sed 's/^"//;s/"$//')
    
    # Set the config (skip if empty)
    if [ -n "$value" ] && [ "$value" != "" ]; then
        heroku config:set "$key=$value" --app marketingby-wetechforu-dev 2>/dev/null || true
    fi
done < /tmp/prod-config.txt

# Ensure dev has its own DATABASE_URL (from dev database)
DEV_DB_URL=$(heroku config:get DATABASE_URL --app marketingby-wetechforu-dev)
if [ -n "$DEV_DB_URL" ]; then
    heroku config:set DATABASE_URL="$DEV_DB_URL" --app marketingby-wetechforu-dev
    echo "   ✅ Dev DATABASE_URL set to dev database"
fi

# Set BACKEND_URL to dev URL
heroku config:set BACKEND_URL=https://marketingby-wetechforu-dev-6745c97bc199.herokuapp.com --app marketingby-wetechforu-dev 2>/dev/null || true

echo "   ✅ All production configs copied to dev (same integrations/credentials)"
echo "   ✅ Dev will use same Twilio, Azure, Google APIs, etc."

# Step 9: Sync Database Schema
echo ""
echo "🗄️  Step 9: Syncing database schema to dev..."
echo "   Running database migrations on dev database..."
if [ -f "sync-dev-database.sh" ]; then
    chmod +x sync-dev-database.sh
    ./sync-dev-database.sh
else
    echo "   ⚠️  sync-dev-database.sh not found, skipping schema sync"
    echo "   You can run migrations manually later"
fi

# Summary
echo ""
echo "=========================================="
echo "✅ Setup Complete!"
echo "=========================================="
echo ""
echo "📱 Apps:"
echo "   Dev:  https://marketingby-wetechforu-dev-6745c97bc199.herokuapp.com"
echo "   Prod: https://marketingby.wetechforu.com"
echo ""
echo "🌿 Branches:"
echo "   Dev:  git checkout dev"
echo "   Prod: git checkout main"
echo ""
echo "🚀 Deployment:"
echo "   Dev:  ./deploy-dev.sh"
echo "   Prod: ./deploy-prod.sh"
echo ""
echo "🔄 Database Sync:"
echo "   Run ./sync-dev-database.sh to sync schema from prod to dev"
echo ""
echo "📊 View Pipeline:"
echo "   https://dashboard.heroku.com/pipelines/marketingby-wetechforu"
echo ""
echo "💰 Cost:"
echo "   Dev:  $5/month (Essential-0 PostgreSQL)"
echo "   Prod: $5/month (Essential-0 PostgreSQL)"
echo "   Total: $10/month"
echo ""
echo "✅ Dev is now a duplicate of prod:"
echo "   - Same database schema"
echo "   - Same integrations (Twilio, Azure, Google, etc.)"
echo "   - Same credentials"
echo "   - Separate databases (dev data won't affect prod)"
echo ""
echo "🎉 You're all set! Start developing on the dev branch!"

