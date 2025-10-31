import axios from 'axios';
import crypto from 'crypto';
import pool from '../config/database';

// ==========================================
// WHATSAPP SERVICE - Twilio Integration
// ==========================================
// Handles WhatsApp messaging via Twilio API
// Each client provides their own Twilio credentials
// ==========================================

interface WhatsAppCredentials {
  accountSid: string;
  authToken: string;
  fromNumber: string; // WhatsApp enabled number (e.g., whatsapp:+14155238886)
}

interface SendMessageParams {
  clientId: number;
  widgetId: number;
  conversationId: number;
  toNumber: string; // Visitor's phone number
  message: string;
  mediaUrl?: string;
  sentByUserId?: number;
  sentByAgentName?: string;
  visitorName?: string;
}

interface MessageResponse {
  success: boolean;
  messageSid?: string;
  status?: string;
  error?: string;
  cost?: number;
}

export class WhatsAppService {
  private static instance: WhatsAppService;
  private ENCRYPTION_KEY: string;

  private constructor() {
    this.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-32-character-secret-key!!';
  }

  static getInstance(): WhatsAppService {
    if (!WhatsAppService.instance) {
      WhatsAppService.instance = new WhatsAppService();
    }
    return WhatsAppService.instance;
  }

  // ==========================================
  // CREDENTIAL MANAGEMENT
  // ==========================================

  private encrypt(value: string): string {
    const key = Buffer.from(this.ENCRYPTION_KEY.padEnd(32, '0').substring(0, 32));
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  }

  private decrypt(encryptedValue: string): string {
    const key = Buffer.from(this.ENCRYPTION_KEY.padEnd(32, '0').substring(0, 32));
    try {
      const parts = encryptedValue.split(':');
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt WhatsApp credentials');
    }
  }

  async saveCredentials(
    clientId: number,
    accountSid: string,
    authToken: string,
    fromNumber: string
  ): Promise<boolean> {
    try {
      const service = `whatsapp_client_${clientId}`;

      // Encrypt credentials
      const encryptedSid = this.encrypt(accountSid);
      const encryptedToken = this.encrypt(authToken);
      const encryptedNumber = this.encrypt(fromNumber);

      // Store in encrypted_credentials table
      await pool.query(
        `INSERT INTO encrypted_credentials (service, key_name, encrypted_value, created_at, updated_at)
         VALUES 
           ($1, 'account_sid', $2, NOW(), NOW()),
           ($1, 'auth_token', $3, NOW(), NOW()),
           ($1, 'from_number', $4, NOW(), NOW())
         ON CONFLICT (service, key_name) 
         DO UPDATE SET 
           encrypted_value = EXCLUDED.encrypted_value,
           updated_at = NOW()`,
        [service, encryptedSid, encryptedToken, encryptedNumber]
      );

      // Update widget_configs to mark WhatsApp as configured
      await pool.query(
        `UPDATE widget_configs 
         SET whatsapp_configured = true, 
             updated_at = NOW()
         WHERE client_id = $1`,
        [clientId]
      );

      // Initialize usage tracking
      await pool.query(
        `INSERT INTO whatsapp_usage (client_id)
         VALUES ($1)
         ON CONFLICT (client_id, widget_id) DO NOTHING`,
        [clientId]
      );

      // Store phone number
      await pool.query(
        `INSERT INTO whatsapp_phone_numbers (client_id, phone_number, formatted_number, is_active, created_at)
         VALUES ($1, $2, $2, true, NOW())
         ON CONFLICT (phone_number) 
         DO UPDATE SET 
           is_active = true,
           updated_at = NOW()`,
        [clientId, fromNumber]
      );

      console.log(`✅ WhatsApp credentials saved for client ${clientId}`);
      return true;
    } catch (error) {
      console.error('Error saving WhatsApp credentials:', error);
      throw error;
    }
  }

