/**
 * Widget Flow Analyzer
 * Checks complete configuration for widget: wtfu_464ed6cab852594fce9034020d77dee3
 */

const { Pool } = require('pg');
require('dotenv').config({ path: './.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const WIDGET_KEY = 'wtfu_464ed6cab852594fce9034020d77dee3';

async function analyzeWidget() {
  try {
    console.log('\n🔍 WIDGET FLOW ANALYSIS');
    console.log('═'.repeat(80));
    console.log(`Widget Key: ${WIDGET_KEY}\n`);

    // 1. Get Widget Configuration
    console.log('📋 1. WIDGET CONFIGURATION');
    console.log('─'.repeat(80));
    const widgetConfig = await pool.query(
      `SELECT 
        id, widget_key, widget_name, client_id,
        bot_name, welcome_message, bot_avatar_url,
        primary_color, secondary_color, position,
        intro_flow_enabled, intro_questions,
        enable_appointment_booking, enable_email_capture, enable_phone_capture,
        enable_ai_handoff, ai_handoff_url,
        business_hours, offline_message,
        llm_enabled, llm_provider, llm_model, llm_temperature,
        industry, practice_phone, emergency_disclaimer, hipaa_disclaimer,
        show_emergency_warning, auto_detect_emergency,
        rate_limit_messages, rate_limit_window,
        is_active, created_at, updated_at
       FROM widget_configs
       WHERE widget_key = $1`,
      [WIDGET_KEY]
    );

    if (widgetConfig.rows.length === 0) {
      console.log('❌ Widget not found!');
      process.exit(1);
    }

    const widget = widgetConfig.rows[0];
    console.log(`✅ Widget ID: ${widget.id}`);
    console.log(`✅ Widget Name: ${widget.widget_name}`);
    console.log(`✅ Client ID: ${widget.client_id}`);
    console.log(`✅ Status: ${widget.is_active ? 'ACTIVE' : 'INACTIVE'}`);
    console.log(`\n🤖 Bot Settings:`);
    console.log(`   - Bot Name: ${widget.bot_name || 'Not set'}`);
    console.log(`   - Welcome Message: ${widget.welcome_message || 'Not set'}`);
    console.log(`   - Bot Avatar: ${widget.bot_avatar_url || 'Not set'}`);
    console.log(`\n🎨 Appearance:`);
    console.log(`   - Primary Color: ${widget.primary_color}`);
    console.log(`   - Secondary Color: ${widget.secondary_color}`);
    console.log(`   - Position: ${widget.position}`);
    console.log(`\n📝 Intro Flow:`);
    console.log(`   - Enabled: ${widget.intro_flow_enabled ? 'YES' : 'NO'}`);
    if (widget.intro_questions) {
      const questions = typeof widget.intro_questions === 'string' 
        ? JSON.parse(widget.intro_questions) 
        : widget.intro_questions;
      console.log(`   - Questions Count: ${Array.isArray(questions) ? questions.length : 0}`);
      if (Array.isArray(questions) && questions.length > 0) {
        questions.forEach((q, i) => {
          console.log(`     ${i + 1}. ${q.question} (${q.type}, required: ${q.required})`);
        });
      }
    } else {
      console.log(`   - Questions: None configured`);
    }
    console.log(`\n🔧 Features:`);
    console.log(`   - Appointment Booking: ${widget.enable_appointment_booking ? 'ENABLED' : 'DISABLED'}`);
    console.log(`   - Email Capture: ${widget.enable_email_capture ? 'ENABLED' : 'DISABLED'}`);
    console.log(`   - Phone Capture: ${widget.enable_phone_capture ? 'ENABLED' : 'DISABLED'}`);
    console.log(`   - AI Handoff: ${widget.enable_ai_handoff ? 'ENABLED' : 'DISABLED'}`);
    console.log(`\n🤖 AI/LLM Settings:`);
    console.log(`   - LLM Enabled: ${widget.llm_enabled ? 'YES' : 'NO'}`);
    if (widget.llm_enabled) {
      console.log(`   - Provider: ${widget.llm_provider || 'Not set'}`);
      console.log(`   - Model: ${widget.llm_model || 'Not set'}`);
      console.log(`   - Temperature: ${widget.llm_temperature || 'Not set'}`);
    }
    console.log(`\n🏥 Healthcare Settings:`);
    console.log(`   - Industry: ${widget.industry || 'general'}`);
    console.log(`   - Practice Phone: ${widget.practice_phone || 'Not set'}`);
    console.log(`   - Show Emergency Warning: ${widget.show_emergency_warning ? 'YES' : 'NO'}`);
    console.log(`   - Auto Detect Emergency: ${widget.auto_detect_emergency ? 'YES' : 'NO'}`);

    // 2. Get Handover Configuration
    console.log(`\n\n🤝 2. HANDOVER CONFIGURATION`);
    console.log('─'.repeat(80));
    const handoverConfig = await pool.query(
      `SELECT 
        enable_handover_choice, handover_options, default_handover_method,
        handover_whatsapp_number, whatsapp_handover_content_sid
       FROM widget_configs
       WHERE widget_key = $1`,
      [WIDGET_KEY]
    );

    if (handoverConfig.rows.length > 0) {
      const handover = handoverConfig.rows[0];
      console.log(`   - Enable Handover Choice: ${handover.enable_handover_choice ? 'YES' : 'NO'}`);
      if (handover.handover_options) {
        const options = typeof handover.handover_options === 'string'
          ? JSON.parse(handover.handover_options)
          : handover.handover_options;
        console.log(`   - Available Methods:`);
        Object.entries(options).forEach(([key, enabled]) => {
          console.log(`     ${key}: ${enabled ? '✅' : '❌'}`);
        });
      }
      console.log(`   - Default Method: ${handover.default_handover_method || 'Not set'}`);
      console.log(`   - WhatsApp Number: ${handover.handover_whatsapp_number || 'Not set'}`);
    }

    // 3. Get Knowledge Base
    console.log(`\n\n📚 3. KNOWLEDGE BASE`);
    console.log('─'.repeat(80));
    const knowledgeBase = await pool.query(
      `SELECT id, question, answer, category, created_at
       FROM widget_knowledge_base
       WHERE widget_id = $1
       ORDER BY created_at DESC
       LIMIT 10`,
      [widget.id]
    );

    console.log(`   - Total Entries: ${knowledgeBase.rows.length} (showing latest 10)`);
    knowledgeBase.rows.forEach((kb, i) => {
      console.log(`   ${i + 1}. Q: ${kb.question.substring(0, 50)}...`);
    });

    // 4. Get Recent Conversations
    console.log(`\n\n💬 4. RECENT CONVERSATIONS (Last 5)`);
    console.log('─'.repeat(80));
    const conversations = await pool.query(
      `SELECT id, visitor_name, visitor_email, visitor_phone,
              intro_completed, intro_data, status, agent_handoff,
              created_at, updated_at, message_count
       FROM widget_conversations
       WHERE widget_id = $1
       ORDER BY created_at DESC
       LIMIT 5`,
      [widget.id]
    );

    console.log(`   - Total Conversations: ${conversations.rows.length}`);
    for (let i = 0; i < conversations.rows.length; i++) {
      const conv = conversations.rows[i];
      console.log(`\n   Conversation ${i + 1} (ID: ${conv.id}):`);
      console.log(`     - Visitor: ${conv.visitor_name || 'Anonymous'}`);
      console.log(`     - Email: ${conv.visitor_email || 'Not provided'}`);
      console.log(`     - Status: ${conv.status}`);
      console.log(`     - Intro Completed: ${conv.intro_completed ? 'YES' : 'NO'}`);
      console.log(`     - Agent Handoff: ${conv.agent_handoff ? 'YES' : 'NO'}`);
      console.log(`     - Messages: ${conv.message_count || 0}`);
      console.log(`     - Created: ${conv.created_at}`);
      
      // Get messages for this conversation
      const msgResult = await pool.query(
        `SELECT message_type, message_text, created_at
         FROM widget_messages
         WHERE conversation_id = $1
         ORDER BY created_at ASC`,
        [conv.id]
      );
      
      if (msgResult.rows.length > 0) {
        console.log(`     - Message History (${msgResult.rows.length} messages):`);
        msgResult.rows.forEach((msg, j) => {
          const preview = msg.message_text ? msg.message_text.substring(0, 60) : '(empty)';
          console.log(`       ${j + 1}. [${msg.message_type.toUpperCase()}] ${preview}${msg.message_text && msg.message_text.length > 60 ? '...' : ''}`);
        });
      }
    }

    // 5. Check for duplicate messages
    console.log(`\n\n🔍 5. DUPLICATE MESSAGE CHECK`);
    console.log('─'.repeat(80));
    const duplicateCheck = await pool.query(
      `SELECT conversation_id, message_text, COUNT(*) as count
       FROM widget_messages
       WHERE conversation_id IN (
         SELECT id FROM widget_conversations WHERE widget_id = $1
       )
       AND message_type = 'bot'
       GROUP BY conversation_id, message_text
       HAVING COUNT(*) > 1
       ORDER BY count DESC
       LIMIT 10`,
      [widget.id]
    );

    if (duplicateCheck.rows.length > 0) {
      console.log(`   ⚠️  Found ${duplicateCheck.rows.length} potential duplicate bot messages:`);
      duplicateCheck.rows.forEach((dup, i) => {
        console.log(`   ${i + 1}. Conversation ${dup.conversation_id}: "${dup.message_text.substring(0, 50)}..." (${dup.count} times)`);
      });
    } else {
      console.log(`   ✅ No duplicate messages found`);
    }

    // 6. Flow Summary
    console.log(`\n\n📊 6. EXPECTED FLOW SUMMARY`);
    console.log('─'.repeat(80));
    console.log(`\n1. WIDGET LOADS:`);
    console.log(`   ✅ Auto-popup: ${widget.is_active ? 'YES (if enabled)' : 'NO'}`);
    console.log(`   ✅ Loads config from: /api/chat-widget/public/widget/${WIDGET_KEY}/config`);
    
    console.log(`\n2. WELCOME/AUTO MESSAGES:`);
    if (widget.intro_flow_enabled && widget.intro_questions) {
      console.log(`   ✅ Intro Flow ENABLED - Will show intro questions`);
      const questions = typeof widget.intro_questions === 'string' 
        ? JSON.parse(widget.intro_questions) 
        : widget.intro_questions;
      if (Array.isArray(questions) && questions.length > 0) {
        console.log(`   ✅ ${questions.length} intro questions configured`);
        console.log(`   ✅ Welcome message: ${widget.welcome_message || 'Default'}`);
      }
    } else {
      console.log(`   ✅ Intro Flow DISABLED`);
      console.log(`   ✅ Will show: "${widget.welcome_message || 'Hi! How can I help you today?'}"`);
    }

    console.log(`\n3. USER MESSAGE HANDLING:`);
    console.log(`   ✅ Endpoint: /api/chat-widget/public/widget/${WIDGET_KEY}/message`);
    if (widget.llm_enabled) {
      console.log(`   ✅ LLM ENABLED - Uses ${widget.llm_provider || 'default'} for responses`);
    } else {
      console.log(`   ✅ LLM DISABLED - Uses Knowledge Base matching`);
    }
    console.log(`   ✅ Agent Handoff Check: YES (bot won't respond if agent took over)`);

    console.log(`\n4. AUTO MESSAGES SOURCE:`);
    console.log(`   ✅ Welcome: From database (welcome_message column)`);
    console.log(`   ✅ Intro Questions: From database (intro_questions JSONB)`);
    console.log(`   ✅ Bot Responses: From LLM or Knowledge Base`);
    console.log(`   ✅ Emergency Alerts: From database (emergency_disclaimer, hipaa_disclaimer)`);

    console.log(`\n5. REPEATING MESSAGES POSSIBLE CAUSES:`);
    console.log(`   ⚠️  Multiple conversation instances`);
    console.log(`   ⚠️  Intro flow repeating (check intro_completed flag)`);
    console.log(`   ⚠️  Welcome message showing multiple times (check sessionStorage)`);
    console.log(`   ⚠️  Agent handoff not set (bot responding when it shouldn't)`);

    console.log('\n' + '═'.repeat(80));
    console.log('✅ Analysis Complete\n');

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error);
    await pool.end();
    process.exit(1);
  }
}

analyzeWidget();

