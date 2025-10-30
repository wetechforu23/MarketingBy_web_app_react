const { Pool } = require('pg');
require('dotenv').config({ path: './backend/.env' });

// Force SSL for remote databases
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

async function testFacebookSync() {
  try {
    console.log('🔍 Testing Facebook Integration for Client 1\n');
    console.log('='.repeat(60));
    
    // 1. Check Facebook credentials
    console.log('\n1. Checking Facebook Credentials...');
    const credResult = await pool.query(`
      SELECT 
        cc.client_id,
        cc.service_type,
        cc.credentials->>'page_id' as page_id,
        CASE 
          WHEN cc.credentials->>'access_token' IS NOT NULL THEN 'EXISTS'
          ELSE 'MISSING'
        END as access_token_status,
        LENGTH(cc.credentials->>'access_token') as token_length
      FROM client_credentials cc
      WHERE cc.client_id = 1 AND cc.service_type = 'facebook'
    `);
    
    if (credResult.rows.length === 0) {
      console.log('❌ No Facebook credentials found for client 1');
      console.log('   You need to add Facebook credentials in the database');
      return;
    }
    
    const cred = credResult.rows[0];
    console.log(`✅ Found Facebook credentials:`);
    console.log(`   Page ID: ${cred.page_id}`);
    console.log(`   Access Token: ${cred.access_token_status} (${cred.token_length} chars)`);
    
    // 2. Check current analytics data
    console.log('\n2. Checking Current Analytics Data...');
    const analyticsResult = await pool.query(`
      SELECT 
        page_views, 
        followers, 
        engagement, 
        reach,
        impressions,
        synced_at
      FROM facebook_analytics
      WHERE client_id = 1
      ORDER BY synced_at DESC
      LIMIT 1
    `);
    
    if (analyticsResult.rows.length === 0) {
      console.log('❌ No analytics data found - database is empty');
    } else {
      const analytics = analyticsResult.rows[0];
      console.log(`📊 Current Analytics:`);
      console.log(`   Page Views: ${analytics.page_views}`);
      console.log(`   Followers: ${analytics.followers}`);
      console.log(`   Engagement: ${analytics.engagement}`);
      console.log(`   Reach: ${analytics.reach}`);
      console.log(`   Impressions: ${analytics.impressions}`);
      console.log(`   Last Synced: ${analytics.synced_at}`);
    }
    
    // 3. Check Facebook posts
    console.log('\n3. Checking Facebook Posts...');
    const postsResult = await pool.query(`
      SELECT 
        COUNT(*) as total_posts,
        SUM(post_impressions) as total_impressions,
        SUM(reactions_like + reactions_love + reactions_haha + reactions_wow + reactions_sad + reactions_angry) as total_reactions,
        SUM(comments_count) as total_comments,
        SUM(shares_count) as total_shares,
        MAX(synced_at) as last_sync
      FROM facebook_posts
      WHERE client_id = 1
    `);
    
    const postStats = postsResult.rows[0];
    console.log(`📄 Posts Statistics:`);
    console.log(`   Total Posts: ${postStats.total_posts}`);
    console.log(`   Total Impressions: ${postStats.total_impressions || 0}`);
    console.log(`   Total Reactions: ${postStats.total_reactions || 0}`);
    console.log(`   Total Comments: ${postStats.total_comments || 0}`);
    console.log(`   Total Shares: ${postStats.total_shares || 0}`);
    console.log(`   Last Sync: ${postStats.last_sync || 'Never'}`);
    
    // 4. Sample recent posts
    console.log('\n4. Sample Recent Posts:');
    const recentPosts = await pool.query(`
      SELECT 
        post_id,
        LEFT(message, 50) as message_preview,
        post_impressions,
        post_reach,
        reactions_like,
        comments_count,
        shares_count,
        created_time
      FROM facebook_posts
      WHERE client_id = 1
      ORDER BY created_time DESC
      LIMIT 3
    `);
    
    if (recentPosts.rows.length === 0) {
      console.log('   No posts found');
    } else {
      recentPosts.rows.forEach((post, idx) => {
        console.log(`\n   Post ${idx + 1}:`);
        console.log(`   Message: ${post.message_preview || '(no message)'}...`);
        console.log(`   Impressions: ${post.post_impressions}`);
        console.log(`   Reach: ${post.post_reach}`);
        console.log(`   Reactions: ${post.reactions_like}, Comments: ${post.comments_count}, Shares: ${post.shares_count}`);
        console.log(`   Created: ${post.created_time}`);
      });
    }
    
    console.log('\n' + '='.repeat(60));
    
    // 5. Diagnosis
    console.log('\n📋 Diagnosis:');
    if (cred.access_token_status === 'MISSING') {
      console.log('❌ Facebook access token is missing');
      console.log('   → Add valid Facebook credentials to client_credentials table');
    } else if (analyticsResult.rows.length === 0 || analyticsResult.rows[0].page_views === 0) {
      console.log('⚠️  Facebook credentials exist, but no data synced yet');
      console.log('   → Click "Sync Facebook Data" button in the frontend');
      console.log('   → Or call: POST /api/facebook/sync/1');
    } else if (postStats.total_posts > 0 && postStats.total_impressions === 0) {
      console.log('⚠️  Posts exist but metrics are all zeros');
      console.log('   → The access token might be expired or lack permissions');
      console.log('   → Check if the token has "pages_read_engagement" permission');
    } else {
      console.log('✅ Everything looks good!');
      console.log('   → Data should be displaying in the frontend');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('   Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

testFacebookSync();

