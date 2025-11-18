#!/bin/bash

# ==========================================
# Deploy to DEV Server
# ==========================================
# This script deploys the dev branch to the dev Heroku app
# Usage: ./deploy-dev.sh
# ==========================================

set -e  # Exit on error

echo "🚀 Deploying to DEV server..."

# Check if dev remote exists
if ! git remote | grep -q "^dev$"; then
    echo "❌ Dev remote not found. Setting up..."
    heroku git:remote -a marketingby-wetechforu-dev -r dev
fi

# Ensure we're on dev branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "dev" ]; then
    echo "⚠️  Warning: Not on dev branch. Current branch: $CURRENT_BRANCH"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Push to dev Heroku app
echo "📤 Pushing to dev Heroku app..."
git push dev dev:main

# Wait for build to complete
echo "⏳ Waiting for build to complete..."
sleep 5

# Show deployment info
echo ""
echo "✅ Dev deployment complete!"
echo "🌐 Dev URL: https://marketingby-wetechforu-dev.herokuapp.com"
echo "📊 View logs: heroku logs --tail --app marketingby-wetechforu-dev"
echo ""
echo "🧪 Test your changes on the dev server before deploying to production!"

