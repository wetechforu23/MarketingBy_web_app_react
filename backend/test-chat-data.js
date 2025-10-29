/**
 * Test Data Generator for Chat Widget Conversations
 * 
 * This script creates sample conversations with messages
 * so you can test the reply system in the portal.
 */

const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function generateTestData() {
  try {
    console.log('🚀 Starting test data generation...\n');

    // 1. Get or create a test widget
    console.log('📦 Step 1: Getting test widget...');
    let widgetResult = await pool.query(
      "SELECT * FROM widget_configs WHERE widget_name LIKE '%Test%' LIMIT 1"
    );

    let widgetId;
    if (widgetResult.rows.length === 0) {
      console.log('  ⚠️  No test widget found. Please create a widget first in the portal.');
      console.log('  📝 Go to: Dashboard → Chat Widgets → Create Widget');
      process.exit(1);
    }

    widgetId = widgetResult.rows[0].id;
    console.log(`  ✅ Found widget: ${widgetResult.rows[0].widget_name} (ID: ${widgetId})\n`);

    // 2. Create test conversations
    console.log('💬 Step 2: Creating test conversations...');
    
    const conversations = [
      {
        visitor_name: 'John Doe',
        visitor_email: 'john@example.com',
        visitor_phone: '555-0101',
        handoff_requested: true,
        messages: [
          { type: 'user', text: 'Hi! I need help with my appointment.' },
          { type: 'bot', text: 'Hello! I can help you with that. What would you like to know?' },
          { type: 'user', text: 'I need to speak with a real person please.' },
          { type: 'bot', text: 'I understand. Let me connect you with our team. Someone will respond shortly!' }
        ]
      },
      {
        visitor_name: 'Jane Smith',
        visitor_email: 'jane@example.com',
        visitor_phone: '555-0102',
        handoff_requested: false,
        messages: [
          { type: 'user', text: 'What are your business hours?' },
          { type: 'bot', text: 'We are open Monday-Friday, 9 AM to 6 PM, and Saturday 10 AM to 2 PM.' },
          { type: 'user', text: 'Perfect, thank you!' }
        ]
      },
      {
        visitor_name: 'Mike Johnson',
        visitor_email: 'mike@example.com',
        visitor_phone: null,
        handoff_requested: true,
        messages: [
          { type: 'user', text: 'Do you accept insurance?' },
          { type: 'bot', text: 'Yes, we accept most major insurance plans. Would you like to provide your insurance details?' },
          { type: 'user', text: 'Can someone call me to discuss this?' },
          { type: 'bot', text: 'Absolutely! I will have a team member contact you. Please provide your phone number.' },
          { type: 'user', text: 'My number is 555-0103' }
        ]
      },
      {
        visitor_name: 'Sarah Williams',
        visitor_email: null,
        visitor_phone: '555-0104',
        handoff_requested: false,
        messages: [
          { type: 'user', text: 'Hi there!' },
          { type: 'bot', text: 'Hello! How can I help you today?' },
          { type: 'user', text: 'Just browsing, thanks!' }
        ]
      }
    ];

    for (let i = 0; i < conversations.length; i++) {
      const conv = conversations[i];
      
      console.log(`  💬 Creating conversation ${i + 1}/${conversations.length}: ${conv.visitor_name}`);

      // Create conversation
      const convResult = await pool.query(
        `INSERT INTO widget_conversations (
          widget_id, visitor_name, visitor_email, visitor_phone,
          status, handoff_requested, handoff_requested_at,
          message_count, bot_response_count, human_response_count,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        RETURNING *`,
        [
          widgetId,
          conv.visitor_name,
          conv.visitor_email,
          conv.visitor_phone,
          'active',
          conv.handoff_requested,
          conv.handoff_requested ? new Date() : null,
          conv.messages.length,
          conv.messages.filter(m => m.type === 'bot').length,
          0
        ]
      );

      const conversationId = convResult.rows[0].id;
      console.log(`     ✅ Conversation created (ID: ${conversationId})`);

      // Add messages
      let lastMessage = '';
      let lastMessageAt = new Date();

      for (const msg of conv.messages) {
        await pool.query(
          `INSERT INTO widget_messages (
            conversation_id, message_type, message_text, created_at
          ) VALUES ($1, $2, $3, NOW())`,
          [conversationId, msg.type, msg.text]
        );
        
        lastMessage = msg.text;
        console.log(`     📝 Added ${msg.type} message: "${msg.text.substring(0, 40)}..."`);
      }

      // Update conversation with last message
      await pool.query(
        `UPDATE widget_conversations 
         SET last_message = $1, last_message_at = NOW()
         WHERE id = $2`,
        [lastMessage, conversationId]
      );
    }

    console.log('\n✅ Test data generated successfully!\n');
    console.log('📊 Summary:');
    console.log(`  - Widget ID: ${widgetId}`);
    console.log(`  - Total Conversations: ${conversations.length}`);
    console.log(`  - Handoff Requests: ${conversations.filter(c => c.handoff_requested).length}`);
    console.log(`  - Total Messages: ${conversations.reduce((sum, c) => sum + c.messages.length, 0)}`);
    console.log('\n🎯 Next Steps:');
    console.log('  1. Go to: Dashboard → Chat Conversations');
    console.log('  2. Select your widget from dropdown');
    console.log('  3. You should see 4 test conversations');
    console.log('  4. Click "View" or "Respond Now" to open a conversation');
    console.log('  5. Type a reply and click "Send Reply"');
    console.log('  6. Your reply will appear in green as a "human" message!\n');

  } catch (error) {
    console.error('❌ Error generating test data:', error);
    console.error('\nDetails:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the generator
generateTestData();

