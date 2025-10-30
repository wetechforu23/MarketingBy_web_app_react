const { Pool } = require('pg');
require('dotenv').config({ path: './.env' });

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

async function test() {
  try {
    // Test 1: Simple SELECT *
    console.log('Test 1: SELECT * with literal value');
    const result1 = await pool.query('SELECT * FROM facebook_analytics WHERE client_id = 199');
    console.log('✅ Success! Rows:', result1.rows.length);
    
    // Test 2: With parameter
    console.log('\nTest 2: SELECT * with parameter');
    const result2 = await pool.query('SELECT * FROM facebook_analytics WHERE client_id = $1', [199]);
    console.log('✅ Success! Rows:', result2.rows.length);
    
    // Test 3: With ORDER BY
    console.log('\nTest 3: With ORDER BY');
    const result3 = await pool.query('SELECT * FROM facebook_analytics WHERE client_id = $1 ORDER BY created_at DESC', [199]);
    console.log('✅ Success! Rows:', result3.rows.length);
    
    // Test 4: Full query
    console.log('\nTest 4: Full original query');
    const result4 = await pool.query(`SELECT page_views, followers, engagement, reach, impressions, engagement_rate, synced_at, created_at
      FROM facebook_analytics 
      WHERE client_id = $1 
      ORDER BY synced_at DESC, created_at DESC 
      LIMIT 1`, [199]);
    console.log('✅ Success! Rows:', result4.rows.length);
    console.log('Data:', JSON.stringify(result4.rows[0], null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Position:', error.position);
    console.error('Code:', error.code);
  } finally {
    await pool.end();
  }
}

test();

