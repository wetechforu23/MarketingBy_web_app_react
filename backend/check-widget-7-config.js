// Check widget ID 7 configuration for WhatsApp handover
const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'health_clinic_marketing',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function checkWidgetConfig() {
  try {
    // Get widget 7 configuration
    const widgetResult = await pool.query(`
      SELECT 
        id, widget_key, widget_name, client_id,
        enable_whatsapp, whatsapp_configured, enable_multiple_whatsapp_chats,
        handover_whatsapp_number, whatsapp_handover_content_sid,
        enable_handover_choice, handover_options, default_handover_method,
        intro_flow_enabled, intro_questions
      FROM widget_configs
      WHERE id = 7
    `);

    if (widgetResult.rows.length === 0) {
      console.log('❌ Widget 7 not found');
      return;
    }

    const widget = widgetResult.rows[0];
    
    console.log('\n' + '='.repeat(80));
    console.log('📋 WIDGET 7 CONFIGURATION');
    console.log('='.repeat(80));
    console.log(`Widget Key: ${widget.widget_key}`);
    console.log(`Widget Name: ${widget.widget_name}`);
    console.log(`Client ID: ${widget.client_id}`);
    console.log(`\n📱 WhatsApp Configuration:`);
    console.log(`  enable_whatsapp: ${widget.enable_whatsapp}`);
    console.log(`  whatsapp_configured: ${widget.whatsapp_configured}`);
    console.log(`  enable_multiple_whatsapp_chats: ${widget.enable_multiple_whatsapp_chats}`);
    console.log(`  handover_whatsapp_number: ${widget.handover_whatsapp_number || 'NULL'}`);
    console.log(`  whatsapp_handover_content_sid: ${widget.whatsapp_handover_content_sid || 'NULL'}`);
    
    console.log(`\n🤝 Handover Configuration:`);
    console.log(`  enable_handover_choice: ${widget.enable_handover_choice}`);
    console.log(`  default_handover_method: ${widget.default_handover_method || 'NULL'}`);
    if (widget.handover_options) {
      const options = typeof widget.handover_options === 'string' 
        ? JSON.parse(widget.handover_options) 
        : widget.handover_options;
      console.log(`  handover_options:`, JSON.stringify(options, null, 2));
    }
    
    console.log(`\n📝 Intro Flow:`);
    console.log(`  intro_flow_enabled: ${widget.intro_flow_enabled}`);
    if (widget.intro_questions) {
      const questions = typeof widget.intro_questions === 'string'
        ? JSON.parse(widget.intro_questions)
        : widget.intro_questions;
      console.log(`  intro_questions count: ${Array.isArray(questions) ? questions.length : 0}`);
    }
    
    // Check WhatsApp credentials for this client
    const clientId = widget.client_id;
    const credsResult = await pool.query(`
      SELECT service, key_name, 
             CASE 
               WHEN encrypted_value LIKE '%:%' THEN 'ENCRYPTED'
               ELSE 'PLAINTEXT'
             END as encryption_status,
             LENGTH(encrypted_value) as value_length
      FROM encrypted_credentials
      WHERE service LIKE '%whatsapp%' OR service LIKE '%twilio%'
      ORDER BY service, key_name
    `);
    
    console.log(`\n🔐 WhatsApp/Twilio Credentials:`);
    if (credsResult.rows.length === 0) {
      console.log(`  ❌ No WhatsApp/Twilio credentials found`);
    } else {
      credsResult.rows.forEach(row => {
        console.log(`  ${row.service}.${row.key_name}: ${row.encryption_status} (${row.value_length} chars)`);
      });
    }
    
    // Check if handover is properly configured
    console.log(`\n✅ WhatsApp Handover Status:`);
    const hasWhatsAppNumber = widget.handover_whatsapp_number && widget.handover_whatsapp_number.trim() !== '';
    const hasCredentials = credsResult.rows.length > 0;
    const isEnabled = widget.enable_whatsapp || (hasWhatsAppNumber && hasCredentials);
    
    console.log(`  Handover Number Set: ${hasWhatsAppNumber ? '✅ Yes' : '❌ No'}`);
    console.log(`  Credentials Found: ${hasCredentials ? '✅ Yes' : '❌ No'}`);
    console.log(`  enable_whatsapp Flag: ${widget.enable_whatsapp ? '✅ Yes' : '❌ No'}`);
    console.log(`  Overall Status: ${isEnabled ? '✅ ENABLED' : '❌ DISABLED'}`);
    
    if (!hasWhatsAppNumber) {
      console.log(`\n⚠️  ISSUE: handover_whatsapp_number is not set!`);
    }
    if (!hasCredentials) {
      console.log(`\n⚠️  ISSUE: WhatsApp credentials not found in encrypted_credentials table!`);
    }
    if (!widget.enable_whatsapp && hasWhatsAppNumber && hasCredentials) {
      console.log(`\n⚠️  ISSUE: enable_whatsapp is false but WhatsApp is configured!`);
    }
    
    console.log('\n' + '='.repeat(80) + '\n');
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
    process.exit(1);
  }
}

checkWidgetConfig();

