import axios from 'axios';
import crypto from 'crypto';
import pool from '../config/database';
import { CredentialManagementService } from './credentialManagementService';

// ==========================================
// TWILIO VOICE SERVICE
// ==========================================
// Handles voice calling via Twilio API
// Similar to Vonage and other call systems
// ==========================================

interface TwilioVoiceCredentials {
  accountSid: string;
  authToken: string;
  phoneNumber: string; // Twilio phone number
}

interface InitiateCallParams {
  clientId: number;
  widgetId: number;
  conversationId?: number;
  fromNumber: string; // Customer/visitor phone
  toNumber: string; // Agent phone or Twilio number
  callerName?: string;
  recordingEnabled?: boolean;
  transcriptionEnabled?: boolean;
  statusCallbackUrl?: string;
}

interface CallResponse {
  success: boolean;
  callSid?: string;
  status?: string;
  error?: string;
  errorCode?: string;
}

export class TwilioVoiceService {
  private static instance: TwilioVoiceService;

  private constructor() {}

  static getInstance(): TwilioVoiceService {
    if (!TwilioVoiceService.instance) {
      TwilioVoiceService.instance = new TwilioVoiceService();
    }
    return TwilioVoiceService.instance;
  }

  /**
   * Get Twilio credentials for a client
   * Checks encrypted_credentials table first, then falls back to shared credentials
   */
  async getCredentials(clientId: number): Promise<TwilioVoiceCredentials | null> {
    try {
      // Try to get client-specific credentials first
      const credentialService = new CredentialManagementService();
      const creds = await credentialService.getDecryptedCredential(
        clientId,
        'twilio_voice',
        'account_sid'
      );

      if (creds) {
        const authToken = await credentialService.getDecryptedCredential(
          clientId,
          'twilio_voice',
          'auth_token'
        );
        const phoneNumber = await credentialService.getDecryptedCredential(
          clientId,
          'twilio_voice',
          'phone_number'
        );

        if (authToken && phoneNumber) {
          return {
            accountSid: creds.value,
            authToken: authToken.value,
            phoneNumber: phoneNumber.value
          };
        }
      }

      // Fallback to shared/system credentials
      const sharedCreds = await credentialService.getDecryptedCredential(
        null, // System-level
        'twilio_voice',
        'account_sid'
      );

      if (sharedCreds) {
        const authToken = await credentialService.getDecryptedCredential(
          null,
          'twilio_voice',
          'auth_token'
        );
        const phoneNumber = await credentialService.getDecryptedCredential(
          null,
          'twilio_voice',
          'phone_number'
        );

        if (authToken && phoneNumber) {
          return {
            accountSid: sharedCreds.value,
            authToken: authToken.value,
            phoneNumber: phoneNumber.value
          };
        }
      }

      // Final fallback to environment variables (for backward compatibility)
      if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
        return {
          accountSid: process.env.TWILIO_ACCOUNT_SID,
          authToken: process.env.TWILIO_AUTH_TOKEN,
          phoneNumber: process.env.TWILIO_PHONE_NUMBER || ''
        };
      }

      return null;
    } catch (error) {
      console.error('Error getting Twilio credentials:', error);
      return null;
    }
  }

  /**
   * Initiate an outbound call (customer calls agent or vice versa)
   */
  async initiateCall(params: InitiateCallParams): Promise<CallResponse> {
    try {
      const {
        clientId,
        widgetId,
        conversationId,
        fromNumber,
        toNumber,
        callerName,
        recordingEnabled = false,
        transcriptionEnabled = false,
        statusCallbackUrl
      } = params;

      // Get credentials
      const creds = await this.getCredentials(clientId);
      if (!creds) {
        return { success: false, error: 'Twilio voice not configured for this client' };
      }

      // Get call settings
      const settingsResult = await pool.query(
        `SELECT * FROM call_settings WHERE widget_id = $1 AND is_active = true`,
        [widgetId]
      );

      const settings = settingsResult.rows[0];
      const twilioPhone = settings?.twilio_phone_number || creds.phoneNumber;

      // Format phone numbers (ensure E.164 format)
      const formattedFrom = fromNumber.startsWith('+') ? fromNumber : `+1${fromNumber.replace(/\D/g, '')}`;
      const formattedTo = toNumber.startsWith('+') ? toNumber : `+1${toNumber.replace(/\D/g, '')}`;
      const formattedTwilioPhone = twilioPhone.startsWith('+') ? twilioPhone : `+1${twilioPhone.replace(/\D/g, '')}`;

      // Build TwiML for call (connects customer to agent)
      const baseUrl = process.env.BACKEND_URL || process.env.HEROKU_APP_URL || 'https://marketingby-wetechforu-b67c6bd0bf6b.herokuapp.com';
      const statusCallback = statusCallbackUrl || `${baseUrl}/api/twilio/voice/status-callback`;

      // Prepare Twilio API request
      const url = `https://api.twilio.com/2010-04-01/Accounts/${creds.accountSid}/Calls.json`;
      const auth = Buffer.from(`${creds.accountSid}:${creds.authToken}`).toString('base64');

      // Build TwiML URL for connecting the call
      const connectUrl = `${baseUrl}/api/twilio/voice/connect?from=${encodeURIComponent(formattedFrom)}&to=${encodeURIComponent(formattedTo)}&callerName=${encodeURIComponent(callerName || 'Customer')}`;

      const body = new URLSearchParams({
        From: formattedTwilioPhone,
        To: formattedTo, // Agent or destination number
        Url: connectUrl,
        Method: 'GET',
        StatusCallback: statusCallback,
        StatusCallbackEvent: 'initiated,ringing,answered,completed',
        StatusCallbackMethod: 'POST'
      });

      // Add optional parameters
      if (recordingEnabled) {
        body.append('Record', 'true');
        body.append('RecordingStatusCallback', `${baseUrl}/api/twilio/voice/recording-callback`);
      }

      if (transcriptionEnabled) {
        body.append('Transcribe', 'true');
        body.append('TranscribeCallback', `${baseUrl}/api/twilio/voice/transcription-callback`);
      }

      console.log(`📞 Initiating Twilio call:`, {
        from: formattedFrom,
        to: formattedTo,
        twilioPhone: formattedTwilioPhone
      });

      const response = await axios.post(url, body.toString(), {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        validateStatus: () => true
      });

      const twilioData = response.data;

      if (response.status !== 201 || twilioData.error_code) {
        const errorMessage = twilioData.message || 'Failed to initiate call';
        const errorCode = twilioData.error_code || 'UNKNOWN';
        console.error(`❌ Twilio call error:`, errorMessage, errorCode);
        return { success: false, error: errorMessage, errorCode };
      }

      const callSid = twilioData.sid;
      const status = twilioData.status;

      // Store call in database
      await pool.query(
        `INSERT INTO calls (
          call_sid, widget_id, client_id, conversation_id,
          direction, status, from_number, to_number, caller_name,
          recording_sid, initiated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
        [
          callSid,
          widgetId,
          clientId,
          conversationId || null,
          'outbound',
          status,
          formattedFrom,
          formattedTo,
          callerName || null,
          twilioData.recording_sid || null
        ]
      );

      console.log(`✅ Call initiated successfully: ${callSid}`);

      return {
        success: true,
        callSid,
        status
      };
    } catch (error: any) {
      console.error('Error initiating call:', error);
      return {
        success: false,
        error: error.message || 'Failed to initiate call',
        errorCode: error.code || 'UNKNOWN'
      };
    }
  }

  /**
   * Handle incoming call (when customer calls Twilio number)
   */
  async handleIncomingCall(callSid: string, fromNumber: string, toNumber: string): Promise<string> {
    try {
      // Find widget by Twilio number
      const widgetResult = await pool.query(
        `SELECT w.id, w.client_id, cs.default_agent_phone, cs.greeting_message
         FROM widget_configs w
         LEFT JOIN call_settings cs ON cs.widget_id = w.id
         WHERE cs.twilio_phone_number = $1 OR w.call_phone_number = $1
         LIMIT 1`,
        [toNumber]
      );

      if (widgetResult.rows.length === 0) {
        return '<?xml version="1.0" encoding="UTF-8"?><Response><Say>Sorry, this number is not configured.</Say><Hangup/></Response>';
      }

      const widget = widgetResult.rows[0];
      const agentPhone = widget.default_agent_phone;

      // Store incoming call
      await pool.query(
        `INSERT INTO calls (
          call_sid, widget_id, client_id,
          direction, status, from_number, to_number,
          initiated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [callSid, widget.id, widget.client_id, 'inbound', 'ringing', fromNumber, toNumber]
      );

      // Build TwiML response
      let twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>';

      // Greeting message
      if (widget.greeting_message) {
        twiml += `<Say voice="alice">${widget.greeting_message}</Say>`;
      }

      // Connect to agent
      if (agentPhone) {
        twiml += `<Dial callerId="${toNumber}">`;
        twiml += `<Number>${agentPhone}</Number>`;
        twiml += `</Dial>`;
      } else {
        twiml += '<Say>Please hold while we connect you to an agent.</Say>';
        twiml += '<Dial>';
        // Add queue logic here if needed
        twiml += '</Dial>';
      }

      twiml += '</Response>';

      return twiml;
    } catch (error) {
      console.error('Error handling incoming call:', error);
      return '<?xml version="1.0" encoding="UTF-8"?><Response><Say>Sorry, there was an error processing your call.</Say><Hangup/></Response>';
    }
  }

  /**
   * Update call status from Twilio webhook
   */
  async updateCallStatus(callSid: string, status: string, duration?: number, recordingUrl?: string): Promise<void> {
    try {
      const updateData: any = {
        status,
        updated_at: 'NOW()'
      };

      if (status === 'completed' || status === 'answered') {
        updateData.ended_at = 'NOW()';
        if (status === 'answered') {
          updateData.answered_at = 'NOW()';
        }
      }

      if (duration) {
        updateData.duration_seconds = duration;
      }

      if (recordingUrl) {
        updateData.recording_url = recordingUrl;
      }

      const setClause = Object.keys(updateData).map((key, idx) => {
        if (updateData[key] === 'NOW()') {
          return `${key} = NOW()`;
        }
        return `${key} = $${idx + 1}`;
      }).join(', ');

      const values = Object.values(updateData).filter(v => v !== 'NOW()');

      await pool.query(
        `UPDATE calls SET ${setClause} WHERE call_sid = $${values.length + 1}`,
        [...values, callSid]
      );

      console.log(`✅ Call status updated: ${callSid} -> ${status}`);
    } catch (error) {
      console.error('Error updating call status:', error);
    }
  }

  /**
   * Get call details
   */
  async getCallDetails(callSid: string) {
    try {
      const result = await pool.query(
        `SELECT * FROM calls WHERE call_sid = $1`,
        [callSid]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting call details:', error);
      return null;
    }
  }

  /**
   * End a call
   */
  async endCall(callSid: string): Promise<boolean> {
    try {
      const call = await this.getCallDetails(callSid);
      if (!call) {
        return false;
      }

      const creds = await this.getCredentials(call.client_id);
      if (!creds) {
        return false;
      }

      // Use Twilio API to end call
      const url = `https://api.twilio.com/2010-04-01/Accounts/${creds.accountSid}/Calls/${callSid}.json`;
      const auth = Buffer.from(`${creds.accountSid}:${creds.authToken}`).toString('base64');

      await axios.post(url, 'Status=completed', {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      await this.updateCallStatus(callSid, 'completed');

      return true;
    } catch (error) {
      console.error('Error ending call:', error);
      return false;
    }
  }
}

