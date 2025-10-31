const axios = require('axios');

// Test new Facebook token locally (NO DATABASE CHANGES)
const NEW_TOKEN = 'EAAVlGna8NrIBPvRcST4BVXQZCFpOVZAxDHG8z4P7PKsG0uTa5J6VZAWQc5Lt9LSK5UJTQhZBZB4TY4iYqHMhq5Dn72B88ZBSawKnypOEs6rD8y0sZAjHOXwkOKJbZAYwiCYPQbdZAC7uEEQBGmbjaCwowxlWkMt3Xh5cAoN1WODDUIcSQuBB3WuyaNSVo9gZDZD';
const PAGE_ID = '744651835408507';
const API_VERSION = 'v23.0';

async function testToken() {
  console.log('🧪 Testing NEW Facebook Token (LOCAL TEST ONLY)\n');
  console.log('━'.repeat(60));
  
  try {
    // Test 1: Get Page Info
    console.log('\n📊 Test 1: Fetching Page Info...');
    const pageInfoUrl = `https://graph.facebook.com/${API_VERSION}/${PAGE_ID}`;
    const pageResponse = await axios.get(pageInfoUrl, {
      params: {
        access_token: NEW_TOKEN,
        fields: 'id,name,category,followers_count,fan_count,checkins,were_here_count,talking_about_count,engagement'
      }
    });
    console.log('✅ Page Info Success:');
    console.log(`   Name: ${pageResponse.data.name}`);
    console.log(`   Followers: ${pageResponse.data.followers_count || pageResponse.data.fan_count || 0}`);
    console.log(`   Category: ${pageResponse.data.category}`);

    // Test 2: Get Posts with Insights
    console.log('\n📝 Test 2: Fetching Posts with Insights...');
    const postsUrl = `https://graph.facebook.com/${API_VERSION}/${PAGE_ID}/posts`;
    const postsResponse = await axios.get(postsUrl, {
      params: {
        access_token: NEW_TOKEN,
        fields: 'id,message,created_time,permalink_url,likes.summary(true),comments.summary(true),shares,reactions.summary(true),insights.metric(post_impressions,post_impressions_unique,post_reactions_by_type_total)',
        limit: 5
      }
    });
    
    console.log(`✅ Posts Retrieved: ${postsResponse.data.data.length}`);
    postsResponse.data.data.forEach((post, index) => {
      console.log(`\n   Post ${index + 1}:`);
      console.log(`   - Message: ${(post.message || 'No text').substring(0, 50)}...`);
      console.log(`   - Created: ${new Date(post.created_time).toLocaleDateString()}`);
      console.log(`   - Likes: ${post.likes?.summary?.total_count || 0}`);
      console.log(`   - Comments: ${post.comments?.summary?.total_count || 0}`);
      console.log(`   - Shares: ${post.shares?.count || 0}`);
      
      // Check insights
      if (post.insights && post.insights.data) {
        const impressions = post.insights.data.find(i => i.name === 'post_impressions');
        const reach = post.insights.data.find(i => i.name === 'post_impressions_unique');
        console.log(`   - Impressions: ${impressions?.values?.[0]?.value || 'N/A'}`);
        console.log(`   - Unique Impressions: ${reach?.values?.[0]?.value || 'N/A'}`);
      } else {
        console.log(`   ⚠️  No insights data available`);
      }
    });

    // Test 3: Check Token Permissions
    console.log('\n🔐 Test 3: Checking Token Permissions...');
    const debugUrl = `https://graph.facebook.com/${API_VERSION}/debug_token`;
    const debugResponse = await axios.get(debugUrl, {
      params: {
        input_token: NEW_TOKEN,
        access_token: NEW_TOKEN
      }
    });
    
    console.log('✅ Token Info:');
    console.log(`   Type: ${debugResponse.data.data.type}`);
    console.log(`   Valid: ${debugResponse.data.data.is_valid}`);
    console.log(`   Expires: ${debugResponse.data.data.expires_at ? new Date(debugResponse.data.data.expires_at * 1000).toLocaleString() : 'Never'}`);
    console.log(`   Scopes: ${debugResponse.data.data.scopes?.join(', ') || 'None'}`);

    console.log('\n' + '━'.repeat(60));
    console.log('✅ ALL TESTS PASSED! Token is working correctly.');
    console.log('\n💡 Next Steps:');
    console.log('   1. This token works with Facebook API v23.0');
    console.log('   2. If you want to update production database, let me know');
    console.log('   3. I will ask for confirmation twice before any database changes');
    
  } catch (error) {
    console.error('\n' + '━'.repeat(60));
    console.error('❌ TEST FAILED:');
    console.error(`   Error: ${error.message}`);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data:`, error.response.data);
    }
    console.log('\n💡 Possible Issues:');
    console.log('   1. Token might be expired or invalid');
    console.log('   2. Token might not have "pages_read_engagement" permission');
    console.log('   3. Token might not have "read_insights" permission');
  }
}

testToken();

