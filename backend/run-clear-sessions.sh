#!/bin/bash
# Script to clear all chats and sessions for fresh WhatsApp testing
# ⚠️ WARNING: This will deactivate ALL conversations and clear ALL session data

echo "⚠️  WARNING: This will deactivate ALL conversations and clear ALL session data!"
echo ""
echo "This will:"
echo "  - Deactivate all active conversations"
echo "  - Clear all visitor session IDs"
echo "  - Clear all handover requests"
echo "  - Delete all visitor session tracking data"
echo "  - Reset conversation activity timestamps"
echo ""
read -p "Are you sure you want to proceed? Type 'CONFIRM CLEAR ALL' to continue: " confirmation

if [ "$confirmation" != "CONFIRM CLEAR ALL" ]; then
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
    echo "📊 Running cleanup script..."
    echo "Database: $DB_NAME on $DB_HOST:$DB_PORT"
    echo ""
    
    # Run the SQL script
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f clear-all-chats-and-sessions.sql
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Cleanup completed successfully!"
        echo "All conversations deactivated and sessions cleared."
    else
        echo ""
        echo "❌ Error running cleanup script. Please check the error messages above."
        exit 1
    fi
else
    echo "❌ .env file not found. Please run this from the backend directory."
    exit 1
fi

