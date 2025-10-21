/**
 * Database Migration Runner
 * Runs the Facebook posts metrics migration
 * 
 * Usage: node backend/database/run-migration.js
 */

require('dotenv').config({ path: './backend/.env' });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Force SSL for all remote databases
const dbUrl = process.env.DATABASE_URL;
const isRemoteDb = dbUrl && (dbUrl.includes('rds.amazonaws.com') || dbUrl.includes('heroku') || !dbUrl.includes('localhost'));

const pool = new Pool({
  connectionString: dbUrl,
  ssl: isRemoteDb ? { rejectUnauthorized: false } : false
});

async function runMigration() {
  console.log('\n🔄 Starting Facebook Posts Metrics Migration...\n');
  
  try {
    // Read the migration SQL file
    const sqlPath = path.join(__dirname, 'update_facebook_posts_metrics.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📄 Migration file loaded');
    console.log(`📊 Database: ${process.env.DATABASE_URL?.split('@')[1]?.split('?')[0] || 'local'}`);
    console.log('');
    
    // Execute the migration
    await pool.query(sql);
    
    console.log('\n✅ Migration completed successfully!');
    console.log('\nChanges made:');
    console.log('  ✅ Added column: post_reach (INTEGER)');
    console.log('  ✅ Added column: post_clicks (INTEGER)');
    console.log('  ✅ Added column: post_video_views (INTEGER)');
    console.log('  ✅ Created performance indexes');
    console.log('  ✅ Updated NULL values to 0');
    console.log('');
    
    // Verify the changes
    const verifyResult = await pool.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'facebook_posts'
      AND column_name IN ('post_reach', 'post_clicks', 'post_video_views')
      ORDER BY column_name;
    `);
    
    if (verifyResult.rows.length === 3) {
      console.log('✅ Verification: All 3 columns exist');
      console.log('\n📋 Column Details:');
      verifyResult.rows.forEach(row => {
        console.log(`   - ${row.column_name}: ${row.data_type} (default: ${row.column_default})`);
      });
    } else {
      console.warn(`⚠️ Warning: Expected 3 columns, found ${verifyResult.rows.length}`);
    }
    
    console.log('\n🎉 Migration complete! You can now:');
    console.log('   1. Start your backend: cd backend && npm run dev');
    console.log('   2. Sync Facebook data: POST /api/facebook/sync/:clientId');
    console.log('   3. Test endpoints: GET /api/facebook/analytics/top-posts/:clientId');
    console.log('');
    
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('\n✅ Columns already exist - migration was previously run');
      console.log('   No action needed, you\'re good to go!');
    } else {
      console.error('\n❌ Migration failed:', error.message);
      console.error('\nError details:', error);
      process.exit(1);
    }
  } finally {
    await pool.end();
  }
}

// Run the migration
runMigration();

