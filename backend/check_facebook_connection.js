/**
 * Diagnostic script to check Facebook connection status for all clients
 * Run: node backend/check_facebook_connection.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { Pool } = require('pg');

// Use the database URL from env.example if .env doesn't exist
const DATABASE_URL = process.env.DATABASE_URL || 'postgres://u6jiliov4itlpd:p8cb462eac52ccb92d2602ce07f0e64f54fd267b1e250307a8d4276cbb73d8fab@cduf3or326qj7m.cluster-czrs8kj4isg7.us-east-1.rds.amazonaws.com:5432/dfkco05sfrm6d1';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkFacebookConnections() {
  try {
    console.log('🔍 Checking Facebook connection status for all clients...\n');

    // Get all clients
    const clientsResult = await pool.query('SELECT id, company_name as name FROM clients ORDER BY id');
    
    for (const client of clientsResult.rows) {
      console.log(`\n📋 Client: ${client.name} (ID: ${client.id})`);
      console.log('─'.repeat(50));

      // Check client_credentials table
      const credsResult = await pool.query(
        `SELECT service_type, credentials, created_at, updated_at, last_connected_at 
         FROM client_credentials 
         WHERE client_id = $1 AND service_type = 'facebook'`,
        [client.id]
      );

      if (credsResult.rows.length === 0) {
        console.log('  ❌ No Facebook credentials found');
      } else {
        const cred = credsResult.rows[0];
        let credentials;
        
        try {
          credentials = typeof cred.credentials === 'string' 
            ? JSON.parse(cred.credentials) 
            : cred.credentials;

          const hasPageId = !!credentials.page_id;
          const hasAccessToken = !!credentials.access_token;
          const isConnected = hasPageId && hasAccessToken;

          console.log(`  ✅ Facebook credentials found`);
          console.log(`     Has Page ID: ${hasPageId ? '✅' : '❌'} ${credentials.page_id || 'N/A'}`);
          console.log(`     Has Access Token: ${hasAccessToken ? '✅' : '❌'} ${hasAccessToken ? '(hidden)' : 'N/A'}`);
          console.log(`     Status: ${isConnected ? '✅ CONNECTED' : '❌ NOT CONNECTED'}`);
          console.log(`     Created: ${cred.created_at}`);
          console.log(`     Updated: ${cred.updated_at}`);
          console.log(`     Last Connected: ${cred.last_connected_at || 'Never'}`);

          // Check for insights data
          const insightsResult = await pool.query(
            `SELECT COUNT(*) as count, MAX(date) as latest_date 
             FROM facebook_insights 
             WHERE client_id = $1`,
            [client.id]
          );

          const insightCount = parseInt(insightsResult.rows[0].count);
          const latestDate = insightsResult.rows[0].latest_date;

          console.log(`     Insights Records: ${insightCount} ${insightCount > 0 ? '✅' : '⚠️'}`);
          if (insightCount > 0) {
            console.log(`     Latest Data: ${latestDate}`);
          }

          // Check for posts data
          const postsResult = await pool.query(
            `SELECT COUNT(*) as count, MAX(created_time) as latest_post 
             FROM facebook_posts 
             WHERE client_id = $1`,
            [client.id]
          );

          const postCount = parseInt(postsResult.rows[0].count);
          const latestPost = postsResult.rows[0].latest_post;

          console.log(`     Posts Records: ${postCount} ${postCount > 0 ? '✅' : '⚠️'}`);
          if (postCount > 0) {
            console.log(`     Latest Post: ${latestPost}`);
          }

        } catch (parseError) {
          console.error('  ❌ Error parsing credentials:', parseError.message);
        }
      }
    }

    console.log('\n' + '═'.repeat(50));
    console.log('✅ Facebook connection check complete!\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkFacebookConnections();

