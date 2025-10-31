const axios = require('axios');

// AUTO-CONVERT User Access Token to Page Access Token
const USER_TOKEN = 'EAAVlGna8NrIBPvRcST4BVXQZCFpOVZAxDHG8z4P7PKsG0uTa5J6VZAWQc5Lt9LSK5UJTQhZBZB4TY4iYqHMhq5Dn72B88ZBSawKnypOEs6rD8y0sZAjHOXwkOKJbZAYwiCYPQbdZAC7uEEQBGmbjaCwowxlWkMt3Xh5cAoN1WODDUIcSQuBB3WuyaNSVo9gZDZD';
const TARGET_PAGE_ID = '744651835408507'; // ProMed Healthcare Associates
const API_VERSION = 'v23.0';

async function convertToPageToken() {
  console.log('🔄 AUTO-CONVERTING User Token to Page Token...\n');
  console.log('━'.repeat(70));
  
  try {
    // Step 1: Get all pages managed by this user
    console.log('\n📋 Step 1: Fetching pages managed by your account...');
    const pagesUrl = `https://graph.facebook.com/${API_VERSION}/me/accounts`;
    const pagesResponse = await axios.get(pagesUrl, {
      params: {
        access_token: USER_TOKEN
      }
    });
    
    const pages = pagesResponse.data.data;
    console.log(`✅ Found ${pages.length} page(s):`);
    pages.forEach(page => {
      console.log(`   - ${page.name} (ID: ${page.id})`);
    });
    
    // Step 2: Find ProMed Healthcare page
    console.log('\n🔍 Step 2: Finding ProMed Healthcare Associates page...');
    const targetPage = pages.find(p => p.id === TARGET_PAGE_ID);
    
    if (!targetPage) {
      console.error('\n❌ ERROR: ProMed Healthcare Associates page not found!');
      console.log('\n💡 Available pages:');
      pages.forEach(page => {
        console.log(`   - ${page.name} (ID: ${page.id})`);
      });
      return;
    }
    
    console.log(`✅ Found: ${targetPage.name}`);
    console.log(`   Page ID: ${targetPage.id}`);
    console.log(`   Category: ${targetPage.category}`);
    
    // Step 3: Extract Page Access Token
    const PAGE_TOKEN = targetPage.access_token;
    console.log(`   Page Token: ${PAGE_TOKEN.substring(0, 30)}...`);
    
    // Step 4: Test the Page Token
    console.log('\n🧪 Step 3: Testing Page Access Token...');
    
    // Test 4a: Get Page Info
    const pageInfoUrl = `https://graph.facebook.com/${API_VERSION}/${TARGET_PAGE_ID}`;
    const pageInfoResponse = await axios.get(pageInfoUrl, {
      params: {
        access_token: PAGE_TOKEN,
        fields: 'id,name,category,followers_count,fan_count'
      }
    });
    console.log(`✅ Page Info: ${pageInfoResponse.data.name}, Followers: ${pageInfoResponse.data.followers_count || pageInfoResponse.data.fan_count}`);
    
    // Test 4b: Get Posts with Insights
    console.log('\n🧪 Step 4: Testing Posts with Insights...');
    const postsUrl = `https://graph.facebook.com/${API_VERSION}/${TARGET_PAGE_ID}/posts`;
    const postsResponse = await axios.get(postsUrl, {
      params: {
        access_token: PAGE_TOKEN,
        fields: 'id,message,created_time,likes.summary(true),comments.summary(true),shares,insights.metric(post_impressions,post_impressions_unique,post_reactions_by_type_total)',
        limit: 3
      }
    });
    
    const posts = postsResponse.data.data;
    console.log(`✅ Fetched ${posts.length} posts with insights:`);
    
    posts.forEach((post, index) => {
      console.log(`\n   Post ${index + 1}:`);
      console.log(`   - Message: ${(post.message || 'No text').substring(0, 40)}...`);
      console.log(`   - Likes: ${post.likes?.summary?.total_count || 0}`);
      console.log(`   - Comments: ${post.comments?.summary?.total_count || 0}`);
      console.log(`   - Shares: ${post.shares?.count || 0}`);
      
      if (post.insights && post.insights.data) {
        const impressions = post.insights.data.find(i => i.name === 'post_impressions');
        const reach = post.insights.data.find(i => i.name === 'post_impressions_unique');
        const reactions = post.insights.data.find(i => i.name === 'post_reactions_by_type_total');
        
        console.log(`   - ✅ Impressions: ${impressions?.values?.[0]?.value || 0}`);
        console.log(`   - ✅ Unique Impressions: ${reach?.values?.[0]?.value || 0}`);
        if (reactions?.values?.[0]?.value) {
          const reactionTypes = reactions.values[0].value;
          console.log(`   - ✅ Reactions: ${JSON.stringify(reactionTypes)}`);
        }
      }
    });
    
    // Step 5: Check Token Info
    console.log('\n🔐 Step 5: Checking Page Token Details...');
    const debugUrl = `https://graph.facebook.com/${API_VERSION}/debug_token`;
    const debugResponse = await axios.get(debugUrl, {
      params: {
        input_token: PAGE_TOKEN,
        access_token: PAGE_TOKEN
      }
    });
    
    const tokenInfo = debugResponse.data.data;
    console.log(`   Type: ${tokenInfo.type}`);
    console.log(`   Valid: ${tokenInfo.is_valid}`);
    if (tokenInfo.expires_at) {
      const expiresAt = new Date(tokenInfo.expires_at * 1000);
      console.log(`   Expires: ${expiresAt.toLocaleString()}`);
    } else {
      console.log(`   Expires: Never (Long-lived)`);
    }
    
    console.log('\n' + '━'.repeat(70));
    console.log('\n✅ **SUCCESS! PAGE ACCESS TOKEN IS WORKING!**\n');
    console.log('📋 **SUMMARY:**');
    console.log(`   Token Type: ${tokenInfo.type}`);
    console.log(`   Page: ${targetPage.name}`);
    console.log(`   Page ID: ${TARGET_PAGE_ID}`);
    console.log(`   Posts with Insights: ✅ Working`);
    console.log(`   Token: ${PAGE_TOKEN.substring(0, 50)}...`);
    
    console.log('\n' + '━'.repeat(70));
    console.log('\n🎯 **NEXT STEP:**');
    console.log('   This Page Access Token works perfectly!');
    console.log('   Now I will ask for your confirmation TWICE before updating the database.\n');
    
    // Save token to file for next step
    const fs = require('fs');
    fs.writeFileSync('backend/.page_token', PAGE_TOKEN);
    console.log('💾 Token saved to backend/.page_token for database update\n');
    
    return PAGE_TOKEN;
    
  } catch (error) {
    console.error('\n' + '━'.repeat(70));
    console.error('❌ CONVERSION FAILED:');
    console.error(`   ${error.message}`);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data:`, error.response.data);
    }
  }
}

convertToPageToken();

