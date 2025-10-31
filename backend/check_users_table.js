// Check all users in the database
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function checkUsersTable() {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 CHECKING ALL USERS IN DATABASE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Get all users with their client assignments
    const result = await pool.query(`
      SELECT 
        u.id,
        u.email,
        u.username,
        u.role,
        u.client_id,
        c.client_name,
        u.is_active,
        u.created_at
      FROM users u
      LEFT JOIN clients c ON u.client_id = c.id
      ORDER BY u.id DESC
      LIMIT 20;
    `);

    console.log(`📊 Found ${result.rows.length} users:\n`);
    
    result.rows.forEach((user, index) => {
      console.log(`${index + 1}. User ID: ${user.id}`);
      console.log(`   📧 Email: ${user.email}`);
      console.log(`   👤 Username: ${user.username}`);
      console.log(`   🔑 Role: ${user.role}`);
      console.log(`   🏢 Client ID: ${user.client_id} → ${user.client_name || 'No client assigned'}`);
      console.log(`   ✓ Active: ${user.is_active}`);
      console.log(`   📅 Created: ${new Date(user.created_at).toLocaleString()}`);
      console.log('');
    });

    // Specifically look for demo2 users
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 DEMO2 USERS SPECIFICALLY:\n');
    
    const demo2Users = result.rows.filter(u => 
      u.email.toLowerCase().includes('demo2') || 
      u.email.toLowerCase().includes('abc')
    );

    if (demo2Users.length > 0) {
      demo2Users.forEach((user) => {
        console.log(`✅ Found: ${user.email}`);
        console.log(`   - User ID: ${user.id}`);
        console.log(`   - Role: ${user.role}`);
        console.log(`   - Client: ${user.client_name} (ID: ${user.client_id})`);
        console.log(`   - Active: ${user.is_active}`);
        console.log('');
      });
    } else {
      console.log('❌ No demo2 users found');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

checkUsersTable();

