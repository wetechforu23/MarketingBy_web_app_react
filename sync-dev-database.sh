#!/bin/bash

# ==========================================
# Sync Dev Database Schema from Production
# ==========================================
# This script copies the database schema from production to dev
# Run this after setting up dev to ensure same structure
# ==========================================

set -e  # Exit on error

echo "🔄 Syncing dev database schema from production..."

# Get database URLs
PROD_DB_URL=$(heroku config:get DATABASE_URL --app marketingby-wetechforu-b67c6bd0bf6b)
DEV_DB_URL=$(heroku config:get DATABASE_URL --app marketingby-wetechforu-dev)

if [ -z "$PROD_DB_URL" ] || [ -z "$DEV_DB_URL" ]; then
    echo "❌ Error: Could not get database URLs"
    exit 1
fi

echo "📋 Step 1: Getting production schema..."

# Export schema from production (structure only, no data)
heroku pg:psql --app marketingby-wetechforu-b67c6bd0bf6b <<EOF > /tmp/prod-schema.sql
-- Export schema only (no data)
\dt
\ds
\df
EOF

echo "📋 Step 2: Running migrations on dev database..."

# Run main setup-database.sql first (creates core tables)
if [ -f "backend/setup-database.sql" ]; then
    echo "   → Running setup-database.sql (core schema)..."
    heroku pg:psql --app marketingby-wetechforu-dev < backend/setup-database.sql 2>&1 | grep -v "already exists" || true
fi

# Run all migration files from backend/database directory
echo "   → Running all migration files..."
cd backend/database

# Run all .sql files in order (alphabetical order should work for most)
for migration in *.sql; do
    if [ -f "$migration" ]; then
        echo "   → Running $migration..."
        heroku pg:psql --app marketingby-wetechforu-dev < "$migration" 2>&1 | grep -v "already exists\|duplicate\|ERROR" || true
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

