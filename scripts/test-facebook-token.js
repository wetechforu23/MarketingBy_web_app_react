#!/usr/bin/env node
/**
 * Facebook Token Test Script
 * 
 * This script helps you test your Facebook Page Access Token
 * and diagnose any issues before using it in the application.
 * 
 * Usage:
 * node test-facebook-token.js <PAGE_ID> <ACCESS_TOKEN>
 * 
 * Example:
 * node test-facebook-token.js 744651835408507 EAAxxxxxxxxxxxxx
 */

const https = require('https');

const [,, pageId, accessToken] = process.argv;

if (!pageId || !accessToken) {
  console.error('❌ Missing arguments!');
  console.log('\nUsage: node test-facebook-token.js <PAGE_ID> <ACCESS_TOKEN>');
  console.log('\nExample:');
  console.log('node test-facebook-token.js 744651835408507 EAAxxxxxxxxxxxxx\n');
  process.exit(1);
}

console.log('🔍 Testing Facebook Page Access Token...\n');
console.log(`📄 Page ID: ${pageId}`);
console.log(`🔑 Token: ${accessToken.substring(0, 20)}...${accessToken.substring(accessToken.length - 10)}\n`);

// Test 1: Get Page Info
function testPageInfo() {
  return new Promise((resolve, reject) => {
    const url = `https://graph.facebook.com/v18.0/${pageId}?fields=name,fan_count,followers_count&access_token=${accessToken}`;
    
    console.log('📊 Test 1: Fetching page info...');
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          
          if (json.error) {
            console.log('❌ Test 1 FAILED');
            console.log('Error:', json.error);
            reject(json.error);
          } else {
            console.log('✅ Test 1 PASSED');
            console.log(`   Page Name: ${json.name}`);
            console.log(`   Followers: ${json.followers_count || json.fan_count || 'N/A'}`);
            resolve(json);
          }
        } catch (e) {
          console.log('❌ Test 1 FAILED - Invalid JSON response');
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

// Test 2: Get Page Posts
function testPagePosts() {
  return new Promise((resolve, reject) => {
    const url = `https://graph.facebook.com/v18.0/${pageId}/posts?fields=id,message,created_time&limit=5&access_token=${accessToken}`;
    
    console.log('\n📝 Test 2: Fetching page posts...');
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          
          if (json.error) {
            console.log('❌ Test 2 FAILED');
            console.log('Error:', json.error);
            reject(json.error);
          } else {
            console.log('✅ Test 2 PASSED');
            console.log(`   Found ${json.data?.length || 0} posts`);
            if (json.data && json.data.length > 0) {
              console.log(`   Latest post: ${json.data[0].created_time}`);
            }
            resolve(json);
          }
        } catch (e) {
          console.log('❌ Test 2 FAILED - Invalid JSON response');
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

// Test 3: Get Page Insights (requires page_read_engagement permission)
function testPageInsights() {
  return new Promise((resolve, reject) => {
    const url = `https://graph.facebook.com/v18.0/${pageId}/insights/page_fans?period=lifetime&access_token=${accessToken}`;
    
    console.log('\n📈 Test 3: Fetching page insights...');
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          
          if (json.error) {
            console.log('❌ Test 3 FAILED');
            console.log('Error:', json.error);
            reject(json.error);
          } else {
            console.log('✅ Test 3 PASSED');
            console.log('   Insights data available');
            resolve(json);
          }
        } catch (e) {
          console.log('❌ Test 3 FAILED - Invalid JSON response');
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

// Test 4: Debug Token
function testDebugToken() {
  return new Promise((resolve, reject) => {
    const url = `https://graph.facebook.com/v18.0/debug_token?input_token=${accessToken}&access_token=${accessToken}`;
    
    console.log('\n🔬 Test 4: Debugging token...');
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          
          if (json.error) {
            console.log('❌ Test 4 FAILED');
            console.log('Error:', json.error);
            reject(json.error);
          } else {
            console.log('✅ Test 4 PASSED');
            const tokenData = json.data;
            console.log(`   Token Type: ${tokenData.type}`);
            console.log(`   App ID: ${tokenData.app_id}`);
            console.log(`   Valid: ${tokenData.is_valid}`);
            console.log(`   Expires: ${tokenData.expires_at ? new Date(tokenData.expires_at * 1000).toLocaleString() : 'Never'}`);
            console.log(`   Scopes: ${tokenData.scopes ? tokenData.scopes.join(', ') : 'None'}`);
            resolve(json);
          }
        } catch (e) {
          console.log('❌ Test 4 FAILED - Invalid JSON response');
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

// Run all tests
async function runTests() {
  try {
    await testPageInfo();
    await testPagePosts();
    await testPageInsights();
    await testDebugToken();
    
    console.log('\n✅ All tests passed! Your token is working correctly.');
    console.log('\n📝 Next Steps:');
    console.log('1. Copy this Page ID and Access Token');
    console.log('2. Go to Client Management Dashboard → Settings Tab');
    console.log('3. Paste the credentials and click "Connect Facebook"');
    console.log('4. Go to Social Media Tab and click "Sync Facebook Data"\n');
  } catch (error) {
    console.log('\n❌ Some tests failed. Please check the errors above.');
    console.log('\n🔧 Common Issues:');
    console.log('1. Token expired - Get a new long-lived page access token');
    console.log('2. Missing permissions - Token needs these scopes:');
    console.log('   - pages_show_list');
    console.log('   - pages_read_engagement');
    console.log('   - pages_read_user_content');
    console.log('3. Wrong Page ID - Make sure you\'re using the correct page ID');
    console.log('\n📚 See FACEBOOK_TOKEN_ISSUE.md for detailed instructions.\n');
    process.exit(1);
  }
}

runTests();

