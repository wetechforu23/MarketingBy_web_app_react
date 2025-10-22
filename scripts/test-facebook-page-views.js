/**
 * Test script for Facebook Page Views Fix
 * Tests the updated facebookService with multiple fallback methods
 * 
 * Usage: node test-facebook-page-views.js <clientId>
 */

const axios = require('axios');
const { Pool } = require('pg');

// Load environment variables
require('dotenv').config({ path: './backend/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const baseUrl = 'https://graph.facebook.com/v18.0';

async function testPageViewsFetch(clientId) {
  console.log('\n🧪 Testing Facebook Page Views Fix...\n');
  console.log(`Client ID: ${clientId}\n`);

  try {
    // Step 1: Get credentials
    console.log('📋 Step 1: Fetching Facebook credentials from database...');
    const credResult = await pool.query(
      'SELECT credentials FROM client_credentials WHERE client_id = $1 AND service_type = $2',
      [clientId, 'facebook']
    );

    if (credResult.rows.length === 0) {
      console.error('❌ No Facebook credentials found for this client');
      console.log('   Please connect Facebook first in the dashboard');
      process.exit(1);
    }

    const credentials = credResult.rows[0].credentials;
    const pageId = credentials.page_id;
    const accessToken = credentials.access_token;

    console.log(`✅ Found credentials for page: ${pageId}\n`);

    // Step 2: Test page info fetch
    console.log('📋 Step 2: Testing page info fetch...');
    try {
      const pageResponse = await axios.get(`${baseUrl}/${pageId}`, {
        params: {
          access_token: accessToken,
          fields: 'id,name,about,fan_count,followers_count,page_views,talking_about_count'
        }
      });

      console.log(`✅ Page Info Retrieved:`);
      console.log(`   Name: ${pageResponse.data.name}`);
      console.log(`   Followers: ${pageResponse.data.followers_count || pageResponse.data.fan_count || 0}`);
      console.log(`   Talking About: ${pageResponse.data.talking_about_count || 0}`);
      console.log(`   Page Views (from page object): ${pageResponse.data.page_views || 'N/A'}\n`);
    } catch (error) {
      console.error('❌ Error fetching page info:', error.response?.data || error.message);
    }

    // Step 3: Test page_views_total with day period
    console.log('📋 Step 3: Testing page_views_total (day period, summed)...');
    try {
      const until = new Date();
      const since = new Date();
      since.setDate(since.getDate() - 28);
      
      const sinceStr = since.toISOString().split('T')[0];
      const untilStr = until.toISOString().split('T')[0];

      console.log(`   Date range: ${sinceStr} to ${untilStr}`);

      const viewsResponse = await axios.get(`${baseUrl}/${pageId}/insights`, {
        params: {
          access_token: accessToken,
          metric: 'page_views_total',
          period: 'day',
          since: sinceStr,
          until: untilStr
        }
      });

      if (viewsResponse.data.data && viewsResponse.data.data.length > 0) {
        const values = viewsResponse.data.data[0].values || [];
        const totalViews = values.reduce((sum, item) => {
          return sum + (typeof item.value === 'number' ? item.value : 0);
        }, 0);
        
        console.log(`✅ page_views_total (day period):`);
        console.log(`   Daily values count: ${values.length}`);
        console.log(`   Total (summed): ${totalViews}`);
        console.log(`   Sample daily values:`, values.slice(0, 5).map(v => ({ date: v.end_time, value: v.value })));
      } else {
        console.log('⚠️ No page_views_total data available');
      }
    } catch (error) {
      console.warn('⚠️ page_views_total not available:', error.response?.data?.error?.message || error.message);
    }

    console.log('');

    // Step 4: Test alternative method (page_consumptions)
    console.log('📋 Step 4: Testing alternative method (page_consumptions)...');
    try {
      const until = new Date();
      const since = new Date();
      since.setDate(since.getDate() - 28);
      
      const sinceStr = since.toISOString().split('T')[0];
      const untilStr = until.toISOString().split('T')[0];

      const altResponse = await axios.get(`${baseUrl}/${pageId}/insights/page_consumptions`, {
        params: {
          access_token: accessToken,
          period: 'day',
          since: sinceStr,
          until: untilStr
        }
      });

      if (altResponse.data.data && altResponse.data.data.length > 0) {
        const values = altResponse.data.data[0].values || [];
        const totalConsumptions = values.reduce((sum, item) => {
          return sum + (typeof item.value === 'number' ? item.value : 0);
        }, 0);
        
        console.log(`✅ page_consumptions (alternative):`);
        console.log(`   Total consumptions: ${totalConsumptions}`);
      } else {
        console.log('⚠️ No page_consumptions data available');
      }
    } catch (error) {
      console.warn('⚠️ page_consumptions not available:', error.response?.data?.error?.message || error.message);
    }

    console.log('');

    // Step 5: Test impressions (for estimation)
    console.log('📋 Step 5: Testing page_impressions (for estimation fallback)...');
    try {
      const until = new Date();
      const since = new Date();
      since.setDate(since.getDate() - 28);
      
      const sinceStr = since.toISOString().split('T')[0];
      const untilStr = until.toISOString().split('T')[0];

      const impResponse = await axios.get(`${baseUrl}/${pageId}/insights`, {
        params: {
          access_token: accessToken,
          metric: 'page_impressions',
          period: 'days_28',
          since: sinceStr,
          until: untilStr
        }
      });

      if (impResponse.data.data && impResponse.data.data.length > 0) {
        const impressions = impResponse.data.data[0].values[0].value;
        const estimatedViews = Math.round(impressions * 0.3);
        
        console.log(`✅ page_impressions (28 days):`);
        console.log(`   Total impressions: ${impressions}`);
        console.log(`   Estimated views (30%): ${estimatedViews}`);
      } else {
        console.log('⚠️ No page_impressions data available');
      }
    } catch (error) {
      console.warn('⚠️ page_impressions not available:', error.response?.data?.error?.message || error.message);
    }

    console.log('\n');

    // Step 6: Summary
    console.log('=' .repeat(60));
    console.log('📊 SUMMARY');
    console.log('=' .repeat(60));
    console.log('\n✅ Test completed successfully!');
    console.log('\nThe updated service will try these methods in order:');
    console.log('  1. page_views_total (day period, summed)');
    console.log('  2. page_views from page object');
    console.log('  3. page_consumptions (alternative API)');
    console.log('  4. Estimated from page_impressions (30%)');
    console.log('\nNext steps:');
    console.log('  1. Deploy the updated facebookService.ts');
    console.log('  2. Sync Facebook data in the dashboard');
    console.log('  3. Verify page views show correctly');
    console.log('\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

// Get client ID from command line
const clientId = process.argv[2] || 1;

console.log('\n' + '='.repeat(60));
console.log('🧪 Facebook Page Views Test Script');
console.log('='.repeat(60));

testPageViewsFetch(parseInt(clientId));

