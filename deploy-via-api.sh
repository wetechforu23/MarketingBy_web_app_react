#!/bin/bash
# Deploy to Heroku via API (works when git push fails)

echo "🚀 Deploying to Heroku via API..."
BUILD_INFO=$(curl -s -X POST https://api.heroku.com/apps/marketingby-wetechforu/builds \
  -H "Content-Type: application/json" \
  -H "Accept: application/vnd.heroku+json; version=3" \
  -H "Authorization: Bearer $(heroku auth:token 2>/dev/null)" \
  -d '{"source_blob":{"url":"https://github.com/wetechforu23/MarketingBy_web_app_react/archive/main.tar.gz"}}')

BUILD_ID=$(echo "$BUILD_INFO" | python3 -c "import sys, json; print(json.load(sys.stdin).get('id', ''))" 2>/dev/null)

if [ -z "$BUILD_ID" ]; then
  echo "❌ Build creation failed"
  echo "$BUILD_INFO"
  exit 1
fi

echo "✅ Build created: $BUILD_ID"
echo "📊 Monitor build: heroku builds:info $BUILD_ID --app marketingby-wetechforu"
echo "📋 View logs: heroku builds:output $BUILD_ID --app marketingby-wetechforu"

