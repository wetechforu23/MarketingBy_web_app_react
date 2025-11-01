const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('heroku') ? { rejectUnauthorized: false } : false
});

async function checkApiKey() {
  try {
    const widgetKey = 'wtfu_464ed6cab852594fce9034020d77dee3';
    
    // Check widget config
    const widgetResult = await pool.query(
      `SELECT id, widget_key, widget_name, client_id, widget_specific_llm_key, llm_enabled, llm_provider 
       FROM widget_configs 
       WHERE widget_key = $1`,
      [widgetKey]
    );
    
    if (widgetResult.rows.length === 0) {
      console.log('❌ Widget not found');
      await pool.end();
      return;
    }
    
    const widget = widgetResult.rows[0];
    console.log('📦 Widget Info:');
    console.log(`   ID: ${widget.id}`);
    console.log(`   Name: ${widget.widget_name}`);
    console.log(`   Client ID: ${widget.client_id}`);
    console.log(`   LLM Enabled: ${widget.llm_enabled}`);
    console.log(`   LLM Provider: ${widget.llm_provider || 'not set'}`);
    console.log(`   Has widget_specific_llm_key: ${!!widget.widget_specific_llm_key}`);
    console.log(`   Key length: ${widget.widget_specific_llm_key?.length || 0}`);
    
    if (widget.widget_specific_llm_key) {
      console.log(`   Key preview: ${widget.widget_specific_llm_key.substring(0, 20)}...`);
    }
    
    // Check encrypted_credentials for client-specific
    if (widget.client_id) {
      const clientServiceName = `google_ai_client_${widget.client_id}`;
      console.log(`\n🔍 Checking encrypted_credentials for: ${clientServiceName}`);
      
      const credResult = await pool.query(
        `SELECT service, key_name, encrypted_value 
         FROM encrypted_credentials 
         WHERE service = $1 AND key_name = 'api_key'`,
        [clientServiceName]
      );
      
      if (credResult.rows.length > 0) {
        console.log(`   ✅ Found client-specific key`);
        console.log(`   Encrypted length: ${credResult.rows[0].encrypted_value?.length || 0}`);
      } else {
        console.log(`   ❌ No client-specific key found`);
      }
    }
    
    // Check global credentials
    console.log(`\n🔍 Checking global credentials...`);
    const globalResult = await pool.query(
      `SELECT service, service_name, key_name, credential_type, encrypted_value 
       FROM encrypted_credentials 
       WHERE (
         (service IS NOT NULL AND (LOWER(service) LIKE '%gemini%' OR LOWER(service) LIKE '%google%') AND key_name = 'api_key')
         OR (service_name IS NOT NULL AND (LOWER(service_name) LIKE '%gemini%' OR LOWER(service_name) LIKE '%google%') AND credential_type = 'api_key')
       )
       AND (is_active IS NULL OR is_active = true)
       LIMIT 5`
    );
    
    if (globalResult.rows.length > 0) {
      console.log(`   ✅ Found ${globalResult.rows.length} global key(s)`);
      globalResult.rows.forEach((row, idx) => {
        console.log(`   ${idx + 1}. Service: ${row.service || row.service_name}, Key: ${row.key_name || row.credential_type}`);
      });
    } else {
      console.log(`   ❌ No global key found`);
    }
    
    console.log('\n💡 Recommendation:');
    if (!widget.widget_specific_llm_key && !credResult?.rows?.[0] && !globalResult.rows[0]) {
      console.log('   API key needs to be stored in widget_specific_llm_key column (encrypted)');
      console.log(`   Use: UPDATE widget_configs SET widget_specific_llm_key = encrypt('AIzaSy...') WHERE widget_key = '${widgetKey}'`);
    } else {
      console.log('   API key exists but may need to be properly encrypted or the decryption is failing');
    }
    
    await pool.end();
  } catch (e) {
    console.error('❌ Error:', e.message);
    console.error(e.stack);
    await pool.end();
  }
}

checkApiKey();

