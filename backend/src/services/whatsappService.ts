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
  errorCode?: string;
  errorMessage?: string;
  twilioResponse?: any;
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

  /**
   * Send a WhatsApp Template message using Twilio Content API
   * Requires a Twilio Content SID configured in env (per template)
   * - Set TWILIO_CONTENT_SID_HANDOVER for the Agent Handover template
   * - Content variables provided as a plain object (will be JSON-stringified)
   */
  async sendTemplateMessage(params: Omit<SendMessageParams, 'message'> & {
    templateType?: 'handover';
    contentSid?: string; // optional override, falls back to env variable
    variables?: Record<string, any>;
  }): Promise<MessageResponse> {
    let formattedTo: string = '';
    let formattedFrom: string = '';
    try {
      const { clientId, widgetId, conversationId, toNumber, mediaUrl, sentByUserId, sentByAgentName, visitorName, templateType, contentSid, variables } = params;

      const creds = await this.getCredentials(clientId);
      if (!creds) {
        return { success: false, error: 'WhatsApp not configured for this client' };
      }

      // Prefer per-client Content SID from widget_configs; fallback to explicit contentSid; then env
      let effectiveContentSid = contentSid as string | undefined;
      if (!effectiveContentSid) {
        try {
          const sidResult = await pool.query(
            `SELECT whatsapp_handover_content_sid FROM widget_configs WHERE client_id = $1 LIMIT 1`,
            [clientId]
          );
          const dbSid = sidResult.rows?.[0]?.whatsapp_handover_content_sid;
          effectiveContentSid = dbSid || effectiveContentSid;
        } catch {}
      }
      if (!effectiveContentSid && templateType === 'handover') {
        effectiveContentSid = process.env.TWILIO_CONTENT_SID_HANDOVER;
      }

      if (!effectiveContentSid) {
        return { success: false, error: 'WhatsApp template not configured (missing Content SID)' };
      }

      formattedTo = toNumber.startsWith('whatsapp:') ? toNumber : `whatsapp:${toNumber}`;
      formattedFrom = creds.fromNumber.startsWith('whatsapp:') ? creds.fromNumber : `whatsapp:${creds.fromNumber}`;

      const url = `https://api.twilio.com/2010-04-01/Accounts/${creds.accountSid}/Messages.json`;
      const auth = Buffer.from(`${creds.accountSid}:${creds.authToken}`).toString('base64');

      const contentVariables = variables ? JSON.stringify(variables) : undefined;

      const body = new URLSearchParams({
        To: formattedTo,
        From: formattedFrom,
        ContentSid: effectiveContentSid,
      });
      if (contentVariables) body.append('ContentVariables', contentVariables);
      if (mediaUrl) body.append('MediaUrl', mediaUrl);

      console.log('📄 Sending WhatsApp template message via Content API', {
        to: formattedTo,
        from: formattedFrom,
        contentSid: effectiveContentSid,
        hasVariables: Boolean(contentVariables),
        clientId: clientId,
        widgetId: widgetId,
        conversationId: conversationId,
        templateType: templateType,
        variables: variables
      });

      const response = await axios.post(url, body.toString(), {
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        validateStatus: () => true,
      });

      const twilioData = response.data;
      if (response.status !== 200 && response.status !== 201) {
        const errorCode = twilioData.code || twilioData.error_code || 'unknown';
        const errorMessage = twilioData.message || twilioData.error_message || 'Unknown Twilio error';
        console.error('❌ Twilio Template send error', { status: response.status, errorCode, errorMessage });
        return { success: false, error: `Twilio error ${errorCode}: ${errorMessage}`, errorCode, errorMessage, twilioResponse: twilioData };
      }

      // Persist a synthetic body to indicate template used
      const persistedBody = `[TEMPLATE:${effectiveContentSid}]`;
      await pool.query(
        `INSERT INTO whatsapp_messages (
          widget_id, conversation_id, client_id, direction,
          from_number, to_number, message_body,
          twilio_message_sid, twilio_status, media_url,
          sent_by_user_id, sent_by_agent_name, visitor_name, visitor_phone, sent_at
        ) VALUES ($1, $2, $3, 'outbound', $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())`,
        [
          widgetId,
          conversationId,
          clientId,
          formattedFrom,
          formattedTo,
          persistedBody,
          twilioData.sid,
          twilioData.status,
          mediaUrl || null,
          sentByUserId || null,
          sentByAgentName || null,
          visitorName || null,
          toNumber.replace('whatsapp:', ''),
        ]
      );

      // Extract actual price from Twilio response
      // Twilio returns: price (e.g., "-0.00900") and price_unit (e.g., "USD")
      // Note: price is negative for outbound messages (debit from account)
      const actualPrice = twilioData.price ? Math.abs(parseFloat(twilioData.price)) : null;
      
      // Store actual price in database if available
      if (actualPrice && twilioData.sid) {
        try {
          await pool.query(
            `UPDATE whatsapp_messages 
             SET twilio_price = $1, twilio_price_unit = $2 
             WHERE twilio_message_sid = $3`,
            [actualPrice, twilioData.price_unit || 'USD', twilioData.sid]
          );
        } catch (err) {
          console.warn('Could not update message price:', err);
        }
      }
      
      // Track usage with actual price from Twilio, fallback to estimated if not available
      // Template messages are always conversation initiations, so use 0.009 (template cost)
      const costToTrack = actualPrice || 0.009;
      await this.trackUsage(clientId, widgetId, true, costToTrack); // true = track as conversation
      
      return { 
        success: true, 
        messageSid: twilioData.sid, 
        status: twilioData.status,
        cost: actualPrice || undefined
      };
    } catch (error: any) {
      const twilioError = error.response?.data || {};
      const errorCode = twilioError.code || error.code || 'unknown';
      const errorMessage = twilioError.message || error.message || 'Unknown error';
      console.error('❌ Error sending WhatsApp template message', { code: errorCode, message: errorMessage });
      return { success: false, error: `Twilio error ${errorCode}: ${errorMessage}`, errorCode, errorMessage, twilioResponse: twilioError };
    }
  }

  async sendMessage(params: SendMessageParams): Promise<MessageResponse> {
    // Declare variables in outer scope for error handling
    let formattedTo: string = '';
    let formattedFrom: string = '';
    
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
      formattedTo = toNumber.startsWith('whatsapp:') ? toNumber : `whatsapp:${toNumber}`;
      formattedFrom = creds.fromNumber.startsWith('whatsapp:') 
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

        // If outside 24h window (WhatsApp error 63016), try template send as fallback
        if (String(errorCode) === '63016') {
          console.warn('🔁 Retrying with WhatsApp Template (Content API) due to 63016 window error');
          return await this.sendTemplateMessage({
            clientId,
            widgetId,
            conversationId,
            toNumber: toNumber.replace('whatsapp:', ''),
            templateType: 'handover',
            variables: {
              client_name: sentByAgentName || 'Agent',
              visitor_name: visitorName || 'Customer',
              conversation_id: conversationId,
              message_preview: (message || '').slice(0, 120),
            },
          });
        }

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

      // Extract actual price from Twilio response
      // Twilio returns: price (e.g., "-0.00500") and price_unit (e.g., "USD")
      // Note: price is negative for outbound messages (debit from account)
      const actualPrice = twilioData.price ? Math.abs(parseFloat(twilioData.price)) : null;
      
      // Store actual price in database if available
      if (actualPrice && twilioData.sid) {
        try {
          await pool.query(
            `UPDATE whatsapp_messages 
             SET twilio_price = $1, twilio_price_unit = $2 
             WHERE twilio_message_sid = $3`,
            [actualPrice, twilioData.price_unit || 'USD', twilioData.sid]
          );
        } catch (err) {
          console.warn('Could not update message price:', err);
        }
      }
      
      // Track usage with actual price from Twilio, fallback to estimated if not available
      const costToTrack = actualPrice || 0.005;
      await this.trackUsage(clientId, widgetId, false, costToTrack);

      console.log(`✅ WhatsApp message sent: ${twilioData.sid}${actualPrice ? ` (Cost: $${actualPrice})` : ''}`);

      return {
        success: true,
        messageSid: twilioData.sid,
        status: twilioData.status,
        cost: actualPrice || undefined
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

  /**
   * Get actual message price from Twilio API
   * Falls back to estimated cost if API call fails
   */
  private async getMessagePriceFromTwilio(
    messageSid: string, 
    accountSid: string, 
    authToken: string,
    trackConversation: boolean
  ): Promise<number> {
    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages/${messageSid}.json`;
      const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
      
      const response = await axios.get(url, {
        headers: {
          Authorization: `Basic ${auth}`
        },
        validateStatus: () => true
      });
      
      if (response.status === 200 && response.data.price) {
        // Twilio returns negative price for outbound messages, make it positive
        const actualPrice = Math.abs(parseFloat(response.data.price));
        console.log(`✅ Fetched actual price from Twilio for ${messageSid}: $${actualPrice}`);
        return actualPrice;
      }
    } catch (error) {
      console.warn(`⚠️ Could not fetch price from Twilio for ${messageSid}, using estimate:`, error);
    }
    
    // Fallback to estimated costs
    return trackConversation ? 0.009 : 0.005;
  }

  private async trackUsage(
    clientId: number, 
    widgetId: number, 
    trackConversation: boolean = false,
    actualCost?: number
  ): Promise<void> {
    try {
      // Use actual cost from Twilio if provided, otherwise estimate
      // Default estimates:
      // - Template message (conversation initiation): $0.009
      // - Session message (within 24h): $0.005
      const costToUse = actualCost !== undefined 
        ? actualCost 
        : (trackConversation ? 0.009 : 0.005);

      const conversationIncrement = trackConversation ? 1 : 0;
      
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
          total_estimated_cost,
          last_daily_reset,
          last_monthly_reset,
          actual_cost_today,
          actual_cost_this_month,
          total_actual_cost
        ) VALUES ($1, $2, 1, 1, 1, $3, $3, $3, $4, $4, $4, CURRENT_DATE, date_trunc('month', CURRENT_DATE), COALESCE($5, 0), COALESCE($5, 0), COALESCE($5, 0))
        ON CONFLICT (client_id, widget_id)
        DO UPDATE SET
          messages_sent_today = whatsapp_usage.messages_sent_today + 1,
          messages_sent_this_month = whatsapp_usage.messages_sent_this_month + 1,
          total_messages_sent = whatsapp_usage.total_messages_sent + 1,
          conversations_today = whatsapp_usage.conversations_today + $3,
          conversations_this_month = whatsapp_usage.conversations_this_month + $3,
          total_conversations = whatsapp_usage.total_conversations + $3,
          estimated_cost_today = whatsapp_usage.estimated_cost_today + $4,
          estimated_cost_this_month = whatsapp_usage.estimated_cost_this_month + $4,
          total_estimated_cost = whatsapp_usage.total_estimated_cost + $4,
          actual_cost_today = CASE 
            WHEN $5 IS NOT NULL THEN whatsapp_usage.actual_cost_today + $5
            ELSE whatsapp_usage.actual_cost_today
          END,
          actual_cost_this_month = CASE 
            WHEN $5 IS NOT NULL THEN whatsapp_usage.actual_cost_this_month + $5
            ELSE whatsapp_usage.actual_cost_this_month
          END,
          total_actual_cost = CASE 
            WHEN $5 IS NOT NULL THEN whatsapp_usage.total_actual_cost + $5
            ELSE whatsapp_usage.total_actual_cost
          END,
          updated_at = NOW()`,
        [clientId, widgetId, conversationIncrement, costToUse, actualCost || null]
      );
      
      console.log(`✅ Tracked WhatsApp usage: Client ${clientId}, Widget ${widgetId}, Message: +1${trackConversation ? ', Conversation: +1' : ''}, Cost: $${costToUse.toFixed(4)}${actualCost !== undefined ? ' (actual)' : ' (estimated)'}`);
    } catch (error) {
      console.error('Error tracking WhatsApp usage:', error);
    }
  }

  async getUsageStats(clientId: number, widgetId?: number): Promise<any> {
    try {
      // First, recalculate actual costs from messages (more accurate than incrementally tracking)
      await this.recalculateActualCosts(clientId, widgetId);
      
      // Also fetch missing prices in background (don't wait)
      this.fetchMissingPrices(clientId).catch(err => 
        console.warn('Background price fetch failed:', err)
      );
      
      let query = `
        SELECT 
          messages_sent_today,
          messages_sent_this_month,
          total_messages_sent,
          conversations_this_month,
          estimated_cost_today,
          estimated_cost_this_month,
          total_estimated_cost,
          COALESCE(actual_cost_today, 0) as actual_cost_today,
          COALESCE(actual_cost_this_month, 0) as actual_cost_this_month,
          COALESCE(total_actual_cost, 0) as total_actual_cost,
          last_monthly_reset
        FROM whatsapp_usage
        WHERE client_id = $1
      `;

      const params: any[] = [clientId];

      if (widgetId) {
        query += ' AND widget_id = $2';
        params.push(widgetId);
      }

      const result = await pool.query(query, params);

      // Calculate next reset date (first day of next month)
      const now = new Date();
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const nextResetDate = nextMonth.toISOString().split('T')[0];

      if (result.rows.length === 0) {
        return {
          messages_sent_today: 0,
          messages_sent_this_month: 0,
          messages_this_month: 0, // Alias for frontend compatibility
          total_messages_sent: 0,
          conversations_this_month: 0,
          estimated_cost_today: 0,
          estimated_cost_this_month: 0,
          total_estimated_cost: 0,
          actual_cost_today: 0,
          actual_cost_this_month: 0,
          total_actual_cost: 0,
          free_messages_remaining: 1000, // First 1,000 per month free
          next_reset_date: nextResetDate
        };
      }

      const stats = result.rows[0];
      
      // Add aliases and calculated fields for frontend compatibility
      stats.messages_this_month = stats.messages_sent_this_month; // Alias
      stats.free_messages_remaining = Math.max(0, 1000 - (stats.conversations_this_month || 0));
      
      // Use actual cost if available (even if 0), otherwise fall back to estimated
      // Check if we have any messages with actual prices to determine if we should use actual or estimated
      // Also check if there are messages with prices in the database (even if not yet aggregated)
      const hasActualPrices = (stats.actual_cost_this_month !== null && stats.actual_cost_this_month !== undefined);
      
      // Double-check: query messages directly to see if any have prices
      let hasMessagesWithPrices = false;
      if (!hasActualPrices) {
        try {
          let priceCheckQuery = `SELECT COUNT(*) as count FROM whatsapp_messages 
                                 WHERE client_id = $1 AND twilio_price IS NOT NULL AND direction = 'outbound'`;
          const priceCheckParams: any[] = [clientId];
          if (widgetId) {
            priceCheckQuery += ' AND widget_id = $2';
            priceCheckParams.push(widgetId);
          }
          const priceCheckResult = await pool.query(priceCheckQuery, priceCheckParams);
          hasMessagesWithPrices = parseInt(priceCheckResult.rows[0]?.count || '0') > 0;
        } catch (e) {
          console.warn('Could not check for messages with prices:', e);
        }
      }
      
      stats.cost_this_month = (hasActualPrices || hasMessagesWithPrices)
        ? (stats.actual_cost_this_month || 0)
        : stats.estimated_cost_this_month;
      stats.total_cost = (stats.total_actual_cost !== null && stats.total_actual_cost !== undefined)
        ? stats.total_actual_cost 
        : stats.total_estimated_cost;
      stats.has_actual_prices = hasActualPrices || hasMessagesWithPrices;
      stats.next_reset_date = stats.last_monthly_reset 
        ? (() => {
            const lastReset = new Date(stats.last_monthly_reset);
            const nextMonth = new Date(lastReset.getFullYear(), lastReset.getMonth() + 1, 1);
            return nextMonth.toISOString().split('T')[0];
          })()
        : nextResetDate;

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
    errorMessage?: string,
    price?: number | null,
    priceUnit?: string
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

      // Update price if provided (from status callback)
      if (price !== undefined && price !== null) {
        updateFields.twilio_price = price;
        updateFields.twilio_price_unit = priceUnit || 'USD';
      }

      const setClause = Object.keys(updateFields)
        .map((key, idx) => `${key} = $${idx + 2}`)
        .join(', ');

      const result = await pool.query(
        `UPDATE whatsapp_messages 
         SET ${setClause}
         WHERE twilio_message_sid = $1
         RETURNING client_id, widget_id, twilio_price`,
        [messageSid, ...Object.values(updateFields)]
      );

      // If we just got the price, update usage stats with actual cost
      if (price !== undefined && price !== null && result.rows.length > 0) {
        const row = result.rows[0];
        // Only update if price wasn't set before (to avoid double counting)
        if (!row.twilio_price) {
          await pool.query(
            `UPDATE whatsapp_usage
             SET actual_cost_today = COALESCE(actual_cost_today, 0) + $1,
                 actual_cost_this_month = COALESCE(actual_cost_this_month, 0) + $1,
                 total_actual_cost = COALESCE(total_actual_cost, 0) + $1,
                 updated_at = NOW()
             WHERE client_id = $2 AND widget_id = $3`,
            [price, row.client_id, row.widget_id]
          );
          console.log(`✅ Updated actual cost for message ${messageSid}: $${price}`);
        }
      }

      console.log(`✅ Updated WhatsApp message ${messageSid} status to ${status}${price !== undefined && price !== null ? ` (Price: $${price})` : ''}`);
    } catch (error) {
      console.error('Error updating message status:', error);
    }
  }

  /**
   * Fetch and update missing message prices from Twilio API
   * Called periodically or after status updates to ensure all messages have actual prices
   */
  async fetchMissingPrices(clientId?: number): Promise<void> {
    try {
      // Get messages without prices that have been sent
      let query = `
        SELECT 
          wm.twilio_message_sid,
          wm.client_id,
          wm.widget_id,
          wm.created_at,
          ec.credential_value->>'accountSid' as account_sid,
          ec.credential_value->>'authToken' as auth_token
        FROM whatsapp_messages wm
        LEFT JOIN encrypted_credentials ec ON ec.service = 'whatsapp_client_' || wm.client_id::text
        WHERE wm.twilio_message_sid IS NOT NULL
          AND wm.twilio_price IS NULL
          AND wm.direction = 'outbound'
          AND wm.created_at > NOW() - INTERVAL '30 days'
      `;
      
      const params: any[] = [];
      if (clientId) {
        query += ' AND wm.client_id = $1';
        params.push(clientId);
      }
      
      query += ' LIMIT 100'; // Process 100 at a time
      
      const result = await pool.query(query, params);
      
      if (result.rows.length === 0) {
        return;
      }

      console.log(`🔄 Fetching prices for ${result.rows.length} messages...`);

      for (const row of result.rows) {
        try {
          if (!row.account_sid || !row.auth_token) {
            continue;
          }

          const price = await this.getMessagePriceFromTwilio(
            row.twilio_message_sid,
            row.account_sid,
            row.auth_token,
            true // Assume template/conversation messages
          );

          if (price && price !== 0.009 && price !== 0.005) {
            // Only update if we got a real price (not fallback estimate)
            await pool.query(
              `UPDATE whatsapp_messages 
               SET twilio_price = $1, twilio_price_unit = 'USD'
               WHERE twilio_message_sid = $2`,
              [price, row.twilio_message_sid]
            );

            // Update usage stats
            await pool.query(
              `UPDATE whatsapp_usage
               SET actual_cost_today = COALESCE(actual_cost_today, 0) + $1,
                   actual_cost_this_month = COALESCE(actual_cost_this_month, 0) + $1,
                   total_actual_cost = COALESCE(total_actual_cost, 0) + $1,
                   updated_at = NOW()
               WHERE client_id = $2 AND widget_id = $3`,
              [price, row.client_id, row.widget_id]
            );
          }
        } catch (err) {
          console.warn(`⚠️ Could not fetch price for ${row.twilio_message_sid}:`, err);
        }
        
        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error('Error fetching missing prices:', error);
    }
  }

  /**
   * Recalculate actual costs from messages for accurate billing
   * This ensures we always show the most up-to-date actual costs
   */
  async recalculateActualCosts(clientId: number, widgetId?: number): Promise<void> {
    try {
      let query = `
        SELECT 
          client_id,
          widget_id,
          SUM(CASE WHEN DATE_TRUNC('day', sent_at) = CURRENT_DATE AND twilio_price IS NOT NULL 
                   THEN twilio_price ELSE 0 END) as cost_today,
          SUM(CASE WHEN DATE_TRUNC('month', sent_at) = DATE_TRUNC('month', CURRENT_DATE) 
                      AND twilio_price IS NOT NULL 
                   THEN twilio_price ELSE 0 END) as cost_this_month,
          SUM(CASE WHEN twilio_price IS NOT NULL THEN twilio_price ELSE 0 END) as total_cost
        FROM whatsapp_messages
        WHERE client_id = $1 AND direction = 'outbound'
      `;
      
      const params: any[] = [clientId];
      if (widgetId) {
        query += ' AND widget_id = $2';
        params.push(widgetId);
      }
      query += ' GROUP BY client_id, widget_id';
      
      const result = await pool.query(query, params);
      
      for (const row of result.rows) {
        await pool.query(
          `UPDATE whatsapp_usage
           SET actual_cost_today = $1,
               actual_cost_this_month = $2,
               total_actual_cost = $3,
               updated_at = NOW()
           WHERE client_id = $4 AND widget_id = $5`,
          [
            parseFloat(row.cost_today) || 0,
            parseFloat(row.cost_this_month) || 0,
            parseFloat(row.total_cost) || 0,
            row.client_id,
            row.widget_id
          ]
        );
      }
    } catch (error) {
      console.error('Error recalculating actual costs:', error);
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