  async getCredentials(clientId: number): Promise<WhatsAppCredentials | null> {
    try {
      const service = `whatsapp_client_${clientId}`;

      const result = await pool.query(
        `SELECT key_name, encrypted_value 
         FROM encrypted_credentials 
         WHERE service = $1`,
        [service]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const creds: any = {};
      for (const row of result.rows) {
        creds[row.key_name] = this.decrypt(row.encrypted_value);
      }

      return {
        accountSid: creds.account_sid,
        authToken: creds.auth_token,
        fromNumber: creds.from_number
      };
    } catch (error) {
      console.error('Error getting WhatsApp credentials:', error);
      return null;
    }
  }

  async testConnection(clientId: number): Promise<{ success: boolean; error?: string }> {
    try {
      const creds = await this.getCredentials(clientId);
      
      if (!creds) {
        return { success: false, error: 'WhatsApp credentials not configured' };
      }

      // Test by fetching account info from Twilio
      const url = `https://api.twilio.com/2010-04-01/Accounts/${creds.accountSid}.json`;
      const auth = Buffer.from(`${creds.accountSid}:${creds.authToken}`).toString('base64');

      const response = await axios.get(url, {
        headers: {
          'Authorization': `Basic ${auth}`
        }
      });

      if (response.status === 200) {
        console.log(`✅ WhatsApp connection test successful for client ${clientId}`);
        return { success: true };
      }

      return { success: false, error: 'Invalid credentials' };
    } catch (error: any) {
      console.error('WhatsApp connection test failed:', error.response?.data || error.message);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message || 'Connection test failed'
      };
    }
  }

  // ==========================================
  // MESSAGE SENDING
  // ==========================================

