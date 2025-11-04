#!/bin/bash
# Clear all sessions for widget wtfu_464ed6cab852594fce9034020d77dee3

echo "🔍 Clearing all sessions for widget wtfu_464ed6cab852594fce9034020d77dee3..."
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL not set. Loading from .env..."
    if [ -f .env ]; then
        export $(cat .env | grep -v '^#' | xargs)
    else
        echo "❌ Error: .env file not found"
        exit 1
    fi
fi

# Run the SQL script
psql "$DATABASE_URL" -f database/clear_widget_sessions.sql

echo ""
echo "✅ Done! Don't forget to clear browser localStorage and sessionStorage:"
echo "   - Open browser DevTools (F12)"
echo "   - Go to Application tab > Local Storage"
echo "   - Delete keys containing: wtfu_464ed6cab852594fce9034020d77dee3"
echo "   - Delete keys containing: visitor_session_id"
echo "   - Also check Session Storage tab"

