import express from 'express';
import pool from '../config/database';
import crypto from 'crypto';
import archiver from 'archiver';
import { EmailService } from '../services/emailService';
import llmService from '../services/llmService';

const router = express.Router();
const emailService = new EmailService();

// ==========================================
// CORS Middleware for ALL chat widget routes
// ==========================================
router.use((req, res, next) => {
  // Allow ALL origins for public widget routes (customer websites embed the widget)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * Calculate similarity between two strings using Levenshtein distance
 * Returns a score from 0 to 1 (1 = identical, 0 = completely different)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1.0;
  
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.length === 0) return 1.0;
  
  // Calculate Levenshtein distance
  const matrix: number[][] = [];
  for (let i = 0; i <= s2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= s1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  
  const distance = matrix[s2.length][s1.length];
  return (longer.length - distance) / longer.length;
}

/**
 * Find similar questions from knowledge base
 * Returns top 3 matches with similarity score
 */
async function findSimilarQuestions(
  userMessage: string,
  widget_id: number,
  minSimilarity: number = 0.5
): Promise<Array<{ id: number; question: string; answer: string; similarity: number }>> {
  const knowledgeResult = await pool.query(
    `SELECT id, question, answer, keywords
     FROM widget_knowledge_base
     WHERE widget_id = $1 AND is_active = true`,
    [widget_id]
  );
  
  const matches: Array<{ id: number; question: string; answer: string; similarity: number }> = [];
  
  for (const entry of knowledgeResult.rows) {
    let similarity = calculateSimilarity(userMessage, entry.question);
    
    // Boost score if keywords match
    if (entry.keywords && Array.isArray(entry.keywords)) {
      const messageLower = userMessage.toLowerCase();
      let keywordMatches = 0;
      for (const keyword of entry.keywords) {
        if (messageLower.includes(keyword.toLowerCase())) {
          keywordMatches++;
        }
      }
      if (keywordMatches > 0) {
        similarity = Math.min(1.0, similarity + (keywordMatches * 0.1));
      }
    }
    
    if (similarity >= minSimilarity) {
      matches.push({
        id: entry.id,
        question: entry.question,
        answer: entry.answer,
        similarity: similarity
      });
    }
  }
  
  // Sort by similarity and return top 3
  return matches.sort((a, b) => b.similarity - a.similarity).slice(0, 3);
}

// ==========================================
// CORS MIDDLEWARE FOR ALL WIDGET ROUTES
// ==========================================
// Allow ALL origins for widget embedding (these are public APIs)
router.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// ==========================================
// WIDGET CONFIGURATION ENDPOINTS
// ==========================================

// Get all widgets for a client
router.get('/widgets', async (req, res) => {
  try {
    const clientId = (req as any).session.clientId || (req as any).user?.client_id;
    const role = (req as any).session.role || (req as any).user?.role;

    let query = 'SELECT * FROM widget_configs';
    const params: any[] = [];

    if (role !== 'super_admin' && role !== 'admin') {
      query += ' WHERE client_id = $1';
      params.push(clientId);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get widgets error:', error);
    res.status(500).json({ error: 'Failed to fetch widgets' });
  }
});

// Create new widget
router.post('/widgets', async (req, res) => {
  try {
    const {
      client_id,
      widget_name,
      primary_color,
      secondary_color,
      position,
      welcome_message,
      bot_name,
      bot_avatar_url,
      enable_appointment_booking,
      enable_email_capture,
      enable_phone_capture,
      enable_ai_handoff,
      ai_handoff_url,
      business_hours,
      offline_message,
      intro_flow_enabled,
      intro_questions
    } = req.body;

    // Generate unique widget key
    const widget_key = `wtfu_${crypto.randomBytes(16).toString('hex')}`;

    const result = await pool.query(
      `INSERT INTO widget_configs (
        client_id, widget_key, widget_name, primary_color, secondary_color,
        position, welcome_message, bot_name, bot_avatar_url,
        enable_appointment_booking, enable_email_capture, enable_phone_capture,
        enable_ai_handoff, ai_handoff_url, business_hours, offline_message,
        intro_flow_enabled, intro_questions,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *`,
      [
        client_id, widget_key, widget_name, primary_color, secondary_color,
        position, welcome_message, bot_name, bot_avatar_url,
        enable_appointment_booking, enable_email_capture, enable_phone_capture,
        enable_ai_handoff, ai_handoff_url, JSON.stringify(business_hours), offline_message,
        intro_flow_enabled !== undefined ? intro_flow_enabled : true, // ✅ Default to true
        intro_questions || null, // ✅ Store intro questions JSON
        (req as any).session.userId
      ]
    );

    // Add default knowledge base
    await pool.query('SELECT add_default_knowledge_base($1)', [result.rows[0].id]);

    console.log(`✅ Widget created: ${widget_key} for client ${client_id}`);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Create widget error:', error);
    res.status(500).json({ error: 'Failed to create widget' });
  }
});

// Get single widget by ID
router.get('/widgets/:id', async (req, res) => {
  try {
    const widgetId = parseInt(req.params.id);
    const user = (req as any).user;

    if (!widgetId || isNaN(widgetId)) {
      return res.status(400).json({ error: 'Invalid widget ID' });
    }

    // Fetch widget
    const result = await pool.query(
      `SELECT w.*, c.client_name, c.email as client_email
       FROM widget_configs w
       JOIN clients c ON w.client_id = c.id
       WHERE w.id = $1`,
      [widgetId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Widget not found' });
    }

    const widget = result.rows[0];

    // Check permissions (super admin or widget owner)
    if (user && !user.is_admin && user.client_id !== widget.client_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(widget);

  } catch (error) {
    console.error('Error fetching widget:', error);
    res.status(500).json({ error: 'Failed to fetch widget' });
  }
});

// Update widget configuration
router.put('/widgets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const allowedFields = [
      'widget_name', 'primary_color', 'secondary_color', 'position',
      'welcome_message', 'bot_name', 'bot_avatar_url',
      'enable_appointment_booking', 'enable_email_capture', 'enable_phone_capture',
      'enable_ai_handoff', 'ai_handoff_url', 'business_hours', 'offline_message',
      'is_active', 'rate_limit_messages', 'rate_limit_window', 'require_captcha',
      'intro_flow_enabled', 'intro_questions',
      // AI Smart Responses
      'llm_enabled', 'llm_provider', 'llm_model', 'llm_temperature', 'llm_max_tokens',
      'widget_specific_llm_key', 'fallback_to_knowledge_base',
      // Email Notifications
      'enable_email_notifications', 'notification_email', 'visitor_engagement_minutes',
      'notify_new_conversation', 'notify_agent_handoff', 'notify_daily_summary',
      // WhatsApp Integration
      'enable_whatsapp', 'whatsapp_configured',
      // Agent Handover Options
      'enable_handover_choice', 'handover_options', 'default_handover_method',
      'webhook_url', 'webhook_secret',
      // Industry & HIPAA
      'industry', 'enable_hipaa', 'hipaa_disclaimer', 'detect_sensitive_data',
      'emergency_keywords', 'emergency_contact', 'require_disclaimer', 'disclaimer_text',
      'show_emergency_warning', 'auto_detect_emergency'
    ];

    const setClause = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        setClause.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }

    if (setClause.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    setClause.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const result = await pool.query(
      `UPDATE widget_configs SET ${setClause.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Widget not found' });
    }

    console.log(`✅ Widget ${id} updated`);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update widget error:', error);
    res.status(500).json({ error: 'Failed to update widget' });
  }
});

// Delete widget
router.delete('/widgets/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM widget_configs WHERE id = $1 RETURNING widget_key',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Widget not found' });
    }

    console.log(`✅ Widget ${id} deleted`);
    res.json({ success: true, message: 'Widget deleted successfully' });
  } catch (error) {
    console.error('Delete widget error:', error);
    res.status(500).json({ error: 'Failed to delete widget' });
  }
});

// ==========================================
// KNOWLEDGE BASE ENDPOINTS
// ==========================================

// Get knowledge base for a widget
router.get('/widgets/:widgetId/knowledge', async (req, res) => {
  try {
    const { widgetId } = req.params;

    const result = await pool.query(
      'SELECT * FROM widget_knowledge_base WHERE widget_id = $1 ORDER BY priority DESC, category',
      [widgetId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get knowledge base error:', error);
    res.status(500).json({ error: 'Failed to fetch knowledge base' });
  }
});

// Add knowledge base entry
router.post('/widgets/:widgetId/knowledge', async (req, res) => {
  try {
    const { widgetId } = req.params;
    const { category, question, answer, keywords, priority } = req.body;

    const result = await pool.query(
      `INSERT INTO widget_knowledge_base (widget_id, category, question, answer, keywords, priority)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [widgetId, category, question, answer, keywords, priority || 0]
    );

    console.log(`✅ Knowledge base entry added for widget ${widgetId}`);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Add knowledge base error:', error);
    res.status(500).json({ error: 'Failed to add knowledge base entry' });
  }
});

// Update knowledge base entry
router.put('/widgets/:widgetId/knowledge/:knowledgeId', async (req, res) => {
  try {
    const { widgetId, knowledgeId } = req.params;
    const { category, question, answer, keywords, priority, is_active } = req.body;

    const result = await pool.query(
      `UPDATE widget_knowledge_base 
       SET category = $1, question = $2, answer = $3, keywords = $4, priority = $5, 
           is_active = $6, updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 AND widget_id = $8
       RETURNING *`,
      [category, question, answer, keywords, priority, is_active, knowledgeId, widgetId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Knowledge base entry not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update knowledge base error:', error);
    res.status(500).json({ error: 'Failed to update knowledge base entry' });
  }
});

// Delete knowledge base entry
router.delete('/widgets/:widgetId/knowledge/:knowledgeId', async (req, res) => {
  try {
    const { widgetId, knowledgeId } = req.params;

    const result = await pool.query(
      'DELETE FROM widget_knowledge_base WHERE id = $1 AND widget_id = $2 RETURNING id',
      [knowledgeId, widgetId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Knowledge base entry not found' });
    }

    res.json({ success: true, message: 'Knowledge base entry deleted' });
  } catch (error) {
    console.error('Delete knowledge base error:', error);
    res.status(500).json({ error: 'Failed to delete knowledge base entry' });
  }
});

// ==========================================
// PUBLIC WIDGET API (No authentication required)
// ==========================================

// Get widget configuration (public endpoint) - INCLUDING INTRO QUESTIONS
router.get('/public/widget/:widgetKey/config', async (req, res) => {
  try {
    const { widgetKey } = req.params;

    const result = await pool.query(
      `SELECT widget_key, widget_name, primary_color, secondary_color, position,
              welcome_message, bot_name, bot_avatar_url, enable_appointment_booking,
              enable_email_capture, enable_phone_capture, enable_ai_handoff,
              ai_handoff_url, business_hours, offline_message, is_active,
              intro_flow_enabled, intro_questions,
              industry, practice_phone, emergency_disclaimer, hipaa_disclaimer,
              show_emergency_warning, auto_detect_emergency
       FROM widget_configs
       WHERE widget_key = $1 AND is_active = true`,
      [widgetKey]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Widget not found or inactive' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get widget config error:', error);
    res.status(500).json({ error: 'Failed to fetch widget configuration' });
  }
});

// Start a new conversation (public endpoint)
router.post('/public/widget/:widgetKey/conversation', async (req, res) => {
  try {
    const { widgetKey } = req.params;
    const { 
      session_id, 
      page_url, 
      referrer_url, 
      user_agent,
      visitor_name,
      visitor_email,
      visitor_phone,
      visitor_session_id
    } = req.body;
    const ip_address = req.ip || req.connection.remoteAddress;

    // Get widget ID AND email notification settings
    const widgetResult = await pool.query(
      `SELECT id, widget_name, rate_limit_messages, rate_limit_window,
              enable_email_notifications, notification_email, notify_new_conversation
       FROM widget_configs 
       WHERE widget_key = $1 AND is_active = true`,
      [widgetKey]
    );

    if (widgetResult.rows.length === 0) {
      return res.status(404).json({ error: 'Widget not found' });
    }

    const widget = widgetResult.rows[0];

    // Check for existing active conversation
    const existingConv = await pool.query(
      'SELECT id FROM widget_conversations WHERE widget_id = $1 AND session_id = $2 AND status = $3',
      [widget.id, session_id, 'active']
    );

    if (existingConv.rows.length > 0) {
      return res.json({ conversation_id: existingConv.rows[0].id, existing: true });
    }

    // Create new conversation with visitor info
    const convResult = await pool.query(
      `INSERT INTO widget_conversations (
        widget_id, session_id, ip_address, user_agent, referrer_url, page_url,
        visitor_name, visitor_email, visitor_phone, visitor_session_id
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [
        widget.id, session_id, ip_address, user_agent, referrer_url, page_url,
        visitor_name || 'Anonymous Visitor', 
        visitor_email || null,
        visitor_phone || null,
        visitor_session_id || session_id
      ]
    );

    const conversationId = convResult.rows[0].id;

    console.log(`✅ New conversation started: ${conversationId} for widget ${widgetKey}`);

    // 📧 Send email notification for NEW conversation (async - don't block response)
    if (widget.enable_email_notifications && widget.notification_email && widget.notify_new_conversation) {
      const clientBrandedName = widget.widget_name || 'Your Website';
      emailService.sendEmail({
        to: widget.notification_email,
        from: `"💬 ${clientBrandedName} - Chat Alert" <info@wetechforu.com>`, // ✅ Branded with client name
        subject: `💬 New Chat Visitor on ${clientBrandedName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4682B4;">🤖 New Website Visitor Started Chatting!</h2>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Widget:</strong> ${widget.widget_name}</p>
              <p><strong>Conversation ID:</strong> ${conversationId}</p>
              <p><strong>Page:</strong> ${page_url || 'Unknown'}</p>
              <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
            </div>
            <p style="margin: 20px 0;">
              <a href="https://marketingby.wetechforu.com/app/chat-conversations" 
                 style="background: #4682B4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                View Conversation →
              </a>
            </p>
            <p style="color: #666; font-size: 14px;">
              This visitor has just started chatting on your website. They may need assistance!
            </p>
          </div>
        `,
        text: `New chat visitor on ${widget.widget_name}! View at: https://marketingby.wetechforu.com/app/chat-conversations`
      }).catch(err => console.error('Failed to send new conversation email:', err));
    }

    res.json({ conversation_id: conversationId, existing: false });
  } catch (error) {
    console.error('Start conversation error:', error);
    res.status(500).json({ error: 'Failed to start conversation' });
  }
});

// Save intro questions data (public endpoint)
router.post('/public/widget/:widgetKey/intro-data', async (req, res) => {
  try {
    const { widgetKey } = req.params;
    const { conversation_id, intro_data } = req.body;

    if (!conversation_id || !intro_data) {
      return res.status(400).json({ error: 'Conversation ID and intro data are required' });
    }

    console.log(`📝 Saving intro data for conversation ${conversation_id}`);

    // Update conversation with intro data
    await pool.query(
      `UPDATE widget_conversations
       SET intro_completed = true,
           intro_data = $1,
           visitor_name = $2,
           visitor_email = $3,
           visitor_phone = $4,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5`,
      [
        JSON.stringify(intro_data),
        intro_data.first_name && intro_data.last_name 
          ? `${intro_data.first_name} ${intro_data.last_name}`.trim()
          : intro_data.first_name || null,
        intro_data.email || null,
        intro_data.phone || null,
        conversation_id
      ]
    );

    // Add system message
    await pool.query(
      `INSERT INTO widget_messages (conversation_id, message_type, message_text)
       VALUES ($1, $2, $3)`,
      [
        conversation_id,
        'system',
        `Visitor information collected: ${intro_data.first_name || 'Anonymous'} ${intro_data.last_name || ''}`
      ]
    );

    console.log(`✅ Intro data saved for conversation ${conversation_id}`);

    res.json({ 
      success: true,
      message: 'Introduction completed successfully'
    });
  } catch (error) {
    console.error('Save intro data error:', error);
    res.status(500).json({ error: 'Failed to save introduction data' });
  }
});

// Send message and get bot response (public endpoint)
router.post('/public/widget/:widgetKey/message', async (req, res) => {
  try {
    const { widgetKey } = req.params;
    const { conversation_id, message_text } = req.body;

    if (!message_text || message_text.trim().length === 0) {
      return res.status(400).json({ error: 'Message text is required' });
    }

    const startTime = Date.now();

    // Get widget and conversation info WITH LLM config
    const widgetResult = await pool.query(
      `SELECT id, client_id, llm_enabled, llm_provider, llm_model, 
              llm_temperature, llm_max_tokens, fallback_to_knowledge_base
       FROM widget_configs 
       WHERE widget_key = $1 AND is_active = true`,
      [widgetKey]
    );

    if (widgetResult.rows.length === 0) {
      return res.status(404).json({ error: 'Widget not found' });
    }

    const widget = widgetResult.rows[0];
    const widget_id = widget.id;
    const client_id = widget.client_id;

    // ✅ CHECK IF AGENT HAS TAKEN OVER (HANDOFF)
    const convCheck = await pool.query(
      'SELECT agent_handoff FROM widget_conversations WHERE id = $1',
      [conversation_id]
    );

    const isAgentHandoff = convCheck.rows.length > 0 && convCheck.rows[0].agent_handoff;

    // Save user message
    await pool.query(
      `INSERT INTO widget_messages (conversation_id, message_type, message_text)
       VALUES ($1, $2, $3)`,
      [conversation_id, 'user', message_text]
    );

    // Update conversation message count, last_activity_at, and unread count (for notifications)
    await pool.query(
      'UPDATE widget_conversations SET message_count = message_count + 1, updated_at = CURRENT_TIMESTAMP, last_activity_at = CURRENT_TIMESTAMP, unread_agent_messages = unread_agent_messages + 1 WHERE id = $1',
      [conversation_id]
    );

    // 📧 SEND EMAIL NOTIFICATION TO AGENT (for EVERY new message)
    // This ensures agents are notified in real-time for all customer messages
    {
      try {
        const widgetInfo = await pool.query(
          `SELECT wc.widget_name, wc.notification_email, wc.enable_email_notifications,
                  wconv.visitor_name, wconv.visitor_email
           FROM widget_configs wc
           JOIN widget_conversations wconv ON wconv.widget_id = wc.id
           WHERE wc.id = $1 AND wconv.id = $2`,
          [widget_id, conversation_id]
        );

        if (widgetInfo.rows.length > 0) {
          const info = widgetInfo.rows[0];
          if (info.enable_email_notifications && info.notification_email) {
            const clientBrandedName = info.widget_name || 'Your Website';
            const subjectPrefix = isAgentHandoff ? '🔴 URGENT' : '💬 NEW MESSAGE';
            emailService.sendEmail({
              to: info.notification_email,
              from: `"💬 ${clientBrandedName} - Chat Alert" <info@wetechforu.com>`, // ✅ Branded with client name
              subject: `${subjectPrefix}: ${info.visitor_name || 'Visitor'} on ${clientBrandedName}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #4682B4;">💬 Customer Sent You a Message!</h2>
                  <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4682B4;">
                    <p style="margin: 0 0 10px 0;"><strong>From:</strong> ${info.visitor_name || 'Anonymous Visitor'}</p>
                    ${info.visitor_email ? `<p style="margin: 0 0 10px 0;"><strong>Email:</strong> ${info.visitor_email}</p>` : ''}
                    <p style="margin: 10px 0 0 0;"><strong>Message:</strong></p>
                    <p style="margin: 10px 0 0 0; padding: 10px; background: white; border-radius: 4px;">${message_text}</p>
                  </div>
                  <p style="margin: 20px 0;">
                    <a href="https://marketingby.wetechforu.com/app/chat-conversations" 
                       style="background: #4682B4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                      Reply Now →
                    </a>
                  </p>
                  <p style="color: #666; font-size: 14px;">
                    Click the button above to respond to the customer in real-time.
                  </p>
                </div>
              `,
              text: `New message from ${info.visitor_name || 'Visitor'}: ${message_text}. Reply at: https://marketingby.wetechforu.com/app/chat-conversations`
            }).catch(err => console.error('Failed to send agent notification email:', err));
          }
        }
      } catch (emailError) {
        console.error('Error sending agent notification:', emailError);
        // Don't fail the request if email fails
      }
    }

    // ✅ IF AGENT HAS TAKEN OVER, BOT DOESN'T RESPOND
    if (isAgentHandoff) {
      console.log(`🤝 Agent handoff active for conversation ${conversation_id} - Bot staying silent`);
      return res.json({
        response: null, // No bot response
        agent_handoff: true,
        message: 'Your message has been sent to our team. An agent will respond shortly.',
        timestamp: new Date().toISOString()
      });
    }

    // ==========================================
    // 🤖 LLM-POWERED RESPONSE (if enabled)
    // ==========================================
    let botResponse: string;
    let confidence = 0.3;
    let knowledge_base_id = null;
    let suggestions: any[] = [];
    let llmUsed = false;

    // 🔍 DEBUG: Log LLM configuration
    console.log(`🔍 LLM Debug - widget_id: ${widget_id}, client_id: ${client_id}`);
    console.log(`🔍 LLM Debug - llm_enabled: ${widget.llm_enabled}, llm_provider: ${widget.llm_provider}`);
    console.log(`🔍 LLM Debug - Condition check: llm_enabled=${widget.llm_enabled}, client_id=${client_id}, both=${widget.llm_enabled && client_id}`);

    if (widget.llm_enabled && client_id) {
      console.log(`🤖 LLM enabled for widget ${widget_id} - Attempting AI response...`);
      
      try {
        // Build context from knowledge base
        const kbResult = await pool.query(
          `SELECT question, answer, category 
           FROM widget_knowledge_base 
           WHERE widget_id = $1 AND is_active = true
           ORDER BY times_used DESC
           LIMIT 10`,
          [widget_id]
        );

        let context = '';
        if (kbResult.rows.length > 0) {
          context = 'Business Knowledge Base:\n\n' + 
            kbResult.rows.map(kb => `Q: ${kb.question}\nA: ${kb.answer}\n`).join('\n');
        }

        // Call LLM service
        const llmResponse = await llmService.generateSmartResponse(
          client_id,
          widget_id,
          conversation_id,
          message_text,
          context,
          {
            provider: widget.llm_provider || 'gemini',
            model: widget.llm_model || 'gemini-pro',
            temperature: widget.llm_temperature || 0.7,
            maxTokens: widget.llm_max_tokens || 500
          }
        );

        if (llmResponse.success && llmResponse.text) {
          // ✅ LLM SUCCESS - Use AI-generated response
          botResponse = llmResponse.text;
          confidence = 0.95; // High confidence for LLM responses
          llmUsed = true;

          console.log(`✅ LLM response generated (${llmResponse.tokensUsed} tokens, ${llmResponse.responseTimeMs}ms)`);
        } else if (llmResponse.error === 'credits_exhausted') {
          // ⚠️ CREDITS EXHAUSTED - Fall back to knowledge base
          console.log(`⚠️ LLM credits exhausted for client ${client_id} - Using knowledge base fallback`);
          
          // Add a notice about credits
          botResponse = `[Note: You've reached your free AI assistant limit for this month. Upgrade for unlimited AI responses!]\n\n`;
          
          // Fall through to knowledge base logic below
        } else {
          // ❌ LLM FAILED - Fall back to knowledge base
          console.log(`❌ LLM failed: ${llmResponse.error} - Using knowledge base fallback`);
        }
      } catch (llmError) {
        console.error('LLM error:', llmError);
        // Fall through to knowledge base
      }
    }

    // ==========================================
    // 📚 KNOWLEDGE BASE FALLBACK (if LLM not used or failed)
    // ==========================================
    if (!llmUsed) {
      // 🎯 SMART MATCHING: Find best matching knowledge base entry
      const similarQuestions = await findSimilarQuestions(message_text, widget_id, 0.5);

      if (similarQuestions.length > 0 && similarQuestions[0].similarity >= 0.85) {
        // ✅ HIGH CONFIDENCE MATCH (85%+) - Answer directly
        const bestMatch = similarQuestions[0];
        
        // If we already have a "credits exhausted" message, append the answer
        if (botResponse && botResponse.includes('free AI assistant limit')) {
          botResponse += bestMatch.answer;
        } else {
          botResponse = bestMatch.answer;
        }
        
        confidence = bestMatch.similarity;
        knowledge_base_id = bestMatch.id;

        // Update usage stats
        await pool.query(
          'UPDATE widget_knowledge_base SET times_used = times_used + 1 WHERE id = $1',
          [knowledge_base_id]
        );

        console.log(`✅ Knowledge base answer (${Math.round(confidence * 100)}% match): "${bestMatch.question}"`);

      } else if (similarQuestions.length > 0) {
        // 🤔 MEDIUM CONFIDENCE (50-85%) - Suggest similar questions (NO percentages shown to user)
        const suggestionText = `I'm not sure I understood that exactly. Did you mean one of these?\n\n` +
          similarQuestions.map((q, i) => 
            `${i + 1}. ${q.question}`  // ✅ NO PERCENTAGE SHOWN
          ).join('\n') +
          `\n\nPlease type the number or rephrase your question.`;
        
        if (botResponse && botResponse.includes('free AI assistant limit')) {
          botResponse += suggestionText;
        } else {
          botResponse = suggestionText;
        }
        
        confidence = similarQuestions[0].similarity;
        suggestions = similarQuestions.map(q => ({
          id: q.id,
          question: q.question
          // ✅ NO similarity field sent to frontend
        }));

        console.log(`🤔 Showing ${suggestions.length} similar question suggestions`);

      } else if (!botResponse) {
        // ❌ NO MATCH - Friendly default response (only if no LLM credits message)
        botResponse = `I'd love to help you with that! I'm still learning about all our services. Could you tell me a bit more about what you're looking for?\n\nSome things I can help with:\n• Our services and offerings\n• Business hours and location\n• Booking an appointment\n• General questions\n\nOr feel free to rephrase your question, and I'll do my best to assist! 😊`;
        confidence = 0.3;

        console.log(`❌ No matching questions found for: "${message_text}"`);
      }
    }

    const responseTime = Date.now() - startTime;

    // Save bot response
    const botMessage = await pool.query(
      `INSERT INTO widget_messages (conversation_id, message_type, message_text, knowledge_base_id, confidence_score, response_time_ms)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [conversation_id, 'bot', botResponse, knowledge_base_id, confidence, responseTime]
    );

    // Update conversation (including last_activity_at for inactivity tracking)
    await pool.query(
      'UPDATE widget_conversations SET bot_response_count = bot_response_count + 1, last_activity_at = CURRENT_TIMESTAMP WHERE id = $1',
      [conversation_id]
    );

    console.log(`✅ Bot response sent (confidence: ${confidence}): ${conversation_id}`);

    res.json({
      message_id: botMessage.rows[0].id,
      response: botResponse,
      confidence: confidence,
      suggestions: suggestions, // 🎯 Include suggested questions for frontend
      timestamp: botMessage.rows[0].created_at
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

// Get messages for a conversation (public endpoint for widget polling)
router.get('/public/widget/:widgetKey/conversations/:conversationId/messages', async (req, res) => {
  try {
    const { widgetKey, conversationId } = req.params;

    // Verify widget exists
    const widgetResult = await pool.query(
      'SELECT id FROM widget_configs WHERE widget_key = $1 AND is_active = true',
      [widgetKey]
    );

    if (widgetResult.rows.length === 0) {
      return res.status(404).json({ error: 'Widget not found' });
    }

    // Get messages for this conversation
    const result = await pool.query(
      `SELECT 
        id,
        conversation_id,
        message_type,
        message_text,
        agent_name,
        created_at
       FROM widget_messages 
       WHERE conversation_id = $1 
       ORDER BY created_at ASC`,
      [conversationId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Capture lead information (public endpoint)
router.post('/public/widget/:widgetKey/capture-lead', async (req, res) => {
  try {
    const { widgetKey } = req.params;
    const {
      conversation_id,
      visitor_name,
      visitor_email,
      visitor_phone,
      handoff_type,
      handoff_details
    } = req.body;

    // Get widget and conversation
    const widgetResult = await pool.query(
      `SELECT wc.id as widget_id, wc.client_id, conv.id as conversation_id
       FROM widget_configs wc
       JOIN widget_conversations conv ON conv.widget_id = wc.id
       WHERE wc.widget_key = $1 AND conv.id = $2 AND wc.is_active = true`,
      [widgetKey, conversation_id]
    );

    if (widgetResult.rows.length === 0) {
      return res.status(404).json({ error: 'Widget or conversation not found' });
    }

    const { widget_id, client_id } = widgetResult.rows[0];

    // Create lead in leads table
    let lead_id = null;
    if (visitor_email) {
      try {
        const leadResult = await pool.query(
          `INSERT INTO leads (company, email, phone, source, status, client_id, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id`,
          [
            visitor_name || 'Chat Visitor',
            visitor_email,
            visitor_phone,
            'chat_widget',
            'new',
            client_id,
            `Captured from chat widget. Handoff type: ${handoff_type}`
          ]
        );
        lead_id = leadResult.rows[0].id;
      } catch (leadError) {
        console.error('Error creating lead:', leadError);
      }
    }

    // Update conversation with lead info
    await pool.query(
      `UPDATE widget_conversations
       SET visitor_name = $1, visitor_email = $2, visitor_phone = $3,
           lead_captured = true, lead_id = $4, handoff_type = $5,
           handoff_details = $6, status = $7, updated_at = CURRENT_TIMESTAMP
       WHERE id = $8`,
      [
        visitor_name,
        visitor_email,
        visitor_phone,
        lead_id,
        handoff_type,
        JSON.stringify(handoff_details),
        'completed',
        conversation_id
      ]
    );

    // Add system message
    await pool.query(
      `INSERT INTO widget_messages (conversation_id, message_type, message_text)
       VALUES ($1, $2, $3)`,
      [
        conversation_id,
        'system',
        `Lead captured: ${handoff_type} handoff requested`
      ]
    );

    console.log(`✅ Lead captured from conversation ${conversation_id}: ${visitor_email}`);

    // 📧 Send URGENT email notification for lead capture request (async)
    const widgetInfoResult = await pool.query(
      'SELECT widget_name, notification_email, enable_email_notifications FROM widget_configs WHERE id = $1',
      [widget_id]
    );

    if (widgetInfoResult.rows.length > 0) {
      const widgetInfo = widgetInfoResult.rows[0];
      if (widgetInfo.enable_email_notifications && widgetInfo.notification_email) {
        const clientBrandedName = widgetInfo.widget_name || 'Your Website';
        emailService.sendEmail({
          to: widgetInfo.notification_email,
          from: `"🚨 ${clientBrandedName} - URGENT Lead Alert" <info@wetechforu.com>`, // ✅ Branded with client name
          subject: `🚨 URGENT: Visitor Wants Contact on ${clientBrandedName}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #dc3545;">🚨 URGENT: Website Visitor Wants to Be Contacted!</h2>
              <div style="background: #fff3cd; padding: 20px; border-left: 4px solid #ffc107; margin: 20px 0;">
                <p style="margin: 0; font-size: 16px; font-weight: bold;">A visitor is waiting to hear from you!</p>
              </div>
              <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0;">Contact Information:</h3>
                <p><strong>Name:</strong> ${visitor_name || 'Not provided'}</p>
                <p><strong>Email:</strong> ${visitor_email || 'Not provided'}</p>
                <p><strong>Phone:</strong> ${visitor_phone || 'Not provided'}</p>
                <p><strong>Requested:</strong> ${handoff_type || 'Contact'}</p>
                <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
              </div>
              ${handoff_details ? `
              <div style="background: #e7f3ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0;"><strong>Additional Details:</strong></p>
                <p style="margin: 10px 0 0 0;">${JSON.stringify(handoff_details)}</p>
              </div>
              ` : ''}
              <p style="margin: 20px 0;">
                <a href="https://marketingby.wetechforu.com/app/chat-conversations" 
                   style="background: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  View Full Conversation →
                </a>
              </p>
              <p style="color: #666; font-size: 14px;">
                ⏰ <strong>Action Required:</strong> Please respond to this visitor as soon as possible!
              </p>
            </div>
          `,
          text: `URGENT: ${visitor_name} (${visitor_email}) wants to be contacted via ${handoff_type}. Phone: ${visitor_phone}. View at: https://marketingby.wetechforu.com/app/chat-conversations`
        }).catch(err => console.error('Failed to send lead capture email:', err));
      }
    }

    res.json({
      success: true,
      message: 'Thank you! We\'ll get back to you soon.',
      lead_id: lead_id
    });
  } catch (error) {
    console.error('Capture lead error:', error);
    res.status(500).json({ error: 'Failed to capture lead information' });
  }
});

// Rate message as helpful/not helpful (public endpoint)
router.post('/public/widget/:widgetKey/feedback', async (req, res) => {
  try {
    const { message_id, was_helpful, feedback_text } = req.body;

    await pool.query(
      'UPDATE widget_messages SET was_helpful = $1, feedback_text = $2 WHERE id = $3',
      [was_helpful, feedback_text, message_id]
    );

    // Update knowledge base stats if applicable
    if (was_helpful !== null) {
      await pool.query(
        `UPDATE widget_knowledge_base
         SET ${was_helpful ? 'helpful_count' : 'not_helpful_count'} = ${was_helpful ? 'helpful_count' : 'not_helpful_count'} + 1
         WHERE id = (SELECT knowledge_base_id FROM widget_messages WHERE id = $1)`,
        [message_id]
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Feedback error:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

// ==========================================
// ANALYTICS ENDPOINTS
// ==========================================

// Get widget analytics
router.get('/widgets/:widgetId/analytics', async (req, res) => {
  try {
    const { widgetId } = req.params;
    const { start_date, end_date } = req.query;

    let query = 'SELECT * FROM widget_analytics WHERE widget_id = $1';
    const params: any[] = [widgetId];

    if (start_date) {
      query += ' AND date >= $2';
      params.push(start_date);
    }
    if (end_date) {
      const dateParam = params.length + 1;
      query += ` AND date <= $${dateParam}`;
      params.push(end_date);
    }

    query += ' ORDER BY date DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Get conversations for a widget
router.get('/widgets/:widgetId/conversations', async (req, res) => {
  try {
    const { widgetId } = req.params;
    const { status, limit = 50, offset = 0 } = req.query;

    console.log(`📊 Fetching conversations for widget ${widgetId}...`);

    // First check if widget exists
    const widgetCheck = await pool.query(
      'SELECT id, widget_name FROM widget_configs WHERE id = $1',
      [widgetId]
    );

    if (widgetCheck.rows.length === 0) {
      console.log(`❌ Widget ${widgetId} not found`);
      return res.status(404).json({ error: 'Widget not found' });
    }

    // Check if conversations table exists by trying a simple query
    try {
      await pool.query('SELECT COUNT(*) FROM widget_conversations WHERE widget_id = $1', [widgetId]);
    } catch (tableError: any) {
      console.error('❌ widget_conversations table might not exist:', tableError.message);
      // Return empty array instead of error - table might not be created yet
      return res.json([]);
    }

    let query = `
      SELECT 
        wc.*,
        wconf.widget_name,
        COALESCE(wc.message_count, 0) as message_count,
        COALESCE(wc.bot_response_count, 0) as bot_response_count,
        COALESCE(wc.human_response_count, 0) as human_response_count,
        wc.last_message,
        wc.last_message_at,
        wc.handoff_requested,
        wc.handoff_requested_at,
        COALESCE(wc.visitor_name, 'Anonymous Visitor') as visitor_name,
        wc.visitor_email,
        wc.visitor_phone,
        wc.visitor_session_id
      FROM widget_conversations wc
      LEFT JOIN widget_configs wconf ON wc.widget_id = wconf.id
      WHERE wc.widget_id = $1
    `;
    const params: any[] = [widgetId];

    if (status) {
      query += ' AND wc.status = $2';
      params.push(status);
    }

    query += ` ORDER BY wc.updated_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    
    console.log(`✅ Fetched ${result.rows.length} conversations for widget ${widgetId}`);
    
    res.json(result.rows);
  } catch (error: any) {
    console.error('❌ Get conversations error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail
    });
    res.status(500).json({ 
      error: 'Failed to fetch conversations',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get messages for a conversation
router.get('/conversations/:conversationId/messages', async (req, res) => {
  try {
    const { conversationId } = req.params;

    const result = await pool.query(
      'SELECT * FROM widget_messages WHERE conversation_id = $1 ORDER BY created_at ASC',
      [conversationId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Send reply to conversation (HUMAN RESPONSE)
router.post('/conversations/:conversationId/reply', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { message } = req.body;
    const userId = (req as any).session.userId;
    const username = (req as any).session.username || 'Support';

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💬 HUMAN REPLY TO CONVERSATION');
    console.log(`👤 User: ${username} (ID: ${userId})`);
    console.log(`📝 Conversation ID: ${conversationId}`);
    console.log(`💬 Message: ${message.substring(0, 100)}...`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Check if conversation exists
    const convResult = await pool.query(
      'SELECT * FROM widget_conversations WHERE id = $1',
      [conversationId]
    );

    if (convResult.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const conversation = convResult.rows[0];

    // Insert human message with agent info
    const messageResult = await pool.query(
      `INSERT INTO widget_messages (
        conversation_id, message_type, message_text, agent_name, agent_user_id, created_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING *`,
      [conversationId, 'human', message.trim(), username, userId]
    );

    // 🔔 Check if this is the FIRST time agent is taking over
    const wasAgentHandoff = conversation.agent_handoff;
    
    // Update conversation - SET AGENT HANDOFF FLAG
    await pool.query(
      `UPDATE widget_conversations SET
        human_response_count = COALESCE(human_response_count, 0) + 1,
        message_count = COALESCE(message_count, 0) + 1,
        last_message = $1,
        last_message_at = NOW(),
        last_human_response_at = NOW(),
        handoff_requested = false,
        agent_handoff = true,
        status = 'active',
        updated_at = NOW(),
        last_activity_at = CURRENT_TIMESTAMP
      WHERE id = $2`,
      [message.trim(), conversationId]
    );

    // 🔔 If this is the FIRST agent takeover, send a system notification to visitor
    if (!wasAgentHandoff) {
      await pool.query(
        `INSERT INTO widget_messages (conversation_id, message_type, message_text)
         VALUES ($1, $2, $3)`,
        [
          conversationId,
          'system',
          `🤝 You are now connected with ${username}. They will assist you personally!`
        ]
      );
      console.log(`🔔 System notification sent: Agent ${username} has taken over conversation`);
    }

    console.log('✅ Human reply sent successfully');
    console.log(`📊 Message ID: ${messageResult.rows[0].id}`);

    res.json({
      success: true,
      message_id: messageResult.rows[0].id,
      message: messageResult.rows[0],
      agent_name: username
    });
  } catch (error) {
    console.error('❌ Send reply error:', error);
    res.status(500).json({ error: 'Failed to send reply' });
  }
});

// ==========================================
// AGENT HANDBACK TO AI
// ==========================================
router.post('/conversations/:conversationId/handback-to-ai', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { userId, username } = req.body;

    // Update conversation - CLEAR agent handoff, AI can respond again
    await pool.query(
      `UPDATE widget_conversations SET
        agent_handoff = false,
        agent_can_handback_to_ai = true,
        updated_at = NOW()
      WHERE id = $1`,
      [conversationId]
    );

    // Add system message
    await pool.query(
      `INSERT INTO widget_messages (
        conversation_id, message_type, message_text, agent_name, created_at
      ) VALUES ($1, $2, $3, $4, NOW())`,
      [conversationId, 'system', `Agent ${username} handed conversation back to AI assistant`, username]
    );

    console.log(`✅ Conversation ${conversationId} handed back to AI by agent ${username}`);

    res.json({ success: true, message: 'Conversation handed back to AI' });
  } catch (error) {
    console.error('❌ Handback to AI error:', error);
    res.status(500).json({ error: 'Failed to hand back to AI' });
  }
});

// ==========================================
// END CONVERSATION & SEND SUMMARY EMAIL TO CLIENT
// ==========================================
router.post('/conversations/:conversationId/end', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { userId, username, summaryNote } = req.body;

    // Get conversation details
    const convResult = await pool.query(
      `SELECT wc.*, w.widget_name, w.notification_email, c.client_name, c.email as client_email
       FROM widget_conversations wc
       JOIN widget_configs w ON w.id = wc.widget_id
       LEFT JOIN clients c ON c.id = w.client_id
       WHERE wc.id = $1`,
      [conversationId]
    );

    if (convResult.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const conversation = convResult.rows[0];

    // Update conversation status
    await pool.query(
      `UPDATE widget_conversations SET
        status = 'closed',
        agent_handoff = false,
        updated_at = NOW()
      WHERE id = $1`,
      [conversationId]
    );

    // Add system message
    await pool.query(
      `INSERT INTO widget_messages (
        conversation_id, message_type, message_text, agent_name, created_at
      ) VALUES ($1, $2, $3, $4, NOW())`,
      [conversationId, 'system', `Conversation closed by agent ${username}`, username]
    );

    // 📧 Send summary email to CLIENT (visitor)
    if (conversation.visitor_email) {
      const clientBrandedName = conversation.widget_name || conversation.client_name || 'Our Team';
      
      // Get conversation messages for summary
      const messagesResult = await pool.query(
        `SELECT message_type, message_text, agent_name, created_at
         FROM widget_messages
         WHERE conversation_id = $1
         ORDER BY created_at ASC`,
        [conversationId]
      );

      const messagesSummary = messagesResult.rows
        .filter(m => m.message_type !== 'system')
        .map(m => {
          const sender = m.message_type === 'user' ? conversation.visitor_name || 'You' :
                        m.message_type === 'human' ? m.agent_name || 'Agent' :
                        'Bot';
          return `${sender}: ${m.message_text}`;
        })
        .join('\n\n');

      emailService.sendEmail({
        to: conversation.visitor_email,
        from: `"${clientBrandedName}" <info@wetechforu.com>`,
        subject: `Conversation Summary - ${clientBrandedName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4682B4;">Thank You for Contacting ${clientBrandedName}!</h2>
            
            <p>Hi ${conversation.visitor_name || 'there'},</p>
            
            <p>Thank you for chatting with us! Here's a summary of our conversation:</p>
            
            ${summaryNote ? `
            <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2196f3;">
              <strong>Agent Note:</strong>
              <p style="margin: 10px 0 0 0;">${summaryNote}</p>
            </div>
            ` : ''}
            
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Conversation Transcript:</h3>
              <pre style="white-space: pre-wrap; font-size: 14px; line-height: 1.6;">${messagesSummary}</pre>
            </div>
            
            <p>If you have any further questions, feel free to:</p>
            <ul>
              <li>Reply to this email</li>
              <li>Visit our website again and start a new chat</li>
              <li>Call us directly</li>
            </ul>
            
            <p>Best regards,<br><strong>${clientBrandedName}</strong></p>
          </div>
        `,
        text: `Thank you for chatting with ${clientBrandedName}!\n\n${summaryNote ? 'Agent Note: ' + summaryNote + '\n\n' : ''}Conversation:\n${messagesSummary}`
      }).catch(err => console.error('Failed to send conversation summary email:', err));
    }

    console.log(`✅ Conversation ${conversationId} ended by agent ${username}`);

    res.json({ success: true, message: 'Conversation ended and summary email sent' });
  } catch (error) {
    console.error('❌ End conversation error:', error);
    res.status(500).json({ error: 'Failed to end conversation' });
  }
});

// ==========================================
// KNOWLEDGE BASE ENDPOINTS
// ==========================================

// Get all knowledge entries for a widget
router.get('/widgets/:id/knowledge', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM widget_knowledge_base WHERE widget_id = $1 ORDER BY created_at DESC',
      [id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get knowledge error:', error);
    res.status(500).json({ error: 'Failed to fetch knowledge entries' });
  }
});

// Create knowledge entry
router.post('/widgets/:id/knowledge', async (req, res) => {
  try {
    const { id } = req.params;
    const { question, answer, category } = req.body;

    const result = await pool.query(
      `INSERT INTO widget_knowledge_base (widget_id, question, answer, category, is_active, created_at)
       VALUES ($1, $2, $3, $4, true, NOW())
       RETURNING *`,
      [id, question, answer, category || 'General']
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Create knowledge error:', error);
    res.status(500).json({ error: 'Failed to create knowledge entry' });
  }
});

// Update knowledge entry
router.put('/widgets/:id/knowledge/:knowledgeId', async (req, res) => {
  try {
    const { knowledgeId } = req.params;
    const { question, answer, category } = req.body;

    const result = await pool.query(
      `UPDATE widget_knowledge_base 
       SET question = $1, answer = $2, category = $3
       WHERE id = $4
       RETURNING *`,
      [question, answer, category, knowledgeId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Knowledge entry not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update knowledge error:', error);
    res.status(500).json({ error: 'Failed to update knowledge entry' });
  }
});

// Delete knowledge entry
router.delete('/widgets/:id/knowledge/:knowledgeId', async (req, res) => {
  try {
    const { knowledgeId } = req.params;

    await pool.query('DELETE FROM widget_knowledge_base WHERE id = $1', [knowledgeId]);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete knowledge error:', error);
    res.status(500).json({ error: 'Failed to delete knowledge entry' });
  }
});

// Bulk upload knowledge entries (CSV/JSON)
router.post('/widgets/:id/knowledge/bulk', async (req, res) => {
  try {
    const { id } = req.params;
    const { entries, skipDuplicates = true } = req.body;

    if (!entries || !Array.isArray(entries)) {
      return res.status(400).json({ error: 'Invalid entries format' });
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📦 BULK UPLOAD KNOWLEDGE BASE');
    console.log(`Widget ID: ${id}`);
    console.log(`Total Entries: ${entries.length}`);
    console.log(`Skip Duplicates: ${skipDuplicates}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    let inserted = 0;
    let skipped = 0;
    let errors = 0;
    const errorDetails: any[] = [];

    for (const entry of entries) {
      const { question, answer, category } = entry;

      if (!question || !answer) {
        errors++;
        errorDetails.push({ entry, reason: 'Missing question or answer' });
        continue;
      }

      try {
        // Check for duplicates if enabled
        if (skipDuplicates) {
          const existingResult = await pool.query(
            'SELECT id FROM widget_knowledge_base WHERE widget_id = $1 AND LOWER(question) = LOWER($2)',
            [id, question.trim()]
          );

          if (existingResult.rows.length > 0) {
            skipped++;
            console.log(`⏭️  Skipped duplicate: "${question.substring(0, 50)}..."`);
            continue;
          }
        }

        // Insert new entry
        await pool.query(
          `INSERT INTO widget_knowledge_base (widget_id, question, answer, category, is_active, created_at)
           VALUES ($1, $2, $3, $4, true, NOW())`,
          [id, question.trim(), answer.trim(), category?.trim() || 'General']
        );

        inserted++;
        console.log(`✅ Inserted: "${question.substring(0, 50)}..." (${category || 'General'})`);
      } catch (error: any) {
        errors++;
        errorDetails.push({ entry, reason: error.message });
        console.error(`❌ Error inserting: "${question.substring(0, 50)}..."`, error.message);
      }
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📊 BULK UPLOAD COMPLETE`);
    console.log(`✅ Inserted: ${inserted}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log(`❌ Errors: ${errors}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    res.json({
      success: true,
      summary: {
        total: entries.length,
        inserted,
        skipped,
        errors
      },
      errorDetails: errors > 0 ? errorDetails : undefined
    });
  } catch (error) {
    console.error('Bulk upload error:', error);
    res.status(500).json({ error: 'Failed to bulk upload knowledge entries' });
  }
});

// Get knowledge categories for a widget
router.get('/widgets/:id/knowledge/categories', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT DISTINCT category, COUNT(*) as count 
       FROM widget_knowledge_base 
       WHERE widget_id = $1 
       GROUP BY category
       ORDER BY category`,
      [id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// ==========================================
// WORDPRESS PLUGIN DOWNLOAD
// ==========================================

// Download WordPress plugin ZIP for a specific widget
router.get('/:widgetKey/download-plugin', async (req, res) => {
  try {
    const { widgetKey } = req.params;

    // Get widget details
    const widgetResult = await pool.query(
      'SELECT * FROM widget_configs WHERE widget_key = $1',
      [widgetKey]
    );

    if (widgetResult.rows.length === 0) {
      return res.status(404).json({ error: 'Widget not found' });
    }

    const widget = widgetResult.rows[0];
    const backendUrl = process.env.BACKEND_URL || 'https://marketingby-wetechforu-b67c6bd0bf6b.herokuapp.com';
    const pluginSlug = `wetechforu-chat-widget-${widget.widget_name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

    // Generate WordPress plugin PHP code
    const pluginCode = `<?php
/**
 * Plugin Name: WeTechForU Chat Widget - ${widget.widget_name}
 * Description: AI-powered chat widget for ${widget.widget_name} with auto-popup and intro flow
 * Version: 2.0.0
 * Author: WeTechForU
 * Author URI: https://wetechforu.com
 * Text Domain: wetechforu-chat-widget
 * Requires at least: 4.0
 * Tested up to: 6.4
 * Requires PHP: 7.0
 */

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
}

// Add widget script to footer
add_action('wp_footer', 'wetechforu_chat_widget_footer');
function wetechforu_chat_widget_footer() {
    ?>
    <!-- WeTechForU Chat Widget V2 - Database-Driven Config -->
    <script src="${backendUrl}/public/wetechforu-widget-v2.js?v=<?php echo time(); ?>"></script>
    <script>
        // ✅ ONLY pass required fields - widget loads ALL other settings from database!
        if (window.WeTechForUWidget) {
            WeTechForUWidget.init({
                widgetKey: '${widgetKey}',
                backendUrl: '${backendUrl}'
                // ✅ All other settings (botName, colors, avatar, welcome message, intro flow) 
                //    are loaded automatically from the database via loadWidgetConfig()!
            });
        }
    </script>
    <?php
}

// Add admin menu
add_action('admin_menu', 'wetechforu_chat_widget_menu');
function wetechforu_chat_widget_menu() {
    add_menu_page(
        'Chat Widget',
        'Chat Widget',
        'manage_options',
        'wetechforu-chat-widget',
        'wetechforu_chat_widget_admin_page',
        'dashicons-format-chat',
        30
    );
}

// Admin page
function wetechforu_chat_widget_admin_page() {
    ?>
    <div class="wrap">
        <h1>WeTechForU Chat Widget</h1>
        <div class="card" style="padding: 20px;">
            <h2>Widget Details</h2>
            <table class="form-table">
                <tr>
                    <th scope="row">Widget Name</th>
                    <td><strong>${widget.widget_name}</strong></td>
                </tr>
                <tr>
                    <th scope="row">Widget Key</th>
                    <td><code>${widgetKey}</code></td>
                </tr>
                <tr>
                    <th scope="row">Status</th>
                    <td><span style="color: green; font-weight: bold;">✓ Active</span></td>
                </tr>
            </table>
            <hr>
            <h3>How It Works</h3>
            <ol>
                <li>This plugin automatically adds a chat widget to your website</li>
                <li>The widget appears in the bottom-right corner of all your pages</li>
                <li>Visitors can chat with your AI assistant 24/7</li>
                <li>All conversations are tracked in your WeTechForU dashboard</li>
                <li>No coding required - works immediately after activation!</li>
            </ol>
            <p>
                <a href="https://marketingby.wetechforu.com/app/chat-conversations" target="_blank" class="button button-primary">View Conversations</a>
                <a href="https://marketingby.wetechforu.com/app/chat-widgets" target="_blank" class="button">Manage Widget</a>
            </p>
        </div>
    </div>
    <?php
}
?>`;

    // Generate README.txt for WordPress Plugin Directory
    const readmeContent = `=== WeTechForU Chat Widget - ${widget.widget_name} ===
Contributors: wetechforu
Tags: chat, chatbot, customer support, live chat, widget
Requires at least: 4.0
Tested up to: 6.4
Requires PHP: 7.0
Stable tag: 2.0.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

AI-powered chat widget that helps you engage with website visitors automatically.

== Description ==

WeTechForU Chat Widget adds a beautiful, AI-powered chat interface to your WordPress website. 

**Features:**

* Auto-popup to greet visitors
* Friendly intro messages
* Quick action buttons for common questions
* Smart AI responses based on your knowledge base
* Lead capture and handoff to human support
* Mobile-responsive design
* Works on all WordPress themes
* No coding required!

**Perfect For:**

* Healthcare providers
* Small businesses
* E-commerce stores
* Service providers
* Any website that wants to engage visitors

All conversations are managed through your WeTechForU dashboard at https://marketingby.wetechforu.com

== Installation ==

1. Upload the plugin ZIP file through WordPress admin
2. Go to Plugins → Add New → Upload Plugin
3. Choose the ZIP file and click "Install Now"
4. Activate the plugin
5. The chat widget will appear automatically on your site!

== Frequently Asked Questions ==

= Do I need a WeTechForU account? =

Yes, this plugin connects to your WeTechForU account. Get started at https://marketingby.wetechforu.com

= Will it slow down my website? =

No! The widget loads asynchronously and has minimal impact on page speed.

= Can I customize the widget appearance? =

Yes! Manage all settings through your WeTechForU dashboard.

= Does it work with my theme? =

Yes! The widget works with all WordPress themes.

== Changelog ==

= 2.0.0 =
* Auto-popup functionality
* Friendly intro flow
* Quick action buttons
* Enhanced mobile support
* Universal compatibility

= 1.0.0 =
* Initial release

== Upgrade Notice ==

= 2.0.0 =
Major update with auto-popup and enhanced user experience.
`;

    // Set response headers for ZIP download
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${pluginSlug}.zip"`);

    // Create ZIP archive
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    // Handle archiver errors
    archive.on('error', (err) => {
      console.error('Archive error:', err);
      throw err;
    });

    // Pipe archive to response
    archive.pipe(res);

    // Add files to the archive with proper WordPress plugin structure
    archive.append(pluginCode, { name: `${pluginSlug}/${pluginSlug}.php` });
    archive.append(readmeContent, { name: `${pluginSlug}/readme.txt` });

    // Finalize the archive
    await archive.finalize();

    console.log(`✅ WordPress plugin ZIP generated for widget: ${widget.widget_name}`);

  } catch (error) {
    console.error('Download plugin error:', error);
    res.status(500).json({ error: 'Failed to generate plugin' });
  }
});

// ==========================================
// LLM ADMIN ROUTES (Manage credits & usage)
// ==========================================

// Get LLM usage for a client
router.get('/clients/:clientId/llm-usage', async (req, res) => {
  try {
    const { clientId } = req.params;

    const result = await pool.query(
      `SELECT cu.*, w.widget_name
       FROM client_llm_usage cu
       LEFT JOIN widget_configs w ON w.id = cu.widget_id
       WHERE cu.client_id = $1
       ORDER BY cu.created_at DESC`,
      [clientId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get LLM usage error:', error);
    res.status(500).json({ error: 'Failed to fetch LLM usage' });
  }
});

// Update client LLM limits
router.put('/clients/:clientId/widgets/:widgetId/llm-limits', async (req, res) => {
  try {
    const { clientId, widgetId } = req.params;
    const { monthlyTokenLimit, dailyTokenLimit, monthlyRequestLimit, dailyRequestLimit } = req.body;

    await llmService.updateClientLimits(
      parseInt(clientId),
      parseInt(widgetId),
      {
        monthlyTokenLimit,
        dailyTokenLimit,
        monthlyRequestLimit,
        dailyRequestLimit
      }
    );

    res.json({ success: true, message: 'Limits updated successfully' });
  } catch (error) {
    console.error('Update LLM limits error:', error);
    res.status(500).json({ error: 'Failed to update limits' });
  }
});

// Get LLM request logs for analytics
router.get('/widgets/:widgetId/llm-logs', async (req, res) => {
  try {
    const { widgetId } = req.params;
    const { limit = 100, offset = 0 } = req.query;

    const result = await pool.query(
      `SELECT 
        id, created_at, llm_provider, llm_model,
        total_tokens, response_time_ms, status,
        prompt_text, response_text, error_message
       FROM llm_request_logs
       WHERE widget_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [widgetId, limit, offset]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get LLM logs error:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// Get LLM analytics summary
router.get('/widgets/:widgetId/llm-analytics', async (req, res) => {
  try {
    const { widgetId } = req.params;

    const [usage, logs] = await Promise.all([
      pool.query(
        `SELECT * FROM client_llm_usage WHERE widget_id = $1`,
        [widgetId]
      ),
      pool.query(
        `SELECT 
          COUNT(*) as total_requests,
          SUM(total_tokens) as total_tokens,
          AVG(response_time_ms) as avg_response_time,
          COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_requests,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_requests,
          COUNT(CASE WHEN status = 'credits_exhausted' THEN 1 END) as credits_exhausted_count
         FROM llm_request_logs
         WHERE widget_id = $1 AND created_at >= NOW() - INTERVAL '30 days'`,
        [widgetId]
      )
    ]);

    res.json({
      usage: usage.rows[0] || null,
      analytics: logs.rows[0] || {}
    });
  } catch (error) {
    console.error('Get LLM analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// ==========================================
// SESSION MANAGEMENT - Auto-close inactive conversations
// ==========================================

/**
 * Auto-close inactive conversations (15+ minutes no activity)
 * This should be called by a scheduled job/cron
 */
router.post('/admin/close-inactive-sessions', async (req, res) => {
  try {
    console.log('🔄 Running auto-close for inactive conversations...');
    
    // Step 1: Find conversations that will be closed
    const toCloseResult = await pool.query(
      `SELECT 
        wc.id as conversation_id,
        wc.widget_id,
        wc.visitor_name,
        wc.visitor_email,
        w.widget_name,
        w.notification_email,
        EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - wc.last_activity_at))/60 as minutes_inactive
       FROM widget_conversations wc
       JOIN widget_configs w ON w.id = wc.widget_id
       WHERE wc.status = 'active'
         AND wc.last_activity_at < CURRENT_TIMESTAMP - INTERVAL '15 minutes'
         AND wc.message_count > 0`
    );
    
    const conversationsToClose = toCloseResult.rows;
    
    if (conversationsToClose.length === 0) {
      console.log('✅ No inactive conversations to close');
      return res.json({
        success: true,
        closed_count: 0,
        message: 'No inactive conversations found'
      });
    }
    
    console.log(`📊 Found ${conversationsToClose.length} inactive conversations`);
    
    // Step 2: Send "closing due to inactivity" message to each conversation
    for (const conv of conversationsToClose) {
      try {
        // Add system message to conversation
        await pool.query(
          `INSERT INTO widget_messages (conversation_id, message_type, message_text, sender_name)
           VALUES ($1, $2, $3, $4)`,
          [
            conv.conversation_id,
            'system',
            `This conversation has been closed due to ${Math.round(conv.minutes_inactive)} minutes of inactivity. Thank you for visiting! If you have more questions, feel free to start a new chat anytime. 😊`,
            'System'
          ]
        );
        
        console.log(`✅ Sent closing message to conversation ${conv.conversation_id}`);
      } catch (msgError) {
        console.error(`❌ Failed to send closing message to conversation ${conv.conversation_id}:`, msgError);
      }
    }
    
    // Step 3: Call database function to close conversations
    const result = await pool.query('SELECT close_inactive_conversations() as closed_count');
    const closedCount = result.rows[0]?.closed_count || 0;
    
    console.log(`✅ Successfully closed ${closedCount} inactive conversations`);
    
    res.json({
      success: true,
      closed_count: closedCount,
      conversations: conversationsToClose.map(c => ({
        conversation_id: c.conversation_id,
        visitor_name: c.visitor_name,
        minutes_inactive: Math.round(c.minutes_inactive),
        widget_name: c.widget_name
      }))
    });
  } catch (error) {
    console.error('❌ Error closing inactive sessions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to close inactive sessions',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get inactive conversation statistics
 */
router.get('/admin/inactive-sessions/stats', async (req, res) => {
  try {
    const stats = await pool.query(
      `SELECT 
        COUNT(*) FILTER (WHERE status = 'active' AND last_activity_at < CURRENT_TIMESTAMP - INTERVAL '10 minutes') as ready_to_warn,
        COUNT(*) FILTER (WHERE status = 'active' AND last_activity_at < CURRENT_TIMESTAMP - INTERVAL '15 minutes') as ready_to_close,
        COUNT(*) FILTER (WHERE status = 'inactive') as already_closed,
        COUNT(*) FILTER (WHERE status = 'active') as total_active,
        AVG(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - last_activity_at))/60) FILTER (WHERE status = 'active') as avg_minutes_inactive
       FROM widget_conversations
       WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'`
    );
    
    res.json({
      success: true,
      stats: stats.rows[0] || {}
    });
  } catch (error) {
    console.error('Error fetching inactive session stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

/**
 * Manually close a specific conversation
 */
router.post('/conversations/:conversationId/close-manual', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { reason } = req.body;
    
    // Add system message
    await pool.query(
      `INSERT INTO widget_messages (conversation_id, message_type, message_text, sender_name)
       VALUES ($1, $2, $3, $4)`,
      [
        conversationId,
        'system',
        reason || 'This conversation has been closed. Thank you for chatting with us!',
        'System'
      ]
    );
    
    // Close conversation
    await pool.query(
      `UPDATE widget_conversations
       SET status = 'closed',
           closed_at = CURRENT_TIMESTAMP,
           closed_by = 'admin',
           close_reason = $2
       WHERE id = $1`,
      [conversationId, reason || 'Manually closed by admin']
    );
    
    res.json({ success: true, message: 'Conversation closed' });
  } catch (error) {
    console.error('Error closing conversation:', error);
    res.status(500).json({ error: 'Failed to close conversation' });
  }
});

/**
 * Get conversation status (for widget to check if conversation still active)
 */
router.get('/public/widget/:widgetKey/conversations/:conversationId/status', async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    const result = await pool.query(
      'SELECT status, closed_at, close_reason FROM widget_conversations WHERE id = $1',
      [conversationId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching conversation status:', error);
    res.status(500).json({ error: 'Failed to fetch status' });
  }
});

/**
 * Get all messages for a conversation (for widget to restore conversation)
 */
router.get('/public/widget/:widgetKey/conversations/:conversationId/messages', async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    const result = await pool.query(
      `SELECT id, message_type, message_text, sender_name, agent_name, created_at
       FROM widget_messages
       WHERE conversation_id = $1
       ORDER BY created_at ASC`,
      [conversationId]
    );
    
    res.json({ messages: result.rows });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

/**
 * Get unread message counts for all widgets (for portal notification badge)
 */
router.get('/admin/unread-counts', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        wc.widget_id,
        w.widget_name,
        COUNT(DISTINCT wc.id) as unread_conversations,
        SUM(wc.unread_agent_messages) as total_unread_messages,
        MAX(wc.updated_at) as last_message_at
       FROM widget_conversations wc
       JOIN widget_configs w ON w.id = wc.widget_id
       WHERE wc.status = 'active' 
         AND wc.unread_agent_messages > 0
       GROUP BY wc.widget_id, w.widget_name
       ORDER BY last_message_at DESC`
    );
    
    res.json({ 
      widgets: result.rows,
      total_unread: result.rows.reduce((sum, w) => sum + parseInt(w.total_unread_messages || 0), 0)
    });
  } catch (error) {
    console.error('Error fetching unread counts:', error);
    res.status(500).json({ error: 'Failed to fetch unread counts' });
  }
});

/**
 * Mark conversation as read by agent
 */
router.post('/conversations/:conversationId/mark-read', async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    await pool.query(
      `UPDATE widget_conversations 
       SET unread_agent_messages = 0,
           last_read_by_agent_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [conversationId]
    );
    
    res.json({ success: true, message: 'Marked as read' });
  } catch (error) {
    console.error('Error marking as read:', error);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

/**
 * 🗑️ DELETE single conversation (Admin only)
 */
router.delete('/conversations/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    console.log(`🗑️ Deleting conversation: ${conversationId}`);
    
    // Delete messages first (foreign key constraint)
    await pool.query('DELETE FROM widget_messages WHERE conversation_id = $1', [conversationId]);
    
    // Delete the conversation
    const result = await pool.query(
      'DELETE FROM widget_conversations WHERE id = $1 RETURNING *',
      [conversationId]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    console.log(`✅ Conversation ${conversationId} deleted successfully`);
    res.json({ success: true, message: 'Conversation deleted successfully' });
  } catch (error) {
    console.error('Delete conversation error:', error);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

/**
 * 🗑️ BULK DELETE conversations (Admin only)
 */
router.post('/conversations/bulk-delete', async (req, res) => {
  try {
    const { widget_id, conversation_ids, delete_all } = req.body;
    
    console.log(`🗑️ Bulk delete request:`, { widget_id, conversation_ids, delete_all });
    
    let deletedCount = 0;
    
    if (delete_all && widget_id) {
      // Delete ALL conversations for this widget
      console.log(`🗑️ Deleting ALL conversations for widget ${widget_id}`);
      
      // Get all conversation IDs for this widget
      const convResult = await pool.query(
        'SELECT id FROM widget_conversations WHERE widget_id = $1',
        [widget_id]
      );
      
      const convIds = convResult.rows.map(r => r.id);
      
      // Delete all messages for these conversations
      if (convIds.length > 0) {
        await pool.query(
          'DELETE FROM widget_messages WHERE conversation_id = ANY($1)',
          [convIds]
        );
        
        // Delete all conversations
        const deleteResult = await pool.query(
          'DELETE FROM widget_conversations WHERE widget_id = $1',
          [widget_id]
        );
        
        deletedCount = deleteResult.rowCount || 0;
      }
      
      console.log(`✅ Deleted ${deletedCount} conversations for widget ${widget_id}`);
    } else if (conversation_ids && conversation_ids.length > 0) {
      // Delete specific conversations
      console.log(`🗑️ Deleting ${conversation_ids.length} specific conversations`);
      
      // Delete messages
      await pool.query(
        'DELETE FROM widget_messages WHERE conversation_id = ANY($1)',
        [conversation_ids]
      );
      
      // Delete conversations
      const deleteResult = await pool.query(
        'DELETE FROM widget_conversations WHERE id = ANY($1)',
        [conversation_ids]
      );
      
      deletedCount = deleteResult.rowCount || 0;
      console.log(`✅ Deleted ${deletedCount} conversations`);
    } else {
      return res.status(400).json({ error: 'Either widget_id with delete_all=true or conversation_ids array required' });
    }
    
    res.json({ 
      success: true, 
      message: `Successfully deleted ${deletedCount} conversation(s)`,
      deleted_count: deletedCount 
    });
  } catch (error) {
    console.error('Bulk delete conversations error:', error);
    res.status(500).json({ error: 'Failed to delete conversations' });
  }
});

// ==========================================
// POST /chat-widget/test-ai
// Test AI/LLM connection
// ==========================================

router.post('/test-ai', async (req, res) => {
  try {
    const { api_key } = req.body;

    if (!api_key) {
      return res.status(400).json({ error: 'API key is required' });
    }

    // Test with Google Gemini (most common)
    const testResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${api_key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: 'Say "Hello World" to test the connection.' }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 50
        }
      })
    });

    if (!testResponse.ok) {
      const errorData = await testResponse.json();
      throw new Error(errorData.error?.message || 'API test failed');
    }

    const result = await testResponse.json();
    const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';

    res.json({
      success: true,
      message: '✅ AI connection successful!',
      test_response: responseText.substring(0, 100) // First 100 chars
    });

  } catch (error: any) {
    console.error('AI test error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to test AI connection'
    });
  }
});

export default router;

