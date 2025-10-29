const { Pool } = require('pg');
const crypto = require('crypto');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Encryption function (same as backend)
function encrypt(text) {
  const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-encryption-key-change-this';
  const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').substring(0, 32));
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

async function addProMedWordPressCredentials() {
  try {
    console.log('🔐 Adding WordPress credentials for ProMed (Client ID: 1)...\n');

    const clientId = 1;
    const serviceName = `wordpress_client_${clientId}`;
    
    // ProMed WordPress credentials
    const credentials = {
      site_url: 'https://promedhca.com',
      username: 'wetechforuteams',
      app_password: 'WetechforuTeams2025'
    };

    console.log('📝 Credentials to save:');
    console.log('  Site URL:', credentials.site_url);
    console.log('  Username:', credentials.username);
    console.log('  Password: ********** (hidden)\n');

    // Encrypt and insert each credential
    for (const [key, value] of Object.entries(credentials)) {
      const encryptedValue = encrypt(value);
      const description = `WordPress ${key.replace('_', ' ')} for ProMed Healthcare Associates`;
      
      console.log(`✅ Encrypting and saving ${key}...`);
      
      await pool.query(
        `INSERT INTO encrypted_credentials (service, key_name, encrypted_value, description, created_at, updated_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT (service, key_name) 
         DO UPDATE SET 
           encrypted_value = EXCLUDED.encrypted_value, 
           updated_at = CURRENT_TIMESTAMP,
           description = EXCLUDED.description`,
        [serviceName, key, encryptedValue, description]
      );
    }

    console.log('\n🎉 SUCCESS! WordPress credentials for ProMed have been saved securely!');
    console.log('\n📊 Verifying saved credentials...');
    
    // Verify
    const result = await pool.query(
      `SELECT id, service, key_name, description, created_at 
       FROM encrypted_credentials 
       WHERE service = $1 
       ORDER BY key_name`,
      [serviceName]
    );
    
    console.log('\n✅ Saved credentials:');
    result.rows.forEach(row => {
      console.log(`  - ${row.key_name}: ${row.description} (ID: ${row.id})`);
    });
    
    console.log('\n✨ ProMed can now publish blogs to WordPress from the portal!');
    console.log('   Go to: https://marketingby.wetechforu.com/app/blog-management');
    console.log('   Select: ProMed Healthcare Associates');
    console.log('   Click: ⚙️ Settings tab (credentials are pre-configured)');
    
  } catch (error) {
    console.error('❌ Error adding credentials:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the script
addProMedWordPressCredentials();

