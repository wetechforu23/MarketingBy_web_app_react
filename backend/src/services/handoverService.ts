import { Pool } from 'pg';
import axios from 'axios';
import crypto from 'crypto';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

interface HandoverRequest {
  conversation_id: number;
  widget_id: number;
  client_id: number;
  requested_method: 'portal' | 'whatsapp' | 'email' | 'phone' | 'webhook';
  visitor_name?: string;
  visitor_email?: string;
  visitor_phone?: string;
  visitor_message?: string;
}

interface HandoverOptions {
  portal: boolean;
  whatsapp: boolean;
  email: boolean;
  phone: boolean;
  webhook: boolean;
}

export class HandoverService {
  /**
   * Get handover configuration for a widget
   */
  static async getHandoverConfig(widgetId: number) {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          enable_handover_choice,
          handover_options,
          default_handover_method,
          webhook_url,
          enable_whatsapp,
          whatsapp_configured,
          sms_twilio_configured,
          notification_email
        FROM widget_configs
        WHERE id = $1
      `, [widgetId]);

      if (result.rows.length === 0) {
        throw new Error('Widget not found');
      }

      return result.rows[0];
    } finally {
      client.release();
    }
  }

  /**
   * Update handover configuration for a widget
   */
  static async updateHandoverConfig(
    widgetId: number,
    config: {
      enable_handover_choice?: boolean;
      handover_options?: HandoverOptions;
      default_handover_method?: string;
      webhook_url?: string;
      webhook_secret?: string;
    }
  ) {
    const client = await pool.connect();
    try {
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (config.enable_handover_choice !== undefined) {
        updates.push(`enable_handover_choice = $${paramIndex++}`);
        values.push(config.enable_handover_choice);
      }

      if (config.handover_options) {
        updates.push(`handover_options = $${paramIndex++}::jsonb`);
        values.push(JSON.stringify(config.handover_options));
      }

      if (config.default_handover_method) {
        updates.push(`default_handover_method = $${paramIndex++}`);
        values.push(config.default_handover_method);
      }

      if (config.webhook_url !== undefined) {
        updates.push(`webhook_url = $${paramIndex++}`);
        values.push(config.webhook_url);
      }

      if (config.webhook_secret !== undefined) {
        updates.push(`webhook_secret = $${paramIndex++}`);
        values.push(config.webhook_secret);
      }

      if (updates.length === 0) {
        return { success: true, message: 'No updates to apply' };
      }

      values.push(widgetId);
      
      await client.query(`
        UPDATE widget_configs
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
      `, values);

      return { success: true, message: 'Handover configuration updated' };
    } finally {
      client.release();
    }
  }

  /**
   * Create a handover request
   */
  static async createHandoverRequest(data: HandoverRequest) {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        INSERT INTO handover_requests (
          conversation_id,
          widget_id,
          client_id,
          requested_method,
          visitor_name,
          visitor_email,
          visitor_phone,
          visitor_message,
          status
        ) VALUES ($1::integer, $2::integer, $3::integer, $4::text, $5::text, $6::text, $7::text, $8::text, 'pending')
        RETURNING *
      `, [
        parseInt(data.conversation_id),
        parseInt(data.widget_id),
        parseInt(data.client_id),
        data.requested_method || 'portal',
        data.visitor_name || null,
        data.visitor_email || null,
        data.visitor_phone || null,
        data.visitor_message || null
      ]);

      const handoverRequest = result.rows[0];

      // Update conversation with preferred contact method
      await client.query(`
        UPDATE widget_conversations
        SET 
          preferred_contact_method = $1,
          contact_method_details = $2,
          handoff_requested = true,
          handoff_requested_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `, [
        data.requested_method,
        JSON.stringify({
          name: data.visitor_name,
          email: data.visitor_email,
          phone: data.visitor_phone,
          message: data.visitor_message
        }),
        data.conversation_id
      ]);

      // Process the handover based on method
      await this.processHandover(handoverRequest);

