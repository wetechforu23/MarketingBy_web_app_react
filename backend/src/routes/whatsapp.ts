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

    // Log full request body for debugging
    console.log('📱 Incoming WhatsApp Message (FULL):', JSON.stringify(req.body, null, 2));
    
    console.log('📱 Incoming WhatsApp Message (SUMMARY):', {
      MessageSid,
      From,
      To,
      Body: Body?.substring(0, 100),
      NumMedia,
      InReplyTo, // Log if this is a reply
      AllKeys: Object.keys(req.body) // Show all fields Twilio sends
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
    
    // ✅ Check for InReplyTo in multiple possible field names (Twilio may use different names)
    // Twilio WhatsApp uses "OriginalRepliedMessageSid" when agent replies to a message
    const inReplyToValue = InReplyTo || 
                           req.body.OriginalRepliedMessageSid || 
                           req.body.InReplyToMessageSid || 
                           req.body.ReferencedMessageSid || 
                           req.body.ReferencedMessage?.Sid;
    
    if (inReplyToValue) {
      const fieldName = InReplyTo ? 'InReplyTo' : 
                       req.body.OriginalRepliedMessageSid ? 'OriginalRepliedMessageSid' :
                       req.body.InReplyToMessageSid ? 'InReplyToMessageSid' : 
                       req.body.ReferencedMessageSid ? 'ReferencedMessageSid' : 
                       'ReferencedMessage.Sid';
      console.log(`📎 Agent replied to message: ${inReplyToValue} (from field: ${fieldName})`);
      
      // Look up which conversation this message belongs to
      // Try multiple SID formats and patterns
      // Note: OriginalRepliedMessageSid may be MM (template) or SM (message) format
      const replyToResult = await pool.query(`
        SELECT conversation_id, widget_id, client_id, message_body, twilio_message_sid, direction, sent_at
        FROM whatsapp_messages
        WHERE twilio_message_sid = $1
           OR twilio_message_sid = $2
           OR twilio_message_sid LIKE $3
           OR twilio_message_sid LIKE $4
           OR twilio_message_sid LIKE $5
           OR (twilio_message_sid LIKE 'SM%' AND twilio_message_sid LIKE '%' || $6 || '%')
           OR (twilio_message_sid LIKE 'MM%' AND twilio_message_sid LIKE '%' || $6 || '%')
        ORDER BY sent_at DESC
        LIMIT 5
      `, [
        inReplyToValue, // Exact match
        inReplyToValue.replace(/^whatsapp:/, ''), // Without whatsapp: prefix
        inReplyToValue + '%', // Starts with
        '%' + inReplyToValue + '%', // Contains
        inReplyToValue.replace(/^MM/, 'SM'), // Try SM instead of MM
        inReplyToValue.substring(inReplyToValue.length - 10) // Last 10 chars for partial match
      ]);
      
      console.log(`🔍 Lookup result for ${inReplyToValue}: Found ${replyToResult.rows.length} matches`);
      if (replyToResult.rows.length > 0) {
        replyToResult.rows.forEach((row, idx) => {
          console.log(`  Match ${idx + 1}: Conversation ${row.conversation_id}, SID: ${row.twilio_message_sid}, Message: "${row.message_body?.substring(0, 50)}"`);
        });
      }
      
      if (replyToResult.rows.length > 0) {
        // Use the most recent match
        const matchedMessage = replyToResult.rows[0];
        conversationId = matchedMessage.conversation_id;
        matchedBy = 'whatsapp_reply';
        
        console.log(`✅ Matched via WhatsApp reply: Conversation ${conversationId}, original message: "${matchedMessage.message_body?.substring(0, 50)}", direction: ${matchedMessage.direction}, stored SID: ${matchedMessage.twilio_message_sid}`);
        
        // Remove reply context from message body if present (WhatsApp sometimes includes it)
        // WhatsApp replies may include: "> Original message\nYour reply"
        if (messageBody.includes('>')) {
          const lines = messageBody.split('\n');
          messageBody = lines.filter(line => !line.trim().startsWith('>')).join('\n').trim();
        }
      } else {
        // Try to find recent messages from active conversations for this WhatsApp number
        console.log(`⚠️ Could not find exact match for ${inReplyToValue}, trying to find recent messages...`);
        
        const recentMessagesResult = await pool.query(`
          SELECT DISTINCT wm.conversation_id, wm.widget_id, wm.client_id, wm.message_body, wm.twilio_message_sid, wm.sent_at
          FROM whatsapp_messages wm
          JOIN widget_configs wc ON wc.id = wm.widget_id
          WHERE wm.direction = 'outbound'
            AND wm.sent_at > NOW() - INTERVAL '2 hours'
            AND (
              REPLACE(REPLACE(wc.handover_whatsapp_number, 'whatsapp:', ''), ' ', '') = $1
              OR REPLACE(REPLACE(wc.handover_whatsapp_number, '+', ''), ' ', '') = REPLACE($1, '+', '')
            )
          ORDER BY wm.sent_at DESC
          LIMIT 10
        `, [fromNumber.replace(/[\s\-\(\)]/g, '')]);
        
        console.log(`🔍 Found ${recentMessagesResult.rows.length} recent outbound messages for this WhatsApp number`);
        
        if (recentMessagesResult.rows.length > 0) {
          // Use the most recent message (most likely what they're replying to)
          const recentMessage = recentMessagesResult.rows[0];
          conversationId = recentMessage.conversation_id;
          matchedBy = 'whatsapp_reply';
          console.log(`💡 Using most recent message: Conversation ${conversationId}, SID: ${recentMessage.twilio_message_sid}, Message: "${recentMessage.message_body?.substring(0, 50)}"`);
        } else {
          console.log(`❌ Could not find conversation for replied message ${inReplyToValue} - message will be blocked`);
        }
      }
    }

    // ✅ PRIORITY 2: Try to parse conversation ID, user name, or session ID from message (if not matched via reply)
    // Support multiple formats:
    // - Conversation ID: "#123: message", "#123 message", "#123message", "#123"
    // - User name: "@John Doe: message", "@John: message"
    // - Session ID: "@visitor_abc123: message", "@visitor_abc123def456: message"
    
    // ✅ VALIDATION: Check if message is in a valid format (reply or ID-based)
    // Only try these if we didn't match via WhatsApp reply
    let messageIsValidFormat = false;
    if (inReplyToValue && conversationId) {
      // Only valid if we successfully found the conversation for the reply
      messageIsValidFormat = true;
      console.log(`✅ Message format is valid: Reply detected and conversation matched`);
    } else if (inReplyToValue && !conversationId) {
      // Reply was attempted but conversation not found - log warning
      console.log(`⚠️ InReplyTo found (${inReplyToValue}) but conversation lookup failed - message will be blocked`);
    } else {
      console.log(`⚠️ No InReplyTo detected - message will be blocked if no conversation matched`);
    }
    
    // ✅ REMOVED: Conversation ID, user name, and session ID formats are no longer supported
    // Only replying to bot messages (InReplyTo) is allowed
    // This ensures agents always reply to specific bot messages
    
    // ✅ VALIDATION: If message doesn't match any valid format, check active conversations
    if (!messageIsValidFormat && !conversationId) {
      // Check if multiple chats are enabled
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
      
      // Get active conversations
      const activeConversations = await pool.query(`
        SELECT DISTINCT wconv.id, wconv.visitor_name, wconv.visitor_session_id, 
               wconv.last_activity_at
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
        ORDER BY wconv.last_activity_at DESC NULLS LAST, wconv.id DESC
        LIMIT 5
      `, [fromNumber.replace(/[\s\-\(\)]/g, '')]);
      
      // ✅ STRICT MODE: Only allow messages when replying (InReplyTo must be present)
      // Agents cannot type regular messages - must reply to bot messages only
      if (!inReplyToValue) {
        // Multiple conversations - must use reply feature
        const { WhatsAppService } = await import('../services/whatsappService');
        const whatsappService = WhatsAppService.getInstance();
        
        let warningMessage = `❌ *Agent cannot type message here*\n\n`;
        warningMessage += `📎 *Please select a bot message and reply to it*\n\n`;
        
        if (activeConversations.rows.length > 0) {
          if (activeConversations.rows.length > 1) {
            warningMessage += `*Active: ${activeConversations.rows.length} conversations*\n`;
            warningMessage += `Reply to the bot message from the conversation you want to respond to.`;
          } else {
            warningMessage += `Reply to any bot message to continue.`;
          }
        } else {
          warningMessage += `No active conversations.`;
        }
        
        try {
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
              widgetId: widgetId,
              conversationId: activeConversations.rows[0]?.id || null,
              toNumber: `whatsapp:${fromNumber}`,
              message: warningMessage,
              sentByAgentName: 'System',
              visitorName: 'Agent'
            });
            
            console.log(`⚠️ Sent invalid format warning to agent`);
            
            // Return empty response - message was not processed
            res.removeHeader('Content-Type');
            res.setHeader('Content-Length', '0');
            return res.status(200).end();
          }
        } catch (warningError) {
          console.error('Error sending format warning:', warningError);
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
      
      // Check if message is a command (deactivate/active)
      const messageLower = messageBody.toLowerCase().trim();
      const isDeactivateCommand = messageLower === 'deactivate' || messageLower === 'deactive';
      const isActivateCommand = messageLower === 'active' || messageLower === 'activate';
      
      if (enableMultipleChats) {
        // Multiple chats enabled but no conversation ID - send informative message
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
          ORDER BY wconv.last_activity_at DESC NULLS LAST, wconv.id DESC
          LIMIT 10
        `, [fromNumber.replace(/[\s\-\(\)]/g, '')]);
        
        // Check if this is a command (deactivate/active) without conversation ID
        if (isDeactivateCommand || isActivateCommand) {
          // Handle deactivate/active command - needs conversation ID
          const { WhatsAppService } = await import('../services/whatsappService');
          const whatsappService = WhatsAppService.getInstance();
          
          let conversationsList = activeConversations.rows.map((conv: any, idx: number) => {
            const visitorName = conv.visitor_name || `Visitor ${conv.id}`;
            return `${idx + 1}. *${visitorName}* - ID: #${conv.id}`;
          }).join('\n');
          
          const infoMessage = `⚠️ *Command Received*\n\n` +
            `To ${isDeactivateCommand ? 'deactivate' : 'activate'} a conversation, please specify the conversation ID:\n\n` +
            `*Format:*\n` +
            `\`#<conversation_id>: ${messageLower}\`\n\n` +
            `*Example:*\n` +
            `\`#${activeConversations.rows[0]?.id || 'ID'}: ${messageLower}\`\n\n` +
            `*Active Conversations:*\n${conversationsList}`;
          
          try {
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
                widgetId: widgetId,
                conversationId: null,
                toNumber: `whatsapp:${fromNumber}`,
                message: infoMessage,
                sentByAgentName: 'System',
                visitorName: 'Agent'
              });
              
              return res.status(200).json({ 
                success: false, 
                message: 'Command requires conversation ID',
                info_sent: true 
              });
            }
          } catch (error) {
            console.error('Error sending command info:', error);
          }
        }
        
        if (activeConversations.rows.length > 1) {
          // Multiple conversations - send warning and return early
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
          
          const warningMessage = `📱 *Multiple Chat Compatible Solution*\n\n` +
            `This WhatsApp number supports multiple simultaneous conversations. To reply to a specific user, you must specify which conversation you're responding to.\n\n` +
            `*Active Conversations:*\n${conversationsList}\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `*TO REPLY TO A USER, use ONE of these formats:*\n\n` +
            `1️⃣ By Conversation ID:\n` +
            `\`#${firstConv.id}: your message\`\n\n` +
            `2️⃣ By User Name:\n` +
            `\`@${firstName}: your message\`\n\n` +
            `3️⃣ By Session ID:\n` +
            `\`@${firstSession}: your message\`\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `*CONVERSATION COMMANDS:*\n\n` +
            `• To deactivate a conversation:\n` +
            `\`#<conversation_id>: deactivate\`\n\n` +
            `• To activate a conversation:\n` +
            `\`#<conversation_id>: active\`\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `❌ Your message "${messageBody}" was NOT delivered.\n` +
            `✅ Please resend using one of the formats above to reply to a specific user.`;
          
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
                widgetId: widgetId,
                conversationId: activeConversations.rows[0]?.id || null,
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
        } else if (activeConversations.rows.length === 1) {
          // Only one active conversation - but still require agent to reply to specific message or use conversation ID
          // This ensures agents always reply to individual conversations, not start new messages
          const { WhatsAppService } = await import('../services/whatsappService');
          const whatsappService = WhatsAppService.getInstance();
          
          const firstConv = activeConversations.rows[0];
          const firstName = firstConv.visitor_name || `Visitor ${firstConv.id}`;
          
          const warningMessage = `❌ *New Messages Not Allowed*\n\n` +
            `You cannot start a new message. You must reply to individual bot messages.\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `*TO REPLY TO THIS USER (REQUIRED):*\n\n` +
            `📎 *Reply to a bot message* (Long-press any message from chat bot and reply)\n\n` +
            `This automatically applies your message to conversation #${firstConv.id}.\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `*Active Conversation:*\n` +
            `👤 *${firstName}*\n` +
            `🆔 Conversation ID: #${firstConv.id}\n\n` +
            `⚠️ Your message "${messageBody}" was NOT delivered.\n` +
            `✅ Please reply to a bot message from this conversation.`;
          
          try {
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
                widgetId: widgetId,
                conversationId: firstConv.id,
                toNumber: `whatsapp:${fromNumber}`,
                message: warningMessage,
                sentByAgentName: 'System',
                visitorName: 'Agent'
              });
              
              console.log(`⚠️ Sent new message not allowed warning - agent must reply to individual conversation`);
              
              // Return empty response - message was not processed
              res.removeHeader('Content-Type');
              res.setHeader('Content-Length', '0');
              return res.status(200).end();
            }
          } catch (warningError) {
            console.error('Error sending warning:', warningError);
            // Still return to prevent message delivery
            res.removeHeader('Content-Type');
            res.setHeader('Content-Length', '0');
            return res.status(200).end();
          }
        }
      }
      
      // ✅ STRICT MODE: If no conversation ID and no valid format, block the message
      // This ensures agents can ONLY reply to individual conversations, never start new messages
      if (!conversationId && !messageIsValidFormat) {
        console.log(`❌ Agent tried to send message without conversation identifier - blocking delivery`);
        
        const { WhatsAppService } = await import('../services/whatsappService');
        const whatsappService = WhatsAppService.getInstance();
        
        // Get active conversations to show in warning
        const activeConversations = await pool.query(`
          SELECT DISTINCT wconv.id, wconv.visitor_name, wconv.visitor_session_id, 
                 wconv.last_activity_at
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
          ORDER BY wconv.last_activity_at DESC NULLS LAST, wconv.id DESC
          LIMIT 5
        `, [fromNumber.replace(/[\s\-\(\)]/g, '')]);
        
        let warningMessage = `❌ *New Messages Not Allowed*\n\n` +
          `You cannot start a new message. You must reply to individual bot messages.\n\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `*TO REPLY TO A USER (REQUIRED):*\n\n` +
          `📎 *Reply to a bot message* (Long-press any message from chat bot and reply)\n\n`;
        
        if (activeConversations.rows.length > 0) {
          const firstConv = activeConversations.rows[0];
          const firstName = firstConv.visitor_name || `Visitor ${firstConv.id}`;
          
          warningMessage += `This automatically applies your message to the correct conversation.\n\n`;
          
          if (activeConversations.rows.length > 1) {
            warningMessage += `*Active Conversations:*\n`;
            activeConversations.rows.slice(0, 3).forEach((conv: any, idx: number) => {
              const visitorName = conv.visitor_name || `Visitor ${conv.id}`;
              warningMessage += `${idx + 1}. *${visitorName}* - Conversation #${conv.id}\n`;
            });
            warningMessage += `\n`;
            warningMessage += `💡 *Tip:* Reply to any bot message from the conversation you want to respond to.\n\n`;
          } else {
            warningMessage += `*Active Conversation:*\n` +
              `👤 *${firstName}*\n` +
              `🆔 Conversation ID: #${firstConv.id}\n\n`;
          }
        } else {
          warningMessage += `⚠️ No active conversations found.\n\n` +
            `Please wait for a visitor to start a chat first.`;
        }
        
        warningMessage += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `⚠️ Your message "${messageBody}" was NOT delivered.\n` +
          `✅ Please reply to a bot message from the conversation you want to respond to.`;
        
        try {
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
              widgetId: widgetId,
              conversationId: activeConversations.rows[0]?.id || null,
              toNumber: `whatsapp:${fromNumber}`,
              message: warningMessage,
              sentByAgentName: 'System',
              visitorName: 'Agent'
            });
            
            console.log(`⚠️ Blocked new message - agent must reply to individual conversation`);
          }
        } catch (warningError) {
          console.error('Error sending warning:', warningError);
        }
        
        // Return empty response - message was not processed
        res.removeHeader('Content-Type');
        res.setHeader('Content-Length', '0');
        return res.status(200).end();
      }
      
      // No conversation ID specified - this should not happen if validation worked correctly
      // But if it does, we need to find the conversation
      if (!conversationId) {
        console.log(`⚠️ No conversation ID found but validation passed - this should not happen`);
        // Still send 200 to prevent Twilio retries
        res.removeHeader('Content-Type');
        res.setHeader('Content-Length', '0');
        return res.status(200).end();
      }
      
      // Find the conversation by ID
      // ✅ IMPORTANT: For WhatsApp replies, also check if conversation exists even without handover_request
      // This handles cases where agent replies to a bot message that was sent directly
      if (matchedBy === 'whatsapp_reply' && conversationId) {
        // Try to find conversation directly (more flexible for replies)
        clientResult = await pool.query(`
          SELECT DISTINCT wc.id as widget_id, wc.client_id, wc.handover_whatsapp_number,
                 $1::integer as conversation_id, NULL::integer as handover_request_id, NOW() as created_at,
                 wc.enable_multiple_whatsapp_chats, wconv.visitor_name, wconv.visitor_session_id,
                 wconv.last_activity_at, wconv.id
          FROM widget_configs wc
          JOIN widget_conversations wconv ON wconv.widget_id = wc.id
          WHERE wconv.id = $1
            AND wconv.status = 'active'
            AND (
              REPLACE(REPLACE(wc.handover_whatsapp_number, 'whatsapp:', ''), ' ', '') = $2
              OR REPLACE(REPLACE(wc.handover_whatsapp_number, '+', ''), ' ', '') = REPLACE($2, '+', '')
            )
          LIMIT 1
        `, [conversationId, fromNumber.replace(/[\s\-\(\)]/g, '')]);
        
        if (clientResult.rows.length === 0) {
          console.log(`⚠️ Conversation ${conversationId} found via reply but not active or doesn't match WhatsApp number - trying handover_request lookup`);
        }
      }
      
      // If lookup via direct conversation failed, try via handover_request
      if (clientResult.rows.length === 0) {
        clientResult = await pool.query(`
          SELECT DISTINCT wc.id as widget_id, wc.client_id, wc.handover_whatsapp_number,
                 hr.conversation_id, hr.id as handover_request_id, hr.created_at,
                 wc.enable_multiple_whatsapp_chats, wconv.visitor_name, wconv.visitor_session_id,
                 wconv.last_activity_at, wconv.id
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
      }
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
    
    // ✅ CHECK FOR DEACTIVATE/ACTIVATE COMMANDS
    // Works when replying to a bot message (InReplyTo) OR when conversation is auto-matched
    const messageBodyLower = messageBody.toLowerCase().trim();
    const isStopCommand = messageBodyLower === 'stop conversation' || 
                         messageBodyLower === 'deactivate' || 
                         messageBodyLower === 'deactive' ||
                         messageBodyLower === 'end conversation' ||
                         messageBodyLower === 'end' ||
                         messageBodyLower === 'stop' ||
                         messageBodyLower === 'close conversation' ||
                         messageBodyLower === 'finish conversation';
    const isActivateCommand = messageBodyLower === 'active' || messageBodyLower === 'activate';
    
    // ✅ Allow commands ONLY when replying to a bot message (InReplyTo must be present)
    if ((isStopCommand || isActivateCommand) && conversationId && matchedBy === 'whatsapp_reply') {
      const targetConvId = conversationId;
      const isDeactivate = isStopCommand;
      
      console.log(`📎 Agent replied to bot message with ${isDeactivate ? 'deactivate' : 'activate'} command for conversation ${targetConvId}`);
      
      // Verify this conversation belongs to this client
      const convCheck = await pool.query(`
        SELECT wconv.id, wconv.status, wc.client_id
        FROM widget_conversations wconv
        JOIN widget_configs wc ON wc.id = wconv.widget_id
        WHERE wconv.id = $1 AND wc.client_id = $2
      `, [targetConvId, clientId]);
      
      if (convCheck.rows.length > 0) {
        const newStatus = isDeactivate ? 'ended' : 'active';
        await pool.query(`
          UPDATE widget_conversations
          SET status = $1, 
              agent_handoff = CASE WHEN $3 THEN false ELSE agent_handoff END,
              ended_at = CASE WHEN $3 THEN NOW() ELSE ended_at END,
              updated_at = NOW()
          WHERE id = $2
        `, [newStatus, targetConvId, isDeactivate]);
        
        const { WhatsAppService } = await import('../services/whatsappService');
        const whatsappService = WhatsAppService.getInstance();
        
        const confirmationMessage = `✅ #${targetConvId} ${isDeactivate ? 'ended' : 'active'}`;
        
        await whatsappService.sendMessage({
          clientId: clientId,
          widgetId: widgetId,
          conversationId: targetConvId,
          toNumber: `whatsapp:${fromNumber}`,
          message: confirmationMessage,
          sentByAgentName: 'System',
          visitorName: 'Agent'
        });
        
        // ✅ Add message to chat widget when conversation is stopped/ended
        if (isDeactivate) {
          await pool.query(`
            INSERT INTO widget_messages (conversation_id, message_type, message_text, created_at)
            VALUES ($1, 'system', $2, NOW())
          `, [targetConvId, '⚠️ We are stopping this session due to a system issue. Please start a new conversation if you need further assistance.']);
        }
        
        console.log(`✅ Conversation ${targetConvId} ${isDeactivate ? 'deactivated' : 'activated'} by agent`);
        
        // If deactivated, also check for queued handovers
        if (isDeactivate) {
          try {
            const { HandoverService } = await import('../services/handoverService');
            await HandoverService.processQueuedWhatsAppHandovers(clientId);
          } catch (queueError) {
            console.error('Error processing queued handovers:', queueError);
          }
        }
        
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Length', '0');
        return res.status(200).end();
      } else {
        // Conversation not found or doesn't belong to this client
        const { WhatsAppService } = await import('../services/whatsappService');
        const whatsappService = WhatsAppService.getInstance();
        
        await whatsappService.sendMessage({
          clientId: clientId,
          widgetId: widgetId,
          conversationId: conversationId,
          toNumber: `whatsapp:${fromNumber}`,
          message: `❌ Conversation #${targetConvId} not found or doesn't belong to your client.`,
          sentByAgentName: 'System',
          visitorName: 'Agent'
        });
        
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Length', '0');
        return res.status(200).end();
      }
    }
    
    // ✅ REMOVED: Duplicate stop command check - already handled above
    // Commands are now only processed when replying to bot messages in the section above
    
    // ✅ PROCESS REGULAR MESSAGES (when replying to bot messages)
    // If we get here, the message is a regular message (not a command) and should be delivered

    // ✅ IMPORTANT: Set agent_handoff = true when first message is received
    // This ensures the conversation is marked as taken over by agent
    // Note: assigned_whatsapp_number column may not exist in all database schemas
    // widgetId already declared above - reuse it
    
    // Log if this was a reply to a bot message
    if (matchedBy === 'whatsapp_reply') {
      console.log(`📎 Agent replied to bot message - message will be delivered to conversation ${conversationId}`);
    }
    
    await pool.query(`
      UPDATE widget_conversations
      SET agent_handoff = true,
          handoff_requested = false,
          updated_at = NOW()
      WHERE id = $1 AND agent_handoff = false
    `, [conversationId]);
    
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
    // Update conversation - use COALESCE for columns that may not exist
    await pool.query(`
      UPDATE widget_conversations
      SET 
        last_message = $1,
        last_message_at = NOW(),
        last_activity_at = NOW(),
        extension_reminders_count = COALESCE(extension_reminders_count, 0),
        message_count = COALESCE(message_count, 0) + 1,
        human_response_count = COALESCE(human_response_count, 0) + 1,
        updated_at = NOW()
      WHERE id = $2
    `, [messageBody.substring(0, 500), conversationId]);
    
    // Try to update last_agent_activity_at if column exists (separate query to avoid errors)
    try {
      await pool.query(`
        UPDATE widget_conversations
        SET last_agent_activity_at = NOW()
        WHERE id = $1
      `, [conversationId]);
    } catch (columnError: any) {
      // Column doesn't exist - ignore (this is OK for older schema versions)
      if (columnError.code !== '42703') {
        // Only ignore column not found errors, re-throw others
        throw columnError;
      }
    }
    
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

