/**
 * Script to fix Facebook analytics unique constraint
 * Run: node backend/run_facebook_fix.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Pool } = require('pg');
const fs = require('fs');

// Use the database URL from env.example if .env doesn't exist
const DATABASE_URL = process.env.DATABASE_URL || 'postgres://u6jiliov4itlpd:p8cb462eac52ccb92d2602ce07f0e64f54fd267b1e250307a8d4276cbb73d8fab@cduf3or326qj7m.cluster-czrs8kj4isg7.us-east-1.rds.amazonaws.com:5432/dfkco05sfrm6d1';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  try {
    console.log('🔧 Fixing Facebook Analytics unique constraint...\n');

    // Read the SQL file
    const sqlPath = path.join(__dirname, 'database', 'fix_facebook_analytics_constraint.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Execute the migration
    console.log('📝 Executing migration...');
    await pool.query(sql);
    
    console.log('\n✅ Migration completed successfully!');
    console.log('   facebook_analytics table now has UNIQUE constraint on client_id');
    console.log('   Facebook sync should now work properly\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

runMigration();

