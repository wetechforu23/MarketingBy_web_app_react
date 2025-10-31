const axios = require('axios');

// Check if token is User or Page Access Token, and if it's long-lived
const TOKEN = 'EAAVlGna8NrIBPvRcST4BVXQZCFpOVZAxDHG8z4P7PKsG0uTa5J6VZAWQc5Lt9LSK5UJTQhZBZB4TY4iYqHMhq5Dn72B88ZBSawKnypOEs6rD8y0sZAjHOXwkOKJbZAYwiCYPQbdZAC7uEEQBGmbjaCwowxlWkMt3Xh5cAoN1WODDUIcSQuBB3WuyaNSVo9gZDZD';

async function checkTokenType() {
  console.log('🔍 Checking Token Type and Expiration...\n');
  console.log('━'.repeat(70));
  
  try {
    const debugUrl = 'https://graph.facebook.com/v23.0/debug_token';
    const response = await axios.get(debugUrl, {
      params: {
        input_token: TOKEN,
        access_token: TOKEN
      }
    });
    
    const data = response.data.data;
    
    console.log('\n📋 TOKEN INFORMATION:\n');
    console.log(`   Type: ${data.type}`);
    console.log(`   Valid: ${data.is_valid}`);
    console.log(`   App ID: ${data.app_id}`);
    console.log(`   Application: ${data.application}`);
    
    // Check expiration
    if (data.expires_at) {
      const expiresAt = new Date(data.expires_at * 1000);
      const now = new Date();
      const daysUntilExpiry = Math.floor((expiresAt - now) / (1000 * 60 * 60 * 24));
      
      console.log(`   Expires At: ${expiresAt.toLocaleString()}`);
      console.log(`   Days Until Expiry: ${daysUntilExpiry} days`);
      
      if (daysUntilExpiry > 50) {
        console.log(`   ✅ This is a LONG-LIVED token (expires in ${daysUntilExpiry} days)`);
      } else if (daysUntilExpiry > 0) {
        console.log(`   ⚠️  This is a SHORT-LIVED token (expires in ${daysUntilExpiry} days)`);
      } else {
        console.log(`   ❌ This token is EXPIRED`);
      }
    } else {
      console.log(`   Expires At: Never (permanent token)`);
      console.log(`   ✅ This is a LONG-LIVED or PERMANENT token`);
    }
    
    // Check scopes/permissions
    if (data.scopes) {
      console.log(`\n   Permissions:`);
      data.scopes.forEach(scope => {
        console.log(`      - ${scope}`);
      });
    }
    
    // Check if it's User ID or Page ID
    if (data.user_id) {
      console.log(`\n   User ID: ${data.user_id}`);
    }
    
    if (data.profile_id) {
      console.log(`   Profile/Page ID: ${data.profile_id}`);
    }
    
    console.log('\n' + '━'.repeat(70));
    
    // Determine token type
    if (data.type === 'USER') {
      console.log('\n❌ THIS IS A **USER ACCESS TOKEN**');
      console.log('\n💡 For Facebook Pages API (posts, insights), you need:');
      console.log('   ✅ A **PAGE ACCESS TOKEN** instead\n');
      console.log('📍 How to get Page Access Token:');
      console.log('   1. Go to: https://developers.facebook.com/tools/explorer/');
      console.log('   2. Select your app from dropdown');
      console.log('   3. Click "Get Token" → "Get Page Access Token"');
      console.log('   4. Select "ProMed Healthcare Associates" page');
      console.log('   5. Make sure these permissions are selected:');
      console.log('      - pages_show_list');
      console.log('      - pages_read_engagement');
      console.log('      - pages_read_user_content');
      console.log('      - read_insights');
      console.log('   6. Copy the token and give it to me\n');
    } else if (data.type === 'PAGE') {
      console.log('\n✅ THIS IS A **PAGE ACCESS TOKEN** ✅');
      console.log('   This token can be used for fetching page posts and insights!\n');
    } else {
      console.log(`\n⚠️  Unknown token type: ${data.type}`);
    }
    
  } catch (error) {
    console.error('\n' + '━'.repeat(70));
    console.error('❌ ERROR CHECKING TOKEN:');
    console.error(`   ${error.message}`);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data:`, error.response.data);
    }
  }
}

checkTokenType();

