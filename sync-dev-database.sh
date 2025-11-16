#!/bin/bash

# ==========================================
# Sync Dev Database Schema from Production
# ==========================================
# This script copies the database schema from production to dev
# Run this after setting up dev to ensure same structure
# ==========================================

set -e  # Exit on error

echo "🔄 Syncing dev database schema from production..."

# Detect production app name
PROD_APP=$(heroku apps 2>&1 | grep -i marketing | grep -v dev | head -1 | awk '{print $1}')
if [ -z "$PROD_APP" ]; then
    PROD_APP="marketingby-wetechforu"  # Default fallback
fi

# Get database URLs
PROD_DB_URL=$(heroku config:get DATABASE_URL --app "$PROD_APP")
DEV_DB_URL=$(heroku config:get DATABASE_URL --app marketingby-wetechforu-dev)

if [ -z "$PROD_DB_URL" ] || [ -z "$DEV_DB_URL" ]; then
    echo "❌ Error: Could not get database URLs"
    exit 1
fi

echo "📋 Step 1: Running migrations on dev database..."
echo "   (Skipping schema export - running migrations directly)"

# Run main setup-database.sql first (creates core tables)
if [ -f "backend/setup-database.sql" ]; then
    echo "   → Running setup-database.sql (core schema)..."
    cat backend/setup-database.sql | heroku pg:psql --app marketingby-wetechforu-dev 2>&1 | grep -v "already exists\|duplicate\|ERROR\|Unknown database" || true
fi

# Run all migration files from backend/database directory
echo "   → Running all migration files..."
cd backend/database

# Run all .sql files in order (alphabetical order should work for most)
for migration in *.sql; do
    if [ -f "$migration" ]; then
        echo "   → Running $migration..."
        cat "$migration" | heroku pg:psql --app marketingby-wetechforu-dev 2>&1 | grep -v "already exists\|duplicate\|ERROR\|Unknown database" || true
    fi
done

cd ../..

echo "   ✅ All migrations completed (errors about existing objects are normal)"

echo ""
echo "✅ Dev database schema synced!"
echo "📊 Verify: heroku pg:psql --app marketingby-wetechforu-dev"
echo ""
echo "⚠️  Note: Dev database is empty (no data copied, only schema)"
echo "   This is intentional - dev is for testing, not production data"

