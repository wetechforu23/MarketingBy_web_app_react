#!/bin/bash
# Script to DELETE all conversations and related data
# ⚠️ WARNING: This will PERMANENTLY DELETE all data!

echo "⚠️  ⚠️  ⚠️  CRITICAL WARNING ⚠️  ⚠️  ⚠️"
echo ""
echo "This will PERMANENTLY DELETE:"
echo "  - ALL conversations"
echo "  - ALL messages"
echo "  - ALL handover requests"
echo "  - ALL visitor sessions"
echo "  - ALL page views and events"
echo ""
echo "THIS CANNOT BE UNDONE!"
echo ""
read -p "Type 'CONFIRM DELETE ALL' to proceed: " confirmation

if [ "$confirmation" != "CONFIRM DELETE ALL" ]; then
    echo "❌ Aborted. No changes made."
    exit 1
fi

# Check if .env file exists
if [ -f .env ]; then
    source .env
    DB_HOST="${DB_HOST:-localhost}"
    DB_PORT="${DB_PORT:-5432}"
    DB_NAME="${DB_NAME:-health_clinic_marketing}"
    DB_USER="${DB_USER:-postgres}"
    DB_PASSWORD="${DB_PASSWORD:-postgres}"
    
    echo ""
    echo "🗑️  Deleting all conversations and related data..."
    echo "Database: $DB_NAME on $DB_HOST:$DB_PORT"
    echo ""
    
    # Run the SQL script
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f delete-all-conversations.sql
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ All conversations and related data deleted successfully!"
    else
        echo ""
        echo "❌ Error running delete script. Please check the error messages above."
        exit 1
    fi
else
    echo "❌ .env file not found. Please run this from the backend directory."
    exit 1
fi

