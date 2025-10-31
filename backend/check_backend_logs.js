// This script will help us trace the error
// Run this and then click the sync button in your browser

const { Pool } = require('pg');
require('dotenv').config({ path: './.env' });

console.log('\n🔍 BACKEND ERROR DIAGNOSTIC');
console.log('================================\n');

// Test database connection
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

async function testSyncOperation() {
  const clientId = 199;
  
  try {
    console.log('1️⃣ Testing database connection...');
    const testQuery = await pool.query('SELECT NOW()');
    console.log('   ✅ Database connected:', testQuery.rows[0].now);
    
    console.log('\n2️⃣ Checking facebook_analytics table structure...');
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'facebook_analytics'
      ORDER BY ordinal_position
    `);
    console.log('   Columns:');
    columns.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });
    
    console.log('\n3️⃣ Checking unique constraint on facebook_analytics...');
    const constraints = await pool.query(`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_name = 'facebook_analytics'
    `);
    console.log('   Constraints:');
    constraints.rows.forEach(c => {
      console.log(`   - ${c.constraint_name} (${c.constraint_type})`);
    });
    
    console.log('\n4️⃣ Testing INSERT query...');
    const testInsert = `
      INSERT INTO facebook_analytics (
        client_id, page_views, followers, engagement, reach, impressions, engagement_rate, synced_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT (client_id) 
      DO UPDATE SET 
        page_views = $2, followers = $3, engagement = $4, reach = $5, impressions = $6, 
        engagement_rate = $7, synced_at = NOW(), updated_at = NOW()
      RETURNING *
    `;
    
    const result = await pool.query(testInsert, [clientId, 100, 200, 50, 300, 400, 25.5]);
    console.log('   ✅ Insert/Update successful!');
    console.log('   Row:', result.rows[0]);
    
    console.log('\n5️⃣ Verifying data in table...');
    const verify = await pool.query('SELECT * FROM facebook_analytics WHERE client_id = $1', [clientId]);
    console.log('   ✅ Data found:', verify.rows[0]);
    
    console.log('\n✅ ALL TESTS PASSED!');
    console.log('\nThe database operations work fine.');
    console.log('The 500 error might be coming from:');
    console.log('  1. Facebook API call failing');
    console.log('  2. Missing credentials');
    console.log('  3. Invalid access token');
    console.log('\nCheck the backend terminal for detailed error logs when you click sync.');
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

testSyncOperation();

