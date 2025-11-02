/**
 * Migration Script: Add Twilio Price Tracking
 * Adds columns to track actual prices from Twilio API responses
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Get database URL from environment
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('❌ DATABASE_URL environment variable not set');
  process.exit(1);
}

// Check if it's a remote database (AWS RDS, Heroku Postgres, etc.)
// Heroku Postgres URLs don't always include 'heroku.com', so check for non-localhost patterns
const isRemoteDb = databaseUrl.includes('amazonaws.com') || 
                   databaseUrl.includes('heroku.com') ||
                   databaseUrl.includes('compute-1.amazonaws.com') ||
                   (!databaseUrl.includes('localhost') && !databaseUrl.includes('127.0.0.1') && !databaseUrl.includes('5432'));

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: isRemoteDb ? { rejectUnauthorized: false } : false
});

async function runMigration() {
  let client;
  try {
    console.log('📊 Running Twilio price tracking migration...');
    console.log('🔗 Database URL:', databaseUrl.substring(0, 30) + '...');
    console.log('🔒 SSL enabled:', isRemoteDb);
    
    client = await pool.connect();
    
    const sqlPath = path.join(__dirname, 'database', 'add_twilio_price_tracking.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📄 Executing migration SQL...');
    await client.query(sql);
    
    console.log('✅ Migration completed successfully!');
    console.log('   - Added twilio_price and twilio_price_unit columns to whatsapp_messages');
    console.log('   - Added actual_cost columns to whatsapp_usage');
    console.log('   - Backfilled actual costs from existing messages');
    
    // Verify columns
    console.log('🔍 Verifying migration...');
    const verifyMessages = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'whatsapp_messages'
        AND column_name IN ('twilio_price', 'twilio_price_unit')
      ORDER BY column_name
    `);
    
    const verifyUsage = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'whatsapp_usage'
        AND column_name IN ('actual_cost_today', 'actual_cost_this_month', 'total_actual_cost')
      ORDER BY column_name
    `);
    
    console.log(`✅ Verified: ${verifyMessages.rows.length} columns in whatsapp_messages, ${verifyUsage.rows.length} columns in whatsapp_usage`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

runMigration();