      return { success: true, handover_id: handoverRequest.id };
    } finally {
      client.release();
    }
  }

  /**
   * Process handover based on chosen method
   */
  private static async processHandover(handoverRequest: any) {
    try {
      switch (handoverRequest.requested_method) {
        case 'portal':
          await this.handlePortalHandover(handoverRequest);
          break;
        case 'whatsapp':
          await this.handleWhatsAppHandover(handoverRequest);
          break;
        case 'email':
          await this.handleEmailHandover(handoverRequest);
          break;
        case 'phone':
          await this.handlePhoneHandover(handoverRequest);
          break;
        case 'webhook':
          await this.handleWebhookHandover(handoverRequest);
          break;
        default:
          console.warn(`Unknown handover method: ${handoverRequest.requested_method}`);
      }
    } catch (error) {
      console.error('Error processing handover:', error);
      await this.updateHandoverStatus(handoverRequest.id, 'failed', (error as Error).message);
    }
  }

  /**
   * Handle portal-based handover (existing notification system)
   */
  private static async handlePortalHandover(handoverRequest: any) {
    const client = await pool.connect();
    try {
      // Get widget config for notification email
      const config = await client.query(`
        SELECT notification_email, enable_email_notifications, notify_agent_handoff
        FROM widget_configs
        WHERE id = $1
      `, [handoverRequest.widget_id]);

      if (config.rows.length === 0 || !config.rows[0].enable_email_notifications || !config.rows[0].notify_agent_handoff) {
        await this.updateHandoverStatus(handoverRequest.id, 'completed', null);
        return;
      }

      // Send email notification (integrate with existing EmailService)
      const { EmailService } = await import('./emailService');
      const emailService = new EmailService();
      
      await emailService.sendEmail({
        to: config.rows[0].notification_email,
        subject: `🔔 Agent Handoff Request`,
        html: `
          <h2>New Agent Handoff Request</h2>
          <p><strong>Visitor Name:</strong> ${handoverRequest.visitor_name || 'Anonymous'}</p>
          <p><strong>Visitor Email:</strong> ${handoverRequest.visitor_email || 'Not provided'}</p>
          <p><strong>Visitor Phone:</strong> ${handoverRequest.visitor_phone || 'Not provided'}</p>
          <p><strong>Message:</strong></p>
          <p>${handoverRequest.visitor_message || 'Visitor requesting agent support'}</p>
          <hr>
          <p><a href="https://marketingby.wetechforu.com/app/chat-conversations">View Conversation</a></p>
        `
      });

      await this.updateHandoverStatus(handoverRequest.id, 'notified', null);
      await client.query(`
        UPDATE handover_requests
        SET notification_sent = true, notification_sent_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [handoverRequest.id]);
    } finally {
      client.release();
    }
  }

  /**
   * Handle WhatsApp-based handover
   */
  private static async handleWhatsAppHandover(handoverRequest: any) {
    if (!handoverRequest.visitor_phone) {
      throw new Error('Phone number required for WhatsApp handover');
    }

    const client = await pool.connect();
    try {
      // 1) Mark conversation as handed off so AI stops replying immediately
      await client.query(
        `UPDATE widget_conversations SET 
           agent_handoff = true,
           handoff_requested = false,
           updated_at = NOW(),
           last_activity_at = NOW()
         WHERE id = $1`,
        [handoverRequest.conversation_id]
      );

      // 2) Add a system message in the portal timeline
      await client.query(
        `INSERT INTO widget_messages (conversation_id, message_type, message_text, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [
          handoverRequest.conversation_id,
          'system',
          `🤝 Conversation handed off to WhatsApp. We will contact ${handoverRequest.visitor_phone} shortly.`
        ]
      );

      // 3) Send initial WhatsApp notification to the visitor
      const normalizeWhatsAppNumber = (raw: string): string => {
        // Remove non-digits, keep leading + if present
        let s = (raw || '').toString().trim();
        // If it already starts with 'whatsapp:', assume caller knows what they're doing
        if (s.startsWith('whatsapp:')) return s;
        // Strip spaces and common separators
        s = s.replace(/\s|\(|\)|-|\./g, '');
        // Ensure leading +; default to US +1 if missing
        if (!s.startsWith('+')) {
          if (s.startsWith('00')) s = '+' + s.substring(2);
          else s = '+1' + s; // Default country code
        }
        return `whatsapp:${s}`;
      };

      const { WhatsAppService } = await import('./whatsappService');
      const whatsappService = WhatsAppService.getInstance();
      const toNumber = normalizeWhatsAppNumber(handoverRequest.visitor_phone);

      try {
        await whatsappService.sendMessage({
          clientId: handoverRequest.client_id,
          widgetId: handoverRequest.widget_id,
          conversationId: handoverRequest.conversation_id,
          toNumber,
          message: `Hello ${handoverRequest.visitor_name || 'there'}! An agent will contact you shortly via WhatsApp.\n\nYour request: ${handoverRequest.visitor_message || 'You requested to speak with an agent.'}`
        });
      } catch (sendErr: any) {
        console.error('❌ WhatsApp sendMessage failed:', sendErr);
        // Log a system message so the portal shows the error context
        await client.query(
          `INSERT INTO widget_messages (conversation_id, message_type, message_text, created_at)
           VALUES ($1, 'system', $2, NOW())`,
          [
            handoverRequest.conversation_id,
            `⚠️ Failed to initiate WhatsApp handover: ${sendErr?.message || 'Unknown error'}`
          ]
        );
        // Mark request as failed
        await this.updateHandoverStatus(handoverRequest.id, 'failed', sendErr?.message || 'send_error');
        return;
      }

      // 4) Update handover status
      await this.updateHandoverStatus(handoverRequest.id, 'notified', null);
    } finally {
      client.release();
    }
  }

  /**
   * Handle email-based handover
   */
  private static async handleEmailHandover(handoverRequest: any) {
    if (!handoverRequest.visitor_email) {
      throw new Error('Email required for email handover');
    }

    const client = await pool.connect();
    try {
      // Get client/widget info
      const info = await client.query(`
        SELECT w.widget_name, w.notification_email, c.name as client_name
        FROM widget_configs w
        JOIN clients c ON c.id = w.client_id
        WHERE w.id = $1
      `, [handoverRequest.widget_id]);

      if (info.rows.length === 0) {
        throw new Error('Widget configuration not found');
      }

      const { EmailService } = await import('./emailService');
      const emailService = new EmailService();
      
      // Send confirmation to visitor
      await emailService.sendEmail({
        to: handoverRequest.visitor_email,
        subject: `${info.rows[0].client_name} - Agent Will Contact You Soon`,
        html: `
          <h2>Thank you for reaching out!</h2>
          <p>Hello ${handoverRequest.visitor_name || 'there'},</p>
          <p>We've received your message and one of our team members will contact you via email shortly.</p>
          <p><strong>Your message:</strong></p>
          <blockquote>${handoverRequest.visitor_message || 'You requested to speak with an agent.'}</blockquote>
          <p>Expected response time: Within 24 hours</p>
          <br>
          <p>Best regards,<br>${info.rows[0].client_name} Team</p>
        `
      });

      // Notify agent
      if (info.rows[0].notification_email) {
        await emailService.sendEmail({
          to: info.rows[0].notification_email,
          subject: `🔔 Agent Handoff Request via Email`,
          html: `
            <h2>New Agent Handoff Request (Email Method)</h2>
            <p><strong>Visitor Name:</strong> ${handoverRequest.visitor_name || 'Anonymous'}</p>
            <p><strong>Visitor Email:</strong> ${handoverRequest.visitor_email}</p>
            <p><strong>Visitor Phone:</strong> ${handoverRequest.visitor_phone || 'Not provided'}</p>
            <p><strong>Message:</strong></p>
            <p>${handoverRequest.visitor_message || 'Visitor requesting agent support'}</p>
            <p><strong>Preferred Method:</strong> Email</p>
            <hr>
            <p><a href="https://marketingby.wetechforu.com/app/chat-conversations">View Conversation</a></p>
          `
        });
      }

      await this.updateHandoverStatus(handoverRequest.id, 'notified', null);
      await client.query(`
        UPDATE handover_requests
        SET notification_sent = true, notification_sent_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [handoverRequest.id]);
    } finally {
      client.release();
    }
  }

  /**
   * Handle phone/SMS-based handover
   */
  private static async handlePhoneHandover(handoverRequest: any) {
    if (!handoverRequest.visitor_phone) {
      throw new Error('Phone number required for phone/SMS handover');
    }

    const client = await pool.connect();
    try {
      // Get client info
      const info = await client.query(`
        SELECT c.name as client_name, w.notification_email
        FROM widget_configs w
        JOIN clients c ON c.id = w.client_id
        WHERE w.id = $1
      `, [handoverRequest.widget_id]);

      // Use Twilio SMS (same credentials as WhatsApp)
      const { WhatsAppService } = await import('./whatsappService');
      const whatsappService = WhatsAppService.getInstance();
      
      // Send SMS to visitor
      const smsBody = `${info.rows[0].client_name}: Thank you for your interest! An agent will call you at ${handoverRequest.visitor_phone} within 24 hours.`;
      
      await whatsappService.sendMessage({
        clientId: handoverRequest.client_id,
        widgetId: handoverRequest.widget_id,
        conversationId: handoverRequest.conversation_id,
        toNumber: handoverRequest.visitor_phone,
        message: smsBody
      });

      // Email notification to agent
      if (info.rows[0].notification_email) {
        const { EmailService } = await import('./emailService');
        const emailService = new EmailService();
        
        await emailService.sendEmail({
          to: info.rows[0].notification_email,
          subject: `🔔 Agent Handoff Request via Phone/SMS`,
          html: `
            <h2>New Agent Handoff Request (Phone/SMS Method)</h2>
            <p><strong>Visitor Name:</strong> ${handoverRequest.visitor_name || 'Anonymous'}</p>
            <p><strong>Visitor Email:</strong> ${handoverRequest.visitor_email || 'Not provided'}</p>
            <p><strong>Visitor Phone:</strong> ${handoverRequest.visitor_phone}</p>
            <p><strong>Message:</strong></p>
            <p>${handoverRequest.visitor_message || 'Visitor requesting phone call'}</p>
            <p><strong>Preferred Method:</strong> Phone/SMS</p>
            <hr>
            <p><a href="https://marketingby.wetechforu.com/app/chat-conversations">View Conversation</a></p>
          `
        });
      }

      await this.updateHandoverStatus(handoverRequest.id, 'notified', null);
      await client.query(`
        UPDATE handover_requests
        SET notification_sent = true, notification_sent_at = CURRENT_TIMESTAMP, sms_sent = true, sms_sent_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [handoverRequest.id]);
    } finally {
      client.release();
    }
  }

  /**
   * Handle webhook-based handover (send to client's system)
   */
  private static async handleWebhookHandover(handoverRequest: any) {
    const client = await pool.connect();
    try {
      // Get webhook config
      const config = await client.query(`
        SELECT webhook_url, webhook_secret
        FROM widget_configs
        WHERE id = $1
      `, [handoverRequest.widget_id]);

      if (config.rows.length === 0 || !config.rows[0].webhook_url) {
        throw new Error('Webhook URL not configured');
      }

      const webhookUrl = config.rows[0].webhook_url;
      const webhookSecret = config.rows[0].webhook_secret;

      // Prepare payload
      const payload = {
        event: 'agent_handover_requested',
        timestamp: new Date().toISOString(),
        conversation_id: handoverRequest.conversation_id,
        visitor: {
          name: handoverRequest.visitor_name,
          email: handoverRequest.visitor_email,
          phone: handoverRequest.visitor_phone
        },
        message: handoverRequest.visitor_message,
        widget_id: handoverRequest.widget_id
      };

      // Generate signature if secret is configured
      const headers: any = {
        'Content-Type': 'application/json',
        'User-Agent': 'MarketingBy-ChatBot/1.0'
      };

      if (webhookSecret) {
        const signature = crypto
          .createHmac('sha256', webhookSecret)
          .update(JSON.stringify(payload))
          .digest('hex');
        headers['X-MarketingBy-Signature'] = signature;
      }

      // Send webhook
      const response = await axios.post(webhookUrl, payload, {
        headers,
        timeout: 10000,  // 10 second timeout
        maxRedirects: 3
      });

      // Update handover request with response
      await client.query(`
        UPDATE handover_requests
        SET 
          webhook_url = $1,
          webhook_response_code = $2,
          webhook_response_body = $3,
          notification_sent = true,
          notification_sent_at = CURRENT_TIMESTAMP,
          status = 'notified'
        WHERE id = $4
      `, [
        webhookUrl,
        response.status,
        JSON.stringify(response.data).substring(0, 1000),  // Store first 1000 chars
        handoverRequest.id
      ]);

      await client.query(`
        UPDATE widget_conversations
        SET webhook_notified = true, webhook_notified_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [handoverRequest.conversation_id]);

    } catch (error: any) {
      // Retry logic (up to 3 times)
      const retryCount = handoverRequest.webhook_retry_count || 0;
      if (retryCount < 3) {
        await client.query(`
          UPDATE handover_requests
          SET webhook_retry_count = $1
          WHERE id = $2
        `, [retryCount + 1, handoverRequest.id]);
        
        // Schedule retry (in a real system, use a job queue)
        console.log(`Webhook failed, will retry (attempt ${retryCount + 1}/3)`);
      }

      throw new Error(`Webhook failed: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Update handover status
   */
  private static async updateHandoverStatus(handoverId: number, status: string, errorMessage: string | null) {
    const client = await pool.connect();
    try {
      await client.query(`
        UPDATE handover_requests
        SET 
          status = $1,
          error_message = $2,
          completed_at = CASE WHEN $1 = 'completed' OR $1 = 'notified' THEN CURRENT_TIMESTAMP ELSE completed_at END
        WHERE id = $3
      `, [status, errorMessage, handoverId]);
    } finally {
      client.release();
    }
  }

  /**
   * Get handover analytics
   */
  static async getHandoverAnalytics(clientId?: number, widgetId?: number, days: number = 30) {
    const client = await pool.connect();
    try {
      let query = `
        SELECT * FROM handover_analytics
        WHERE 1=1
      `;
      const params: any[] = [];

      if (clientId) {
        params.push(clientId);
        query += ` AND client_id = $${params.length}`;
      }

      if (widgetId) {
        params.push(widgetId);
        query += ` AND widget_id = $${params.length}`;
      }

      const result = await client.query(query, params);
      return result.rows;
    } finally {
      client.release();
    }
  }
}

export default HandoverService;

