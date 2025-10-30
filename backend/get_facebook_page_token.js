/**
 * Facebook Page Access Token Generator
 * 
 * This script helps you generate a Page Access Token with all required permissions.
 * 
 * STEPS TO GET YOUR PAGE ACCESS TOKEN:
 * ====================================
 * 
 * 1. Go to: https://developers.facebook.com/tools/explorer/
 * 
 * 2. Select your App: "Marketing Platform" (App ID: 1518539219154610)
 * 
 * 3. Click "Generate Access Token"
 * 
 * 4. Add these permissions (click "Add a Permission"):
 *    ✅ pages_show_list
 *    ✅ pages_read_engagement
 *    ✅ pages_read_user_content
 *    ✅ pages_manage_posts
 *    ✅ pages_manage_engagement
 *    ✅ read_insights
 *
 * 5. Click "Generate Access Token" button again
 * 
 * 6. Copy the generated User Access Token
 * 
 * 7. Run this script with your token:
 *    node backend/get_facebook_page_token.js YOUR_USER_ACCESS_TOKEN
 * 
 * This script will:
 * - Exchange your User Access Token for a long-lived token (60 days)
 * - Get all your Facebook Pages
 * - Display Page Access Tokens for each page
 * - Show you how to save them to the database
 */

const axios = require('axios');
require('dotenv').config({ path: './backend/.env' });

const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID || '1518539219154610';
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET || '6b4924d4db16f9715c6c460f14fe208c';
const FACEBOOK_REDIRECT_URI = process.env.FACEBOOK_REDIRECT_URI || 'https://marketingby.wetechforu.com/auth/callback';
const BASE_URL = 'https://graph.facebook.com/v23.0';

