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
    
    // Start transaction
    await client.query('BEGIN');
    
    // 1. Delete all messages first
    console.log('1. Deleting all messages...');
    const messagesResult = await client.query('DELETE FROM widget_messages');
    console.log(`   ✅ Deleted ${messagesResult.rowCount} messages`);
    
    // 2. Delete all handover requests
    console.log('2. Deleting all handover requests...');
    const handoverResult = await client.query('DELETE FROM handover_requests');
    console.log(`   ✅ Deleted ${handoverResult.rowCount} handover requests`);
    
    // 3. Delete all conversations
    console.log('3. Deleting all conversations...');
    const conversationsResult = await client.query('DELETE FROM widget_conversations');
    console.log(`   ✅ Deleted ${conversationsResult.rowCount} conversations`);
    
    // 4. Delete all visitor session tracking data
    console.log('4. Deleting visitor session tracking data...');
    const sessionsResult = await client.query('DELETE FROM widget_visitor_sessions');
    console.log(`   ✅ Deleted ${sessionsResult.rowCount} visitor sessions`);
    
    const pageViewsResult = await client.query('DELETE FROM widget_page_views');
    console.log(`   ✅ Deleted ${pageViewsResult.rowCount} page views`);
    
    const eventsResult = await client.query('DELETE FROM widget_visitor_events');
    console.log(`   ✅ Deleted ${eventsResult.rowCount} visitor events`);
    
    // 5. Delete legacy visitor_sessions if it exists
    try {
      const legacyResult = await client.query('DELETE FROM visitor_sessions');
      console.log(`   ✅ Deleted ${legacyResult.rowCount} legacy visitor sessions`);
    } catch (e) {
      if (e.code === '42P01') {
        console.log('   ℹ️  Legacy visitor_sessions table does not exist (skipped)');
      } else {
        throw e;
      }
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log('');
    console.log('✅ All conversations and related data deleted successfully!');
    console.log('');
    
    // Show summary
    const summaryResult = await client.query(`
      SELECT 
        'Conversations Remaining' as action,
        COUNT(*)::text as count
      FROM widget_conversations
      UNION ALL
      SELECT 
        'Messages Remaining' as action,
        COUNT(*)::text as count
      FROM widget_messages
      UNION ALL
      SELECT 
        'Handover Requests Remaining' as action,
        COUNT(*)::text as count
      FROM handover_requests
      UNION ALL
      SELECT 
        'Visitor Sessions Remaining' as action,
        COUNT(*)::text as count
      FROM widget_visitor_sessions
    `);
    
    console.log('📊 Summary:');
    summaryResult.rows.forEach(row => {
      console.log(`   ${row.action}: ${row.count}`);
    });
    
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

