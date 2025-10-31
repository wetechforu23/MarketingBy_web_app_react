import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

// Create pool with proper SSL config for remote databases
const dbUrl = process.env.DATABASE_URL || '';
const isRemoteDb = dbUrl && (
  dbUrl.includes('rds.amazonaws.com') || 
  dbUrl.includes('heroku') || 
  dbUrl.includes('.com') ||
  !dbUrl.includes('localhost')
);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isRemoteDb ? { rejectUnauthorized: false } : false,
});

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('🔄 Running migration: add_handover_whatsapp_number...');
    
    // Read migration file
    const migrationPath = path.join(__dirname, '../database/add_handover_whatsapp_number.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute migration
    await client.query('BEGIN');
    await client.query(migrationSQL);
    await client.query('COMMIT');
    
    console.log('✅ Migration completed successfully!');
    console.log('✅ Added column: widget_configs.handover_whatsapp_number');
    
    // Verify the column was added
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'widget_configs' 
      AND column_name = 'handover_whatsapp_number'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Verification: Column exists:', result.rows[0]);
    } else {
      console.log('⚠️  Warning: Could not verify column was created');
    }
    
  } catch (error: any) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration()
  .then(() => {
    console.log('🎉 Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration script failed:', error);
    process.exit(1);
  });

