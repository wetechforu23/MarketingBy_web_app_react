const { Pool } = require('pg');
require('dotenv').config({ path: './.env' });

async function checkDemo2FacebookData() {
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
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 CHECKING DEMO-2 FACEBOOK DATA IN DATABASE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const clientId = 199; // Demo-2

    // 1. Check if client exists
    console.log('📊 Step 1: Check if Demo-2 client exists...');
    const clientResult = await pool.query(
      'SELECT id, client_name, email FROM clients WHERE id = $1',
      [clientId]
    );
    
    if (clientResult.rows.length === 0) {
      console.log('❌ Client ID 199 (Demo-2) not found!');
      process.exit(1);
    }
    
    console.log('✅ Client found:', clientResult.rows[0]);
    console.log('');

    // 2. Check Facebook credentials
    console.log('📊 Step 2: Check Facebook credentials...');
    const credsResult = await pool.query(
      `SELECT 
        client_id,
        service_type,
        credentials::jsonb->>'access_token' IS NOT NULL as has_token,
        credentials::jsonb->>'page_id' as page_id,
        created_at
      FROM client_credentials 
      WHERE client_id = $1 AND service_type = 'facebook'`,
      [clientId]
    );

    if (credsResult.rows.length === 0) {
      console.log('❌ No Facebook credentials found for Demo-2!');
      console.log('   → This is why it shows "Not Connected"');
      process.exit(1);
    }

    console.log('✅ Facebook credentials found:');
    console.log('   → Page ID:', credsResult.rows[0].page_id);
    console.log('   → Has Token:', credsResult.rows[0].has_token);
    console.log('   → Created:', credsResult.rows[0].created_at);
    console.log('');

    // 3. Check facebook_analytics table
    console.log('📊 Step 3: Check facebook_analytics table...');
    const metricsResult = await pool.query(
      `SELECT *
      FROM facebook_analytics 
      WHERE client_id = $1
      ORDER BY created_at DESC
      LIMIT 1`,
      [clientId]
    );

    if (metricsResult.rows.length === 0) {
      console.log('❌ No data in facebook_analytics table!');
      console.log('   → This is why client sees all zeros!');
      console.log('   → Need to sync data from Facebook API');
      console.log('');
      console.log('💡 SOLUTION: Run the Facebook sync for Demo-2:');
      console.log('   POST /api/facebook/sync/199');
      console.log('');
    } else {
      console.log('✅ Data found in facebook_analytics:');
      const data = metricsResult.rows[0];
      console.log('   Full row data:', JSON.stringify(data, null, 2));
      console.log('');
      console.log('   → Page Views:', data.page_views || 'N/A');
      console.log('   → Followers:', data.followers || 'N/A');
      console.log('   → Reach:', data.reach || 'N/A');
      console.log('   → Impressions:', data.impressions || 'N/A');
      console.log('   → Engagement:', data.engagement || 'N/A');
      console.log('   → Created At:', data.created_at || 'N/A');
      console.log('');
      
      const pageViews = data.page_views || 0;
      const followers = data.followers || 0;
      const reach = data.reach || 0;
      
      if (pageViews === 0 && followers === 0 && reach === 0) {
        console.log('⚠️ WARNING: Data exists but all values are zero!');
        console.log('   → This might be correct if the page has no activity');
        console.log('   → Or the sync captured zero values from Facebook');
        console.log('');
      }
    }

    // 4. Check facebook_posts table
    console.log('📊 Step 4: Check facebook_posts table...');
    const postsResult = await pool.query(
      `SELECT 
        COUNT(*) as total_posts,
        SUM(likes) as total_likes,
        SUM(comments) as total_comments,
        SUM(shares) as total_shares,
        SUM(post_impressions) as total_impressions,
        SUM(post_reach) as total_reach
      FROM facebook_posts 
      WHERE client_id = $1`,
      [clientId]
    );

    const posts = postsResult.rows[0];
    console.log('📝 Facebook Posts Summary:');
    console.log('   → Total Posts:', posts.total_posts || 0);
    console.log('   → Total Likes:', posts.total_likes || 0);
    console.log('   → Total Comments:', posts.total_comments || 0);
    console.log('   → Total Shares:', posts.total_shares || 0);
    console.log('   → Total Impressions:', posts.total_impressions || 0);
    console.log('   → Total Reach:', posts.total_reach || 0);
    console.log('');

    // 5. Check what API would return
    console.log('📊 Step 5: Simulate API response (/api/facebook/overview/199)...');
    
    if (metricsResult.rows.length > 0) {
      const apiResponse = {
        success: true,
        connected: true,
        data: {
          pageViews: metricsResult.rows[0].page_views || 0,
          followers: metricsResult.rows[0].followers || 0,
          reach: metricsResult.rows[0].reach || 0,
          impressions: metricsResult.rows[0].impressions || 0,
          engagement: metricsResult.rows[0].engagement || 0,
          connected: true,
          status: 'Connected'
        }
      };
      console.log('✅ API would return:');
      console.log(JSON.stringify(apiResponse, null, 2));
    } else {
      const apiResponse = {
        success: true,
        connected: true,
        data: {
          pageViews: 0,
          followers: 0,
          reach: 0,
          impressions: 0,
          engagement: 0,
          connected: true,
          status: 'Connected'
        }
      };
      console.log('⚠️ API would return (all zeros):');
      console.log(JSON.stringify(apiResponse, null, 2));
    }
    console.log('');

    // 6. Final diagnosis
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 FINAL DIAGNOSIS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (credsResult.rows.length > 0 && metricsResult.rows.length > 0) {
      console.log('✅ STATUS: Connected with data');
      console.log('✅ Client should see real metrics on their dashboard');
      console.log('');
      console.log('📊 Data to display:');
      console.log('   → Page Views:', metricsResult.rows[0].page_views);
      console.log('   → Followers:', metricsResult.rows[0].followers);
      console.log('   → Reach:', metricsResult.rows[0].reach);
      console.log('   → Impressions:', metricsResult.rows[0].impressions);
      console.log('   → Engagement:', metricsResult.rows[0].engagement);
    } else if (credsResult.rows.length > 0 && metricsResult.rows.length === 0) {
      console.log('⚠️ STATUS: Connected but no data synced');
      console.log('❌ Client will see: ✅ Connected but all zeros (0)');
      console.log('');
      console.log('🔧 SOLUTION:');
      console.log('   1. Sync Facebook data from API to database');
      console.log('   2. Run: POST /api/facebook/sync/199');
      console.log('   3. Or use Super Admin UI to sync data');
    } else {
      console.log('❌ STATUS: Not connected');
      console.log('❌ Client will see: ⚪ Not Connected message');
      console.log('');
      console.log('🔧 SOLUTION:');
      console.log('   1. Connect Facebook account first');
      console.log('   2. Then sync data');
    }

    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('   Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

checkDemo2FacebookData();

