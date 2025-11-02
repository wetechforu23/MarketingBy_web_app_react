#!/usr/bin/env node
/**
 * Automated migration script for inactivity extension tracking
 * This script applies the database migration automatically
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  console.log('🔄 Starting inactivity extension tracking migration...');
  
  // Get database URL from environment
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable not set');
    process.exit(1);
  }

  // Check if it's a remote database (AWS RDS, Heroku Postgres, etc.)
  const isRemoteDb = databaseUrl.includes('amazonaws.com') || 
                     databaseUrl.includes('heroku.com') ||
                     databaseUrl.includes('compute-1.amazonaws.com');

  // Create database connection pool
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: isRemoteDb ? { rejectUnauthorized: false } : false
  });

  try {
    // Read migration SQL file
    const sqlPath = path.join(__dirname, 'database', 'add_inactivity_extension_tracking.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('📄 Migration SQL file loaded');
    console.log('🔧 Applying migration...');

    // Execute migration
    await pool.query(sql);

    console.log('✅ Migration applied successfully!');
    console.log('📊 Verifying columns...');

    // Verify columns were created
    const verifyResult = await pool.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'widget_conversations'
        AND column_name IN (
          'last_agent_activity_at',
          'last_visitor_activity_at',
          'extension_reminders_count',
          'visitor_extension_reminders_count',
          'extension_granted_until'
        )
      ORDER BY column_name
    `);

    if (verifyResult.rows.length === 5) {
      console.log('✅ All columns verified:');
      verifyResult.rows.forEach(row => {
        console.log(`   - ${row.column_name} (${row.data_type})`);
      });
    } else {
      console.log(`⚠️  Expected 5 columns, found ${verifyResult.rows.length}`);
      verifyResult.rows.forEach(row => {
        console.log(`   - ${row.column_name} (${row.data_type})`);
      });
    }

    // Verify indexes
    const indexResult = await pool.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'widget_conversations'
        AND indexname IN (
          'idx_conversations_agent_activity',
          'idx_conversations_visitor_activity',
          'idx_conversations_extension_until'
        )
    `);

    if (indexResult.rows.length === 3) {
      console.log('✅ All indexes verified:');
      indexResult.rows.forEach(row => {
        console.log(`   - ${row.indexname}`);
      });
    } else {
      console.log(`⚠️  Expected 3 indexes, found ${indexResult.rows.length}`);
    }

    console.log('🎉 Migration complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migration
runMigration().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

