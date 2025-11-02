/**
 * Migration Script: Add Twilio Price Tracking
 * Adds columns to track actual prices from Twilio API responses
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : {
    rejectUnauthorized: false
  }
});

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('📊 Running Twilio price tracking migration...');
    
    const sqlPath = path.join(__dirname, 'database', 'add_twilio_price_tracking.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    await client.query(sql);
    
    console.log('✅ Migration completed successfully!');
    console.log('   - Added twilio_price and twilio_price_unit columns to whatsapp_messages');
    console.log('   - Added actual_cost columns to whatsapp_usage');
    console.log('   - Backfilled actual costs from existing messages');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();

