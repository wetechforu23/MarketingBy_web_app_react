const { Pool } = require('pg');
require('dotenv').config({ path: './.env' });

async function testClientAPI() {
  const clientId = 199;
  const dbUrl = process.env.DATABASE_URL || '';
  const isRemoteDb = dbUrl && (
    dbUrl.includes('rds.amazonaws.com') ||
    dbUrl.includes('heroku') ||
    dbUrl.includes('.com') ||
    !dbUrl.includes('localhost')
  );

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isRemoteDb ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('\n🧪 TESTING CLIENT API ENDPOINT DATA RETRIEVAL');
    console.log('=============================================\n');

    // Import the FacebookService
    const FacebookService = require('./dist/services/facebookService').default;
    const facebookService = new FacebookService(pool);

    // Test getStoredData (what the client dashboard calls)
    console.log('1️⃣ Testing getStoredData() function...');
    const storedData = await facebookService.getStoredData(clientId);

    if (storedData) {
      console.log('   ✅ getStoredData() returned data:');
      console.log('   → Page Views:', storedData.pageViews);
      console.log('   → Followers:', storedData.followers);
      console.log('   → Engagement:', storedData.engagement);
      console.log('   → Reach:', storedData.reach);
      console.log('   → Impressions:', storedData.impressions);
      console.log('   → Posts count:', storedData.posts?.length || 0);
    } else {
      console.log('   ❌ getStoredData() returned NULL!');
      console.log('   This means the client will see zeros!');
    }

    // Test getClientCredentials
    console.log('\n2️⃣ Testing getClientCredentials()...');
    const credentials = await facebookService.getClientCredentials(clientId);
    
    if (credentials) {
      console.log('   ✅ Credentials found:');
      console.log('   → Page ID:', credentials.page_id);
      console.log('   → Has Token:', !!credentials.access_token);
    } else {
      console.log('   ❌ No credentials found!');
    }

    // Simulate the API response
    console.log('\n3️⃣ Simulating /api/facebook/overview/:clientId response...');
    
    if (!storedData) {
      console.log('   ⚠️ API would return:');
      console.log(JSON.stringify({
        success: true,
        connected: !!credentials,
        data: {
          pageViews: 0,
          followers: 0,
          engagement: 0,
          reach: 0,
          impressions: 0,
          connected: !!credentials,
          status: credentials ? 'Connected' : 'Not Connected'
        }
      }, null, 2));
    } else {
      console.log('   ✅ API would return:');
      console.log(JSON.stringify({
        success: true,
        connected: !!credentials,
        data: {
          pageViews: storedData.pageViews,
          followers: storedData.followers,
          engagement: storedData.engagement,
          reach: storedData.reach,
          impressions: storedData.impressions,
          connected: !!credentials,
          status: credentials ? 'Connected' : 'Not Connected'
        }
      }, null, 2));
    }

    console.log('\n=============================================');
    console.log('✅ TEST COMPLETE!\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

testClientAPI();

