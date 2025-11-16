#!/bin/bash

# ==========================================
# Deploy to PRODUCTION Server
# ==========================================
# This script deploys the main branch to the production Heroku app
# Usage: ./deploy-prod.sh
# ==========================================

set -e  # Exit on error

echo "🚀 Deploying to PRODUCTION server..."

# Check if prod remote exists
if ! git remote | grep -q "^prod$"; then
    echo "❌ Prod remote not found. Setting up..."
    # Detect production app name
    PROD_APP=$(heroku apps 2>&1 | grep -i marketing | grep -v dev | head -1 | awk '{print $1}')
    if [ -z "$PROD_APP" ]; then
        PROD_APP="marketingby-wetechforu"  # Default fallback
    fi
    heroku git:remote -a "$PROD_APP" -r prod
fi

# Ensure we're on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "⚠️  Warning: Not on main branch. Current branch: $CURRENT_BRANCH"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Safety confirmation
echo "⚠️  WARNING: You are about to deploy to PRODUCTION!"
echo "   Make sure you have:"
echo "   1. ✅ Tested on dev server"
echo "   2. ✅ Merged dev branch to main"
echo "   3. ✅ All tests passing"
echo ""
read -p "Continue with production deployment? (type 'yes' to confirm): " -r
if [ "$REPLY" != "yes" ]; then
    echo "❌ Deployment cancelled."
    exit 1
fi

# Push to production Heroku app
echo "📤 Pushing to production Heroku app..."
git push prod main:main

# Wait for build to complete
echo "⏳ Waiting for build to complete..."
sleep 5

# Show deployment info
echo ""
echo "✅ Production deployment complete!"
echo "🌐 Prod URL: https://marketingby.wetechforu.com"
echo "📊 View logs: heroku logs --tail --app marketingby-wetechforu-b67c6bd0bf6b"
echo ""
echo "🎉 Your changes are now live in production!"

