import express from 'express';
import pool from '../config/database';
import crypto from 'crypto';
import archiver from 'archiver';
import { EmailService } from '../services/emailService';

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
      'intro_flow_enabled', 'intro_questions' // ✅ FIXED: Allow intro flow fields to be saved
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
              intro_flow_enabled, intro_questions
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
    const { session_id, page_url, referrer_url, user_agent } = req.body;
    const ip_address = req.ip || req.connection.remoteAddress;

    // Get widget ID
    const widgetResult = await pool.query(
      'SELECT id, rate_limit_messages, rate_limit_window FROM widget_configs WHERE widget_key = $1 AND is_active = true',
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

    // Create new conversation
    const convResult = await pool.query(
      `INSERT INTO widget_conversations (widget_id, session_id, ip_address, user_agent, referrer_url, page_url)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [widget.id, session_id, ip_address, user_agent, referrer_url, page_url]
    );

    const conversationId = convResult.rows[0].id;

    console.log(`✅ New conversation started: ${conversationId} for widget ${widgetKey}`);

    // 📧 Send email notification for NEW conversation (async - don't block response)
    if (widget.enable_email_notifications && widget.notification_email) {
      emailService.sendEmail({
        to: widget.notification_email,
        subject: `🤖 New Chat Visitor - ${widget.widget_name}`,
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

    // Get widget and conversation info
    const widgetResult = await pool.query(
      'SELECT id FROM widget_configs WHERE widget_key = $1 AND is_active = true',
      [widgetKey]
    );

    if (widgetResult.rows.length === 0) {
      return res.status(404).json({ error: 'Widget not found' });
    }

    const widget_id = widgetResult.rows[0].id;

    // Save user message
    await pool.query(
      `INSERT INTO widget_messages (conversation_id, message_type, message_text)
       VALUES ($1, $2, $3)`,
      [conversation_id, 'user', message_text]
    );

    // Update conversation message count
    await pool.query(
      'UPDATE widget_conversations SET message_count = message_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [conversation_id]
    );

    // 🎯 SMART MATCHING: Find best matching knowledge base entry
    const similarQuestions = await findSimilarQuestions(message_text, widget_id, 0.5);

    // Generate bot response
    let botResponse: string;
    let confidence = 0.3;
    let knowledge_base_id = null;
    let suggestions: any[] = [];

    if (similarQuestions.length > 0 && similarQuestions[0].similarity >= 0.85) {
      // ✅ HIGH CONFIDENCE MATCH (85%+) - Answer directly
      const bestMatch = similarQuestions[0];
      botResponse = bestMatch.answer;
      confidence = bestMatch.similarity;
      knowledge_base_id = bestMatch.id;

      // Update usage stats
      await pool.query(
        'UPDATE widget_knowledge_base SET times_used = times_used + 1 WHERE id = $1',
        [knowledge_base_id]
      );

      console.log(`✅ Direct answer (${Math.round(confidence * 100)}% match): "${bestMatch.question}"`);

    } else if (similarQuestions.length > 0) {
      // 🤔 MEDIUM CONFIDENCE (50-85%) - Suggest similar questions
      botResponse = `I'm not sure I understood that exactly. Did you mean one of these?\n\n` +
        similarQuestions.map((q, i) => 
          `${i + 1}. ${q.question} (${Math.round(q.similarity * 100)}% match)`
        ).join('\n') +
        `\n\nPlease type the number or rephrase your question.`;
      
      confidence = similarQuestions[0].similarity;
      suggestions = similarQuestions.map(q => ({
        id: q.id,
        question: q.question,
        similarity: Math.round(q.similarity * 100)
      }));

      console.log(`🤔 Showing ${suggestions.length} similar question suggestions`);

    } else {
      // ❌ NO MATCH - Default response
      botResponse = 'I understand you have a question. Let me connect you with our team who can help you better. Would you like to leave your email or phone number?';
      confidence = 0.3;

      console.log(`❌ No matching questions found for: "${message_text}"`);
    }

    const responseTime = Date.now() - startTime;

    // Save bot response
    const botMessage = await pool.query(
      `INSERT INTO widget_messages (conversation_id, message_type, message_text, knowledge_base_id, confidence_score, response_time_ms)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [conversation_id, 'bot', botResponse, knowledge_base_id, confidence, responseTime]
    );

    // Update conversation
    await pool.query(
      'UPDATE widget_conversations SET bot_response_count = bot_response_count + 1 WHERE id = $1',
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
        emailService.sendEmail({
          to: widgetInfo.notification_email,
          subject: `🚨 URGENT: Visitor Requests Contact - ${widgetInfo.widget_name}`,
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
        wc.handoff_requested_at
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

    // Insert human message
    const messageResult = await pool.query(
      `INSERT INTO widget_messages (
        conversation_id, message_type, message_text, sender_name, created_at
      ) VALUES ($1, $2, $3, $4, NOW())
      RETURNING *`,
      [conversationId, 'human', message.trim(), username]
    );

    // Update conversation
    await pool.query(
      `UPDATE widget_conversations SET
        human_response_count = COALESCE(human_response_count, 0) + 1,
        message_count = COALESCE(message_count, 0) + 1,
        last_message = $1,
        last_message_at = NOW(),
        handoff_requested = false,
        status = 'active',
        updated_at = NOW()
      WHERE id = $2`,
      [message.trim(), conversationId]
    );

    console.log('✅ Human reply sent successfully');
    console.log(`📊 Message ID: ${messageResult.rows[0].id}`);

    res.json({
      success: true,
      message_id: messageResult.rows[0].id,
      message: messageResult.rows[0]
    });
  } catch (error) {
    console.error('❌ Send reply error:', error);
    res.status(500).json({ error: 'Failed to send reply' });
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

export default router;

