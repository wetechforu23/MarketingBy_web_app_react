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

# Step 2: Add PostgreSQL to Dev
echo ""
echo "🗄️  Step 2: Adding PostgreSQL to DEV app..."
if heroku addons:info heroku-postgresql --app marketingby-wetechforu-dev &> /dev/null; then
    echo "   ✅ PostgreSQL already added to dev app"
else
    echo "   ⚠️  Note: Heroku no longer offers free PostgreSQL. Using Essential-0 ($5/month)"
    echo "   💡 Alternative: Use free external PostgreSQL (Supabase/Neon) for dev - see guide"
    read -p "   Add Essential-0 PostgreSQL to dev? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        heroku addons:create heroku-postgresql:essential-0 --app marketingby-wetechforu-dev
        echo "   ✅ PostgreSQL Essential-0 added to dev app ($5/month)"
    else
        echo "   ⚠️  Skipping database setup. You can add it later or use external free DB"
    fi
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

# Step 8: Copy Production Config to Dev (optional)
echo ""
echo "📋 Step 8: Copying production config to dev..."
read -p "   Copy production environment variables to dev? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Get production config
    heroku config --app marketingby-wetechforu-b67c6bd0bf6b --shell > /tmp/prod-config.txt
    
    # Filter out DATABASE_URL and set dev-specific values
    while IFS='=' read -r key value; do
        if [ "$key" != "DATABASE_URL" ] && [ "$key" != "NODE_ENV" ]; then
            # Remove quotes from value
            value=$(echo "$value" | sed 's/^"//;s/"$//')
            heroku config:set "$key=$value" --app marketingby-wetechforu-dev 2>/dev/null || true
        fi
    done < /tmp/prod-config.txt
    
    # Set dev-specific DATABASE_URL
    DEV_DB_URL=$(heroku config:get DATABASE_URL --app marketingby-wetechforu-dev)
    heroku config:set DATABASE_URL="$DEV_DB_URL" --app marketingby-wetechforu-dev
    
    echo "   ✅ Config copied (DATABASE_URL and NODE_ENV set to dev values)"
fi

# Summary
echo ""
echo "=========================================="
echo "✅ Setup Complete!"
echo "=========================================="
echo ""
echo "📱 Apps:"
echo "   Dev:  https://marketingby-wetechforu-dev.herokuapp.com"
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
echo "📊 View Pipeline:"
echo "   https://dashboard.heroku.com/pipelines/marketingby-wetechforu"
echo ""
echo "💰 Cost:"
echo "   Dev:  FREE (hobby dyno + hobby-dev database)"
echo "   Prod: $5/month (Essential-0 PostgreSQL)"
echo "   Total: $5/month (same as current!)"
echo ""
echo "🎉 You're all set! Start developing on the dev branch!"

