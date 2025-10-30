const { Pool } = require('pg');
const axios = require('axios');
require('dotenv').config({ path: './.env' });

async function diagnoseFacebookInsights() {
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
    console.log('🔍 Diagnosing Facebook Insights Issue...\n');

    // 1. Get Facebook credentials
    const credsResult = await pool.query(
      `SELECT * FROM client_credentials WHERE client_id = 1 AND service_name = 'facebook'`
    );

    if (credsResult.rows.length === 0) {
      console.log('❌ No Facebook credentials found for client 1');
      process.exit(1);
    }

    const creds = credsResult.rows[0];
    const accessToken = creds.access_token;
    const pageId = creds.page_id;

    console.log(`✅ Found Facebook credentials:`);
    console.log(`   Page ID: ${pageId}`);
    console.log(`   Token: ${accessToken.substring(0, 20)}...`);
    console.log('');

    // 2. Test fetching a single post with insights
    console.log('📊 Fetching posts with insights from Facebook API...\n');

    const fields = [
      'id', 'message', 'created_time', 'permalink_url',
      'likes.summary(true)', 'comments.summary(true)', 'shares', 'reactions.summary(true)',
      'insights.metric(post_impressions,post_impressions_unique,post_engaged_users,post_clicks,post_video_views)'
    ].join(',');

    const response = await axios.get(
      `https://graph.facebook.com/v19.0/${pageId}/posts`,
      {
        params: {
          access_token: accessToken,
          fields: fields,
          limit: 3
        }
      }
    );

    if (response.data.error) {
      console.log('❌ Facebook API Error:', response.data.error);
      process.exit(1);
    }

    const posts = response.data.data || [];
    console.log(`✅ Fetched ${posts.length} posts\n`);

    // 3. Check each post for insights
    for (let i = 0; i < posts.length; i++) {
      const post = posts[i];
      console.log(`--- Post ${i + 1} ---`);
      console.log(`Post ID: ${post.id}`);
      console.log(`Message: ${(post.message || 'No message').substring(0, 50)}...`);
      console.log(`Likes: ${post.likes?.summary?.total_count || 0}`);
      console.log(`Comments: ${post.comments?.summary?.total_count || 0}`);
      console.log(`Shares: ${post.shares?.count || 0}`);
      
      if (post.insights && post.insights.data) {
        console.log(`✅ Insights found (${post.insights.data.length} metrics):`);
        for (const insight of post.insights.data) {
          const value = insight.values[0]?.value;
          console.log(`   - ${insight.name}: ${value}`);
        }
      } else {
        console.log(`❌ NO INSIGHTS DATA FOUND!`);
        console.log(`   This is why your table shows "N/A"`);
      }
      console.log('');
    }

    // 4. Check database
    console.log('\n📦 Checking database for stored insights...\n');
    
    const dbPosts = await pool.query(
      `SELECT post_id, likes, comments, shares, post_impressions, post_reach, post_engaged_users 
       FROM facebook_posts 
       WHERE client_id = 1 
       ORDER BY created_time DESC 
       LIMIT 3`
    );

    console.log(`Found ${dbPosts.rows.length} posts in database:\n`);
    for (const dbPost of dbPosts.rows) {
      console.log(`Post ID: ${dbPost.post_id}`);
      console.log(`  Likes: ${dbPost.likes}, Comments: ${dbPost.comments}, Shares: ${dbPost.shares}`);
      console.log(`  Impressions: ${dbPost.post_impressions}`);
      console.log(`  Reach (Unique Impressions): ${dbPost.post_reach}`);
      console.log(`  Engaged Users: ${dbPost.post_engaged_users}`);
      console.log('');
    }

    // 5. Recommendations
    console.log('\n💡 DIAGNOSIS & RECOMMENDATIONS:\n');
    
    const hasInsights = posts.some(p => p.insights && p.insights.data && p.insights.data.length > 0);
    
    if (!hasInsights) {
      console.log('❌ ISSUE FOUND: Facebook API is not returning insights data!');
      console.log('\n🔧 POSSIBLE CAUSES:');
      console.log('   1. Token missing "read_insights" permission');
      console.log('   2. Posts are too old (insights only available for recent posts)');
      console.log('   3. Page Access Token vs User Access Token issue');
      console.log('   4. Facebook API changed requirements');
      console.log('\n✅ SOLUTION:');
      console.log('   1. Generate a NEW Page Access Token with these permissions:');
      console.log('      - pages_read_engagement');
      console.log('      - pages_show_list');
      console.log('      - read_insights');
      console.log('   2. Use Graph API Explorer: https://developers.facebook.com/tools/explorer/');
      console.log('   3. Update the token in your database');
    } else {
      console.log('✅ Insights are being returned by Facebook API!');
      console.log('\n🔍 Next steps:');
      console.log('   1. Check if database columns exist');
      console.log('   2. Verify sync function is storing the data');
      console.log('   3. Check frontend is reading correct field names');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('   Response:', error.response.data);
    }
  } finally {
    await pool.end();
  }
}

diagnoseFacebookInsights();

