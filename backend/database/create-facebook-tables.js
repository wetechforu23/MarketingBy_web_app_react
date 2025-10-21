/**
 * Create Facebook Analytics Tables Migration
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function createFacebookTables() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL is not set in .env file.');
    process.exit(1);
  }

  const dbUrl = databaseUrl || '';
  const isRemoteDb = dbUrl && (
    dbUrl.includes('rds.amazonaws.com') || 
    dbUrl.includes('heroku') || 
    dbUrl.includes('.com') ||
    !dbUrl.includes('localhost')
  );

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: isRemoteDb ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🚀 Creating Facebook Analytics Tables...\n');
    console.log('📄 Migration file: create_facebook_tables.sql');
    console.log('📊 Database:', databaseUrl.split('@')[1]?.split('/')[0] || 'unknown');
    console.log('');

    const sql = fs.readFileSync(path.resolve(__dirname, 'create_facebook_tables.sql'), 'utf8');
    await pool.query(sql);

    console.log('✅ Tables created successfully!\n');
    console.log('📝 Created tables:');
    console.log('   - facebook_analytics');
    console.log('   - facebook_posts');
    console.log('');
    console.log('🎉 You can now sync Facebook data!');
    console.log('   Click "Sync Facebook Data" in your app');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.message.includes('already exists')) {
      console.log('ℹ️  Tables already exist - this is fine!');
    } else {
      process.exit(1);
    }
  } finally {
    await pool.end();
  }
}

createFacebookTables();

