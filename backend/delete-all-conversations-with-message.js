// Delete all conversations with a friendly message to users first
const { Pool } = require('pg');

// Get database URL from Heroku config or use local .env
const databaseUrl = process.env.DATABASE_URL || 
  `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'postgres'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'health_clinic_marketing'}`;

// Determine if SSL is needed (remote databases)
const isRemoteDatabase = databaseUrl.includes('amazonaws.com') || 
                         databaseUrl.includes('heroku') || 
                         databaseUrl.includes('rds.amazonaws.com') || 
                         databaseUrl.includes('sslmode=require') ||
                         (!databaseUrl.includes('localhost') && !databaseUrl.includes('127.0.0.1'));

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: isRemoteDatabase ? { rejectUnauthorized: false } : false
});

async function sendFriendlyMessageToActiveConversations() {
  const client = await pool.connect();
  
  try {
    console.log('📨 Sending friendly messages to active conversations...');
    console.log('');
    
    // Check if table exists first
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'widget_conversations'
      )
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('   ℹ️  widget_conversations table does not exist (skipped)');
      return;
    }
    
    // Get all active conversations
    const activeConvs = await client.query(`
      SELECT id, visitor_name, visitor_email, widget_id
      FROM widget_conversations
      WHERE status = 'active'
      ORDER BY id
    `);
    
    if (activeConvs.rows.length === 0) {
      console.log('   ℹ️  No active conversations found');
      return;
    }
    
    console.log(`   Found ${activeConvs.rows.length} active conversation(s)`);
    
    // Friendly message to send
    const friendlyMessage = `👋 Hi! We're performing system maintenance and need to reset all conversations. 
    
Thank you for chatting with us! We appreciate your patience. 

Please feel free to start a new conversation anytime - we're here to help! 😊

Have a great day!`;

    // Send message to each active conversation
    let messagesSent = 0;
    for (const conv of activeConvs.rows) {
      try {
        // Check if widget_messages table exists
        const messagesTableCheck = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'widget_messages'
          )
        `);
        
        if (messagesTableCheck.rows[0].exists) {
          await client.query(`
            INSERT INTO widget_messages (conversation_id, message_type, message_text, created_at)
            VALUES ($1, $2, $3, NOW())
          `, [conv.id, 'system', friendlyMessage]);
        }
        
        // Also update conversation status to closed
        await client.query(`
          UPDATE widget_conversations
          SET status = 'closed',
              ended_at = NOW(),
              updated_at = NOW()
          WHERE id = $1
        `, [conv.id]);
        
        messagesSent++;
        console.log(`   ✅ Sent message to conversation ${conv.id} (${conv.visitor_name || 'Anonymous'})`);
      } catch (error) {
        console.error(`   ❌ Failed to send message to conversation ${conv.id}:`, error.message);
      }
    }
    
    console.log('');
    console.log(`✅ Sent ${messagesSent} friendly message(s) to active conversations`);
    console.log('');
    
  } catch (error) {
    console.error('❌ Error sending messages:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function deleteAllConversations() {
  const client = await pool.connect();
  
  try {
    console.log('🗑️  Starting cleanup: Deleting all conversations and related data...');
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
    
    // 4. Delete all conversations (active, inactive, ended, closed - everything)
    console.log('4. Deleting ALL conversations (active, inactive, ended, closed)...');
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
    console.error('❌ Error deleting conversations:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

async function main() {
  try {
    // Step 1: Send friendly messages to active conversations
    await sendFriendlyMessageToActiveConversations();
    
    // Step 2: Wait a moment for messages to be processed
    console.log('⏳ Waiting 2 seconds for messages to be processed...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('');
    
    // Step 3: Delete all conversations
    await deleteAllConversations();
    
    console.log('');
    console.log('✅ Complete! All conversations have been notified and deleted.');
    console.log('🎉 Database is now clean and ready for fresh testing!');
    
  } catch (error) {
    console.error('❌ Failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Failed:', error);
      process.exit(1);
    });
}

module.exports = { sendFriendlyMessageToActiveConversations, deleteAllConversations };

