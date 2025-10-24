/**
 * List all clients with Facebook connection status
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function listClients() {
  try {
    console.log(`\n${'='.repeat(100)}`);
    console.log(`📋 All Clients with Facebook Connection Status`);
    console.log(`${'='.repeat(100)}\n`);

    const result = await pool.query(`
      SELECT 
        c.id,
        c.client_name as name,
        c.email,
        CASE 
          WHEN cc.credentials IS NOT NULL THEN 'Connected'
          ELSE 'Not Connected'
        END as facebook_status,
        cc.credentials->>'page_id' as page_id
      FROM clients c
      LEFT JOIN client_credentials cc ON c.id = cc.client_id AND cc.service_type = 'facebook'
      ORDER BY c.id
    `);

    console.log(`Found ${result.rows.length} clients:\n`);

    result.rows.forEach(client => {
      const status = client.facebook_status === 'Connected' ? '✅' : '❌';
      const name = client.name || 'Unnamed';
      console.log(`${status} ID: ${client.id.toString().padEnd(5)} | ${name.padEnd(40)} | ${client.facebook_status.padEnd(15)} | Page ID: ${client.page_id || 'N/A'}`);
    });

    console.log(`\n${'='.repeat(100)}\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

listClients();

