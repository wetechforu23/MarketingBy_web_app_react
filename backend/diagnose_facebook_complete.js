require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function diagnoseFacebookIntegration() {
  console.log('\n🔍 ================================');
  console.log('🔍 FACEBOOK INTEGRATION DIAGNOSTIC');
  console.log('🔍 ================================\n');

  try {
    // 1. Check Demo2 client
    console.log('📋 Step 1: Checking Demo2 Client...');
    const clientResult = await pool.query(
      `SELECT id, client_name FROM clients WHERE client_name ILIKE '%demo%2%' OR client_name ILIKE '%demo-2%' OR id = 199`
    );
    
    if (clientResult.rows.length === 0) {
      console.log('❌ No Demo2 client found!');
      return;
    }
    
    const client = clientResult.rows[0];
    console.log(`✅ Found client: ${client.client_name} (ID: ${client.id})\n`);
    const clientId = client.id;

    // 2. Check Facebook Credentials
    console.log('📋 Step 2: Checking Facebook Credentials...');
    const credsResult = await pool.query(
      `SELECT service_type, page_id, access_token IS NOT NULL as has_token, created_at, updated_at 
       FROM client_credentials 
       WHERE client_id = $1 AND service_type = 'facebook'`,
      [clientId]
    );
    
    if (credsResult.rows.length === 0) {
      console.log('❌ No Facebook credentials found for Demo2!');
      console.log('   → Client needs to connect Facebook first\n');
      return;
    }
    
    const creds = credsResult.rows[0];
    console.log(`✅ Facebook credentials found:`);
    console.log(`   → Page ID: ${creds.page_id}`);
    console.log(`   → Has Access Token: ${creds.has_token}`);
    console.log(`   → Created: ${creds.created_at}`);
    console.log(`   → Updated: ${creds.updated_at}\n`);

    // 3. Check facebook_analytics table
    console.log('📋 Step 3: Checking facebook_analytics table...');
    const analyticsResult = await pool.query(
      `SELECT page_views, followers, engagement, reach, impressions, engagement_rate, 
              synced_at, created_at, updated_at
       FROM facebook_analytics 
       WHERE client_id = $1 
       ORDER BY synced_at DESC, created_at DESC 
       LIMIT 1`,
      [clientId]
    );
    
    if (analyticsResult.rows.length === 0) {
      console.log('❌ No data in facebook_analytics table!');
      console.log('   → Need to run sync to fetch data from Facebook API\n');
    } else {
      const analytics = analyticsResult.rows[0];
      console.log(`✅ Facebook analytics data found:`);
      console.log(`   → Page Views: ${analytics.page_views}`);
      console.log(`   → Followers: ${analytics.followers}`);
      console.log(`   → Engagement: ${analytics.engagement}`);
      console.log(`   → Reach: ${analytics.reach}`);
      console.log(`   → Impressions: ${analytics.impressions}`);
      console.log(`   → Engagement Rate: ${analytics.engagement_rate}%`);
      console.log(`   → Last Synced: ${analytics.synced_at}`);
      console.log(`   → Created: ${analytics.created_at}`);
      console.log(`   → Updated: ${analytics.updated_at}\n`);
      
      // Check if all zeros
      const allZeros = analytics.page_views === 0 && 
                       analytics.followers === 0 && 
                       analytics.engagement === 0 && 
                       analytics.reach === 0 && 
                       analytics.impressions === 0;
      
      if (allZeros) {
        console.log('⚠️  WARNING: All metrics are ZERO!');
        console.log('   → Data might not have been synced properly\n');
      }
    }

    // 4. Check facebook_posts table
    console.log('📋 Step 4: Checking facebook_posts table...');
    const postsCountResult = await pool.query(
      `SELECT COUNT(*) as count FROM facebook_posts WHERE client_id = $1`,
      [clientId]
    );
    
    const postCount = parseInt(postsCountResult.rows[0].count);
    console.log(`   → Total posts in database: ${postCount}\n`);
    
    if (postCount > 0) {
      // Get sample posts
      const postsResult = await pool.query(
        `SELECT post_id, message, created_time, permalink_url,
                post_impressions, post_reach, post_engaged_users,
                comments_count, shares_count,
                reactions_like, reactions_love, reactions_haha, reactions_wow, reactions_sad, reactions_angry
         FROM facebook_posts 
         WHERE client_id = $1 
         ORDER BY created_time DESC 
         LIMIT 3`,
        [clientId]
      );
      
      console.log(`✅ Sample posts (showing 3 most recent):\n`);
      postsResult.rows.forEach((post, idx) => {
        const totalReactions = (post.reactions_like || 0) + (post.reactions_love || 0) +
                              (post.reactions_haha || 0) + (post.reactions_wow || 0) +
                              (post.reactions_sad || 0) + (post.reactions_angry || 0);
        
        console.log(`   Post ${idx + 1}:`);
        console.log(`   → Post ID: ${post.post_id}`);
        console.log(`   → Message: ${(post.message || 'No message').substring(0, 60)}...`);
        console.log(`   → Created: ${post.created_time}`);
        console.log(`   → Permalink: ${post.permalink_url ? 'Yes' : 'No'}`);
        console.log(`   → Impressions: ${post.post_impressions}`);
        console.log(`   → Reach: ${post.post_reach}`);
        console.log(`   → Engaged Users: ${post.post_engaged_users}`);
        console.log(`   → Comments: ${post.comments_count}`);
        console.log(`   → Shares: ${post.shares_count}`);
        console.log(`   → Total Reactions: ${totalReactions}`);
        console.log('');
      });
    } else {
      console.log('❌ No posts in database!');
      console.log('   → Need to run sync to fetch posts from Facebook API\n');
    }

    // 5. Test API Endpoints
    console.log('📋 Step 5: Testing API Endpoint Responses...');
    console.log('   You can test these endpoints manually:');
    console.log(`   → GET http://localhost:3001/api/facebook/overview/${clientId}`);
    console.log(`   → GET http://localhost:3001/api/facebook/posts/${clientId}?limit=50`);
    console.log(`   → POST http://localhost:3001/api/facebook/sync/${clientId}\n`);

    // 6. Recommendations
    console.log('📋 Step 6: Recommendations...\n');
    
    if (analyticsResult.rows.length === 0 || postCount === 0) {
      console.log('🔧 ACTION REQUIRED:');
      console.log('   1. Run Facebook sync to fetch data:');
      console.log(`      POST http://localhost:3001/api/facebook/sync/${clientId}`);
      console.log('   2. Or use the "Request Data Sync" button in the client dashboard\n');
    } else if (analyticsResult.rows.length > 0) {
      const analytics = analyticsResult.rows[0];
      const allZeros = analytics.page_views === 0 && 
                       analytics.followers === 0 && 
                       analytics.engagement === 0 && 
                       analytics.reach === 0 && 
                       analytics.impressions === 0;
      
      if (allZeros) {
        console.log('🔧 ISSUE DETECTED: Data is all zeros');
        console.log('   Possible causes:');
        console.log('   1. Facebook Page has no activity/insights available');
        console.log('   2. Access token doesn\'t have correct permissions');
        console.log('   3. Facebook API returned empty data');
        console.log('   4. Try re-syncing: POST http://localhost:3001/api/facebook/sync/${clientId}\n');
      } else {
        console.log('✅ Everything looks good!');
        console.log('   → Data is present in database');
        console.log('   → Posts are available');
        console.log('   → API endpoints should return data correctly\n');
      }
    }

  } catch (error) {
    console.error('❌ Error during diagnostic:', error);
    console.error('   Error message:', error.message);
    console.error('   Error stack:', error.stack);
  } finally {
    await pool.end();
  }
}

diagnoseFacebookIntegration();

