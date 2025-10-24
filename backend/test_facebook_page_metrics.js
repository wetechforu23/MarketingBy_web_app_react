/**
 * Test Facebook Page Metrics API
 * This script tests the Facebook Graph API v18.0 connection for a specific client
 */

require('dotenv').config();
const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const baseUrl = 'https://graph.facebook.com/v18.0';

async function testFacebookPageMetrics(clientId) {
  try {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🔍 Testing Facebook Page Metrics for Client ID: ${clientId}`);
    console.log(`${'='.repeat(80)}\n`);

    // Step 1: Get client info
    console.log(`📋 Step 1: Fetching client information...`);
    const clientResult = await pool.query(
      'SELECT id, client_name as name, email FROM clients WHERE id = $1',
      [clientId]
    );

    if (clientResult.rows.length === 0) {
      console.error(`❌ Client ${clientId} not found in database`);
      return;
    }

    const client = clientResult.rows[0];
    console.log(`✅ Client found: ${client.name} (${client.email})`);

    // Step 2: Get Facebook credentials
    console.log(`\n🔑 Step 2: Fetching Facebook credentials...`);
    const credsResult = await pool.query(
      'SELECT credentials FROM client_credentials WHERE client_id = $1 AND service_type = $2',
      [clientId, 'facebook']
    );

    if (credsResult.rows.length === 0) {
      console.error(`❌ No Facebook credentials found for client ${clientId}`);
      console.log(`💡 Tip: Add Facebook credentials in the Settings tab for this client`);
      return;
    }

    const credentials = credsResult.rows[0].credentials;
    const pageId = credentials.page_id;
    const accessToken = credentials.access_token;

    console.log(`✅ Credentials found:`);
    console.log(`   📄 Page ID: ${pageId}`);
    console.log(`   🔑 Token: ${accessToken.substring(0, 20)}...${accessToken.substring(accessToken.length - 10)}`);
    console.log(`   🔑 Token Length: ${accessToken.length} characters`);

    // Step 3: Test token validity
    console.log(`\n🔐 Step 3: Testing token validity...`);
    try {
      const debugResponse = await axios.get(`${baseUrl}/debug_token`, {
        params: {
          input_token: accessToken,
          access_token: accessToken
        }
      });

      const tokenData = debugResponse.data.data;
      console.log(`✅ Token is valid:`);
      console.log(`   App ID: ${tokenData.app_id}`);
      console.log(`   Type: ${tokenData.type}`);
      console.log(`   Expires: ${tokenData.expires_at ? new Date(tokenData.expires_at * 1000).toLocaleString() : 'Never'}`);
      console.log(`   Scopes: ${tokenData.scopes?.join(', ') || 'None'}`);
    } catch (error) {
      console.error(`❌ Token validation failed:`, error.response?.data || error.message);
      return;
    }

    // Step 4: Test each metric
    console.log(`\n📊 Step 4: Testing each of the 8 core metrics...\n`);

    const metrics = [
      { name: 'page_impressions', period: 'days_28' },
      { name: 'page_impressions_unique', period: 'days_28' },
      { name: 'page_views_total', period: 'days_28' },
      { name: 'page_posts_impressions', period: 'days_28' },
      { name: 'page_posts_impressions_unique', period: 'days_28' },
      { name: 'page_fans', period: 'lifetime' },
      { name: 'page_fan_adds', period: 'days_28' },
      { name: 'page_fan_removes', period: 'days_28' }
    ];

    for (const metric of metrics) {
      try {
        console.log(`  📊 Testing ${metric.name} (${metric.period})...`);
        
        const response = await axios.get(
          `${baseUrl}/${pageId}/insights/${metric.name}`,
          {
            params: {
              access_token: accessToken,
              period: metric.period
            }
          }
        );

        if (response.data.data && response.data.data.length > 0) {
          const insight = response.data.data[0];
          const values = insight.values || [];
          
          if (values.length > 0) {
            const latestValue = values[values.length - 1];
            console.log(`     ✅ SUCCESS: ${latestValue.value}`);
            console.log(`     📅 End Time: ${latestValue.end_time}`);
          } else {
            console.log(`     ⚠️  No values returned`);
          }
        } else {
          console.log(`     ⚠️  No data returned`);
        }
      } catch (error) {
        console.error(`     ❌ FAILED: ${error.message}`);
        if (error.response?.data) {
          console.error(`     📋 Error Details:`, JSON.stringify(error.response.data, null, 2));
        }
      }
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log(`✅ Test Complete`);
    console.log(`${'='.repeat(80)}\n`);

  } catch (error) {
    console.error(`\n❌ Test failed:`, error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

// Get client ID from command line argument
const clientId = process.argv[2];

if (!clientId) {
  console.error('❌ Usage: node test_facebook_page_metrics.js <client_id>');
  console.log('💡 Example: node test_facebook_page_metrics.js 1');
  process.exit(1);
}

testFacebookPageMetrics(parseInt(clientId));

