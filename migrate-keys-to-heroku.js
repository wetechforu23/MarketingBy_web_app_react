#!/usr/bin/env node
/**
 * Migrate API keys from local .env to Heroku encrypted database
 * Run: node migrate-keys-to-heroku.js
 */

const { Pool } = require('pg');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });

// Encryption configuration (same as in backend)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-32-character-secret-key!!';
const ALGORITHM = 'aes-256-cbc';

// Encrypt function
function encrypt(text) {
  const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').substring(0, 32));
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

async function migrateKeys() {
  console.log('🔐 MIGRATING API KEYS TO HEROKU ENCRYPTED DATABASE');
  console.log('===================================================\n');

  // Connect to Heroku database
  const herokuDbUrl = process.env.HEROKU_DATABASE_URL || process.env.DATABASE_URL;
  
  if (!herokuDbUrl || herokuDbUrl.includes('localhost')) {
    console.error('❌ Error: HEROKU_DATABASE_URL environment variable not set');
    console.error('   Run: export HEROKU_DATABASE_URL=$(heroku config:get DATABASE_URL --app marketingby-wetechforu)');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: herokuDbUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✅ Connected to Heroku database\n');

    // Read Google Service Account JSON
    const googleServiceAccountPath = '/Users/viraltarpara/Desktop/github_viral/MarketingBy_web_app_react/wetechforu-marketing-platform-10460ab2b357.json';
    const googleServiceAccount = JSON.parse(fs.readFileSync(googleServiceAccountPath, 'utf8'));

    // Define all keys to migrate
    const keysToMigrate = [
      {
        service: 'google_maps',
        key_name: 'api_key',
        key_value: process.env.GOOGLE_MAPS_API_KEY,
        description: 'Google Maps and Places API Key'
      },
      {
        service: 'google_places',
        key_name: 'api_key',
        key_value: process.env.GOOGLE_MAPS_API_KEY, // Same as Maps
        description: 'Google Places API Key'
      },
      {
        service: 'google_service_account',
        key_name: 'private_key',
        key_value: googleServiceAccount.private_key,
        description: 'Google Service Account Private Key'
      },
      {
        service: 'google_service_account',
        key_name: 'client_email',
        key_value: googleServiceAccount.client_email,
        description: 'Google Service Account Email'
      },
      {
        service: 'google_service_account',
        key_name: 'project_id',
        key_value: googleServiceAccount.project_id,
        description: 'Google Project ID'
      },
      {
        service: 'stripe',
        key_name: 'public_key',
        key_value: process.env.STRIPE_PUBLIC_KEY,
        description: 'Stripe Public Key'
      },
      {
        service: 'stripe',
        key_name: 'secret_key',
        key_value: process.env.STRIPE_SECRET_KEY,
        description: 'Stripe Secret Key'
      },
      {
        service: 'azure',
        key_name: 'client_id',
        key_value: process.env.AZURE_CLIENT_ID,
        description: 'Azure Client ID'
      },
      {
        service: 'azure',
        key_name: 'tenant_id',
        key_value: process.env.AZURE_TENANT_ID,
        description: 'Azure Tenant ID'
      },
      {
        service: 'azure',
        key_name: 'client_secret',
        key_value: process.env.AZURE_CLIENT_SECRET,
        description: 'Azure Client Secret'
      },
      {
        service: 'smtp',
        key_name: 'server',
        key_value: process.env.SMTP_SERVER,
        description: 'SMTP Server'
      },
      {
        service: 'smtp',
        key_name: 'port',
        key_value: process.env.SMTP_PORT,
        description: 'SMTP Port'
      },
      {
        service: 'smtp',
        key_name: 'username',
        key_value: process.env.SMTP_SENDER_EMAIL,
        description: 'SMTP Username'
      },
      {
        service: 'smtp',
        key_name: 'password',
        key_value: process.env.SMTP_PASSWORD,
        description: 'SMTP Password'
      }
    ];

    // Migrate each key
    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const keyData of keysToMigrate) {
      if (!keyData.key_value) {
        console.log(`⏭️  Skipping ${keyData.service}/${keyData.key_name} (not found in .env)`);
        skipped++;
        continue;
      }

      try {
        const encryptedValue = encrypt(keyData.key_value);
        
        await pool.query(
          `INSERT INTO encrypted_credentials (service, key_name, encrypted_value, description, created_at, updated_at)
           VALUES ($1, $2, $3, $4, NOW(), NOW())
           ON CONFLICT (service, key_name) 
           DO UPDATE SET encrypted_value = $3, description = $4, updated_at = NOW()`,
          [keyData.service, keyData.key_name, encryptedValue, keyData.description]
        );

        console.log(`✅ Migrated: ${keyData.service}/${keyData.key_name}`);
        migrated++;
      } catch (error) {
        console.error(`❌ Error migrating ${keyData.service}/${keyData.key_name}:`, error.message);
        errors++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`📊 MIGRATION SUMMARY:`);
    console.log(`   ✅ Migrated: ${migrated}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log('='.repeat(50));

    // Verify what's in the database
    const result = await pool.query(
      'SELECT service, key_name, description FROM encrypted_credentials ORDER BY service, key_name'
    );
    
    console.log('\n📋 ENCRYPTED CREDENTIALS IN DATABASE:');
    console.log('=====================================');
    result.rows.forEach(row => {
      console.log(`   ${row.service}/${row.key_name} - ${row.description}`);
    });

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migration
migrateKeys().then(() => {
  console.log('\n✅ Migration complete!');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

