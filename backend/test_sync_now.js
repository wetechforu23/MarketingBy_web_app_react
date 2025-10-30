const { Pool } = require('pg');
require('dotenv').config({ path: './.env' });

async function testSyncNow() {
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
    console.log('\n🧪 TESTING FACEBOOK SYNC ENDPOINT');
    console.log('=====================================\n');

    // 1. Check current data in table
    console.log('1️⃣ Current data in facebook_analytics BEFORE sync:');
    const beforeResult = await pool.query(
      'SELECT * FROM facebook_analytics WHERE client_id = $1 ORDER BY synced_at DESC LIMIT 1',
      [clientId]
    );
    
    if (beforeResult.rows.length > 0) {
      console.log('   ✅ Found existing data:');
      console.log('   → Synced at:', beforeResult.rows[0].synced_at);
      console.log('   → Page Views:', beforeResult.rows[0].page_views);
      console.log('   → Followers:', beforeResult.rows[0].followers);
      console.log('   → Engagement:', beforeResult.rows[0].engagement);
    } else {
      console.log('   ❌ No data found');
    }

    // 2. Test the sync by calling the fetchAndStoreData function directly
    console.log('\n2️⃣ Calling fetchAndStoreData() function...');
    
    const FacebookService = require('./dist/services/facebookService').default;
    const facebookService = new FacebookService(pool);
    
    console.log('   🔄 Starting sync...');
    const syncData = await facebookService.fetchAndStoreData(clientId);
    
    console.log('\n   ✅ Sync completed!');
    console.log('   → Returned data:');
    console.log('     - Page Views:', syncData.pageViews);
    console.log('     - Followers:', syncData.followers);
    console.log('     - Engagement:', syncData.engagement);
    console.log('     - Reach:', syncData.reach);
    console.log('     - Impressions:', syncData.impressions);
    console.log('     - Posts:', syncData.posts?.length || 0);

    // 3. Check data in table AFTER sync
    console.log('\n3️⃣ Data in facebook_analytics AFTER sync:');
    const afterResult = await pool.query(
      'SELECT * FROM facebook_analytics WHERE client_id = $1 ORDER BY synced_at DESC LIMIT 1',
      [clientId]
    );
    
    if (afterResult.rows.length > 0) {
      console.log('   ✅ Data updated:');
      console.log('   → Synced at:', afterResult.rows[0].synced_at);
      console.log('   → Page Views:', afterResult.rows[0].page_views);
      console.log('   → Followers:', afterResult.rows[0].followers);
      console.log('   → Engagement:', afterResult.rows[0].engagement);
      console.log('   → Reach:', afterResult.rows[0].reach);
      console.log('   → Impressions:', afterResult.rows[0].impressions);
      console.log('   → Engagement Rate:', afterResult.rows[0].engagement_rate);
    }

    // 4. Compare timestamps
    if (beforeResult.rows.length > 0 && afterResult.rows.length > 0) {
      const before = new Date(beforeResult.rows[0].synced_at);
      const after = new Date(afterResult.rows[0].synced_at);
      
      console.log('\n4️⃣ Sync verification:');
      if (after > before) {
        console.log('   ✅ SUCCESS! Data was updated with new sync timestamp');
        console.log(`   → Before: ${before.toLocaleString()}`);
        console.log(`   → After:  ${after.toLocaleString()}`);
      } else {
        console.log('   ⚠️ WARNING: Sync timestamp did not change');
        console.log(`   → Still: ${after.toLocaleString()}`);
      }
    }

    console.log('\n=====================================');
    console.log('✅ SYNC TEST COMPLETE!\n');

  } catch (error) {
    console.error('\n❌ ERROR DURING SYNC:');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

testSyncNow();

