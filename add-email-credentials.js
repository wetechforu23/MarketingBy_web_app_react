const { Pool } = require('pg');
const crypto = require('crypto');
require('dotenv').config({ path: './backend/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.HEROKU_POSTGRESQL_COLORFUL_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

function encrypt(text) {
  const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-32-character-secret-key!!';
  const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').substring(0, 32));
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

async function addEmailCredentials() {
  console.log('🔐 Adding Email Credentials to Encrypted Database...\n');

  const credentials = [
    // Gmail for sending SEO reports
    {
      service: 'gmail',
      key_name: 'email_user',
      value: 'noreply@marketingby.wetechforu.com', // Update with your Gmail
      description: 'Gmail address for sending SEO reports'
    },
    {
      service: 'gmail',
      key_name: 'email_password',
      value: 'YOUR_GMAIL_APP_PASSWORD', // Update with app-specific password
      description: 'Gmail app-specific password'
    },
    // Azure Calendar Booking Link
    {
      service: 'azure_calendar',
      key_name: 'calendar_booking_link',
      value: 'https://outlook.office365.com/book/WeTechForU@wetechforu.com/',
      description: 'Azure calendar booking page URL'
    }
  ];

  let added = 0;
  let updated = 0;
  let skipped = 0;

  for (const cred of credentials) {
    try {
      // Check if exists
      const existing = await pool.query(
        'SELECT id FROM encrypted_credentials WHERE service = $1 AND key_name = $2',
        [cred.service, cred.key_name]
      );

      const encryptedValue = encrypt(cred.value);

      if (existing.rows.length > 0) {
        // Update
        await pool.query(
          'UPDATE encrypted_credentials SET encrypted_value = $1, updated_at = NOW() WHERE service = $2 AND key_name = $3',
          [encryptedValue, cred.service, cred.key_name]
        );
        console.log(`✅ Updated: ${cred.service}.${cred.key_name}`);
        updated++;
      } else {
        // Insert
        await pool.query(
          'INSERT INTO encrypted_credentials (service, key_name, encrypted_value, description, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW())',
          [cred.service, cred.key_name, encryptedValue, cred.description]
        );
        console.log(`✅ Added: ${cred.service}.${cred.key_name}`);
        added++;
      }
    } catch (error) {
      console.error(`❌ Error with ${cred.service}.${cred.key_name}:`, error.message);
      skipped++;
    }
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📊 Summary:`);
  console.log(`   Added: ${added}`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Total: ${added + updated + skipped}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  await pool.end();
}

addEmailCredentials().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

