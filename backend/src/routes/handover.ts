import express from 'express';
import HandoverService from '../services/handoverService';

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
    if (!conversation_id || !widget_id || !client_id || !requested_method) {
      return res.status(400).json({ 
        error: 'Missing required fields: conversation_id, widget_id, client_id, requested_method' 
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

    if ((requested_method === 'whatsapp' || requested_method === 'phone') && !visitor_phone) {
      return res.status(400).json({ error: 'Phone number required for WhatsApp/Phone handover' });
    }

    const result = await HandoverService.createHandoverRequest({
      conversation_id: parseInt(conversation_id),
      widget_id: parseInt(widget_id),
      client_id: parseInt(client_id),
      requested_method,
      visitor_name,
      visitor_email,
      visitor_phone,
      visitor_message
    });

    res.json(result);
  } catch (error: any) {
    console.error('Error creating handover request:', error);
    res.status(500).json({ error: error.message });
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

export default router;

