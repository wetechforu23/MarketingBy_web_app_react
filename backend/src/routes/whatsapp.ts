import express, { Request, Response } from 'express';
import pool from '../config/database';
import { requireAuth } from '../middleware/auth';
import { WhatsAppService } from '../services/whatsappService';

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

    res.sendStatus(200);

  } catch (error) {
    console.error('Error processing WhatsApp webhook:', error);
    res.sendStatus(500);
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
      ErrorMessage
    } = req.body;

    console.log('📱 WhatsApp Status Callback:', {
      MessageSid,
      Status: MessageStatus || SmsStatus,
      To,
      From,
      ErrorCode,
      ErrorMessage
    });

    // Update message status in database
    if (MessageSid && (MessageStatus || SmsStatus)) {
      await whatsappService.updateMessageStatus(
        MessageSid,
        MessageStatus || SmsStatus,
        ErrorCode,
        ErrorMessage
      );
    }

    res.sendStatus(200);

  } catch (error) {
    console.error('WhatsApp status callback error:', error);
    res.sendStatus(500);
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
      NumMedia
    } = req.body;

    console.log('📱 Incoming WhatsApp Message:', {
      MessageSid,
      From,
      To,
      Body: Body?.substring(0, 100),
      NumMedia
    });

    // Normalize phone number (remove whatsapp: prefix if present)
    const normalizePhone = (phone: string): string => {
      return phone.replace(/^whatsapp:/, '').trim();
    };

    const fromNumber = normalizePhone(From);
    const toNumber = normalizePhone(To);

    // Find the client and active conversation by matching the From number
    // The From number should match the client's handover_whatsapp_number
    const clientResult = await pool.query(`
      SELECT DISTINCT wc.id as widget_id, wc.client_id, wc.handover_whatsapp_number,
             hr.conversation_id, hr.id as handover_request_id, hr.created_at
      FROM widget_configs wc
      JOIN handover_requests hr ON hr.widget_id = wc.id
      JOIN widget_conversations wconv ON wconv.id = hr.conversation_id
      WHERE hr.requested_method = 'whatsapp'
        AND hr.status IN ('notified', 'completed')
        AND wconv.status = 'active'
        AND wconv.agent_handoff = true
        AND (
          REPLACE(REPLACE(wc.handover_whatsapp_number, 'whatsapp:', ''), ' ', '') = $1
          OR REPLACE(REPLACE(wc.handover_whatsapp_number, '+', ''), ' ', '') = REPLACE($1, '+', '')
        )
      ORDER BY hr.created_at DESC
      LIMIT 1
    `, [fromNumber.replace(/[\s\-\(\)]/g, '')]);

    if (clientResult.rows.length === 0) {
      console.log(`⚠️ No active WhatsApp handover found for number: ${fromNumber}`);
      // Still send 200 to Twilio to acknowledge receipt
      return res.sendStatus(200);
    }

    const match = clientResult.rows[0];
    const conversationId = match.conversation_id;
    const widgetId = match.widget_id;
    const clientId = match.client_id;

    console.log(`✅ Matched conversation ${conversationId} for widget ${widgetId}, client ${clientId}`);

    // Store agent's WhatsApp message in widget_messages
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
      Body || '',
      'WhatsApp Agent'
    ]);

    // Update conversation to mark agent response
    await pool.query(`
      UPDATE widget_conversations
      SET 
        last_message = $1,
        last_message_at = NOW(),
        last_activity_at = NOW(),
        message_count = COALESCE(message_count, 0) + 1,
        human_response_count = COALESCE(human_response_count, 0) + 1,
        updated_at = NOW()
      WHERE id = $2
    `, [Body?.substring(0, 500) || '', conversationId]);

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

    console.log(`✅ Agent WhatsApp message synced to conversation ${conversationId}`);

    res.sendStatus(200);
  } catch (error) {
    console.error('❌ Error processing incoming WhatsApp message:', error);
    // Still send 200 to prevent Twilio from retrying
    res.sendStatus(200);
  }
});

export default router;