  async sendMessage(params: SendMessageParams): Promise<MessageResponse> {
    try {
      const {
        clientId,
        widgetId,
        conversationId,
        toNumber,
        message,
        mediaUrl,
        sentByUserId,
        sentByAgentName,
        visitorName
      } = params;

      // Get credentials
      const creds = await this.getCredentials(clientId);
      if (!creds) {
        return { success: false, error: 'WhatsApp not configured for this client' };
      }

      // Format phone numbers (ensure whatsapp: prefix)
      const formattedTo = toNumber.startsWith('whatsapp:') ? toNumber : `whatsapp:${toNumber}`;
      const formattedFrom = creds.fromNumber.startsWith('whatsapp:') 
        ? creds.fromNumber 
        : `whatsapp:${creds.fromNumber}`;

      // Prepare Twilio API request
      const url = `https://api.twilio.com/2010-04-01/Accounts/${creds.accountSid}/Messages.json`;
      const auth = Buffer.from(`${creds.accountSid}:${creds.authToken}`).toString('base64');

      const body = new URLSearchParams({
        To: formattedTo,
        From: formattedFrom,
        Body: message
      });

      if (mediaUrl) {
        body.append('MediaUrl', mediaUrl);
      }

      // Send message via Twilio
      console.log(`📱 Sending WhatsApp message:`, {
        to: formattedTo,
        from: formattedFrom,
        messageLength: message.length
      });

      const response = await axios.post(url, body.toString(), {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        validateStatus: () => true // Don't throw on errors, handle them below
      });

      const twilioData = response.data;

      // Check for Twilio errors
      if (response.status !== 200 && response.status !== 201) {
        const errorCode = twilioData.code || twilioData.error_code || 'unknown';
        const errorMessage = twilioData.message || twilioData.error_message || 'Unknown Twilio error';
        console.error(`❌ Twilio API error:`, {
          status: response.status,
          code: errorCode,
          message: errorMessage,
          to: formattedTo,
          from: formattedFrom
        });

        // Store failed message in database
        await pool.query(
          `INSERT INTO whatsapp_messages (
            widget_id, conversation_id, client_id, direction,
            from_number, to_number, message_body,
            twilio_message_sid, twilio_status,
            twilio_error_code, twilio_error_message,
            visitor_name, visitor_phone, failed_at, sent_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())`,
          [
            widgetId, conversationId, clientId, 'outbound',
            formattedFrom, formattedTo, message,
            twilioData.sid || null, 'failed',
            String(errorCode), errorMessage,
            visitorName || null, toNumber
          ]
        );

        throw new Error(`Twilio error ${errorCode}: ${errorMessage}`);
      }

      // Store message in database
      await pool.query(
        `INSERT INTO whatsapp_messages (
          widget_id,
          conversation_id,
          client_id,
          direction,
          from_number,
          to_number,
          message_body,
          twilio_message_sid,
          twilio_status,
          media_url,
          sent_by_user_id,
          sent_by_agent_name,
          visitor_name,
          visitor_phone,
          sent_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())`,
        [
          widgetId,
          conversationId,
          clientId,
          'outbound',
          formattedFrom,
          formattedTo,
          message,
          twilioData.sid,
          twilioData.status,
          mediaUrl || null,
          sentByUserId || null,
          sentByAgentName || null,
          visitorName || null,
          toNumber
        ]
      );

      // Update usage tracking
      await this.trackUsage(clientId, widgetId);

      console.log(`✅ WhatsApp message sent: ${twilioData.sid}`);

      return {
        success: true,
        messageSid: twilioData.sid,
        status: twilioData.status,
        cost: parseFloat(twilioData.price || '0')
      };

    } catch (error: any) {
      const twilioError = error.response?.data || {};
      const errorCode = twilioError.code || error.code || 'unknown';
      const errorMessage = twilioError.message || error.message || 'Unknown error';
      
      console.error('❌ Error sending WhatsApp message:', {
        status: error.response?.status,
        code: errorCode,
        message: errorMessage,
        to: params.toNumber,
        from: formattedFrom || 'unknown',
        twilioResponse: twilioError
      });
      
      // Store failed message attempt with full error details
      try {
        await pool.query(
          `INSERT INTO whatsapp_messages (
            widget_id,
            conversation_id,
            client_id,
            direction,
            from_number,
            to_number,
            message_body,
            twilio_message_sid,
            twilio_status,
            twilio_error_code,
            twilio_error_message,
            visitor_name,
            visitor_phone,
            failed_at,
            sent_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())`,
          [
            params.widgetId,
            params.conversationId,
            params.clientId,
            'outbound',
            formattedFrom || 'unknown',
            params.toNumber,
            params.message,
            twilioError.sid || null,
            'failed',
            String(errorCode),
            errorMessage,
            params.visitorName || null,
            params.toNumber.replace('whatsapp:', '')
          ]
        );
      } catch (dbError) {
        console.error('Error storing failed message:', dbError);
      }

      return {
        success: false,
        error: `Twilio error ${errorCode}: ${errorMessage}`,
        errorCode,
        errorMessage,
        twilioResponse: twilioError
      };
    }
  }

  // ==========================================
  // USAGE TRACKING
  // ==========================================

  private async trackUsage(clientId: number, widgetId: number): Promise<void> {
    try {
      // Estimate cost per message (average US rate)
      const estimatedCost = 0.006; // $0.006 per message (user-initiated conversation)

      await pool.query(
        `INSERT INTO whatsapp_usage (
          client_id,
          widget_id,
          messages_sent_today,
          messages_sent_this_month,
          total_messages_sent,
          conversations_today,
          conversations_this_month,
          total_conversations,
          estimated_cost_today,
          estimated_cost_this_month,
          total_estimated_cost
        ) VALUES ($1, $2, 1, 1, 1, 0, 0, 0, $3, $3, $3)
        ON CONFLICT (client_id, widget_id)
        DO UPDATE SET
          messages_sent_today = whatsapp_usage.messages_sent_today + 1,
          messages_sent_this_month = whatsapp_usage.messages_sent_this_month + 1,
          total_messages_sent = whatsapp_usage.total_messages_sent + 1,
          estimated_cost_today = whatsapp_usage.estimated_cost_today + $3,
          estimated_cost_this_month = whatsapp_usage.estimated_cost_this_month + $3,
          total_estimated_cost = whatsapp_usage.total_estimated_cost + $3,
          updated_at = NOW()`,
        [clientId, widgetId, estimatedCost]
      );
    } catch (error) {
      console.error('Error tracking WhatsApp usage:', error);
    }
  }

