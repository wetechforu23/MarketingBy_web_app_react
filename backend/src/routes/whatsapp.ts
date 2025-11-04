import express, { Request, Response } from 'express';
import pool from '../config/database';
import { requireAuth } from '../middleware/auth';
import { WhatsAppService } from '../services/whatsappService';
import HandoverService from '../services/handoverService';

const router = express.Router();
const whatsappService = WhatsAppService.getInstance();

// ==========================================
// WHATSAPP API ROUTES
// ==========================================
// Manage WhatsApp integration per client
// ==========================================

// ==========================================
// POST /api/whatsapp/settings
// Save WhatsApp/Twilio credentials
// ==========================================

router.post('/settings', requireAuth, async (req: Request, res: Response) => {
  try {
    const userRole = req.session.role;
    const userClientId = req.session.clientId;
    const { client_id, account_sid, auth_token, from_number } = req.body;

    // Validate input
    if (!client_id || !account_sid || !auth_token || !from_number) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check permissions (super admin or client owner)
    const isAdmin = userRole === 'super_admin';
    if (!isAdmin && userClientId !== client_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Save credentials
    await whatsappService.saveCredentials(
      client_id,
      account_sid,
      auth_token,
      from_number
    );

    res.json({
      success: true,
      message: 'WhatsApp credentials saved successfully'
    });

  } catch (error) {
    console.error('Error saving WhatsApp settings:', error);
    res.status(500).json({ error: 'Failed to save WhatsApp settings' });
  }
});

// ==========================================
// GET /api/whatsapp/settings/:clientId
// Get WhatsApp configuration status
// ==========================================

router.get('/settings/:clientId', requireAuth, async (req: Request, res: Response) => {
  try {
    const userRole = req.session.role;
    const userClientId = req.session.clientId;
    const clientId = parseInt(req.params.clientId);

    // Check permissions
    const isAdmin = userRole === 'super_admin';
    if (!isAdmin && userClientId !== clientId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Fetch missing prices from Twilio (async, don't wait)
    whatsappService.fetchMissingPrices(clientId).catch(err => 
      console.warn('Background price fetch failed:', err)
    );

    // Check if configured
    const isConfigured = await whatsappService.isWhatsAppEnabled(clientId);

    // Get phone number if configured
    let phoneNumber = null;
    let credentialsPartial = null; // Partial credentials for display (last 4 digits)
    
    if (isConfigured) {
      const phoneResult = await pool.query(
        `SELECT phone_number, display_name, is_sandbox
         FROM whatsapp_phone_numbers
         WHERE client_id = $1 AND is_active = true
         LIMIT 1`,
        [clientId]
      );

      if (phoneResult.rows.length > 0) {
        phoneNumber = phoneResult.rows[0];
      }

      // ✅ Get partial credentials for display (last 4 digits only)
      try {
        const crypto = require('crypto');
        const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-32-character-secret-key!!';
        const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').substring(0, 32));
        
        const decrypt = (encrypted: string): string => {
          try {
            const parts = encrypted.split(':');
            const iv = Buffer.from(parts[0], 'hex');
            const encryptedText = parts[1];
            const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
            let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
          } catch (e) {
            console.error('Decrypt error:', e);
            return '';
          }
        };

        const credResult = await pool.query(
          `SELECT key_name, encrypted_value 
           FROM encrypted_credentials 
           WHERE service = $1`,
          [`whatsapp_client_${clientId}`]
        );

        if (credResult.rows.length > 0) {
          const partials: any = {};
          credResult.rows.forEach((row: any) => {
            try {
              const decrypted = decrypt(row.encrypted_value);
              if (decrypted && decrypted.length >= 4) {
                // Show last 4 characters
                partials[row.key_name] = `••••${decrypted.substring(decrypted.length - 4)}`;
              }
            } catch (e) {
              console.error(`Error decrypting ${row.key_name}:`, e);
            }
          });
          credentialsPartial = partials;
        }
      } catch (e) {
        console.error('Error getting partial credentials:', e);
      }
    }

    // Get usage stats
    const usage = await whatsappService.getUsageStats(clientId);

    res.json({
      configured: isConfigured,
      phone_number: phoneNumber,
      credentials_partial: credentialsPartial, // Last 4 digits for display
      usage
    });

  } catch (error) {
    console.error('Error fetching WhatsApp settings:', error);
    res.status(500).json({ error: 'Failed to fetch WhatsApp settings' });
  }
});

// ==========================================
// POST /api/whatsapp/test-connection
// Test Twilio credentials
// ==========================================

router.post('/test-connection', requireAuth, async (req: Request, res: Response) => {
  try {
    const userRole = req.session.role;
    const userClientId = req.session.clientId;
    const { client_id } = req.body;

    if (!client_id) {
      return res.status(400).json({ error: 'Missing client_id' });
    }

    // Check permissions
    const isAdmin = userRole === 'super_admin';
    if (!isAdmin && userClientId !== client_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await whatsappService.testConnection(client_id);

    if (result.success) {
      res.json({ 
        success: true,
        message: 'WhatsApp connection successful!' 
      });
    } else {
      res.status(400).json({ 
        success: false,
        error: result.error 
      });
    }

  } catch (error) {
    console.error('Error testing WhatsApp connection:', error);
    res.status(500).json({ error: 'Connection test failed' });
  }
});

// ==========================================
// POST /api/whatsapp/send
// Send WhatsApp message (for agent handoff)
// ==========================================

router.post('/send', requireAuth, async (req: Request, res: Response) => {
  try {
    const userRole = req.session.role;
    const userClientId = req.session.clientId;
    const {
      client_id,
      widget_id,
      conversation_id,
      to_number,
      message,
      media_url,
      visitor_name
    } = req.body;

    // Validate input
    if (!client_id || !widget_id || !conversation_id || !to_number || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check permissions
    const isAdmin = userRole === 'super_admin';
    if (!isAdmin && userClientId !== client_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Send message
    const result = await whatsappService.sendMessage({
      clientId: client_id,
      widgetId: widget_id,
      conversationId: conversation_id,
      toNumber: to_number,
      message,
      mediaUrl: media_url,
      sentByUserId: req.session.userId!,
      sentByAgentName: req.session.username || 'Agent',
      visitorName: visitor_name
    });

    if (result.success) {
      res.json({
        success: true,
        message_sid: result.messageSid,
        status: result.status
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    res.status(500).json({ error: 'Failed to send WhatsApp message' });
  }
});

// ==========================================
// GET /api/whatsapp/messages/:conversationId
// Get WhatsApp messages for a conversation
// ==========================================

router.get('/messages/:conversationId', requireAuth, async (req: Request, res: Response) => {
  try {
    const userRole = req.session.role;
    const userClientId = req.session.clientId;
    const conversationId = parseInt(req.params.conversationId);

    // Get conversation to check permissions
    const convResult = await pool.query(
      `SELECT wc.client_id
       FROM widget_conversations wc
       WHERE wc.id = $1`,
      [conversationId]
    );

    if (convResult.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const clientId = convResult.rows[0].client_id;

    // Check permissions
    const isAdmin = userRole === 'super_admin';
    if (!isAdmin && userClientId !== clientId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get WhatsApp messages
    const messages = await pool.query(
      `SELECT 
        id,
        direction,
        from_number,
        to_number,
        message_body,
        twilio_message_sid,
        twilio_status,
        media_url,
        sent_by_agent_name,
        visitor_name,
        sent_at,
        delivered_at,
        failed_at,
        twilio_error_message
       FROM whatsapp_messages
       WHERE conversation_id = $1
       ORDER BY sent_at ASC`,
      [conversationId]
    );

    res.json({
      messages: messages.rows
    });

  } catch (error) {
    console.error('Error fetching WhatsApp messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// ==========================================
// GET /api/whatsapp/all/:clientId
// Get all WhatsApp messages for a client (with optional widget filter)
// ==========================================

router.get('/all/:clientId', requireAuth, async (req: Request, res: Response) => {
  try {
    const userRole = req.session.role;
    const userClientId = req.session.clientId;
    const clientId = parseInt(req.params.clientId);
    const widgetId = req.query.widgetId ? parseInt(req.query.widgetId as string) : null;
    const limit = parseInt(req.query.limit as string) || 50;

    // Check permissions
    const isAdmin = userRole === 'super_admin';
    if (!isAdmin && userClientId !== clientId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    let query = `
      SELECT 
        wm.id,
        wm.widget_id,
        wm.conversation_id,
        wm.direction,
        wm.from_number,
        wm.to_number,
        wm.message_body,
        wm.twilio_message_sid,
        wm.twilio_status,
        wm.twilio_error_code,
        wm.twilio_error_message,
        wm.visitor_name,
        wm.visitor_phone,
        wm.sent_at,
        wm.delivered_at,
        wm.failed_at,
        wc.widget_name,
        wc.client_id
      FROM whatsapp_messages wm
      JOIN widget_configs wc ON wc.id = wm.widget_id
      WHERE wm.client_id = $1
    `;
    const params: any[] = [clientId];
    let paramIndex = 2;

    if (widgetId) {
      params.push(widgetId);
      query += ` AND wm.widget_id = $${paramIndex++}`;
    }

    query += ` ORDER BY wm.sent_at DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const result = await pool.query(query, params);

    res.json({
      messages: result.rows,
      total: result.rows.length
    });

  } catch (error) {
    console.error('Error fetching WhatsApp messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// ==========================================
// GET /api/whatsapp/usage/:clientId
// Get WhatsApp usage statistics
// ==========================================

router.get('/usage/:clientId', requireAuth, async (req: Request, res: Response) => {
  try {
    const userRole = req.session.role;
    const userClientId = req.session.clientId;
    const clientId = parseInt(req.params.clientId);

    // Check permissions
    const isAdmin = userRole === 'super_admin';
    if (!isAdmin && userClientId !== clientId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const usage = await whatsappService.getUsageStats(clientId);

    res.json(usage);

  } catch (error) {
    console.error('Error fetching WhatsApp usage:', error);
    res.status(500).json({ error: 'Failed to fetch usage statistics' });
  }
});

// ==========================================
// DELETE /api/whatsapp/settings/:clientId
// Delete WhatsApp credentials
// ==========================================

router.delete('/settings/:clientId', requireAuth, async (req: Request, res: Response) => {
  try {
    const userRole = req.session.role;
    const userClientId = req.session.clientId;
    const clientId = parseInt(req.params.clientId);

    // Check permissions
    const isAdmin = userRole === 'super_admin';
    if (!isAdmin && userClientId !== clientId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const success = await whatsappService.deleteCredentials(clientId);

    if (success) {
      res.json({ 
        success: true,
        message: 'WhatsApp credentials deleted successfully' 
      });
    } else {
      res.status(500).json({ error: 'Failed to delete credentials' });
    }

  } catch (error) {
    console.error('Error deleting WhatsApp credentials:', error);
    res.status(500).json({ error: 'Failed to delete credentials' });
  }
});

// ==========================================
// POST /api/whatsapp/webhook
// Twilio webhook for message status updates
// (PUBLIC - No auth required)
// ==========================================

router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const {
      MessageSid,
      MessageStatus,
      ErrorCode,
      ErrorMessage
    } = req.body;

    if (MessageSid && MessageStatus) {
      await whatsappService.updateMessageStatus(
        MessageSid,
        MessageStatus,
        ErrorCode,
        ErrorMessage
      );
    }

    // ✅ Return empty response to prevent "OK" auto-replies from Twilio
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Length', '0');
    res.status(200).end();

  } catch (error) {
    console.error('Error processing WhatsApp webhook:', error);
    // Still return 200 to prevent Twilio from retrying
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Length', '0');
    res.status(200).end();
  }
});

// ==========================================
// POST /api/whatsapp/status-callback
// Twilio status callback for delivery updates
// (PUBLIC - No auth required)
// ==========================================

router.post('/status-callback', async (req: Request, res: Response) => {
  try {
    const {
      MessageSid,
      MessageStatus,
      To,
      From,
      SmsStatus,
      ErrorCode,
      ErrorMessage,
      Price,
      PriceUnit
    } = req.body;

    console.log('📱 WhatsApp Status Callback:', {
      MessageSid,
      Status: MessageStatus || SmsStatus,
      To,
      From,
      ErrorCode,
      ErrorMessage,
      Price,
      PriceUnit
    });

    // Update message status in database (including price if available)
    if (MessageSid && (MessageStatus || SmsStatus)) {
      await whatsappService.updateMessageStatus(
        MessageSid,
        MessageStatus || SmsStatus,
        ErrorCode,
        ErrorMessage,
        Price ? Math.abs(parseFloat(Price)) : null,
        PriceUnit || 'USD'
      );
    }

    // ✅ Return empty response to prevent "OK" auto-replies from Twilio
    // ✅ CRITICAL: Return completely empty response (no text, no JSON, no whitespace)
    // Twilio sends "OK" auto-replies if the webhook response contains ANY text or whitespace
    // Empty response = no auto-reply
    res.removeHeader('Content-Type'); // Remove default Content-Type
    res.setHeader('Content-Length', '0');
    res.status(200).end(); // End with no body

  } catch (error) {
    console.error('WhatsApp status callback error:', error);
    // Still return 200 to prevent Twilio from retrying - MUST be empty
    res.removeHeader('Content-Type');
    res.setHeader('Content-Length', '0');
    res.status(200).end();
  }
});

// ==========================================
// POST /api/whatsapp/incoming
// Twilio webhook for incoming WhatsApp messages from agents
// (PUBLIC - No auth required)
// ==========================================

router.post('/incoming', async (req: Request, res: Response) => {
  try {
    const {
      MessageSid,
      AccountSid,
      From, // Agent's WhatsApp number (client's handover number)
      To, // Our Twilio WhatsApp number
      Body, // Message text
      NumMedia,
      InReplyTo // ✅ NEW: MessageSid of the message being replied to (when agent uses WhatsApp reply feature)
    } = req.body;

    console.log('📱 Incoming WhatsApp Message:', {
      MessageSid,
      From,
      To,
      Body: Body?.substring(0, 100),
      NumMedia,
      InReplyTo // Log if this is a reply
    });

    // Normalize phone number (remove whatsapp: prefix if present)
    const normalizePhone = (phone: string): string => {
      return phone.replace(/^whatsapp:/, '').trim();
    };

    const fromNumber = normalizePhone(From);
    const toNumber = normalizePhone(To);

    let messageBody = (Body || '').trim();

    // ✅ PRIORITY 1: Check if agent is REPLYING to a specific message (WhatsApp reply feature)
    // This is the BEST way - agent long-presses message and replies
    let conversationId: number | null = null;
    let matchedBy: string = 'none';
    
    if (InReplyTo) {
      console.log(`📎 Agent replied to message: ${InReplyTo}`);
      
      // Look up which conversation this message belongs to
      const replyToResult = await pool.query(`
        SELECT conversation_id, widget_id, client_id, message_body
        FROM whatsapp_messages
        WHERE twilio_message_sid = $1
        ORDER BY sent_at DESC
        LIMIT 1
      `, [InReplyTo]);
      
      if (replyToResult.rows.length > 0) {
        conversationId = replyToResult.rows[0].conversation_id;
        matchedBy = 'whatsapp_reply';
        
        console.log(`✅ Matched via WhatsApp reply: Conversation ${conversationId}, original message: "${replyToResult.rows[0].message_body?.substring(0, 50)}"`);
        
        // Remove reply context from message body if present (WhatsApp sometimes includes it)
        // WhatsApp replies may include: "> Original message\nYour reply"
        if (messageBody.includes('>')) {
          const lines = messageBody.split('\n');
          messageBody = lines.filter(line => !line.trim().startsWith('>')).join('\n').trim();
        }
      } else {
        console.log(`⚠️ Could not find conversation for replied message ${InReplyTo} - will try other methods`);
      }
    }

    // ✅ PRIORITY 2: Try to parse conversation ID, user name, or session ID from message (if not matched via reply)
    // Support multiple formats:
    // - Conversation ID: "#123: message", "#123 message", "#123message", "#123"
    // - User name: "@John Doe: message", "@John: message"
    // - Session ID: "@visitor_abc123: message", "@visitor_abc123def456: message"
    
    // Only try these if we didn't match via WhatsApp reply
    if (!conversationId) {
      // Try conversation ID first (#123)
      const conversationIdMatch = messageBody.match(/^#(\d+)(?:\s*[:]\s*|\s+)?/);
      if (conversationIdMatch) {
        conversationId = parseInt(conversationIdMatch[1]);
        messageBody = messageBody.replace(/^#\d+[\s:]*/, '').trim();
        matchedBy = 'conversation_id';
        console.log(`📌 Agent specified conversation ID: ${conversationId}, remaining message: "${messageBody}"`);
      } else {
        // Try user name (@John Doe or @John)
        const userNameMatch = messageBody.match(/^@([^:]+?):\s*(.+)$/);
        if (userNameMatch) {
          const userName = userNameMatch[1].trim();
          messageBody = userNameMatch[2].trim();
          
          // Find conversation by user name
          const nameMatchResult = await pool.query(`
            SELECT DISTINCT wconv.id as conversation_id
            FROM widget_configs wc
            JOIN handover_requests hr ON hr.widget_id = wc.id
            JOIN widget_conversations wconv ON wconv.id = hr.conversation_id
            WHERE hr.requested_method = 'whatsapp'
              AND hr.status IN ('pending', 'notified', 'completed')
              AND wconv.status = 'active'
              AND (
                REPLACE(REPLACE(wc.handover_whatsapp_number, 'whatsapp:', ''), ' ', '') = $1
                OR REPLACE(REPLACE(wc.handover_whatsapp_number, '+', ''), ' ', '') = REPLACE($1, '+', '')
              )
              AND (
                LOWER(wconv.visitor_name) LIKE LOWER($2 || '%')
                OR LOWER(wconv.visitor_name) LIKE LOWER('%' || $2 || '%')
              )
            ORDER BY wconv.last_activity_at DESC NULLS LAST
            LIMIT 1
          `, [fromNumber.replace(/[\s\-\(\)]/g, ''), userName]);
          
          if (nameMatchResult.rows.length > 0) {
            conversationId = nameMatchResult.rows[0].conversation_id;
            matchedBy = 'user_name';
            console.log(`📌 Agent specified user name: "${userName}", matched to conversation ${conversationId}, remaining message: "${messageBody}"`);
          }
        } else {
          // Try session ID (@visitor_abc123)
          const sessionIdMatch = messageBody.match(/^@(visitor_[a-z0-9]+):\s*(.+)$/i);
          if (sessionIdMatch) {
            const sessionIdPrefix = sessionIdMatch[1].trim();
            messageBody = sessionIdMatch[2].trim();
            
            // Find conversation by session ID prefix
            const sessionMatchResult = await pool.query(`
              SELECT DISTINCT wconv.id as conversation_id
              FROM widget_configs wc
              JOIN handover_requests hr ON hr.widget_id = wc.id
              JOIN widget_conversations wconv ON wconv.id = hr.conversation_id
              WHERE hr.requested_method = 'whatsapp'
                AND hr.status IN ('pending', 'notified', 'completed')
                AND wconv.status = 'active'
                AND (
                  REPLACE(REPLACE(wc.handover_whatsapp_number, 'whatsapp:', ''), ' ', '') = $1
                  OR REPLACE(REPLACE(wc.handover_whatsapp_number, '+', ''), ' ', '') = REPLACE($1, '+', '')
                )
                AND wconv.visitor_session_id LIKE $2 || '%'
              ORDER BY wconv.last_activity_at DESC NULLS LAST
              LIMIT 1
            `, [fromNumber.replace(/[\s\-\(\)]/g, ''), sessionIdPrefix]);
            
            if (sessionMatchResult.rows.length > 0) {
              conversationId = sessionMatchResult.rows[0].conversation_id;
              matchedBy = 'session_id';
              console.log(`📌 Agent specified session ID: "${sessionIdPrefix}", matched to conversation ${conversationId}, remaining message: "${messageBody}"`);
            }
          }
        }
      }
    }

    // Find the client and active conversation(s) by matching the From number
    // The From number should match the client's handover_whatsapp_number
    let clientResult;
    
    if (conversationId) {
      // If conversation ID specified, use it directly
      clientResult = await pool.query(`
        SELECT DISTINCT wc.id as widget_id, wc.client_id, wc.handover_whatsapp_number,
               hr.conversation_id, hr.id as handover_request_id, hr.created_at,
               wc.enable_multiple_whatsapp_chats, wconv.visitor_name, wconv.visitor_session_id
        FROM widget_configs wc
        JOIN handover_requests hr ON hr.widget_id = wc.id
        JOIN widget_conversations wconv ON wconv.id = hr.conversation_id
        WHERE hr.requested_method = 'whatsapp'
          AND hr.status IN ('pending', 'notified', 'completed')
          AND wconv.status = 'active'
          AND wconv.id = $1
          AND (
            REPLACE(REPLACE(wc.handover_whatsapp_number, 'whatsapp:', ''), ' ', '') = $2
            OR REPLACE(REPLACE(wc.handover_whatsapp_number, '+', ''), ' ', '') = REPLACE($2, '+', '')
          )
        LIMIT 1
      `, [conversationId, fromNumber.replace(/[\s\-\(\)]/g, '')]);
    } else {
      // No conversation ID specified - check if multiple chats are enabled
      // If enabled, we need to warn the agent or use the most recent active conversation
      // First, check widget config to see if multiple chats are enabled
      const widgetCheck = await pool.query(`
        SELECT enable_multiple_whatsapp_chats
        FROM widget_configs wc
        WHERE (
          REPLACE(REPLACE(wc.handover_whatsapp_number, 'whatsapp:', ''), ' ', '') = $1
          OR REPLACE(REPLACE(wc.handover_whatsapp_number, '+', ''), ' ', '') = REPLACE($1, '+', '')
        )
        LIMIT 1
      `, [fromNumber.replace(/[\s\-\(\)]/g, '')]);
      
      const enableMultipleChats = widgetCheck.rows[0]?.enable_multiple_whatsapp_chats || false;
      
      if (enableMultipleChats) {
        // Multiple chats enabled but no conversation ID - send warning with list of active conversations
        console.log(`⚠️ Multiple chats enabled but agent didn't specify conversation ID - sending active conversations list`);
        
        // Get all active WhatsApp conversations for this number
        const activeConversations = await pool.query(`
          SELECT DISTINCT wconv.id, wconv.visitor_name, wconv.visitor_session_id, 
                 wconv.last_activity_at, hr.created_at as handover_requested_at
          FROM widget_configs wc
          JOIN handover_requests hr ON hr.widget_id = wc.id
          JOIN widget_conversations wconv ON wconv.id = hr.conversation_id
          WHERE hr.requested_method = 'whatsapp'
            AND hr.status IN ('pending', 'notified', 'completed')
            AND wconv.status = 'active'
            AND (
              REPLACE(REPLACE(wc.handover_whatsapp_number, 'whatsapp:', ''), ' ', '') = $1
              OR REPLACE(REPLACE(wc.handover_whatsapp_number, '+', ''), ' ', '') = REPLACE($1, '+', '')
            )
          ORDER BY wconv.last_activity_at DESC NULLS LAST, hr.created_at DESC
          LIMIT 10
        `, [fromNumber.replace(/[\s\-\(\)]/g, '')]);
        
        if (activeConversations.rows.length > 1) {
          // Multiple active conversations - send list to agent
          const { WhatsAppService } = await import('../services/whatsappService');
          const whatsappService = WhatsAppService.getInstance();
          
          let conversationsList = activeConversations.rows.map((conv: any, idx: number) => {
            const visitorName = conv.visitor_name || `Visitor ${conv.id}`;
            const sessionDisplay = conv.visitor_session_id ? conv.visitor_session_id.substring(0, 25) : 'N/A';
            return `${idx + 1}. *${visitorName}*\n   ID: #${conv.id} | Session: \`${sessionDisplay}\``;
          }).join('\n\n');
          
          const firstConv = activeConversations.rows[0];
          const firstName = firstConv.visitor_name || `Visitor ${firstConv.id}`;
          const firstSession = firstConv.visitor_session_id ? firstConv.visitor_session_id.substring(0, 25) : 'N/A';
          
          const warningMessage = `⚠️ *Multiple Active Conversations*\n\n` +
            `You have ${activeConversations.rows.length} active WhatsApp conversations:\n\n` +
            `${conversationsList}\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `*TO REPLY, use ONE of these formats:*\n\n` +
            `1️⃣ By Conversation ID:\n` +
            `\`#${firstConv.id}: your message\`\n\n` +
            `2️⃣ By User Name:\n` +
            `\`@${firstName}: your message\`\n\n` +
            `3️⃣ By Session ID:\n` +
            `\`@${firstSession}: your message\`\n\n` +
            `❌ Your message "${messageBody}" was NOT delivered.\n` +
            `✅ Please resend using one of the formats above.`;
          
          try {
            // Get client_id and widget_id from the first active conversation
            const clientIdResult = await pool.query(`
              SELECT DISTINCT wc.client_id, wc.id as widget_id
              FROM widget_configs wc
              WHERE (
                REPLACE(REPLACE(wc.handover_whatsapp_number, 'whatsapp:', ''), ' ', '') = $1
                OR REPLACE(REPLACE(wc.handover_whatsapp_number, '+', ''), ' ', '') = REPLACE($1, '+', '')
              )
              LIMIT 1
            `, [fromNumber.replace(/[\s\-\(\)]/g, '')]);
            
            if (clientIdResult.rows.length > 0) {
              const clientId = clientIdResult.rows[0].client_id;
              const widgetId = clientIdResult.rows[0].widget_id;
              
              await whatsappService.sendMessage({
                clientId: clientId,
                widgetId: widgetId, // Use actual widget ID, not 0
                conversationId: activeConversations.rows[0]?.id || null, // Use first conversation ID
                toNumber: `whatsapp:${fromNumber}`,
                message: warningMessage,
                sentByAgentName: 'System',
                visitorName: 'Agent'
              });
              
              console.log(`📱 Sent active conversations list to agent (${activeConversations.rows.length} conversations)`);
              
              // Return empty response - message was sent but not processed
              res.removeHeader('Content-Type');
              res.setHeader('Content-Length', '0');
              return res.status(200).end();
            }
          } catch (warningError) {
            console.error('Error sending conversations list warning:', warningError);
            // Continue to process as single conversation
          }
        }
        
        // If only one conversation or warning failed, use most recent
        console.log(`⚠️ Multiple chats enabled but agent didn't specify conversation ID - using most recent active conversation`);
      }
      
      // No conversation ID specified - use most recent (backward compatibility)
      clientResult = await pool.query(`
        SELECT DISTINCT wc.id as widget_id, wc.client_id, wc.handover_whatsapp_number,
               hr.conversation_id, hr.id as handover_request_id, hr.created_at,
               wc.enable_multiple_whatsapp_chats, wconv.visitor_name, wconv.visitor_session_id
        FROM widget_configs wc
        JOIN handover_requests hr ON hr.widget_id = wc.id
        JOIN widget_conversations wconv ON wconv.id = hr.conversation_id
        WHERE hr.requested_method = 'whatsapp'
          AND hr.status IN ('pending', 'notified', 'completed')
          AND wconv.status = 'active'
          AND (
            REPLACE(REPLACE(wc.handover_whatsapp_number, 'whatsapp:', ''), ' ', '') = $1
            OR REPLACE(REPLACE(wc.handover_whatsapp_number, '+', ''), ' ', '') = REPLACE($1, '+', '')
          )
        ORDER BY wconv.last_activity_at DESC NULLS LAST, hr.created_at DESC
        LIMIT 1
      `, [fromNumber.replace(/[\s\-\(\)]/g, '')]);
    }

    if (clientResult.rows.length === 0) {
      console.log(`⚠️ No active WhatsApp handover found for number: ${fromNumber}${conversationId ? ` and conversation ID: ${conversationId}` : ''}`);
      
      // Debug: Check what conversations exist for this number
      const debugQuery = await pool.query(`
        SELECT wc.id as widget_id, wc.handover_whatsapp_number,
               hr.conversation_id, hr.status as handover_status, hr.requested_method,
               wconv.status as conv_status, wconv.agent_handoff, wconv.id as conv_id
        FROM widget_configs wc
        LEFT JOIN handover_requests hr ON hr.widget_id = wc.id
        LEFT JOIN widget_conversations wconv ON wconv.id = hr.conversation_id
        WHERE (
          REPLACE(REPLACE(wc.handover_whatsapp_number, 'whatsapp:', ''), ' ', '') = $1
          OR REPLACE(REPLACE(wc.handover_whatsapp_number, '+', ''), ' ', '') = REPLACE($1, '+', '')
        )
        ORDER BY hr.created_at DESC
        LIMIT 5
      `, [fromNumber.replace(/[\s\-\(\)]/g, '')]);
      
      console.log(`🔍 Debug: Found ${debugQuery.rows.length} widget(s) with this number:`);
      debugQuery.rows.forEach((row: any, idx: number) => {
        console.log(`  ${idx + 1}. Widget ${row.widget_id}, Conv ${row.conv_id}, Handover: ${row.handover_status}, Method: ${row.requested_method}, Agent Handoff: ${row.agent_handoff}, Status: ${row.conv_status}`);
      });
      
      // Still send 200 to Twilio to acknowledge receipt (empty response prevents "OK" auto-replies)
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Length', '0');
      return res.status(200).end();
    }

    const match = clientResult.rows[0];
    conversationId = match.conversation_id;
    const widgetId = match.widget_id;
    const clientId = match.client_id;
    const enableMultipleChats = match.enable_multiple_whatsapp_chats || false;
    const visitorName = match.visitor_name || `Visitor ${conversationId}`;
    const visitorSessionId = match.visitor_session_id || 'N/A';

    console.log(`✅ Matched conversation ${conversationId} for widget ${widgetId}, client ${clientId}`);
    if (enableMultipleChats) {
      console.log(`💬 Multiple chats enabled - showing visitor: ${visitorName} (Session: ${visitorSessionId.substring(0, 20)}...)`);
    }
    
    // ✅ CHECK FOR EXTENSION REQUEST (before stop command)
    const { ConversationInactivityService } = await import('../services/conversationInactivityService');
    const inactivityService = ConversationInactivityService.getInstance();
    const extensionResult = await inactivityService.handleExtensionRequest(conversationId, messageBody, true);
    
    if (extensionResult.extended) {
      // Extension granted, update activity and return
      await inactivityService.updateActivityTimestamp(conversationId, true);
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Length', '0');
      return res.status(200).end(); // Empty response prevents "OK" auto-replies
    }
    
    // ✅ CHECK FOR "STOP CONVERSATION" COMMAND
    const stopCommands = ['stop conversation', 'end conversation', 'stop', 'end', 'close conversation', 'finish conversation'];
    const isStopCommand = stopCommands.some(cmd => messageBody.toLowerCase().includes(cmd.toLowerCase()));
    
    if (isStopCommand) {
      // ✅ When conversation ends, check for queued handovers
      console.log(`🔄 Conversation ${conversationId} ended - checking for queued WhatsApp handovers`);
      try {
        await HandoverService.processQueuedWhatsAppHandovers(clientId);
      } catch (queueError) {
        console.error('Error processing queued handovers:', queueError);
      }
      console.log(`🛑 Agent requested to end conversation ${conversationId}`);
      
      // Get conversation details for summary
      const convDetails = await pool.query(`
        SELECT wconv.visitor_name, wconv.visitor_email, wconv.created_at, wconv.message_count,
               wc.widget_name, c.client_name, c.client_email
        FROM widget_conversations wconv
        JOIN widget_configs wc ON wc.id = wconv.widget_id
        JOIN clients c ON c.id = wc.client_id
        WHERE wconv.id = $1
      `, [conversationId]);
      
      const conv = convDetails.rows[0];
      
      // Get all messages for summary
      const messagesResult = await pool.query(`
        SELECT message_type, message_text, agent_name, created_at
        FROM widget_messages
        WHERE conversation_id = $1
        ORDER BY created_at ASC
      `, [conversationId]);
      
      // Update conversation status to ended
      await pool.query(`
        UPDATE widget_conversations
        SET 
          status = 'ended',
          agent_handoff = false,
          ended_at = NOW(),
          updated_at = NOW()
        WHERE id = $1
      `, [conversationId]);
      
      // Add system message
      await pool.query(`
        INSERT INTO widget_messages (
          conversation_id,
          message_type,
          message_text,
          created_at
        ) VALUES ($1, 'system', $2, NOW())
      `, [conversationId, '📞 Conversation ended by agent. A summary has been sent to your email.']);
      
      // Generate summary
      const messages = messagesResult.rows;
      const summary = {
        conversationId,
        visitorName: conv.visitor_name || 'Visitor',
        visitorEmail: conv.visitor_email,
        startedAt: conv.created_at,
        messageCount: conv.message_count || messages.length,
        messages: messages.map((m: any) => ({
          type: m.message_type,
          text: m.message_text,
          sender: m.agent_name || (m.message_type === 'user' ? 'You' : 'Bot'),
          time: m.created_at
        }))
      };
      
      // Send summary email to visitor
      if (conv.visitor_email) {
        try {
          const { EmailService } = await import('../services/emailService');
          const emailService = new EmailService();
          await emailService.sendEmail({
            to: conv.visitor_email,
            from: '"WeTechForU Support" <info@wetechforu.com>',
            subject: `📋 Conversation Summary - ${conv.widget_name || 'Chat Support'}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2E86AB;">📋 Conversation Summary</h2>
                <p>Hello ${conv.visitor_name || 'there'},</p>
                <p>Your conversation with our support team has ended. Here's a summary:</p>
                <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p><strong>Conversation ID:</strong> #${conversationId}</p>
                  <p><strong>Started:</strong> ${new Date(conv.created_at).toLocaleString()}</p>
                  <p><strong>Total Messages:</strong> ${summary.messageCount}</p>
                </div>
                <h3>Messages:</h3>
                <div style="max-height: 400px; overflow-y: auto; border: 1px solid #ddd; padding: 15px; border-radius: 5px;">
                  ${summary.messages.map((m: any) => `
                    <div style="margin-bottom: 15px; padding: 10px; background: ${m.type === 'user' ? '#e3f2fd' : '#f5f5f5'}; border-radius: 5px;">
                      <strong>${m.sender}:</strong> ${m.text}
                      <div style="font-size: 12px; color: #666; margin-top: 5px;">${new Date(m.time).toLocaleString()}</div>
                    </div>
                  `).join('')}
                </div>
                <p style="margin-top: 30px;">
                  <a href="https://marketingby.wetechforu.com/review?conversation=${conversationId}" 
                     style="background: #2E86AB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                    ⭐ Rate Your Experience
                  </a>
                </p>
                <p style="color: #666; font-size: 14px; margin-top: 20px;">
                  Thank you for reaching out to us!
                </p>
              </div>
            `,
            text: `Conversation Summary\n\nConversation ID: #${conversationId}\nStarted: ${new Date(conv.created_at).toLocaleString()}\nTotal Messages: ${summary.messageCount}\n\nRate your experience: https://marketingby.wetechforu.com/review?conversation=${conversationId}`
          });
          console.log(`✅ Summary email sent to visitor: ${conv.visitor_email}`);
        } catch (emailError) {
          console.error('❌ Error sending summary email to visitor:', emailError);
        }
      }
      
      // Send summary email to client
      if (conv.client_email) {
        try {
          const { EmailService } = await import('../services/emailService');
          const emailService = new EmailService();
          await emailService.sendEmail({
            to: conv.client_email,
            from: '"WeTechForU Support" <info@wetechforu.com>',
            subject: `📋 Conversation Ended - ${conv.visitor_name || 'Visitor'} - ${conv.widget_name}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2E86AB;">📋 Conversation Summary</h2>
                <p>A conversation has ended on your widget "${conv.widget_name}".</p>
                <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p><strong>Visitor:</strong> ${conv.visitor_name || 'Anonymous'}</p>
                  <p><strong>Email:</strong> ${conv.visitor_email || 'Not provided'}</p>
                  <p><strong>Conversation ID:</strong> #${conversationId}</p>
                  <p><strong>Started:</strong> ${new Date(conv.created_at).toLocaleString()}</p>
                  <p><strong>Total Messages:</strong> ${summary.messageCount}</p>
                </div>
                <p><a href="https://marketingby.wetechforu.com/app/chat-conversations/${conversationId}" 
                     style="background: #2E86AB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                    View Full Conversation →
                  </a></p>
              </div>
            `,
            text: `Conversation Summary\n\nVisitor: ${conv.visitor_name || 'Anonymous'}\nEmail: ${conv.visitor_email || 'Not provided'}\nConversation ID: #${conversationId}\nTotal Messages: ${summary.messageCount}`
          });
          console.log(`✅ Summary email sent to client: ${conv.client_email}`);
        } catch (emailError) {
          console.error('❌ Error sending summary email to client:', emailError);
        }
      }
      
      // ✅ Send WhatsApp message to agent (if WhatsApp handoff was used)
      if (match.handover_whatsapp_number) {
        try {
          const { WhatsAppService } = await import('../services/whatsappService');
          const whatsappService = WhatsAppService.getInstance();
          
          const endMessage = `📞 *Conversation Ended*\n\n` +
            `*Conversation ID:* #${conversationId}\n` +
            `*Widget:* ${match.widget_name || 'Chat Widget'}\n` +
            `*Visitor:* ${visitorName}\n` +
            `*Reason:* Ended by agent\n\n` +
            `A summary has been sent to the visitor (if email provided).\n` +
            `You will receive a detailed summary via email.`;
          
          await whatsappService.sendMessage({
            clientId: clientId,
            widgetId: widgetId,
            conversationId: conversationId,
            toNumber: `whatsapp:${match.handover_whatsapp_number.replace(/^whatsapp:/, '')}`,
            message: endMessage,
            sentByAgentName: 'System',
            visitorName: visitorName
          });
          
          console.log(`✅ Sent WhatsApp end notification to agent for conversation ${conversationId}`);
        } catch (whatsappError) {
          console.error('❌ Error sending WhatsApp end notification:', whatsappError);
        }
      }
      
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Length', '0');
      return res.status(200).end(); // Empty response prevents "OK" auto-replies
    }

    // ✅ IMPORTANT: Set agent_handoff = true when first message is received
    // This ensures the conversation is marked as taken over by agent
    // Also check if this conversation has an assigned WhatsApp number (for separate threading)
    const convResult = await pool.query(`
      SELECT assigned_whatsapp_number, widget_id
      FROM widget_conversations
      WHERE id = $1
    `, [conversationId]);
    
    const assignedNumber = convResult.rows[0]?.assigned_whatsapp_number;
    // widgetId already declared above - reuse it
    
    await pool.query(`
      UPDATE widget_conversations
      SET agent_handoff = true,
          handoff_requested = false,
          updated_at = NOW()
      WHERE id = $1 AND agent_handoff = false
    `, [conversationId]);
    
    // Log if using separate number for this conversation
    if (assignedNumber && assignedNumber !== fromNumber.replace(/[\s\-\(\)]/g, '')) {
      console.log(`📱 Conversation ${conversationId} using separate WhatsApp number: ${assignedNumber} (incoming from: ${fromNumber})`);
    }
    
    // Store agent's WhatsApp message in widget_messages (normal message, not stop command)
    await pool.query(`
      INSERT INTO widget_messages (
        conversation_id,
        message_type,
        message_text,
        agent_name,
        created_at
      ) VALUES ($1, $2, $3, $4, NOW())
    `, [
      conversationId,
      'human', // Agent response
      messageBody,
      'WhatsApp Agent'
    ]);

    // Update conversation to mark agent response
    await pool.query(`
      UPDATE widget_conversations
      SET 
        last_message = $1,
        last_message_at = NOW(),
        last_activity_at = NOW(),
        last_agent_activity_at = NOW(),
        extension_reminders_count = 0,
        message_count = COALESCE(message_count, 0) + 1,
        human_response_count = COALESCE(human_response_count, 0) + 1,
        updated_at = NOW()
      WHERE id = $2
    `, [messageBody.substring(0, 500), conversationId]);
    
    // ✅ Update activity timestamp via service
    await inactivityService.updateActivityTimestamp(conversationId, true);

    // Store in whatsapp_messages table for tracking
    await pool.query(`
      INSERT INTO whatsapp_messages (
        client_id,
        widget_id,
        conversation_id,
        twilio_message_sid,
        message_type,
        message_text,
        sent_by_agent_name,
        sent_at,
        twilio_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), 'received')
    `, [
      clientId,
      widgetId,
      conversationId,
      MessageSid,
      'incoming',
      Body || '',
      'WhatsApp Agent'
    ]);

    // Get visitor info for logging
    const visitorInfo = await pool.query(`
      SELECT visitor_name, visitor_session_id
      FROM widget_conversations
      WHERE id = $1
    `, [conversationId]);
    
    // visitorName already declared above - reuse it, but update if needed
    const currentVisitorName = visitorInfo.rows[0]?.visitor_name || visitorName;
    const sessionId = visitorInfo.rows[0]?.visitor_session_id || 'N/A';
    
    console.log(`✅ Agent WhatsApp message synced to conversation ${conversationId}`);
    console.log(`👤 User: ${currentVisitorName} | Session: ${sessionId.substring(0, 20)}...`);
    console.log(`📊 Message details: ID=${MessageSid}, Text="${messageBody.substring(0, 50)}", Matched by: ${matchedBy}, Type=human, Agent=WhatsApp Agent`);
    
    // Verify message was saved
    const verifyMsg = await pool.query(`
      SELECT id, message_type, message_text, agent_name, created_at
      FROM widget_messages
      WHERE conversation_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `, [conversationId]);
    
    if (verifyMsg.rows.length > 0) {
      console.log(`✅ Verified: Last message in conversation ${conversationId} (${currentVisitorName}):`, {
        id: verifyMsg.rows[0].id,
        type: verifyMsg.rows[0].message_type,
        text: verifyMsg.rows[0].message_text?.substring(0, 30),
        agent: verifyMsg.rows[0].agent_name
      });
    } else {
      console.error(`❌ ERROR: Message was NOT saved to conversation ${conversationId} (${currentVisitorName})!`);
    }

    // ✅ CRITICAL: Return completely empty response (no text, no JSON, no whitespace)
    // Twilio sends "OK" auto-replies if the webhook response contains ANY text or whitespace
    // Empty response = no auto-reply
    res.removeHeader('Content-Type'); // Remove default Content-Type that might add charset
    res.setHeader('Content-Length', '0');
    res.status(200).end(); // End with no body at all
  } catch (error) {
    console.error('❌ Error processing incoming WhatsApp message:', error);
    // Still send 200 to prevent Twilio from retrying - MUST be empty response
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Length', '0');
    res.status(200).end();
  }
});

export default router;

