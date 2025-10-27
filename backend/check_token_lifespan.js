require('dotenv').config();
const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function checkTokenLifespan() {
  try {
    console.log('\n🔍 Checking Facebook Token Lifespan for All Clients...\n');

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

    const appId = process.env.FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET;

    if (!appId || !appSecret) {
      console.log('❌ Missing FACEBOOK_APP_ID or FACEBOOK_APP_SECRET in .env file');
      return;
    }

    // Get App Access Token
    console.log('📱 Getting Facebook App Access Token...');
    let appAccessToken;
    try {
      const appTokenResponse = await axios.get(
        `https://graph.facebook.com/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&grant_type=client_credentials`
      );
      appAccessToken = appTokenResponse.data.access_token;
      console.log('✅ App Access Token obtained\n');
    } catch (error) {
      console.error('❌ Failed to get App Access Token:', error.response?.data || error.message);
      console.error('   Make sure FACEBOOK_APP_ID and FACEBOOK_APP_SECRET are correct in .env');
      return;
    }

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
        // Debug the token using Facebook's debug_token endpoint
        const debugResponse = await axios.get(
          `https://graph.facebook.com/debug_token?input_token=${accessToken}&access_token=${appAccessToken}`
        );

        const tokenData = debugResponse.data.data;

        console.log('\n   📋 Token Information:');
        console.log(`   ├─ Valid: ${tokenData.is_valid ? '✅ YES' : '❌ NO'}`);
        console.log(`   ├─ Type: ${tokenData.type || 'Unknown'}`);
        console.log(`   ├─ App ID: ${tokenData.app_id}`);
        console.log(`   ├─ User ID: ${tokenData.user_id || 'N/A'}`);
        
        // Check expiration
        if (tokenData.expires_at) {
          const expiresAt = new Date(tokenData.expires_at * 1000);
          const now = new Date();
          const daysUntilExpiry = Math.floor((expiresAt - now) / (1000 * 60 * 60 * 24));
          
          console.log(`   ├─ Expires At: ${expiresAt.toLocaleString()}`);
          console.log(`   ├─ Days Until Expiry: ${daysUntilExpiry} days`);
          
          // Determine if it's long-lived or short-lived
          if (daysUntilExpiry > 30) {
            console.log(`   ├─ Token Lifespan: 🟢 LONG-LIVED (${daysUntilExpiry} days remaining)`);
          } else if (daysUntilExpiry > 0) {
            console.log(`   ├─ Token Lifespan: 🟡 EXPIRING SOON (${daysUntilExpiry} days remaining)`);
          } else {
            console.log(`   ├─ Token Lifespan: 🔴 EXPIRED`);
          }
        } else if (tokenData.data_access_expires_at) {
          const dataExpiresAt = new Date(tokenData.data_access_expires_at * 1000);
          console.log(`   ├─ Data Access Expires: ${dataExpiresAt.toLocaleString()}`);
          console.log(`   ├─ Token Lifespan: 🟢 LONG-LIVED (Page Token - No expiration)`);
        } else {
          console.log(`   ├─ Expires At: Never (Page Token)`);
          console.log(`   ├─ Token Lifespan: 🟢 LONG-LIVED (No expiration)`);
        }

        // Show scopes
        if (tokenData.scopes && tokenData.scopes.length > 0) {
          console.log(`   ├─ Permissions (${tokenData.scopes.length}):`);
          const requiredScopes = ['pages_read_engagement', 'pages_manage_posts', 'read_insights'];
          requiredScopes.forEach(scope => {
            const hasScope = tokenData.scopes.includes(scope);
            console.log(`   │  ${hasScope ? '✅' : '❌'} ${scope}`);
          });
          
          // Show other scopes
          const otherScopes = tokenData.scopes.filter(s => !requiredScopes.includes(s));
          if (otherScopes.length > 0) {
            console.log(`   │  ℹ️  Other: ${otherScopes.join(', ')}`);
          }
        }

        console.log(`   └─ Token Status: ${tokenData.is_valid ? '✅ VALID' : '❌ INVALID'}`);

      } catch (error) {
        console.log(`\n   ❌ Error checking token:`);
        if (error.response?.data) {
          console.log(`   └─ ${JSON.stringify(error.response.data, null, 2)}`);
        } else {
          console.log(`   └─ ${error.message}`);
        }
      }

      console.log('\n' + '='.repeat(100));
    }

    console.log('\n✅ Token lifespan check complete!\n');

    console.log('📖 Token Types Explained:');
    console.log('├─ 🔴 SHORT-LIVED USER TOKEN: Expires in 1-2 hours');
    console.log('├─ 🟡 LONG-LIVED USER TOKEN: Expires in ~60 days');
    console.log('└─ 🟢 LONG-LIVED PAGE TOKEN: Never expires (recommended)\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkTokenLifespan();

