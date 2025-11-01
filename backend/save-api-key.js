const { Pool } = require('pg');
const crypto = require('crypto');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('heroku') || process.env.DATABASE_URL?.includes('.com') 
    ? { rejectUnauthorized: false } 
    : false
});

async function saveApiKey() {
  try {
    const widgetKey = 'wtfu_464ed6cab852594fce9034020d77dee3';
    const apiKey = 'AIzaSyDACu87GKFpSqhrReeDXVMjknKL85f1pLw';
    
    // Get encryption key
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-32-character-secret-key!!';
    const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').substring(0, 32));
    
    // Encrypt function
    const encrypt = (text) => {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return iv.toString('hex') + ':' + encrypted;
    };
    
    // Find widget
    const widgetResult = await pool.query(
      'SELECT id, widget_name, client_id FROM widget_configs WHERE widget_key = $1',
      [widgetKey]
    );
    
    if (widgetResult.rows.length === 0) {
      console.log('❌ Widget not found');
      await pool.end();
      return;
    }
    
    const widget = widgetResult.rows[0];
    console.log(`\n📦 Widget: ${widget.widget_name} (ID: ${widget.id})`);
    console.log(`🔑 API Key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`);
    
    // Encrypt the API key
    const encryptedKey = encrypt(apiKey);
    console.log(`\n🔐 Encrypted Key (first 50 chars): ${encryptedKey.substring(0, 50)}...`);
    
    // Update widget_specific_llm_key
    const updateResult = await pool.query(
      `UPDATE widget_configs 
       SET widget_specific_llm_key = $1, 
           llm_enabled = true,
           llm_provider = 'gemini',
           llm_model = 'gemini-2.0-flash',
           updated_at = CURRENT_TIMESTAMP
       WHERE widget_key = $2
       RETURNING id, widget_name, llm_enabled, llm_provider`,
      [encryptedKey, widgetKey]
    );
    
    if (updateResult.rows.length > 0) {
      const updated = updateResult.rows[0];
      console.log('\n✅ API Key saved successfully!');
      console.log(`   Widget: ${updated.widget_name}`);
      console.log(`   LLM Enabled: ${updated.llm_enabled}`);
      console.log(`   LLM Provider: ${updated.llm_provider}`);
      console.log('\n💡 The widget editor should now show "Configured" status');
    } else {
      console.log('\n❌ Failed to update widget');
    }
    
    await pool.end();
  } catch (e) {
    console.error('\n❌ Error:', e.message);
    console.error(e.stack);
    await pool.end();
    process.exit(1);
  }
}

saveApiKey();

