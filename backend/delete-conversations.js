// Delete all conversations and related data from Heroku database
const { Pool } = require('pg');

// Get database URL from Heroku config or use local .env
const databaseUrl = process.env.DATABASE_URL || 
  `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'postgres'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'health_clinic_marketing'}`;

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: databaseUrl.includes('amazonaws.com') || databaseUrl.includes('heroku') ? { rejectUnauthorized: false } : false
});

async function deleteAllConversations() {
  const client = await pool.connect();
  
  try {
    console.log('🗑️  Starting deletion of all conversations and related data...');
    console.log('');
    
    // Helper function to safely delete from a table
    async function safeDelete(tableName, description) {
      try {
        const result = await client.query(`DELETE FROM ${tableName}`);
        console.log(`   ✅ Deleted ${result.rowCount} ${description}`);
        return result.rowCount;
      } catch (e) {
        if (e.code === '42P01') {
          console.log(`   ℹ️  ${tableName} table does not exist (skipped)`);
          return 0;
        } else {
          throw e;
        }
      }
    }
    
    // Delete in order (respecting foreign keys)
    // 1. Delete WhatsApp messages first (if table exists)
    console.log('1. Deleting WhatsApp messages...');
    await safeDelete('whatsapp_messages', 'WhatsApp messages');
    
    // 2. Delete all messages
    console.log('2. Deleting all messages...');
    await safeDelete('widget_messages', 'messages');
    
    // 3. Delete all handover requests
    console.log('3. Deleting all handover requests...');
    await safeDelete('handover_requests', 'handover requests');
    
    // 4. Delete all conversations
    console.log('4. Deleting all conversations...');
    await safeDelete('widget_conversations', 'conversations');
    
    // 5. Delete all visitor session tracking data
    console.log('5. Deleting visitor session tracking data...');
    await safeDelete('widget_visitor_sessions', 'visitor sessions');
    await safeDelete('widget_page_views', 'page views');
    await safeDelete('widget_visitor_events', 'visitor events');
    
    // 6. Delete legacy visitor_sessions if it exists
    console.log('6. Deleting legacy visitor sessions...');
    await safeDelete('visitor_sessions', 'legacy visitor sessions');
    
    console.log('');
    console.log('✅ All conversations and related data deleted successfully!');
    console.log('');
    
    // Show summary (only for tables that exist)
    console.log('📊 Summary:');
    const tablesToCheck = [
      { name: 'widget_conversations', label: 'Conversations Remaining' },
      { name: 'widget_messages', label: 'Messages Remaining' },
      { name: 'handover_requests', label: 'Handover Requests Remaining' },
      { name: 'widget_visitor_sessions', label: 'Visitor Sessions Remaining' }
    ];
    
    for (const table of tablesToCheck) {
      try {
        const result = await client.query(`SELECT COUNT(*)::text as count FROM ${table.name}`);
        console.log(`   ${table.label}: ${result.rows[0].count}`);
      } catch (e) {
        if (e.code === '42P01') {
          console.log(`   ${table.label}: 0 (table does not exist)`);
        } else {
          console.log(`   ${table.label}: Error checking`);
        }
      }
    }
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error deleting conversations:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  deleteAllConversations()
    .then(() => {
      console.log('');
      console.log('✅ Cleanup complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Failed:', error);
      process.exit(1);
    });
}

module.exports = { deleteAllConversations };

