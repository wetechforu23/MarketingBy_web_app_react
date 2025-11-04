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
          notification_email,
          handover_whatsapp_number,
          whatsapp_handover_content_sid
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
      handover_whatsapp_number?: string;
      whatsapp_handover_content_sid?: string;
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

      if (config.handover_whatsapp_number !== undefined) {
        updates.push(`handover_whatsapp_number = $${paramIndex++}`);
        values.push(config.handover_whatsapp_number || null);
      }

      if (config.whatsapp_handover_content_sid !== undefined) {
        updates.push(`whatsapp_handover_content_sid = $${paramIndex++}`);
        values.push(config.whatsapp_handover_content_sid || null);
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
      // Prepare values with explicit type casting to match database schema
      const values = [
        data.conversation_id ? parseInt(String(data.conversation_id)) : null,
        data.widget_id ? parseInt(String(data.widget_id)) : null,
        data.client_id ? parseInt(String(data.client_id)) : null,
        String(data.requested_method || 'portal'),
        data.visitor_name ? String(data.visitor_name) : null,
        data.visitor_email ? String(data.visitor_email) : null,
        data.visitor_phone ? String(data.visitor_phone) : null,
        data.visitor_message ? String(data.visitor_message) : null
      ];

      // Use explicit type casts in SQL to ensure compatibility
      // Handle NULL values by using COALESCE to ensure proper type casting
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
        ) VALUES (
          $1,
          $2,
          $3,
          COALESCE($4, 'portal')::varchar(50),
          NULLIF($5, '')::varchar(255),
          NULLIF($6, '')::varchar(255),
          NULLIF($7, '')::varchar(50),
          NULLIF($8, '')::text,
          'pending'::varchar(50)
        )
        RETURNING *
      `, values);

      const handoverRequest = result.rows[0];

      // Update conversation with preferred contact method
      const contactDetails = {
        name: data.visitor_name,
        email: data.visitor_email,
        phone: data.visitor_phone,
        message: data.visitor_message
      };
      
      await client.query(`
        UPDATE widget_conversations
        SET 
          preferred_contact_method = $1::varchar(50),
          contact_method_details = $2::jsonb,
          handoff_requested = true,
          handoff_requested_at = CURRENT_TIMESTAMP
        WHERE id = $3::integer
      `, [
        String(data.requested_method || 'portal'),
        JSON.stringify(contactDetails),
        data.conversation_id ? parseInt(String(data.conversation_id)) : null
      ]);

      // Process the handover based on method
      try {
        await this.processHandover(handoverRequest);
        return { success: true, handover_id: handoverRequest.id };
      } catch (error: any) {
        // Handle special "AGENT_BUSY" error
        if (error.message === 'AGENT_BUSY') {
          return { 
            success: false, 
            handover_id: handoverRequest.id,
            agent_busy: true,
            message: 'Agent is currently busy with another conversation. We will notify you when the agent is available.'
          };
        }
        throw error; // Re-throw other errors
      }
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
   * Check if agent is currently busy with WhatsApp handover
   * Returns true if there's an active WhatsApp conversation for this client
   */
  static async isAgentBusyWithWhatsApp(clientId: number): Promise<boolean> {
    const client = await pool.connect();
    try {
      // Check for active WhatsApp handovers for this client
      const busyCheck = await client.query(`
        SELECT COUNT(*) as active_count
        FROM widget_conversations wc
        JOIN widget_configs w ON w.id = wc.widget_id
        JOIN handover_requests hr ON hr.conversation_id = wc.id
        WHERE w.client_id = $1
          AND wc.status = 'active'
          AND wc.agent_handoff = true
          AND hr.requested_method = 'whatsapp'
          AND hr.status IN ('notified', 'completed')
          AND wc.updated_at > NOW() - INTERVAL '1 hour'
        `, [clientId]);

      const activeCount = parseInt(busyCheck.rows[0]?.active_count || '0');
      return activeCount > 0;
    } finally {
      client.release();
    }
  }

  /**
   * Check for queued WhatsApp handovers and notify when agent becomes available
   * This should be called periodically or when a conversation ends
   */
  static async processQueuedWhatsAppHandovers(clientId: number): Promise<void> {
    const client = await pool.connect();
    try {
      // Check if agent is now available
      const isBusy = await this.isAgentBusyWithWhatsApp(clientId);
      
      if (!isBusy) {
        // Agent is available - process queued handovers
        const queuedHandovers = await client.query(`
          SELECT hr.*, wc.visitor_name, wc.visitor_email, wc.visitor_phone
          FROM handover_requests hr
          JOIN widget_conversations wc ON wc.id = hr.conversation_id
          JOIN widget_configs w ON w.id = wc.widget_id
          WHERE w.client_id = $1
            AND hr.requested_method = 'whatsapp'
            AND hr.status = 'queued'
            AND wc.status = 'active'
          ORDER BY hr.created_at ASC
          LIMIT 1
        `, [clientId]);

        if (queuedHandovers.rows.length > 0) {
          const queuedHandover = queuedHandovers.rows[0];
          console.log(`✅ Processing queued WhatsApp handover: ${queuedHandover.id}`);
          
          // Process the handover now that agent is available
          await this.processHandover(queuedHandover);
          
          // Update status
          await this.updateHandoverStatus(queuedHandover.id, 'notified', null);
          
          // Mark conversation as handed off
          await client.query(`
            UPDATE widget_conversations
            SET agent_handoff = true,
                handoff_requested = false,
                updated_at = NOW()
            WHERE id = $1
          `, [queuedHandover.conversation_id]);
        }
      }
    } finally {
      client.release();
    }
  }

  /**
   * Handle WhatsApp-based handover
   * Sends notification to CLIENT's WhatsApp number (not visitor's)
   */
  private static async handleWhatsAppHandover(handoverRequest: any) {
    const client = await pool.connect();
    try {
      // ✅ Get widget config (including multiple chats setting) in one query
      const widgetConfig = await client.query(`
        SELECT 
          handover_whatsapp_number,
          widget_name,
          client_id,
          enable_multiple_whatsapp_chats
        FROM widget_configs
        WHERE id = $1
      `, [handoverRequest.widget_id]);
      
      if (widgetConfig.rows.length === 0) {
        throw new Error('Widget configuration not found');
      }
      
      const enableMultipleChats = widgetConfig.rows[0]?.enable_multiple_whatsapp_chats || false;
      
      // ✅ Only check if agent is busy if multiple chats are NOT enabled
      if (!enableMultipleChats) {
        const isBusy = await this.isAgentBusyWithWhatsApp(handoverRequest.client_id);
        
        if (isBusy) {
          console.log(`⚠️ Agent is busy with WhatsApp handover for client ${handoverRequest.client_id}`);
          await this.updateHandoverStatus(handoverRequest.id, 'queued', 'Agent is currently busy with another WhatsApp conversation');
          
          // Update conversation to indicate handover is queued
          await client.query(`
            UPDATE widget_conversations
            SET 
              handoff_requested = true,
              preferred_contact_method = 'whatsapp',
              handoff_requested_at = CURRENT_TIMESTAMP
            WHERE id = $1
          `, [handoverRequest.conversation_id]);
          
          // Add system message to conversation
          await client.query(`
            INSERT INTO widget_messages (conversation_id, message_type, message_text, created_at)
            VALUES ($1, 'system', 'Agent handover request queued - agent is currently busy', NOW())
          `, [handoverRequest.conversation_id]);
          
          throw new Error('AGENT_BUSY'); // Special error to handle in createHandoverRequest
        }
      }

      // 2) Get client info
      const clientInfo = await client.query(`
        SELECT client_name
        FROM clients
        WHERE id = $1
      `, [handoverRequest.client_id]);

      const clientName = clientInfo.rows.length > 0 ? clientInfo.rows[0].client_name : 'Client';

      // 3) Determine client's WhatsApp number for handover
      let clientHandoverNumber = widgetConfig.rows[0].handover_whatsapp_number;
      
      // If handover_whatsapp_number is not set, try to get it from WhatsApp credentials
      if (!clientHandoverNumber) {
        const { WhatsAppService } = await import('./whatsappService');
        const whatsappService = WhatsAppService.getInstance();
        const credentials = await whatsappService.getCredentials(handoverRequest.client_id);
        
        if (credentials && credentials.fromNumber) {
          // Extract number from whatsapp:+14155551234 format
          clientHandoverNumber = credentials.fromNumber.replace('whatsapp:', '');
        }
      }

      if (!clientHandoverNumber) {
        throw new Error('Client WhatsApp number not configured for handover. Please set handover_whatsapp_number in widget settings.');
      }

      // 4) Mark conversation as handed off so AI stops replying immediately
      await client.query(
        `UPDATE widget_conversations SET 
           agent_handoff = true,
           handoff_requested = false,
           updated_at = NOW(),
           last_activity_at = NOW()
         WHERE id = $1`,
        [handoverRequest.conversation_id]
      );

      // 5) Add a system message in the portal timeline
      await client.query(
        `INSERT INTO widget_messages (conversation_id, message_type, message_text, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [
          handoverRequest.conversation_id,
          'system',
          `🤝 Agent handover requested. Client WhatsApp number will be notified.`
        ]
      );

      // 6) Normalize WhatsApp number
      const normalizeWhatsAppNumber = (raw: string): string => {
        // Remove non-digits, keep leading + if present
        let s = (raw || '').toString().trim();
        // If it already starts with 'whatsapp:', remove it first to normalize
        if (s.startsWith('whatsapp:')) {
          s = s.substring(9); // Remove 'whatsapp:' prefix
        }
        // Strip spaces and common separators
        s = s.replace(/\s|\(|\)|-|\./g, '');
        
        // Validate: must have at least 10 digits
        const digitsOnly = s.replace(/\+/g, '');
        if (digitsOnly.length < 10) {
          throw new Error(`Invalid phone number: ${raw} (too short, needs at least 10 digits)`);
        }
        
        // Ensure leading +; default to US +1 if missing
        if (!s.startsWith('+')) {
          if (s.startsWith('00')) {
            s = '+' + s.substring(2);
          } else if (digitsOnly.length === 9 || digitsOnly.length === 10) {
            // 9-10 digits = US number without country code, add +1
            s = '+1' + digitsOnly;
          } else if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
            // 11 digits starting with 1 = US number
            s = '+' + digitsOnly;
          } else {
            throw new Error(`Invalid phone number format: ${raw} (please include country code, e.g., +14698880705 or 14698880705)`);
          }
        }
        
        // Final validation: E.164 format should be +[country code][number]
        const finalNumber = `whatsapp:${s}`;
        console.log(`📞 Normalized phone: ${raw} → ${finalNumber}`);
        return finalNumber;
      };

      // 7) Get visitor_session_id from conversation for identification
      const conversationInfo = await client.query(`
        SELECT visitor_session_id
        FROM widget_conversations
        WHERE id = $1
      `, [handoverRequest.conversation_id]);
      
      const visitorSessionId = conversationInfo.rows[0]?.visitor_session_id || null;
      const sessionIdDisplay = visitorSessionId ? visitorSessionId.substring(0, 20) + '...' : 'N/A';

      // 8) Send WhatsApp notification to CLIENT (not visitor)
      const { WhatsAppService } = await import('./whatsappService');
      const whatsappService = WhatsAppService.getInstance();
      const clientWhatsAppNumber = normalizeWhatsAppNumber(clientHandoverNumber);

      // Build notification message for client
      const visitorInfo = [];
      if (handoverRequest.visitor_name) {
        visitorInfo.push(`Name: ${handoverRequest.visitor_name}`);
      }
      if (handoverRequest.visitor_phone) {
        visitorInfo.push(`Phone: ${handoverRequest.visitor_phone}`);
      }
      if (handoverRequest.visitor_email) {
        visitorInfo.push(`Email: ${handoverRequest.visitor_email}`);
      }

      // Build notification message with conversation identifier (enableMultipleChats already set above)
      const visitorName = handoverRequest.visitor_name || `Visitor ${handoverRequest.conversation_id}`;
      const conversationIdentifier = enableMultipleChats 
        ? `[#${handoverRequest.conversation_id}] ${visitorName}`
        : visitorName;
      
      // Improved notification format - make conversation ID and session ID prominent
      const notificationMessage = enableMultipleChats
        ? `🔔 *Agent Handover Request*\n\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `*CONVERSATION ID: #${handoverRequest.conversation_id}*\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
          `*Visitor:* ${visitorName}\n` +
          `*Session ID:* \`${sessionIdDisplay}\`\n\n` +
          (visitorInfo.length > 0 ? `*Contact Info:*\n${visitorInfo.map(v => `• ${v}`).join('\n')}\n\n` : '') +
          `*Message:*\n${handoverRequest.visitor_message || 'Visitor requested agent support'}\n\n` +
          `*Widget:* ${widgetConfig.rows[0].widget_name || 'N/A'}\n\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `💬 *HOW TO REPLY (REQUIRED):*\n` +
          `Start your message with:\n` +
          `\`#${handoverRequest.conversation_id}: your message\`\n\n` +
          `✅ *Example:*\n` +
          `\`#${handoverRequest.conversation_id}: Hello ${visitorName}, how can I help?\`\n\n` +
          `❌ *WRONG (will go to wrong conversation):*\n` +
          `\`Hello, how can I help?\`\n\n` +
          `⚠️ *CRITICAL:* You may have multiple active conversations. Always include #${handoverRequest.conversation_id} prefix!\n\n` +
          `Please respond as soon as possible.`
        : `🔔 *Agent Handover Request*\n\n` +
          `*Conversation ID:* #${handoverRequest.conversation_id}\n` +
          `*Session ID:* \`${sessionIdDisplay}\`\n` +
          `*Visitor:* ${visitorName}\n` +
          (visitorInfo.length > 0 ? `*Contact Info:*\n${visitorInfo.map(v => `• ${v}`).join('\n')}\n\n` : '') +
          `*Message:*\n${handoverRequest.visitor_message || 'Visitor requested agent support'}\n\n` +
          `*Widget:* ${widgetConfig.rows[0].widget_name || 'N/A'}\n\n` +
          `Please respond to the visitor at your earliest convenience.`;

      try {
        console.log(`📱 Sending WhatsApp handover notification to client:`, {
          to: clientWhatsAppNumber,
          client_id: handoverRequest.client_id,
          widget_id: handoverRequest.widget_id,
          conversation_id: handoverRequest.conversation_id
        });

        if (!handoverRequest.client_id) {
          throw new Error('client_id is required but was not provided in handover request');
        }

        // Prefer template first (avoids 24h window errors)
        // Remove 'whatsapp:' prefix from number if present, ensure it's just digits with + prefix
        let cleanNumber = clientWhatsAppNumber.replace('whatsapp:', '').trim();
        
        // Ensure E.164 format: + followed by digits only (no spaces, dashes, etc)
        if (!cleanNumber.startsWith('+')) {
          cleanNumber = '+' + cleanNumber.replace(/\D/g, '');
        } else {
          // Already has +, just remove all non-digits after it
          cleanNumber = '+' + cleanNumber.substring(1).replace(/\D/g, '');
        }
        
        console.log(`📱 WhatsApp Handover Debug:`, {
          original: clientWhatsAppNumber,
          cleaned: cleanNumber,
          client_id: handoverRequest.client_id,
          widget_id: handoverRequest.widget_id,
          conversation_id: handoverRequest.conversation_id,
          handover_number: clientHandoverNumber
        });
        
        // Ensure all variables are strings and match template expectations
        // Twilio Content API requires all values to be strings
        let result = await whatsappService.sendTemplateMessage({
          clientId: handoverRequest.client_id,
          widgetId: handoverRequest.widget_id,
          conversationId: handoverRequest.conversation_id,
          toNumber: cleanNumber,
          templateType: 'handover',
          variables: {
            client_name: String(clientName || 'Client'),
            widget_name: String(widgetConfig.rows[0].widget_name || 'Widget'),
            conversation_id: String(handoverRequest.conversation_id || ''),
            visitor_name: String(handoverRequest.visitor_name || 'Visitor'),
            visitor_phone: String(handoverRequest.visitor_phone || 'N/A'),
            visitor_email: String(handoverRequest.visitor_email || 'N/A'),
            visitor_message: String(handoverRequest.visitor_message || 'Visitor requested agent support'),
          }
        });

        console.log(`📱 Template message result:`, {
          success: result.success,
          error: result.error,
          errorCode: result.errorCode,
          errorMessage: result.errorMessage,
          messageSid: result.messageSid,
          status: result.status,
          to: cleanNumber,
          clientId: handoverRequest.client_id
        });

        // If template fails (invalid variables, template not configured, etc.), fallback to freeform
        // Error 21656 = Invalid Content Variables, 21608 = Template not approved, etc.
        if (!result.success && (result.errorCode === '21656' || result.errorCode === '21608' || /template|variable|content/i.test(result.error || ''))) {
          console.log(`📱 Template failed (${result.errorCode}), falling back to freeform message...`);
          result = await whatsappService.sendMessage({
            clientId: handoverRequest.client_id,
            widgetId: handoverRequest.widget_id,
            conversationId: handoverRequest.conversation_id,
            toNumber: clientWhatsAppNumber, // Keep whatsapp: prefix for freeform
            message: notificationMessage,
            sentByAgentName: 'System',
            visitorName: handoverRequest.visitor_name || 'Anonymous Visitor'
          });
          console.log(`📱 Freeform message result:`, {
            success: result.success,
            error: result.error,
            messageSid: result.messageSid
          });
        }

        if (!result.success) {
          throw new Error(result.error || 'Failed to send WhatsApp message');
        }

        console.log(`✅ WhatsApp handover notification sent to client:`, {
          messageSid: result.messageSid,
          status: result.status,
          to: clientWhatsAppNumber
        });

        // Log success in system messages
        await client.query(
          `INSERT INTO widget_messages (conversation_id, message_type, message_text, created_at)
           VALUES ($1, 'system', $2, NOW())`,
          [
            handoverRequest.conversation_id,
            `✅ WhatsApp handover notification sent to client at ${clientHandoverNumber}`
          ]
        );
      } catch (sendErr: any) {
        console.error('❌ WhatsApp sendMessage failed:', {
          error: sendErr.message,
          stack: sendErr.stack,
          to: clientWhatsAppNumber,
          client_id: handoverRequest.client_id,
          widget_id: handoverRequest.widget_id,
          conversation_id: handoverRequest.conversation_id
        });
        
        // Log error in system messages
        await client.query(
          `INSERT INTO widget_messages (conversation_id, message_type, message_text, created_at)
           VALUES ($1, 'system', $2, NOW())`,
          [
            handoverRequest.conversation_id,
            `⚠️ Failed to send WhatsApp handover notification to client: ${sendErr?.message || 'Unknown error'}. Client number: ${clientHandoverNumber}`
          ]
        );
        // Mark request as failed
        await this.updateHandoverStatus(handoverRequest.id, 'failed', sendErr?.message || 'send_error');
        // Re-throw to ensure error is logged in processHandover catch block too
        throw sendErr;
      }

      // 8) Update handover status
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
          status = $1::varchar(50),
          error_message = NULLIF($2, '')::text,
          completed_at = CASE WHEN $1 = 'completed' OR $1 = 'notified' THEN CURRENT_TIMESTAMP ELSE completed_at END
        WHERE id = $3::integer
      `, [status, errorMessage || null, handoverId]);
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

