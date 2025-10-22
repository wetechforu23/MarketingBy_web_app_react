#!/usr/bin/env node
/**
 * Convert User Access Token to Page Access Token
 * 
 * You have a valid User Access Token, but Facebook's new Pages API requires
 * a Page Access Token. This script converts your User token to a Page token.
 * 
 * Usage:
 * node convert-to-page-token.js <USER_ACCESS_TOKEN>
 */

const https = require('https');

const userAccessToken = process.argv[2];

if (!userAccessToken) {
  console.error('❌ Missing User Access Token!');
  console.log('\nUsage: node convert-to-page-token.js <USER_ACCESS_TOKEN>\n');
  console.log('Example:');
  console.log('node convert-to-page-token.js EAAVlGna8NrIBPuIUA2qb73O6wGjFj2A...\n');
  process.exit(1);
}

console.log('🔄 Converting User Access Token to Page Access Token...\n');
console.log(`📝 User Token: ${userAccessToken.substring(0, 20)}...${userAccessToken.substring(userAccessToken.length - 10)}\n`);

// Step 1: Get list of pages managed by this user
console.log('📋 Step 1: Fetching your Facebook pages...');

const url = `https://graph.facebook.com/v18.0/me/accounts?access_token=${userAccessToken}`;

https.get(url, (response) => {
  let data = '';
  response.on('data', (chunk) => data += chunk);
  response.on('end', () => {
    try {
      const result = JSON.parse(data);
      
      if (result.error) {
        console.error('❌ Error fetching pages:', result.error);
        process.exit(1);
      }
      
      if (!result.data || result.data.length === 0) {
        console.error('❌ No pages found for this user token!');
        console.log('\n💡 This user account does not manage any Facebook pages.');
        console.log('   Make sure you are logged in as a Page admin/manager.\n');
        process.exit(1);
      }
      
      console.log(`✅ Found ${result.data.length} page(s)\n`);
      
      // Display all pages
      console.log('📄 Your Facebook Pages:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      result.data.forEach((page, index) => {
        console.log(`${index + 1}. ${page.name}`);
        console.log(`   Page ID: ${page.id}`);
        console.log(`   Category: ${page.category || 'N/A'}`);
        console.log(`   Access Token: ${page.access_token.substring(0, 30)}...`);
        console.log(`   Token Length: ${page.access_token.length} characters`);
        console.log('');
      });
      
      // Find ProMed Healthcare Associates
      const promedPage = result.data.find(p => p.id === '744651835408507' || p.name.includes('ProMed'));
      
      if (promedPage) {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🎯 FOUND: ProMed Healthcare Associates!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        console.log('📋 Page Details:');
        console.log(`   Name: ${promedPage.name}`);
        console.log(`   Page ID: ${promedPage.id}`);
        console.log(`   Category: ${promedPage.category}`);
        console.log('');
        console.log('🔑 Page Access Token:');
        console.log(`   ${promedPage.access_token}`);
        console.log('');
        console.log('✅ This is your PERMANENT Page Access Token!');
        console.log('   It NEVER expires and is ready to use.\n');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📝 Next Steps:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        console.log('1. Copy the Page Access Token above');
        console.log('2. Test it using the HTML tester:');
        console.log('   - Open: facebook-token-tester.html');
        console.log('   - Page ID: 744651835408507');
        console.log('   - Paste the Page Access Token');
        console.log('   - Click "Test Token"');
        console.log('   - All 4 tests should now PASS ✅');
        console.log('');
        console.log('3. Once verified, use it in your app:');
        console.log('   - Go to Client Management → Settings');
        console.log('   - Facebook section');
        console.log('   - Page ID: 744651835408507');
        console.log('   - Access Token: <paste the Page Access Token>');
        console.log('   - Click "Connect Facebook"');
        console.log('');
        console.log('4. Go to Social Media tab and click "Sync Facebook Data"');
        console.log('');
        console.log('🎉 Done! Your Facebook integration will work now.\n');
      } else {
        console.log('⚠️  ProMed Healthcare Associates not found in your pages list.');
        console.log('\n💡 If you manage this page, make sure you have admin access.');
        console.log('   Check if the Page ID is correct: 744651835408507\n');
        
        if (result.data.length > 0) {
          console.log('🔧 You can use any of the pages above by:');
          console.log('   1. Copying the Page ID');
          console.log('   2. Copying the access_token for that page');
          console.log('   3. Using them in your app Settings\n');
        }
      }
      
    } catch (e) {
      console.error('❌ Error parsing response:', e.message);
      console.error('Response:', data);
      process.exit(1);
    }
  });
}).on('error', (error) => {
  console.error('❌ Network error:', error.message);
  process.exit(1);
});

