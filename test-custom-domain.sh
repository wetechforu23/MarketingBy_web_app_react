#!/bin/bash

echo "🧪 Testing Custom Domain Configuration..."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  Testing DNS Resolution..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "🔍 Checking www.marketingby.wetechforu.com..."
dig www.marketingby.wetechforu.com CNAME +short | head -3
echo ""

echo "🔍 Checking marketingby.wetechforu.com..."
dig marketingby.wetechforu.com CNAME +short | head -3
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  Testing HTTP Response..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "🌐 Testing https://www.marketingby.wetechforu.com..."
curl -I https://www.marketingby.wetechforu.com 2>&1 | head -5
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣  Testing API Health..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "🏥 Testing https://www.marketingby.wetechforu.com/api/health..."
curl -s https://www.marketingby.wetechforu.com/api/health 2>&1 | head -5
echo ""
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Test Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "If you see errors, wait a few more minutes for DNS propagation."
echo "Run this script again to re-test: ./test-custom-domain.sh"