  async getUsageStats(clientId: number, widgetId?: number): Promise<any> {
    try {
      let query = `
        SELECT 
          messages_sent_today,
          messages_sent_this_month,
          total_messages_sent,
          conversations_this_month,
          estimated_cost_today,
          estimated_cost_this_month,
          total_estimated_cost
        FROM whatsapp_usage
        WHERE client_id = $1
      `;

      const params: any[] = [clientId];

      if (widgetId) {
        query += ' AND widget_id = $2';
        params.push(widgetId);
      }

      const result = await pool.query(query, params);

      if (result.rows.length === 0) {
        return {
          messages_sent_today: 0,
          messages_sent_this_month: 0,
          total_messages_sent: 0,
          conversations_this_month: 0,
          estimated_cost_today: 0,
          estimated_cost_this_month: 0,
          total_estimated_cost: 0,
          free_messages_remaining: 1000 // First 1,000 per month free
        };
      }

      const stats = result.rows[0];
      stats.free_messages_remaining = Math.max(0, 1000 - stats.messages_sent_this_month);

      return stats;
    } catch (error) {
      console.error('Error getting WhatsApp usage stats:', error);
      return null;
    }
  }

  // ==========================================
  // MESSAGE STATUS UPDATES (Webhook Handler)
  // ==========================================

  async updateMessageStatus(
    messageSid: string,
    status: string,
    errorCode?: string,
    errorMessage?: string
  ): Promise<void> {
    try {
      const updateFields: any = {
        twilio_status: status,
        updated_at: new Date()
      };

      if (status === 'delivered') {
        updateFields.delivered_at = new Date();
      } else if (status === 'failed' || status === 'undelivered') {
        updateFields.failed_at = new Date();
        updateFields.twilio_error_code = errorCode;
        updateFields.twilio_error_message = errorMessage;
      }

      const setClause = Object.keys(updateFields)
        .map((key, idx) => `${key} = $${idx + 2}`)
        .join(', ');

      await pool.query(
        `UPDATE whatsapp_messages 
         SET ${setClause}
         WHERE twilio_message_sid = $1`,
        [messageSid, ...Object.values(updateFields)]
      );

      console.log(`✅ Updated WhatsApp message ${messageSid} status to ${status}`);
    } catch (error) {
      console.error('Error updating message status:', error);
    }
  }

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  async isWhatsAppEnabled(clientId: number): Promise<boolean> {
    try {
      // Check if there are active WhatsApp credentials in whatsapp_phone_numbers table
      const result = await pool.query(
        `SELECT id 
         FROM whatsapp_phone_numbers 
         WHERE client_id = $1 AND is_active = true
         LIMIT 1`,
        [clientId]
      );

      return result.rows.length > 0;
    } catch (error) {
      console.error('Error checking WhatsApp status:', error);
      return false;
    }
  }

  async deleteCredentials(clientId: number): Promise<boolean> {
    try {
      const service = `whatsapp_client_${clientId}`;

      await pool.query(
        `DELETE FROM encrypted_credentials WHERE service = $1`,
        [service]
      );

      await pool.query(
        `UPDATE widget_configs 
         SET whatsapp_configured = false, 
             updated_at = NOW()
         WHERE client_id = $1`,
        [clientId]
      );

      console.log(`✅ WhatsApp credentials deleted for client ${clientId}`);
      return true;
    } catch (error) {
      console.error('Error deleting WhatsApp credentials:', error);
      return false;
    }
  }
}

export default WhatsAppService;

