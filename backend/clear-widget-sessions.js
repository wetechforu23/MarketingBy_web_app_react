require('dotenv').config();
const { Pool } = require('pg');

const WIDGET_KEY = 'wtfu_464ed6cab852594fce9034020d77dee3';

// Determine if this is a remote database (Heroku, AWS, etc.)
const dbUrl = process.env.DATABASE_URL || '';
const isRemoteDb = dbUrl && (
  dbUrl.includes('rds.amazonaws.com') || 
  dbUrl.includes('heroku') || 
  dbUrl.includes('.com') ||
  !dbUrl.includes('localhost')
);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isRemoteDb ? { 
    rejectUnauthorized: false,
    require: true 
  } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

async function clearWidgetSessions() {
  const client = await pool.connect();
  try {
    // Find widget ID
    const widgetResult = await client.query(
      'SELECT id, widget_name FROM widget_configs WHERE widget_key = $1',
      [WIDGET_KEY]
    );

    if (widgetResult.rows.length === 0) {
      console.log(`❌ Widget with key ${WIDGET_KEY} not found`);
      return;
    }

    const widgetId = widgetResult.rows[0].id;
    const widgetName = widgetResult.rows[0].widget_name;
    console.log(`✅ Found widget: ${widgetName} (ID: ${widgetId})`);

    // Get conversation IDs for this widget
    const conversationsResult = await client.query(
      'SELECT id, visitor_session_id, session_id FROM widget_conversations WHERE widget_id = $1',
      [widgetId]
    );

    const conversationIds = conversationsResult.rows.map(r => r.id);
    const visitorSessionIds = conversationsResult.rows
      .map(r => r.visitor_session_id)
      .filter(id => id !== null);
    const sessionIds = conversationsResult.rows
      .map(r => r.session_id)
      .filter(id => id !== null);

    console.log(`\n📊 Found:`);
    console.log(`   - ${conversationsResult.rows.length} conversations`);
    console.log(`   - ${visitorSessionIds.length} unique visitor_session_ids`);
    console.log(`   - ${sessionIds.length} unique session_ids`);

    if (conversationIds.length === 0) {
      console.log('\n✅ No conversations to delete');
    } else {
      // Delete all messages for these conversations
      const messagesDeleted = await client.query(
        'DELETE FROM widget_messages WHERE conversation_id = ANY($1::int[])',
        [conversationIds]
      );
      console.log(`   - ${messagesDeleted.rowCount} messages deleted`);

      // Delete all conversations
      const conversationsDeleted = await client.query(
        'DELETE FROM widget_conversations WHERE widget_id = $1',
        [widgetId]
      );
      console.log(`   - ${conversationsDeleted.rowCount} conversations deleted`);

      // Delete visitor sessions
      if (visitorSessionIds.length > 0) {
        const visitorSessionsDeleted = await client.query(
          'DELETE FROM widget_visitor_sessions WHERE widget_id = $1',
          [widgetId]
        );
        console.log(`   - ${visitorSessionsDeleted.rowCount} visitor sessions deleted`);
      }

      // Delete handover requests
      const handoverDeleted = await client.query(
        'DELETE FROM handover_requests WHERE widget_id = $1',
        [widgetId]
      );
      console.log(`   - ${handoverDeleted.rowCount} handover requests deleted`);
    }

    console.log(`\n✅ All sessions cleared for widget ${WIDGET_KEY} (ID: ${widgetId})`);
    console.log(`\n📝 Browser Storage Keys to Clear:`);
    console.log(`   - localStorage keys containing: ${WIDGET_KEY}`);
    console.log(`   - localStorage keys containing: visitor_session_id`);
    console.log(`   - sessionStorage keys containing: ${WIDGET_KEY}`);
    
    if (visitorSessionIds.length > 0) {
      console.log(`\n   Specific visitor_session_ids found:`);
      visitorSessionIds.slice(0, 10).forEach(id => {
        console.log(`   - ${id}`);
      });
      if (visitorSessionIds.length > 10) {
        console.log(`   ... and ${visitorSessionIds.length - 10} more`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

clearWidgetSessions()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });

