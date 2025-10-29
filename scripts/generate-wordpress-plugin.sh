#!/bin/bash

# ===================================================
# WeTechForU Chat Widget - WordPress Plugin Generator
# ===================================================
# This script generates a customer-specific WordPress plugin ZIP
# 
# Usage: ./scripts/generate-wordpress-plugin.sh <widget_key> <client_name>
# Example: ./scripts/generate-wordpress-plugin.sh abc123xyz "John's Clinic"
#
# ===================================================

# Check arguments
if [ "$#" -ne 2 ]; then
    echo "❌ Error: Missing arguments"
    echo ""
    echo "Usage: ./scripts/generate-wordpress-plugin.sh <widget_key> <client_name>"
    echo "Example: ./scripts/generate-wordpress-plugin.sh abc123xyz \"John's Clinic\""
    exit 1
fi

WIDGET_KEY="$1"
CLIENT_NAME="$2"
SAFE_CLIENT_NAME=$(echo "$CLIENT_NAME" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -cd '[:alnum:]-')

# Directories
SOURCE_DIR="wordpress-plugin/wetechforu-chat-widget"
BUILD_DIR="wordpress-plugin/builds"
PLUGIN_DIR="$BUILD_DIR/wetechforu-chat-widget-$SAFE_CLIENT_NAME"
ZIP_FILE="wetechforu-chat-widget-$SAFE_CLIENT_NAME.zip"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🤖 WeTechForU Chat Widget - Plugin Generator"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Client: $CLIENT_NAME"
echo "🔑 Widget Key: $WIDGET_KEY"
echo "📦 Output: $BUILD_DIR/$ZIP_FILE"
echo ""

# Create build directory
mkdir -p "$BUILD_DIR"
mkdir -p "$PLUGIN_DIR"

# Copy plugin files
echo "📂 Copying plugin files..."
cp -r "$SOURCE_DIR"/* "$PLUGIN_DIR/"

# Update widget key in plugin file
echo "🔧 Configuring widget key..."
sed -i.bak "s/YOUR_WIDGET_KEY_HERE/$WIDGET_KEY/g" "$PLUGIN_DIR/wetechforu-chat-widget.php"
sed -i.bak "s/BACKEND_URL_HERE/https:\\/\\/marketingby-wetechforu-b67c6bd0bf6b.herokuapp.com/g" "$PLUGIN_DIR/wetechforu-chat-widget.php"
rm "$PLUGIN_DIR"/*.bak

# Update readme with client name
echo "📝 Updating readme..."
sed -i.bak "s/your website/$CLIENT_NAME's website/g" "$PLUGIN_DIR/readme.txt"
rm "$PLUGIN_DIR"/*.bak

# Create ZIP file
echo "🗜️  Creating ZIP file..."
cd "$BUILD_DIR"
zip -r "$ZIP_FILE" "wetechforu-chat-widget-$SAFE_CLIENT_NAME" > /dev/null 2>&1

# Cleanup temp directory
rm -rf "wetechforu-chat-widget-$SAFE_CLIENT_NAME"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ WordPress Plugin Generated Successfully!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📦 ZIP Location: $BUILD_DIR/$ZIP_FILE"
echo ""
echo "📧 Send this file to: $CLIENT_NAME"
echo ""
echo "📋 Installation Instructions:"
echo "   1. Send ZIP file to customer"
echo "   2. Customer uploads via WordPress Admin → Plugins → Add New → Upload"
echo "   3. Customer activates plugin"
echo "   4. Widget automatically works on their site!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd - > /dev/null

