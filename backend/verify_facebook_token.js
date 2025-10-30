/**
 * Script to verify Facebook token permissions and validity
 * Run: node backend/verify_facebook_token.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Pool } = require('pg');
const axios = require('axios');

// Use the database URL from env.example
const DATABASE_URL = process.env.DATABASE_URL || 'postgres://u6jiliov4itlpd:p8cb462eac52ccb92d2602ce07f0e64f54fd267b1e250307a8d4276cbb73d8fab@cduf3or326qj7m.cluster-czrs8kj4isg7.us-east-1.rds.amazonaws.com:5432/dfkco05sfrm6d1';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function verifyToken() {
  try {
    console.log('🔍 Verifying Facebook Token...\n');

    // Get credentials for client 1 (ProMed)
    const result = await pool.query(
      `SELECT credentials FROM client_credentials 
       WHERE client_id = 1 AND service_type = 'facebook'`
    );

    if (result.rows.length === 0) {
      console.log('❌ No Facebook credentials found for Client 1');
      return;
    }

    const creds = result.rows[0].credentials;
    const pageId = creds.page_id;
    const accessToken = creds.access_token;

    console.log('📋 Credentials Found:');
    console.log(`   Page ID: ${pageId}`);
    console.log(`   Token: ${accessToken.substring(0, 30)}...`);
    console.log('');

    // 1. Check token info
    console.log('1️⃣ Checking Token Info...');
    try {
      const tokenInfo = await axios.get(`https://graph.facebook.com/v18.0/debug_token`, {
        params: {
          input_token: accessToken,
          access_token: accessToken
        }
      });
      
      console.log('   ✅ Token Info:');
      console.log(`      Type: ${tokenInfo.data.data.type}`);
      console.log(`      Valid: ${tokenInfo.data.data.is_valid}`);
      console.log(`      Expires: ${tokenInfo.data.data.expires_at || 'Never'}`);
      console.log(`      Scopes: ${tokenInfo.data.data.scopes?.join(', ') || 'None'}`);
      console.log('');
    } catch (error) {
      console.log('   ⚠️ Could not get token info');
    }

    // 2. Check page access
    console.log('2️⃣ Checking Page Access...');
    try {
      const pageResponse = await axios.get(`https://graph.facebook.com/v18.0/${pageId}`, {
        params: {
          access_token: accessToken,
          fields: 'id,name,followers_count,fan_count'
        }
      });
      
      console.log('   ✅ Page Access OK:');
      console.log(`      Name: ${pageResponse.data.name}`);
      console.log(`      ID: ${pageResponse.data.id}`);
      console.log(`      Followers: ${pageResponse.data.followers_count || pageResponse.data.fan_count || 0}`);
      console.log('');
    } catch (error) {
      console.log('   ❌ Page Access Failed:', error.response?.data?.error?.message || error.message);
      console.log('');
    }

    // 3. Check posts access
    console.log('3️⃣ Checking Posts Access...');
    try {
      const postsResponse = await axios.get(`https://graph.facebook.com/v18.0/${pageId}/posts`, {
        params: {
          access_token: accessToken,
          fields: 'id,message,created_time',
          limit: 3
        }
      });
      
      console.log(`   ✅ Posts Access OK: Found ${postsResponse.data.data.length} posts`);
      if (postsResponse.data.data.length > 0) {
        console.log(`      First Post ID: ${postsResponse.data.data[0].id}`);
      }
      console.log('');
    } catch (error) {
      console.log('   ❌ Posts Access Failed:', error.response?.data?.error?.message || error.message);
      console.log('');
    }

    // 4. Check insights access (CRITICAL!)
    console.log('4️⃣ Checking Insights Access (CRITICAL)...');
    try {
      // First get a post
      const postsResponse = await axios.get(`https://graph.facebook.com/v18.0/${pageId}/posts`, {
        params: {
          access_token: accessToken,
          fields: 'id',
          limit: 1
        }
      });

      if (postsResponse.data.data.length > 0) {
        const postId = postsResponse.data.data[0].id;
        console.log(`   Testing insights for post: ${postId}`);

        // Try to get insights for this post
        const insightsResponse = await axios.get(`https://graph.facebook.com/v18.0/${postId}`, {
          params: {
            access_token: accessToken,
            fields: 'id,insights.metric(post_impressions,post_impressions_unique)'
          }
        });

        if (insightsResponse.data.insights) {
          console.log('   ✅ Insights Access OK!');
          console.log('      Insights Data:', JSON.stringify(insightsResponse.data.insights, null, 2));
        } else {
          console.log('   ⚠️ Insights field exists but no data');
        }
      } else {
        console.log('   ⚠️ No posts found to test insights');
      }
      console.log('');
    } catch (error) {
      console.log('   ❌ Insights Access Failed:', error.response?.data?.error?.message || error.message);
      console.log('      Error Code:', error.response?.data?.error?.code);
      console.log('      Error Type:', error.response?.data?.error?.type);
      console.log('');
      
      if (error.response?.data?.error?.message?.includes('permission') || 
          error.response?.data?.error?.message?.includes('Permissions')) {
        console.log('   💡 SOLUTION: Your token is missing the "read_insights" permission!');
        console.log('      You need to regenerate your token with these permissions:');
        console.log('      - pages_show_list');
        console.log('      - pages_read_engagement');
        console.log('      - read_insights  ← MISSING!');
        console.log('      - pages_read_user_content');
        console.log('');
      }
    }

    // 5. Test the exact query we use
    console.log('5️⃣ Testing Exact Query Used in App...');
    try {
      const testResponse = await axios.get(`https://graph.facebook.com/v18.0/${pageId}/posts`, {
        params: {
          access_token: accessToken,
          fields: 'id,message,created_time,permalink_url,likes.summary(true),comments.summary(true),shares,reactions.summary(true),insights.metric(post_impressions,post_impressions_unique,post_reactions_by_type_total)',
          limit: 1
        }
      });

      console.log('   ✅ Full Query Works!');
      if (testResponse.data.data.length > 0) {
        const post = testResponse.data.data[0];
        console.log(`      Post ID: ${post.id}`);
        console.log(`      Has insights: ${!!post.insights}`);
        if (post.insights) {
          console.log('      Insights:', JSON.stringify(post.insights, null, 2));
        }
      }
      console.log('');
    } catch (error) {
      console.log('   ❌ Full Query Failed:', error.response?.data?.error?.message || error.message);
      console.log('');
    }

    console.log('═'.repeat(70));
    console.log('✅ Verification Complete!');
    console.log('═'.repeat(70));

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

verifyToken();

