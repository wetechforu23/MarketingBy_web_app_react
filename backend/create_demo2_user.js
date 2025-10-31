// Quick script to create Demo2 user with PROPER password hash
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Debug: Check if DATABASE_URL is loaded
console.log('🔍 DATABASE_URL loaded:', process.env.DATABASE_URL ? 'YES' : 'NO');

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment variables!');
  console.log('💡 Make sure backend/.env file exists with DATABASE_URL');
  process.exit(1);
}

const isRemoteDb = process.env.DATABASE_URL && (
  process.env.DATABASE_URL.includes('rds.amazonaws.com') || 
  process.env.DATABASE_URL.includes('heroku') || 
  process.env.DATABASE_URL.includes('.com') ||
  !process.env.DATABASE_URL.includes('localhost')
);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isRemoteDb ? { rejectUnauthorized: false } : false,
});

async function createDemo2User() {
  try {
    console.log('🔄 Generating password hash...');
    const password = 'Demo2@2025';
    const passwordHash = await bcrypt.hash(password, 10);
    console.log('✅ Password hash generated');
    
    console.log('🔄 Creating Demo2 user in database...');
    
    const result = await pool.query(`
      INSERT INTO users (
        email, 
        password_hash, 
        username,
        role, 
        client_id, 
        is_active,
        created_at,
        updated_at,
        first_name,
        last_name
      ) VALUES (
        $1, $2, $3, $4, $5, $6, NOW(), NOW(), $7, $8
      ) ON CONFLICT (email) DO UPDATE 
      SET 
        password_hash = $2,
        client_id = $5,
        role = $4,
        is_active = $6,
        updated_at = NOW()
      RETURNING id, email, username, role, client_id, is_active;
    `, [
      'demo2@abc.com',
      passwordHash,
      'Demo2 Client Admin',
      'client_admin',
      199,  // Demo-2 client ID
      true,
      'Demo2',
      'Admin'
    ]);

    console.log('✅ Demo2 user created successfully!');
    console.log('📊 User details:', result.rows[0]);
    console.log('\n🎉 You can now login with:');
    console.log('📧 Email: demo2@abc.com');
    console.log('🔑 Password: Demo2@2025');
    console.log('\n⚠️  Make sure to use the EXACT email: demo2@abc.com');
    console.log('⚠️  Make sure to use the EXACT password: Demo2@2025');
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating user:', error.message);
    console.error('Full error:', error);
    await pool.end();
    process.exit(1);
  }
}

createDemo2User();