async function getPageAccessToken(userAccessToken) {
  try {
    console.log('\n🔄 Step 1: Exchanging User Access Token for Long-Lived Token...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Step 1: Exchange for long-lived token
    const longTokenResponse = await axios.get(`${BASE_URL}/oauth/access_token`, {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: FACEBOOK_APP_ID,
        client_secret: FACEBOOK_APP_SECRET,
        fb_exchange_token: userAccessToken
      }
    });
    
    const longLivedToken = longTokenResponse.data.access_token;
    console.log('✅ Long-lived token generated (valid for ~60 days)');
    console.log(`📝 Token: ${longLivedToken.substring(0, 50)}...`);
    
    // Step 2: Get user info
    console.log('\n🔄 Step 2: Fetching User Information...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const userResponse = await axios.get(`${BASE_URL}/me`, {
      params: {
        access_token: longLivedToken,
        fields: 'id,name,email'
      }
    });
    
    console.log(`✅ User: ${userResponse.data.name} (${userResponse.data.id})`);
    if (userResponse.data.email) {
      console.log(`📧 Email: ${userResponse.data.email}`);
    }
    
    // Step 3: Get pages with Page Access Tokens
    console.log('\n🔄 Step 3: Fetching Your Facebook Pages...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const pagesResponse = await axios.get(`${BASE_URL}/me/accounts`, {
      params: {
        access_token: longLivedToken,
        fields: 'id,name,access_token,category,fan_count'
      }
    });
    
    const pages = pagesResponse.data.data || [];
    
    if (pages.length === 0) {
      console.log('❌ No Facebook pages found!');
      console.log('\n💡 TROUBLESHOOTING:');
      console.log('   1. Make sure you are an admin of at least one Facebook Page');
      console.log('   2. Make sure you selected the "pages_show_list" permission');
      console.log('   3. Try generating a new token with all required permissions');
      return;
    }
    
    console.log(`✅ Found ${pages.length} Facebook Page(s):\n`);
    
    pages.forEach((page, index) => {
      console.log(`📄 Page ${index + 1}: ${page.name}`);
      console.log(`   Page ID: ${page.id}`);
      console.log(`   Category: ${page.category || 'N/A'}`);
      console.log(`   Followers: ${page.fan_count || 'N/A'}`);
      console.log(`   Page Access Token: ${page.access_token.substring(0, 60)}...`);
      console.log('');
    });
    
    // Step 4: Save instructions
    console.log('\n✅ SUCCESS! Now save these credentials to your database:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    pages.forEach((page, index) => {
      console.log(`📄 For Page: ${page.name} (${page.id})`);
      console.log(`\nSQL Query to save in database:\n`);
      console.log(`-- Replace CLIENT_ID with your actual client ID (1, 67, 105, etc.)`);
      console.log(`INSERT INTO client_credentials (client_id, service_type, credentials, created_at, updated_at)`);
      console.log(`VALUES (`);
      console.log(`  YOUR_CLIENT_ID, -- Replace with actual client ID`);
      console.log(`  'facebook',`);
      console.log(`  jsonb_build_object(`);
      console.log(`    'page_id', '${page.id}',`);
      console.log(`    'access_token', '${page.access_token}'`);
      console.log(`  ),`);
      console.log(`  NOW(),`);
      console.log(`  NOW()`);
      console.log(`)`);
      console.log(`ON CONFLICT (client_id, service_type)`);
      console.log(`DO UPDATE SET`);
      console.log(`  credentials = jsonb_build_object(`);
      console.log(`    'page_id', '${page.id}',`);
      console.log(`    'access_token', '${page.access_token}'`);
      console.log(`  ),`);
      console.log(`  updated_at = NOW();`);
      console.log(`\n${'─'.repeat(70)}\n`);
    });
    
    console.log('\n🎯 NEXT STEPS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('1. Copy the SQL query above');
    console.log('2. Replace YOUR_CLIENT_ID with your actual client ID');
    console.log('3. Run it in pgAdmin or your database tool');
    console.log('4. Refresh your app and click "Refresh All Data" in the Facebook Full Data section');
    console.log('5. Your Facebook data should now appear!\n');
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.response?.data?.error?.message || error.message);
    
    if (error.response?.data?.error) {
      const fbError = error.response.data.error;
      console.error('\n📋 Facebook API Error Details:');
      console.error(`   Type: ${fbError.type}`);
      console.error(`   Code: ${fbError.code}`);
      console.error(`   Message: ${fbError.message}`);
      
      if (fbError.message.includes('permissions') || fbError.message.includes('OAuthException')) {
        console.error('\n💡 SOLUTION:');
        console.error('   Your token is missing required permissions.');
        console.error('   Go back to Step 4 in the instructions and make sure ALL permissions are selected:');
        console.error('   ✅ pages_show_list');
        console.error('   ✅ pages_read_engagement');
        console.error('   ✅ pages_read_user_content');
        console.error('   ✅ pages_manage_posts');
        console.error('   ✅ pages_manage_engagement');
        console.error('   ✅ read_insights');
      }
    }
  }
}

// Main execution
const userAccessToken = process.argv[2];

if (!userAccessToken) {
  console.log('\n❌ ERROR: No User Access Token provided!\n');
  console.log('USAGE:');
  console.log('   node backend/get_facebook_page_token.js YOUR_USER_ACCESS_TOKEN\n');
  console.log('INSTRUCTIONS:');
  console.log('   1. Go to: https://developers.facebook.com/tools/explorer/');
  console.log('   2. Select your App (App ID: 1518539219154610)');
  console.log('   3. Click "Add a Permission" and select:');
  console.log('      ✅ pages_show_list');
  console.log('      ✅ pages_read_engagement');
  console.log('      ✅ pages_read_user_content');
  console.log('      ✅ pages_manage_posts');
  console.log('      ✅ pages_manage_engagement');
  console.log('      ✅ read_insights');
  console.log('   4. Click "Generate Access Token"');
  console.log('   5. Copy the token and run this script again\n');
  process.exit(1);
}

console.log('\n🚀 Facebook Page Access Token Generator');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`📱 App ID: ${FACEBOOK_APP_ID}`);
console.log(`🔑 App Secret: ${FACEBOOK_APP_SECRET.substring(0, 10)}...`);
console.log(`🔗 Redirect URI: ${FACEBOOK_REDIRECT_URI}`);
console.log(`📝 User Token Provided: ${userAccessToken.substring(0, 30)}...`);

getPageAccessToken(userAccessToken);

