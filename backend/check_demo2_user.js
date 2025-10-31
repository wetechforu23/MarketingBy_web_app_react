// Quick script to check Demo2 user assignment
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function checkDemo2User() {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 CHECKING DEMO2 USER ASSIGNMENT');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 1. Find Demo2 client
    console.log('📊 Step 1: Finding Demo2 client...');
    const clientResult = await pool.query(
      "SELECT id, client_name, email FROM clients WHERE client_name ILIKE '%demo%' ORDER BY id"
    );
    
    if (clientResult.rows.length === 0) {
      console.log('❌ No Demo clients found!');
      return;
    }

    console.log('✅ Found Demo clients:');
    clientResult.rows.forEach(client => {
      console.log(`   - ID: ${client.id}, Name: ${client.client_name}, Email: ${client.email}`);
    });
    console.log();

    // 2. Find demo2 user
    console.log('📊 Step 2: Finding demo2 user...');
    const userResult = await pool.query(
      "SELECT id, email, username, role, client_id, is_active FROM users WHERE email LIKE '%demo2%'"
    );

    if (userResult.rows.length === 0) {
      console.log('❌ No demo2 user found!');
      console.log('💡 You need to create this user first via Super Admin dashboard.');
      return;
    }

    console.log('✅ Found demo2 user:');
    const user = userResult.rows[0];
    console.log(`   - ID: ${user.id}`);
    console.log(`   - Email: ${user.email}`);
    console.log(`   - Role: ${user.role}`);
    console.log(`   - Client ID: ${user.client_id}`);
    console.log(`   - Active: ${user.is_active}`);
    console.log();

    // 3. Check if user is assigned to correct client
    console.log('📊 Step 3: Verifying client assignment...');
    const joinResult = await pool.query(
      `SELECT u.id, u.email, u.role, u.client_id, c.client_name
       FROM users u
       LEFT JOIN clients c ON u.client_id = c.id
       WHERE u.email LIKE '%demo2%'`
    );

    const assignment = joinResult.rows[0];
    console.log(`✅ User "${assignment.email}" is assigned to: ${assignment.client_name} (ID: ${assignment.client_id})`);
    console.log();

    // 4. Suggest fix if needed
    const demo2Client = clientResult.rows.find(c => c.client_name === 'Demo2' || c.client_name === 'demo2' || c.id === 199);
    
    if (demo2Client && assignment.client_id !== demo2Client.id) {
      console.log('⚠️  WARNING: User is assigned to WRONG client!');
      console.log(`   Current assignment: ${assignment.client_name} (ID: ${assignment.client_id})`);
      console.log(`   Should be: ${demo2Client.client_name} (ID: ${demo2Client.id})`);
      console.log();
      console.log('💡 TO FIX: Log in as Super Admin → Users → Edit demo2 user → Change Client to "Demo2"');
    } else {
      console.log('✅ User is assigned to the correct client!');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkDemo2User();

