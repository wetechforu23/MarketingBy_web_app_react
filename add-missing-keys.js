#!/usr/bin/env node
/**
 * Add missing API keys from .env to Heroku encrypted database
 */

const { Pool } = require('pg');
const crypto = require('crypto');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });

// Encryption configuration
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-32-character-secret-key!!';
const ALGORITHM = 'aes-256-cbc';

function encrypt(text) {
  const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').substring(0, 32));
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

async function addMissingKeys() {
  console.log('🔐 ADDING MISSING KEYS TO HEROKU ENCRYPTED DATABASE');
  console.log('===================================================\n');

  const herokuDbUrl = process.env.HEROKU_DATABASE_URL || process.env.DATABASE_URL;
  
  if (!herokuDbUrl || herokuDbUrl.includes('localhost')) {
    console.error('❌ Error: HEROKU_DATABASE_URL not set');
    console.error('   Run: export HEROKU_DATABASE_URL=$(heroku config:get DATABASE_URL --app marketingby-wetechforu)');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: herokuDbUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await pool.query('SELECT NOW()');
    console.log('✅ Connected to Heroku database\n');

    // Define ALL missing keys from .env
    const missingKeys = [
      // Azure Communication Services
      {
        service: 'azure_communication',
        key_name: 'connection_string',
        key_value: process.env.AZURE_COMMUNICATION_CONNECTION_STRING,
        description: 'Azure Communication Services Connection String'
      },
      {
        service: 'azure_communication',
        key_name: 'email_from_address',
        key_value: process.env.AZURE_EMAIL_FROM_ADDRESS,
        description: 'Azure Email From Address'
      },
      // Gmail
      {
        service: 'gmail',
        key_name: 'user',
        key_value: process.env.GMAIL_USER,
        description: 'Gmail Username'
      },
      {
        service: 'gmail',
        key_name: 'app_password',
        key_value: process.env.GMAIL_APP_PASSWORD,
        description: 'Gmail App Password'
      },
      // GoDaddy
      {
        service: 'godaddy',
        key_name: 'api_key',
        key_value: process.env.GODADDY_API_KEY,
        description: 'GoDaddy API Key'
      },
      {
        service: 'godaddy',
        key_name: 'api_secret',
        key_value: process.env.GODADDY_API_SECRET,
        description: 'GoDaddy API Secret'
      },
      // Google Ads
      {
        service: 'google_ads',
        key_name: 'client_id',
        key_value: process.env.GOOGLE_ADS_CLIENT_ID,
        description: 'Google Ads Client ID'
      },
      {
        service: 'google_ads',
        key_name: 'client_secret',
        key_value: process.env.GOOGLE_ADS_CLIENT_SECRET,
        description: 'Google Ads Client Secret'
      },
      {
        service: 'google_ads',
        key_name: 'project_id',
        key_value: process.env.GOOGLE_ADS_PROJECT_ID,
        description: 'Google Ads Project ID'
      },
      // Google Analytics
      {
        service: 'google_analytics',
        key_name: 'api_key',
        key_value: process.env.GOOGLE_ANALYTICS_DATA_API_KEY,
        description: 'Google Analytics Data API Key'
      },
      // Google Calendar
      {
        service: 'google_calendar',
        key_name: 'api_key',
        key_value: process.env.GOOGLE_CALENDAR_API_KEY,
        description: 'Google Calendar API Key'
      },
      {
        service: 'google_calendar',
        key_name: 'api_url',
        key_value: process.env.GOOGLE_CALENDAR_API_URL,
        description: 'Google Calendar API URL'
      },
      // Google PageSpeed
      {
        service: 'google_pagespeed',
        key_name: 'api_key',
        key_value: process.env.GOOGLE_PAGESPEED_API_KEY,
        description: 'Google PageSpeed API Key'
      },
      // Google Search Console
      {
        service: 'google_search_console',
        key_name: 'api_key',
        key_value: process.env.GOOGLE_SEARCH_CONSOLE_API_KEY,
        description: 'Google Search Console API Key'
      },
      // Heroku
      {
        service: 'heroku',
        key_name: 'api_key',
        key_value: process.env.HEROKU_API_KEY,
        description: 'Heroku API Key'
      },
      // OpenAI
      {
        service: 'openai',
        key_name: 'api_key',
        key_value: process.env.OPENAI_API_KEY,
        description: 'OpenAI API Key'
      },
      // SEranking
      {
        service: 'seranking',
        key_name: 'api_key',
        key_value: process.env.SERANKING_API_KEY,
        description: 'SEranking API Key'
      },
      // Stripe Webhook
      {
        service: 'stripe',
        key_name: 'webhook_secret',
        key_value: process.env.STRIPE_WEBHOOK_SECRET,
        description: 'Stripe Webhook Secret'
      },
      // SMTP Password (was missing before)
      {
        service: 'smtp',
        key_name: 'password',
        key_value: process.env.SMTP_PASSWORD,
        description: 'SMTP Password'
      },
      // Company Info
      {
        service: 'company',
        key_name: 'name',
        key_value: process.env.COMPANY_NAME,
        description: 'Company Name'
      },
      {
        service: 'company',
        key_name: 'email',
        key_value: process.env.COMPANY_EMAIL,
        description: 'Company Email'
      },
      {
        service: 'company',
        key_name: 'reply_to_email',
        key_value: process.env.REPLY_TO_EMAIL,
        description: 'Reply To Email'
      },
      {
        service: 'company',
        key_name: 'from_name',
        key_value: process.env.FROM_NAME,
        description: 'Email From Name'
      }
    ];

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const keyData of missingKeys) {
      if (!keyData.key_value) {
        console.log(`⏭️  Skipping ${keyData.service}/${keyData.key_name} (not found in .env)`);
        skipped++;
        continue;
      }

      try {
        // Check if key already exists
        const existing = await pool.query(
          'SELECT id FROM encrypted_credentials WHERE service = $1 AND key_name = $2',
          [keyData.service, keyData.key_name]
        );

        if (existing.rows.length > 0) {
          console.log(`⏭️  Skipping ${keyData.service}/${keyData.key_name} (already exists)`);
          skipped++;
          continue;
        }

        const encryptedValue = encrypt(keyData.key_value);
        
        await pool.query(
          `INSERT INTO encrypted_credentials (service, key_name, encrypted_value, description, created_at, updated_at)
           VALUES ($1, $2, $3, $4, NOW(), NOW())`,
          [keyData.service, keyData.key_name, encryptedValue, keyData.description]
        );

        console.log(`✅ Added: ${keyData.service}/${keyData.key_name}`);
        migrated++;
      } catch (error) {
        console.error(`❌ Error adding ${keyData.service}/${keyData.key_name}:`, error.message);
        errors++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`📊 SUMMARY:`);
    console.log(`   ✅ Added: ${migrated}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log('='.repeat(50));

    // Show all credentials now in database
    const result = await pool.query(
      'SELECT service, key_name, description FROM encrypted_credentials ORDER BY service, key_name'
    );
    
    console.log(`\n📋 ALL ${result.rows.length} ENCRYPTED CREDENTIALS IN DATABASE:`);
    console.log('='.repeat(70));
    result.rows.forEach(row => {
      console.log(`   ${row.service.padEnd(25)} / ${row.key_name.padEnd(20)} - ${row.description}`);
    });

  } catch (error) {
    console.error('\n❌ Failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

addMissingKeys().then(() => {
  console.log('\n✅ Complete!');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

