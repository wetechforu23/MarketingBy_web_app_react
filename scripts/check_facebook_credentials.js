/**
 * Check Facebook Credentials from Database
 * This script retrieves and displays Facebook credentials for debugging
 */

require('dotenv').config({ path: './.env' });
const { Pool } = require('pg');

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

async function checkFacebookCredentials() {
  try {
    console.log('🔍 Checking Facebook credentials for client 1...\n');
    
    // Get credentials
    const result = await pool.query(
      `SELECT 
        client_id,
        service_type,
        credentials->>'page_id' as page_id,
        credentials->>'access_token' as access_token,
        LEFT(credentials->>'access_token', 30) as token_preview,
        created_at,
        updated_at
      FROM client_credentials 
      WHERE client_id = 1 AND service_type = 'facebook'`
    );
    
    if (result.rows.length === 0) {
      console.log('❌ No Facebook credentials found for client 1');
      console.log('');
      console.log('ℹ️  You need to configure Facebook credentials first:');
      console.log('   1. Go to the client settings in your app');
      console.log('   2. Add Facebook Page ID and Access Token');
      console.log('   3. Click Save');
      return;
    }
    
    const creds = result.rows[0];
    console.log('✅ Facebook credentials found!');
    console.log('');
    console.log('📋 Details:');
    console.log('   Client ID:', creds.client_id);
    console.log('   Service Type:', creds.service_type);
    console.log('   Page ID:', creds.page_id || '❌ NOT SET');
    console.log('   Access Token Preview:', creds.token_preview + '...');
    console.log('   Token Length:', creds.access_token ? creds.access_token.length : 0, 'characters');
    console.log('   Created:', creds.created_at);
    console.log('   Updated:', creds.updated_at);
    console.log('');
    
    if (!creds.page_id) {
      console.log('❌ PROBLEM: Page ID is not set!');
      console.log('   This is why the sync returns all zeros.');
      console.log('');
      return;
    }
    
    if (!creds.access_token || creds.access_token.length < 50) {
      console.log('❌ PROBLEM: Access Token is invalid or too short!');
      console.log('   Expected length: ~200+ characters');
      console.log('   Actual length:', creds.access_token ? creds.access_token.length : 0);
      console.log('');
      return;
    }
    
    console.log('✅ Credentials look valid!');
    console.log('');
    console.log('📝 Next Steps:');
    console.log('   1. Update test_facebook_api.js with these credentials:');
    console.log('      PAGE_ID = \'' + creds.page_id + '\'');
    console.log('      ACCESS_TOKEN = (copy from database)');
    console.log('   2. Run: node test_facebook_api.js');
    console.log('   3. This will test if Facebook API is working');
    console.log('');
    
    // Also check stored Facebook data
    console.log('📊 Checking stored Facebook data...\n');
    const dataResult = await pool.query(
      `SELECT 
        client_id,
        page_views,
        followers,
        reach,
        impressions,
        engagement_rate,
        synced_at
      FROM facebook_analytics
      WHERE client_id = 1
      ORDER BY synced_at DESC
      LIMIT 1`
    );
    
    if (dataResult.rows.length > 0) {
      const data = dataResult.rows[0];
      console.log('✅ Facebook analytics found in database:');
      console.log('   Page Views:', data.page_views);
      console.log('   Followers:', data.followers);
      console.log('   Reach:', data.reach);
      console.log('   Impressions:', data.impressions);
      console.log('   Engagement Rate:', data.engagement_rate + '%');
      console.log('   Last Synced:', data.synced_at);
      console.log('');
      
      if (data.followers === 0 && data.page_views === 0) {
        console.log('⚠️  All metrics are 0 - This could mean:');
        console.log('   1. Facebook access token permissions are insufficient');
        console.log('   2. The page has no activity/data');
        console.log('   3. Facebook API is returning errors (check backend logs)');
      }
    } else {
      console.log('⚠️  No Facebook analytics data in database yet');
      console.log('   Try clicking "Sync Facebook Data" in the app');
    }
    
    // Check posts
    const postsResult = await pool.query(
      `SELECT COUNT(*) as count FROM facebook_posts WHERE client_id = 1`
    );
    console.log('');
    console.log('📝 Facebook posts in database:', postsResult.rows[0].count);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkFacebookCredentials();

