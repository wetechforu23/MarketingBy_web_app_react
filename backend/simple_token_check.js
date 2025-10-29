require('dotenv').config();
const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function checkTokens() {
  try {
    console.log('\n🔍 Simple Facebook Token Check for All Clients...\n');

    // Get all Facebook credentials
    const result = await pool.query(`
      SELECT 
        cc.client_id,
        c.client_name,
        cc.credentials,
        cc.created_at,
        cc.updated_at
      FROM client_credentials cc
      LEFT JOIN clients c ON cc.client_id = c.id
      WHERE cc.service_type = 'facebook'
      ORDER BY cc.client_id
    `);

    if (result.rows.length === 0) {
      console.log('❌ No Facebook credentials found in database');
      return;
    }

    console.log(`📊 Found ${result.rows.length} clients with Facebook tokens\n`);
    console.log('='.repeat(100));

    for (const row of result.rows) {
      const clientName = row.client_name || `Client ${row.client_id}`;
      const credentials = row.credentials;
      
      // Parse credentials JSON
      const pageId = credentials.page_id || credentials.pageId || 'N/A';
      const accessToken = credentials.access_token || credentials.accessToken;

      console.log(`\n👤 Client: ${clientName} (ID: ${row.client_id})`);
      console.log(`   Page ID: ${pageId}`);
      console.log(`   Token Created: ${new Date(row.created_at).toLocaleString()}`);
      console.log(`   Token Updated: ${new Date(row.updated_at).toLocaleString()}`);

      if (!accessToken) {
        console.log('   ❌ No access token found in credentials');
        console.log('\n' + '='.repeat(100));
        continue;
      }

      try {
        // Method 1: Try to get basic page info
        console.log('\n   🔍 Testing token by fetching page info...');
        const pageResponse = await axios.get(
          `https://graph.facebook.com/v18.0/${pageId}?fields=id,name,access_token&access_token=${accessToken}`
        );
        
        console.log(`   ✅ Token VALID! Page: ${pageResponse.data.name}`);
        console.log(`   ├─ Page ID: ${pageResponse.data.id}`);

        // Method 2: Try to get page insights to check read_insights permission
        try {
          const insightsResponse = await axios.get(
            `https://graph.facebook.com/v18.0/${pageId}/insights?metric=page_fans&period=day&access_token=${accessToken}`
          );
          console.log(`   ├─ ✅ Has read_insights permission`);
          console.log(`   ├─ Page Fans: ${insightsResponse.data.data[0]?.values[0]?.value || 'N/A'}`);
        } catch (insightsError) {
          console.log(`   ├─ ❌ No read_insights permission or error:`, insightsError.response?.data?.error?.message || insightsError.message);
        }

        // Method 3: Check token expiration by trying to extend it
        try {
          const exchangeResponse = await axios.get(
            `https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.FACEBOOK_APP_ID}&client_secret=${process.env.FACEBOOK_APP_SECRET}&fb_exchange_token=${accessToken}`
          );
          
          if (exchangeResponse.data.access_token) {
            console.log(`   ├─ 🟡 Token can be extended (SHORT-LIVED or USER TOKEN)`);
            console.log(`   ├─ New token received: ${exchangeResponse.data.access_token.substring(0, 20)}...`);
            console.log(`   └─ 💡 RECOMMENDATION: This is likely a SHORT-LIVED token. You should exchange it for a LONG-LIVED PAGE TOKEN.`);
          }
        } catch (exchangeError) {
          if (exchangeError.response?.status === 400) {
            console.log(`   ├─ 🟢 Token cannot be extended (already LONG-LIVED PAGE TOKEN)`);
            console.log(`   └─ ✅ This is PERFECT! Long-lived page tokens don't expire.`);
          } else {
            console.log(`   └─ ⚠️  Could not check token expiration: ${exchangeError.response?.data?.error?.message || exchangeError.message}`);
          }
        }

      } catch (error) {
        console.log('\n   ❌ Token INVALID or EXPIRED');
        if (error.response?.data?.error) {
          console.log(`   ├─ Error: ${error.response.data.error.message}`);
          console.log(`   ├─ Type: ${error.response.data.error.type}`);
          console.log(`   └─ Code: ${error.response.data.error.code}`);
        } else {
          console.log(`   └─ ${error.message}`);
        }
      }

      console.log('\n' + '='.repeat(100));
    }

    console.log('\n✅ Token check complete!\n');

    console.log('📖 Token Types Explained:');
    console.log('├─ 🔴 SHORT-LIVED USER TOKEN: Expires in 1-2 hours');
    console.log('├─ 🟡 LONG-LIVED USER TOKEN: Expires in ~60 days');
    console.log('└─ 🟢 LONG-LIVED PAGE TOKEN: Never expires (recommended for your app)\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkTokens();

