const { Pool } = require('pg');
const axios = require('axios');
require('dotenv').config({ path: './.env' });

async function manualSyncDemo2() {
  const clientId = 199;
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

  try {
    console.log('\n🔄 MANUAL SYNC FOR DEMO-2');
    console.log('======================================\n');

    // 1. Get credentials from database
    console.log('1️⃣ Getting Facebook credentials...');
    const credsResult = await pool.query(
      `SELECT credentials FROM client_credentials WHERE client_id = $1 AND service_type = 'facebook'`,
      [clientId]
    );

    if (credsResult.rows.length === 0) {
      console.error('❌ No Facebook credentials found!');
      process.exit(1);
    }

    const { access_token, page_id } = credsResult.rows[0].credentials;
    console.log(`✅ Found credentials for page: ${page_id}`);

    // 2. Fetch data from Facebook API
    console.log('\n2️⃣ Fetching data from Facebook Graph API...');
    
    const baseUrl = 'https://graph.facebook.com/v18.0';
    
    // Get page info and fan count
    const pageInfo = await axios.get(`${baseUrl}/${page_id}`, {
      params: {
        fields: 'name,fan_count',
        access_token: access_token
      }
    });
    
    const followers = pageInfo.data.fan_count || 0;
    console.log(`   Followers: ${followers}`);
    
    // Get insights
    const insights = await axios.get(`${baseUrl}/${page_id}/insights`, {
      params: {
        metric: 'page_views_total,page_impressions,page_impressions_unique,page_post_engagements',
        period: 'days_28',
        access_token: access_token
      }
    });
    
    let pageViews = 0, impressions = 0, reach = 0, engagement = 0;
    
    if (insights.data.data) {
      insights.data.data.forEach(metric => {
        const values = metric.values || [];
        const latestValue = values[values.length - 1]?.value || 0;
        
        if (metric.name === 'page_views_total') pageViews = latestValue;
        if (metric.name === 'page_impressions') impressions = latestValue;
        if (metric.name === 'page_impressions_unique') reach = latestValue;
        if (metric.name === 'page_post_engagements') engagement = latestValue;
      });
    }
    
    console.log(`   Page Views: ${pageViews}`);
    console.log(`   Impressions: ${impressions}`);
    console.log(`   Reach: ${reach}`);
    console.log(`   Engagement: ${engagement}`);
    
    // Calculate engagement rate (cap at 100%)
    const rawRate = followers > 0 ? (engagement / followers) * 100 : 0;
    const engagementRate = Math.min(rawRate, 100); // Cap at 100%
    const engagementRateFixed = parseFloat(engagementRate.toFixed(2));
    
    console.log('\n   Calculated values:');
    console.log(`   - client_id: ${clientId} (${typeof clientId})`);
    console.log(`   - page_views: ${pageViews} (${typeof pageViews})`);
    console.log(`   - followers: ${followers} (${typeof followers})`);
    console.log(`   - engagement: ${engagement} (${typeof engagement})`);
    console.log(`   - reach: ${reach} (${typeof reach})`);
    console.log(`   - impressions: ${impressions} (${typeof impressions})`);
    console.log(`   - engagement_rate: ${engagementRateFixed} (${typeof engagementRateFixed}) [raw: ${rawRate.toFixed(2)}%, capped]`);
    
    // 3. Save to database
    console.log('\n3️⃣ Saving to database...');
    const insertResult = await pool.query(
      `INSERT INTO facebook_analytics (
        client_id, page_views, followers, engagement, reach, impressions, engagement_rate, synced_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT (client_id) 
      DO UPDATE SET 
        page_views = $2, followers = $3, engagement = $4, reach = $5, impressions = $6, 
        engagement_rate = $7, synced_at = NOW(), updated_at = NOW()
      RETURNING *`,
      [clientId, pageViews, followers, engagement, reach, impressions, engagementRateFixed]
    );
    
    console.log(`✅ Data saved successfully!`);
    console.log(insertResult.rows[0]);
    
    console.log('\n======================================');
    console.log('✅ MANUAL SYNC COMPLETE!');
    console.log('======================================');
    console.log('\nNow the client will see real data in their dashboard!');
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    if (error.response) {
      console.error('API Response:', error.response.data);
    }
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

manualSyncDemo2();

