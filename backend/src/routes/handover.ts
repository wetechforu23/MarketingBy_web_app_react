import express from 'express';
import HandoverService from '../services/handoverService';
import pool from '../config/database';

const router = express.Router();

/**
 * GET /api/handover/config/:widgetId
 * Get handover configuration for a widget
 */
router.get('/config/:widgetId', async (req, res) => {
  try {
    const { widgetId } = req.params;
    const config = await HandoverService.getHandoverConfig(parseInt(widgetId));
    res.json(config);
  } catch (error: any) {
    console.error('Error getting handover config:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/handover/config/client/:clientId
 * Get handover WhatsApp number for a client
 */
router.get('/config/client/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    const result = await pool.query(
      'SELECT id, client_id, handover_whatsapp_number, whatsapp_handover_content_sid, widget_name FROM widget_configs WHERE client_id = $1 LIMIT 1',
      [parseInt(clientId)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Widget config not found for this client' });
    }

    res.json({
      widget_id: result.rows[0].id,
      client_id: result.rows[0].client_id,
      handover_whatsapp_number: result.rows[0].handover_whatsapp_number || '',
      whatsapp_handover_content_sid: result.rows[0].whatsapp_handover_content_sid || '',
      widget_name: result.rows[0].widget_name
    });
  } catch (error: any) {
    console.error('Error getting client handover config:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/handover/config/client/:clientId
 * Update handover WhatsApp number for a client
 */
router.put('/config/client/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    const { handover_whatsapp_number, whatsapp_handover_content_sid } = req.body;

    const result = await pool.query(
      'UPDATE widget_configs SET handover_whatsapp_number = $1, whatsapp_handover_content_sid = $2 WHERE client_id = $3 RETURNING id, client_id, handover_whatsapp_number, whatsapp_handover_content_sid, widget_name',
      [handover_whatsapp_number || null, whatsapp_handover_content_sid || null, parseInt(clientId)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Widget config not found for this client' });
    }

    res.json({
      success: true,
      widget_id: result.rows[0].id,
      client_id: result.rows[0].client_id,
      handover_whatsapp_number: result.rows[0].handover_whatsapp_number,
      whatsapp_handover_content_sid: result.rows[0].whatsapp_handover_content_sid,
      widget_name: result.rows[0].widget_name
    });
  } catch (error: any) {
    console.error('Error updating client handover config:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/handover/config/:widgetId
 * Update handover configuration for a widget
 */
router.put('/config/:widgetId', async (req, res) => {
  try {
    const { widgetId } = req.params;
    const config = req.body;
    
    const result = await HandoverService.updateHandoverConfig(parseInt(widgetId), config);
    res.json(result);
  } catch (error: any) {
    console.error('Error updating handover config:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/handover/request
 * Create a new handover request
 * PUBLIC ENDPOINT - called from chat widget
 */
router.post('/request', async (req, res) => {
  try {
    const {
      conversation_id,
      widget_id,
      client_id,
      requested_method,
      visitor_name,
      visitor_email,
      visitor_phone,
      visitor_message
    } = req.body;

    // Validation
    if (!conversation_id || !widget_id || !requested_method) {
      return res.status(400).json({ 
        error: 'Missing required fields: conversation_id, widget_id, requested_method' 
      });
    }

    // Normalize numeric IDs
    const convId = conversation_id !== undefined && conversation_id !== null && String(conversation_id).trim() !== ''
      ? parseInt(String(conversation_id), 10)
      : null;
    const wid = widget_id !== undefined && widget_id !== null && String(widget_id).trim() !== ''
      ? parseInt(String(widget_id), 10)
      : null;

    // Get client_id from widget_id if not provided
    let finalClientId = client_id !== undefined && client_id !== null && String(client_id).trim() !== ''
      ? parseInt(String(client_id), 10)
      : null;
    if (!finalClientId) {
      const widgetResult = await pool.query(
        'SELECT client_id FROM widget_configs WHERE id = $1::integer',
        [wid]
      );
      if (widgetResult.rows.length > 0) {
        finalClientId = widgetResult.rows[0].client_id;
      }
    }

    if (!finalClientId) {
      return res.status(400).json({ 
        error: 'Could not determine client_id from widget_id' 
      });
    }

    // Validate method
    const validMethods = ['portal', 'whatsapp', 'email', 'phone', 'webhook'];
    if (!validMethods.includes(requested_method)) {
      return res.status(400).json({ 
        error: `Invalid method. Must be one of: ${validMethods.join(', ')}` 
      });
    }

    // Method-specific validation
    if (requested_method === 'email' && !visitor_email) {
      return res.status(400).json({ error: 'Email address required for email handover' });
    }

    // Phone handover still requires visitor phone (SMS to visitor)
    if (requested_method === 'phone' && !visitor_phone) {
      return res.status(400).json({ error: 'Phone number required for Phone handover' });
    }

    // WhatsApp handover no longer requires visitor_phone 
    // (notifications go to CLIENT's WhatsApp number, not visitor's)
    // visitor_phone is optional but recommended to include in the notification message

    const result = await HandoverService.createHandoverRequest({
      conversation_id: convId,
      widget_id: wid,
      client_id: finalClientId,
      requested_method,
      visitor_name,
      visitor_email,
      visitor_phone,
      visitor_message
    });

    res.json(result);
  } catch (error: any) {
    console.error('Error creating handover request:', error);
    // Surface PG detail when available to diagnose type issues fast
    const pgDetail = error?.detail || error?.hint || error?.message;
    res.status(500).json({ error: pgDetail || 'Internal error' });
  }
});

/**
 * GET /api/handover/analytics
 * Get handover analytics
 * Optional query params: clientId, widgetId, days
 */
router.get('/analytics', async (req, res) => {
  try {
    const { clientId, widgetId, days } = req.query;
    
    const analytics = await HandoverService.getHandoverAnalytics(
      clientId ? parseInt(clientId as string) : undefined,
      widgetId ? parseInt(widgetId as string) : undefined,
      days ? parseInt(days as string) : 30
    );

    res.json(analytics);
  } catch (error: any) {
    console.error('Error getting handover analytics:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/handover/test-webhook
 * Test webhook configuration
 */
router.post('/test-webhook', async (req, res) => {
  try {
    const { webhook_url, webhook_secret } = req.body;

    if (!webhook_url) {
      return res.status(400).json({ error: 'webhook_url is required' });
    }

    // Send test payload
    const axios = (await import('axios')).default;
    const crypto = (await import('crypto')).default;

    const testPayload = {
      event: 'test_webhook',
      timestamp: new Date().toISOString(),
      message: 'This is a test webhook from MarketingBy'
    };

    const headers: any = {
      'Content-Type': 'application/json',
      'User-Agent': 'MarketingBy-ChatBot/1.0'
    };

    if (webhook_secret) {
      const signature = crypto
        .createHmac('sha256', webhook_secret)
        .update(JSON.stringify(testPayload))
        .digest('hex');
      headers['X-MarketingBy-Signature'] = signature;
    }

    const response = await axios.post(webhook_url, testPayload, {
      headers,
      timeout: 10000
    });

    res.json({
      success: true,
      message: 'Webhook test successful',
      status_code: response.status,
      response: response.data
    });
  } catch (error: any) {
    console.error('Webhook test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.response?.data || 'No response from webhook'
    });
  }
});

/**
 * POST /api/handover/test-whatsapp
 * Test WhatsApp handover notification
 */
router.post('/test-whatsapp', async (req, res) => {
  try {
    const { client_id, phone_number } = req.body;

    if (!client_id) {
      return res.status(400).json({ error: 'client_id is required' });
    }

    if (!phone_number) {
      return res.status(400).json({ error: 'phone_number is required' });
    }

    // Get widget for this client
    const widgetResult = await pool.query(
      'SELECT id, widget_name FROM widget_configs WHERE client_id = $1 LIMIT 1',
      [parseInt(client_id)]
    );

    if (widgetResult.rows.length === 0) {
      return res.status(404).json({ error: 'No widget found for this client' });
    }

    const widgetId = widgetResult.rows[0].id;
    const widgetName = widgetResult.rows[0].widget_name || 'Test Widget';

    // Normalize phone number
    const normalizeWhatsAppNumber = (raw: string): string => {
      let s = (raw || '').toString().trim();
      if (s.startsWith('whatsapp:')) {
        s = s.substring(9);
      }
      s = s.replace(/\s|\(|\)|-|\./g, '');
      
      const digitsOnly = s.replace(/\+/g, '');
      if (digitsOnly.length < 10) {
        throw new Error(`Invalid phone number: ${raw} (too short)`);
      }
      
      if (!s.startsWith('+')) {
        if (digitsOnly.length === 10 || digitsOnly.length === 11) {
          s = '+1' + digitsOnly.replace(/^1/, '');
        } else {
          throw new Error(`Invalid phone number format: ${raw}`);
        }
      }
      
      return `whatsapp:${s}`;
    };

    const normalizedNumber = normalizeWhatsAppNumber(phone_number);

    // Send test TEMPLATE message via WhatsApp Service (avoids 24h window issues)
    const { WhatsAppService } = await import('../services/whatsappService');
    const whatsappService = WhatsAppService.getInstance();

    const result = await whatsappService.sendTemplateMessage({
      clientId: parseInt(client_id),
      widgetId: widgetId,
      conversationId: 0,
      toNumber: normalizedNumber.replace('whatsapp:', ''),
      templateType: 'handover',
      variables: {
        client_name: `Client ${client_id}`,
        widget_name: widgetName,
        conversation_id: 'TEST',
        visitor_name: 'Test User',
        visitor_phone: phone_number,
        visitor_email: 'test@example.com',
        visitor_message: 'This is a test of WhatsApp handover notifications.'
      }
    });

    res.json({
      success: true,
      message: 'Test WhatsApp message sent successfully',
      messageSid: result.messageSid,
      status: result.status,
      to: phone_number,
      normalized: normalizedNumber
    });
  } catch (error: any) {
    console.error('WhatsApp test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.stack
    });
  }
});

export default router;

