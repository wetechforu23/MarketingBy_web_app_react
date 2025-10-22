#!/usr/bin/env node
/**
 * Test Facebook Credentials from Heroku Database
 * 
 * This script connects to your Heroku database and tests the stored Facebook credentials.
 * 
 * Setup:
 * 1. Get your DATABASE_URL from Heroku:
 *    heroku config:get DATABASE_URL --app marketingby-wetechforu
 * 
 * 2. Run this script:
 *    DATABASE_URL="postgres://..." node test-facebook-db.js
 * 
 * Or create a .env file with:
 *    DATABASE_URL=postgres://...
 */

require('dotenv').config();
const { Pool } = require('pg');
const https = require('https');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not set!');
  console.log('\n📝 How to get it:');
  console.log('   heroku config:get DATABASE_URL --app marketingby-wetechforu');
  console.log('\n🔧 How to use:');
  console.log('   DATABASE_URL="postgres://..." node test-facebook-db.js');
  console.log('\n   Or create a .env file with: DATABASE_URL=postgres://...\n');
  process.exit(1);
}

// Create database pool
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function testFacebookCredentials() {
  console.log('🔍 Connecting to Heroku database...\n');
  
  try {
    // Test connection
    const testConnection = await pool.query('SELECT NOW()');
    console.log('✅ Database connected:', testConnection.rows[0].now);
    console.log('');
    
    // Get Facebook credentials for client 1 (ProMed)
    const clientId = 1;
    console.log(`📋 Fetching Facebook credentials for client ${clientId}...\n`);
    
    const result = await pool.query(
      `SELECT 
        client_id,
        service_type,
        credentials,
        last_connected_at
       FROM client_credentials 
       WHERE client_id = $1 AND service_type = $2`,
      [clientId, 'facebook']
    );
    
    if (result.rows.length === 0) {
      console.error('❌ No Facebook credentials found in database for client 1');
      console.log('\n💡 This means no credentials have been saved yet.');
      console.log('   Go to Settings → Facebook → Enter credentials and click Connect\n');
      await pool.end();
      return;
    }
    
    const row = result.rows[0];
    const credentials = row.credentials;
    const lastConnected = row.last_connected_at;
    
    console.log('📊 Credentials found in database:');
    console.log('   Client ID:', row.client_id);
    console.log('   Service Type:', row.service_type);
    console.log('   Last Connected:', lastConnected);
    console.log('   Has Page ID:', !!credentials.page_id);
    console.log('   Has Access Token:', !!credentials.access_token);
    console.log('');
    
    if (!credentials.page_id || !credentials.access_token) {
      console.error('❌ Credentials incomplete!');
      console.log('   Missing:', !credentials.page_id ? 'Page ID' : 'Access Token');
      await pool.end();
      return;
    }
    
    const pageId = credentials.page_id;
    const accessToken = credentials.access_token;
    
    console.log('🔑 Credential Details:');
    console.log('   Page ID:', pageId);
    console.log('   Token Length:', accessToken.length);
    console.log('   Token Prefix:', accessToken.substring(0, 20) + '...');
    console.log('   Token Starts With:', accessToken.substring(0, 3));
    console.log('');
    
    // Validate token format
    if (!accessToken.startsWith('EAA')) {
      console.warn('⚠️  Warning: Token doesn\'t start with "EAA" (typical Facebook tokens start with this)');
      console.log('   This might be an invalid token format\n');
    }
    
    // Test 1: Basic Page Info
    console.log('🧪 Test 1: Fetching page info from Facebook...');
    const pageInfoUrl = `https://graph.facebook.com/v18.0/${pageId}?fields=name,id,fan_count,followers_count&access_token=${accessToken}`;
    
    const pageData = await new Promise((resolve, reject) => {
      https.get(pageInfoUrl, (response) => {
        let data = '';
        response.on('data', (chunk) => data += chunk);
        response.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error('Invalid JSON response'));
          }
        });
      }).on('error', reject);
    });
    
    if (pageData.error) {
      console.log('❌ Test 1 FAILED');
      console.log('   Facebook Error:', JSON.stringify(pageData.error, null, 2));
      console.log('');
      console.log('🔧 Common Error Codes:');
      console.log('   190 = Invalid/Expired Token');
      console.log('   102 = API Session Error');
      console.log('   200 = Permission Denied');
      console.log('   10  = No access to this page');
      console.log('');
      console.log('💡 Solution: Get a new long-lived Page Access Token');
      console.log('   See FACEBOOK_TOKEN_ISSUE.md for instructions\n');
      
      await pool.end();
      return;
    }
    
    console.log('✅ Test 1 PASSED');
    console.log('   Page Name:', pageData.name);
    console.log('   Page ID:', pageData.id);
    console.log('   Followers:', pageData.followers_count || pageData.fan_count || 'N/A');
    console.log('');
    
    // Test 2: Page Posts
    console.log('🧪 Test 2: Fetching page posts from Facebook...');
    const postsUrl = `https://graph.facebook.com/v18.0/${pageId}/posts?fields=id,message,created_time&limit=5&access_token=${accessToken}`;
    
    const postsData = await new Promise((resolve, reject) => {
      https.get(postsUrl, (response) => {
        let data = '';
        response.on('data', (chunk) => data += chunk);
        response.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error('Invalid JSON response'));
          }
        });
      }).on('error', reject);
    });
    
    if (postsData.error) {
      console.log('❌ Test 2 FAILED');
      console.log('   Facebook Error:', JSON.stringify(postsData.error, null, 2));
      console.log('');
      await pool.end();
      return;
    }
    
    console.log('✅ Test 2 PASSED');
    console.log('   Posts Found:', postsData.data?.length || 0);
    if (postsData.data && postsData.data.length > 0) {
      console.log('   Latest Post:', postsData.data[0].created_time);
    }
    console.log('');
    
    // Test 3: Page Insights
    console.log('🧪 Test 3: Fetching page insights from Facebook...');
    const insightsUrl = `https://graph.facebook.com/v18.0/${pageId}/insights/page_fans?period=lifetime&access_token=${accessToken}`;
    
    const insightsData = await new Promise((resolve, reject) => {
      https.get(insightsUrl, (response) => {
        let data = '';
        response.on('data', (chunk) => data += chunk);
        response.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error('Invalid JSON response'));
          }
        });
      }).on('error', reject);
    });
    
    if (insightsData.error) {
      console.log('❌ Test 3 FAILED');
      console.log('   Facebook Error:', JSON.stringify(insightsData.error, null, 2));
      console.log('');
    } else {
      console.log('✅ Test 3 PASSED');
      console.log('   Insights accessible');
      console.log('');
    }
    
    // Final summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 SUCCESS! Your Facebook credentials are VALID!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('✅ Credentials are stored correctly in database');
    console.log('✅ Token is valid and working');
    console.log('✅ Token has access to the Facebook page');
    console.log('');
    console.log('📝 Next Steps:');
    console.log('   1. Wait for Heroku deployment to complete');
    console.log('   2. Go to Social Media tab');
    console.log('   3. Click "Sync Facebook Data"');
    console.log('   4. Data should sync successfully!');
    console.log('');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
    console.log('🔌 Database connection closed\n');
  }
}

// Run the test
testFacebookCredentials().catch(console.error);

