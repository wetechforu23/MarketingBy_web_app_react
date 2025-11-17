import pool from '../config/database';
import { TwilioVoiceService } from './twilioVoiceService';

// ==========================================
// CALL ROUTING SERVICE
// ==========================================
// Handles intelligent call routing with IVR, AI, and staff routing
// ==========================================

interface IVRMenuOption {
  digit: string;
  label: string;
  description?: string;
  routeType: 'staff' | 'department' | 'voicemail' | 'ai' | 'external';
  routeTargetId?: number;
  routeTargetPhone?: string;
  departmentName?: string;
  aiPrompt?: string;
  aiFallbackToStaff?: boolean;
}

interface StaffRoutingConfig {
  userId: number;
  priority: number;
  receiveInPortal: boolean;
  staffPhone?: string;
  useStaffPhone: boolean;
  department?: string;
  skills?: string[];
  isAvailable: boolean;
}

interface CallRoutingResult {
  success: boolean;
  twiml?: string;
  routingType?: 'ivr' | 'ai' | 'staff' | 'voicemail' | 'queue';
  targetStaffId?: number;
  targetPhone?: string;
  error?: string;
}

export class CallRoutingService {
  private static instance: CallRoutingService;
  private voiceService: TwilioVoiceService;

  private constructor() {
    this.voiceService = TwilioVoiceService.getInstance();
  }

  static getInstance(): CallRoutingService {
    if (!CallRoutingService.instance) {
      CallRoutingService.instance = new CallRoutingService();
    }
    return CallRoutingService.instance;
  }

  /**
   * Handle incoming call with routing logic
   */
  async handleIncomingCall(
    callSid: string,
    fromNumber: string,
    toNumber: string,
    clientId?: number
  ): Promise<string> {
    try {
      // Find call settings by Twilio number
      const settingsResult = await pool.query(
        `SELECT cs.*, w.client_id
         FROM call_settings cs
         LEFT JOIN widget_configs w ON w.id = cs.widget_id
         WHERE cs.twilio_phone_number = $1 AND cs.is_active = true
         LIMIT 1`,
        [toNumber]
      );

      if (settingsResult.rows.length === 0) {
        return this.generateErrorTwiML('This number is not configured.');
      }

      const settings = settingsResult.rows[0];
      const actualClientId = clientId || settings.client_id;

      // Store incoming call
      await pool.query(
        `INSERT INTO calls (
          call_sid, widget_id, client_id,
          direction, status, from_number, to_number,
          initiated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [
          callSid,
          settings.widget_id,
          actualClientId,
          'inbound',
          'ringing',
          fromNumber,
          toNumber
        ]
      );

      // Check if AI call handling is enabled
      if (settings.enable_ai_call_handling) {
        return await this.handleAICall(callSid, fromNumber, toNumber, settings, actualClientId);
      }

      // Check if IVR menu is enabled
      if (settings.enable_ivr_menu) {
        return await this.handleIVRMenu(callSid, fromNumber, toNumber, settings, actualClientId);
      }

      // Default: Route directly to staff
      return await this.routeToStaff(callSid, fromNumber, toNumber, settings, actualClientId, null);

    } catch (error: any) {
      console.error('Error handling incoming call:', error);
      return this.generateErrorTwiML('Error processing your call.');
    }
  }

  /**
   * Handle AI-powered call answering
   */
  private async handleAICall(
    callSid: string,
    fromNumber: string,
    toNumber: string,
    settings: any,
    clientId: number
  ): Promise<string> {
    // Log routing step
    await this.logRoutingStep(callSid, 'ai', 'AI Call Handling', null, null);

    // Generate TwiML for AI interaction
    // This will use Twilio's <Gather> to collect speech input
    const baseUrl = process.env.BACKEND_URL || 'https://marketingby-wetechforu-b67c6bd0bf6b.herokuapp.com';
    const gatherUrl = `${baseUrl}/api/twilio/voice/ai-gather?callSid=${callSid}&clientId=${clientId}`;

    let twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>';

    // Greeting
    if (settings.greeting_message) {
      twiml += `<Say voice="alice">${settings.greeting_message}</Say>`;
    } else {
      twiml += `<Say voice="alice">Thank you for calling. How can I help you today?</Say>`;
    }

    // Gather speech input (AI will process this)
    twiml += `<Gather input="speech" action="${gatherUrl}" method="POST" speechTimeout="auto" timeout="10">`;
    twiml += `<Say voice="alice">Please tell me how I can help you.</Say>`;
    twiml += `</Gather>`;

    // Fallback if no input
    twiml += `<Say voice="alice">I didn't catch that. Let me connect you with a staff member.</Say>`;
    twiml += `<Redirect>${baseUrl}/api/twilio/voice/route-to-staff?callSid=${callSid}&clientId=${clientId}</Redirect>`;
    twiml += '</Response>';

    return twiml;
  }

  /**
   * Handle IVR menu (digit-based routing)
   */
  private async handleIVRMenu(
    callSid: string,
    fromNumber: string,
    toNumber: string,
    settings: any,
    clientId: number
  ): Promise<string> {
    // Get IVR menu options
    const menuOptions = await this.getIVRMenuOptions(clientId, settings.id);

    if (menuOptions.length === 0) {
      // No IVR menu configured, route directly to staff
      return await this.routeToStaff(callSid, fromNumber, toNumber, settings, clientId, null);
    }

    // Log routing step
    await this.logRoutingStep(callSid, 'ivr', 'IVR Menu', null, null);

    const baseUrl = process.env.BACKEND_URL || 'https://marketingby-wetechforu-b67c6bd0bf6b.herokuapp.com';
    const gatherUrl = `${baseUrl}/api/twilio/voice/ivr-gather?callSid=${callSid}&clientId=${clientId}`;

    let twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>';

    // Greeting
    if (settings.greeting_message) {
      twiml += `<Say voice="alice">${settings.greeting_message}</Say>`;
    }

    // Build menu options
    let menuText = 'Please select from the following options. ';
    for (const option of menuOptions.sort((a, b) => parseInt(a.digit) - parseInt(b.digit))) {
      menuText += `${option.label}, press ${option.digit}. `;
    }
    menuText += 'To speak with the next available staff member, press 0.';

    twiml += `<Say voice="alice">${menuText}</Say>`;

    // Gather digit input
    twiml += `<Gather input="dtmf" action="${gatherUrl}" method="POST" numDigits="1" timeout="10">`;
    twiml += `<Say voice="alice">Please press a number.</Say>`;
    twiml += `</Gather>`;

    // Timeout: Route to staff
    twiml += `<Say voice="alice">Connecting you to the next available staff member.</Say>`;
    twiml += `<Redirect>${baseUrl}/api/twilio/voice/route-to-staff?callSid=${callSid}&clientId=${clientId}</Redirect>`;
    twiml += '</Response>';

    return twiml;
  }

  /**
   * Process IVR digit selection
   */
  async processIVRDigit(
    callSid: string,
    digit: string,
    clientId: number,
    settingsId: number
  ): Promise<string> {
    try {
      // Get IVR menu option for this digit
      const optionResult = await pool.query(
        `SELECT * FROM ivr_menu_options
         WHERE client_id = $1 AND menu_digit = $2 AND call_settings_id = $3 AND is_active = true
         LIMIT 1`,
        [clientId, digit, settingsId]
      );

      if (optionResult.rows.length === 0) {
        // Invalid digit, route to staff
        return await this.routeToStaffByClient(callSid, clientId, null);
      }

      const option = optionResult.rows[0];

      // Log routing step
      await this.logRoutingStep(
        callSid,
        'ivr',
        `IVR Option: ${option.menu_label}`,
        option.id,
        null
      );

      // Route based on option type
      switch (option.route_type) {
        case 'staff':
          return await this.routeToStaff(
            callSid,
            '',
            '',
            null,
            clientId,
            option.route_target_id || null
          );

        case 'department':
          return await this.routeToDepartment(
            callSid,
            clientId,
            option.department_name || ''
          );

        case 'voicemail':
          return await this.routeToVoicemail(callSid, clientId, option.id);

        case 'ai':
          return await this.handleAIOption(callSid, clientId, option);

        case 'external':
          return await this.routeToExternal(callSid, option.route_target_phone || '');

        default:
          return await this.routeToStaffByClient(callSid, clientId, null);
      }
    } catch (error: any) {
      console.error('Error processing IVR digit:', error);
      return await this.routeToStaffByClient(callSid, clientId, null);
    }
  }

  /**
   * Route call to staff member(s)
   */
  async routeToStaff(
    callSid: string,
    fromNumber: string,
    toNumber: string,
    settings: any,
    clientId: number,
    specificStaffId: number | null
  ): Promise<string> {
    try {
      // Get available staff members
      const staffMembers = await this.getAvailableStaff(clientId, specificStaffId);

      if (staffMembers.length === 0) {
        // No staff available, route to voicemail
        return await this.routeToVoicemail(callSid, clientId, null);
      }

      // Try routing to staff in priority order
      for (const staff of staffMembers) {
        const routingResult = await this.attemptStaffRouting(callSid, staff, clientId);
        
        if (routingResult.success) {
          return routingResult.twiml || '';
        }
      }

      // All staff unavailable, route to voicemail
      return await this.routeToVoicemail(callSid, clientId, null);

    } catch (error: any) {
      console.error('Error routing to staff:', error);
      return await this.routeToVoicemail(callSid, clientId, null);
    }
  }

  /**
   * Get available staff members
   */
  private async getAvailableStaff(
    clientId: number,
    specificStaffId: number | null
  ): Promise<StaffRoutingConfig[]> {
    let query = `
      SELECT 
        scr.id,
        scr.user_id,
        scr.routing_priority,
        scr.receive_calls_in_portal,
        scr.staff_phone_number,
        scr.use_staff_phone,
        scr.department,
        scr.skills,
        scr.is_available_for_calls,
        sca.is_available,
        sca.is_online,
        sca.is_busy
      FROM staff_call_routing scr
      LEFT JOIN staff_call_availability sca ON sca.staff_routing_id = scr.id
      WHERE scr.client_id = $1
        AND scr.is_active = true
        AND scr.is_available_for_calls = true
        AND (sca.is_busy IS NULL OR sca.is_busy = false)
    `;

    const params: any[] = [clientId];

    if (specificStaffId) {
      query += ` AND scr.id = $2`;
      params.push(specificStaffId);
    }

    query += ` ORDER BY scr.routing_priority ASC, scr.id ASC`;

    const result = await pool.query(query, params);

    return result.rows.map((row: any) => ({
      userId: row.user_id,
      priority: row.routing_priority,
      receiveInPortal: row.receive_calls_in_portal,
      staffPhone: row.staff_phone_number,
      useStaffPhone: row.use_staff_phone,
      department: row.department,
      skills: row.skills || [],
      isAvailable: row.is_available !== false && !row.is_busy
    }));
  }

  /**
   * Attempt to route call to a specific staff member
   */
  private async attemptStaffRouting(
    callSid: string,
    staff: StaffRoutingConfig,
    clientId: number
  ): Promise<CallRoutingResult> {
    try {
      // Log routing attempt
      await this.logRoutingStep(
        callSid,
        'staff',
        `Staff ID: ${staff.userId}`,
        null,
        staff.userId
      );

      // Get call info
      const callResult = await pool.query(
        `SELECT from_number, to_number FROM calls WHERE call_sid = $1 LIMIT 1`,
        [callSid]
      );

      if (callResult.rows.length === 0) {
        return { success: false, error: 'Call not found' };
      }

      const call = callResult.rows[0];
      const fromNumber = call.from_number;
      const toNumber = call.to_number;

      // Determine routing method
      if (staff.useStaffPhone && staff.staffPhone) {
        // Route to staff's personal phone
        return await this.routeToPhone(callSid, fromNumber, toNumber, staff.staffPhone);
      } else if (staff.receiveInPortal) {
        // Route to portal (WebRTC - requires portal connection)
        return await this.routeToPortal(callSid, staff.userId, clientId);
      } else {
        // Fallback: route to default phone
        return await this.routeToPhone(callSid, fromNumber, toNumber, staff.staffPhone || '');
      }
    } catch (error: any) {
      console.error('Error attempting staff routing:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Route call to phone number
   */
  private async routeToPhone(
    callSid: string,
    fromNumber: string,
    toNumber: string,
    targetPhone: string
  ): Promise<CallRoutingResult> {
    const baseUrl = process.env.BACKEND_URL || 'https://marketingby-wetechforu-b67c6bd0bf6b.herokuapp.com';
    const connectUrl = `${baseUrl}/api/twilio/voice/connect?from=${encodeURIComponent(fromNumber)}&to=${encodeURIComponent(targetPhone)}`;

    let twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>';
    twiml += `<Say voice="alice">Connecting you now.</Say>`;
    twiml += `<Dial callerId="${toNumber}" timeout="30" action="${baseUrl}/api/twilio/voice/call-status?callSid=${callSid}">`;
    twiml += `<Number>${targetPhone}</Number>`;
    twiml += `</Dial>`;
    
    // If no answer, go to voicemail
    twiml += `<Say voice="alice">The person you're trying to reach is not available. Please leave a message.</Say>`;
    twiml += `<Record maxLength="120" action="${baseUrl}/api/twilio/voice/voicemail?callSid=${callSid}" transcribe="true" />`;
    twiml += '</Response>';

    return { success: true, twiml, routingType: 'staff' };
  }

  /**
   * Route call to portal (WebRTC)
   */
  private async routeToPortal(
    callSid: string,
    userId: number,
    clientId: number
  ): Promise<CallRoutingResult> {
    // Check if staff is online in portal
    const availabilityResult = await pool.query(
      `SELECT is_online, portal_session_id FROM staff_call_availability
       WHERE user_id = $1 AND is_online = true
       LIMIT 1`,
      [userId]
    );

    if (availabilityResult.rows.length === 0) {
      // Staff not online, try next staff or voicemail
      return { success: false, error: 'Staff not online in portal' };
    }

    // TODO: Implement WebRTC connection to portal
    // For now, fallback to phone routing
    const staffResult = await pool.query(
      `SELECT staff_phone_number, use_staff_phone FROM staff_call_routing
       WHERE user_id = $1 AND client_id = $2
       LIMIT 1`,
      [userId, clientId]
    );

    if (staffResult.rows.length > 0 && staffResult.rows[0].staff_phone_number) {
      const callResult = await pool.query(
        `SELECT from_number, to_number FROM calls WHERE call_sid = $1 LIMIT 1`,
        [callSid]
      );
      
      if (callResult.rows.length > 0) {
        return await this.routeToPhone(
          callSid,
          callResult.rows[0].from_number,
          callResult.rows[0].to_number,
          staffResult.rows[0].staff_phone_number
        );
      }
    }

    return { success: false, error: 'No routing method available' };
  }

  /**
   * Route call to department
   */
  private async routeToDepartment(
    callSid: string,
    clientId: number,
    departmentName: string
  ): Promise<string> {
    // Get staff members in this department
    const staffResult = await pool.query(
      `SELECT scr.id, scr.user_id, scr.routing_priority
       FROM staff_call_routing scr
       LEFT JOIN staff_call_availability sca ON sca.staff_routing_id = scr.id
       WHERE scr.client_id = $1
         AND scr.department = $2
         AND scr.is_active = true
         AND scr.is_available_for_calls = true
         AND (sca.is_busy IS NULL OR sca.is_busy = false)
       ORDER BY scr.routing_priority ASC
       LIMIT 5`,
      [clientId, departmentName]
    );

    if (staffResult.rows.length === 0) {
      // No staff in department, route to voicemail
      return await this.routeToVoicemail(callSid, clientId, null);
    }

    // Try routing to department staff
    for (const staff of staffResult.rows) {
      const routingConfig: StaffRoutingConfig = {
        userId: staff.user_id,
        priority: staff.routing_priority,
        receiveInPortal: true,
        useStaffPhone: false,
        isAvailable: true
      };

      const result = await this.attemptStaffRouting(callSid, routingConfig, clientId);
      if (result.success) {
        return result.twiml || '';
      }
    }

    // All department staff unavailable
    return await this.routeToVoicemail(callSid, clientId, null);
  }

  /**
   * Route call to voicemail
   */
  private async routeToVoicemail(
    callSid: string,
    clientId: number,
    ivrOptionId: number | null
  ): Promise<string> {
    // Get voicemail settings
    const settingsResult = await pool.query(
      `SELECT voicemail_message, voicemail_email FROM call_settings
       WHERE client_id = $1 AND is_active = true
       LIMIT 1`,
      [clientId]
    );

    const voicemailMessage = settingsResult.rows[0]?.voicemail_message || 
      'Please leave a message after the tone.';
    const voicemailEmail = settingsResult.rows[0]?.voicemail_email;

    // Log routing step
    await this.logRoutingStep(callSid, 'voicemail', 'Voicemail', ivrOptionId, null);

    const baseUrl = process.env.BACKEND_URL || 'https://marketingby-wetechforu-b67c6bd0bf6b.herokuapp.com';

    let twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>';
    twiml += `<Say voice="alice">${voicemailMessage}</Say>`;
    twiml += `<Record 
      maxLength="300" 
      action="${baseUrl}/api/twilio/voice/voicemail?callSid=${callSid}&clientId=${clientId}&ivrOptionId=${ivrOptionId || ''}" 
      transcribe="true" 
      recordingStatusCallback="${baseUrl}/api/twilio/voice/voicemail-callback"
    />`;
    twiml += '<Say voice="alice">Thank you for your message. Goodbye.</Say>';
    twiml += '</Response>';

    return twiml;
  }

  /**
   * Handle AI option from IVR
   */
  private async handleAIOption(
    callSid: string,
    clientId: number,
    option: any
  ): Promise<string> {
    // Similar to handleAICall but with custom prompt
    const baseUrl = process.env.BACKEND_URL || 'https://marketingby-wetechforu-b67c6bd0bf6b.herokuapp.com';
    const gatherUrl = `${baseUrl}/api/twilio/voice/ai-gather?callSid=${callSid}&clientId=${clientId}&optionId=${option.id}`;

    let twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>';
    twiml += `<Say voice="alice">${option.menu_description || 'How can I help you?'}</Say>`;
    twiml += `<Gather input="speech" action="${gatherUrl}" method="POST" speechTimeout="auto" timeout="10">`;
    twiml += `<Say voice="alice">Please tell me how I can help you.</Say>`;
    twiml += `</Gather>`;

    // Fallback: Route to staff if AI can't answer
    if (option.ai_fallback_to_staff) {
      twiml += `<Say voice="alice">Let me connect you with a staff member.</Say>`;
      twiml += `<Redirect>${baseUrl}/api/twilio/voice/route-to-staff?callSid=${callSid}&clientId=${clientId}</Redirect>`;
    } else {
      twiml += await this.routeToVoicemail(callSid, clientId, option.id);
    }

    twiml += '</Response>';
    return twiml;
  }

  /**
   * Route to external phone number
   */
  private async routeToExternal(callSid: string, phoneNumber: string): Promise<string> {
    const callResult = await pool.query(
      `SELECT from_number, to_number FROM calls WHERE call_sid = $1 LIMIT 1`,
      [callSid]
    );

    if (callResult.rows.length === 0) {
      return this.generateErrorTwiML('Call not found');
    }

    const call = callResult.rows[0];
    return (await this.routeToPhone(callSid, call.from_number, call.to_number, phoneNumber)).twiml || '';
  }

  /**
   * Helper: Route to staff by client ID
   */
  async routeToStaffByClient(
    callSid: string,
    clientId: number,
    specificStaffId: number | null
  ): Promise<string> {
    const settingsResult = await pool.query(
      `SELECT * FROM call_settings WHERE client_id = $1 AND is_active = true LIMIT 1`,
      [clientId]
    );

    const settings = settingsResult.rows[0] || {};
    return await this.routeToStaff(callSid, '', '', settings, clientId, specificStaffId);
  }

  /**
   * Get IVR menu options
   */
  private async getIVRMenuOptions(clientId: number, settingsId: number): Promise<IVRMenuOption[]> {
    const result = await pool.query(
      `SELECT * FROM ivr_menu_options
       WHERE client_id = $1 AND call_settings_id = $2 AND is_active = true
       ORDER BY menu_order ASC, menu_digit ASC`,
      [clientId, settingsId]
    );

    return result.rows.map((row: any) => ({
      digit: row.menu_digit,
      label: row.menu_label,
      description: row.menu_description,
      routeType: row.route_type,
      routeTargetId: row.route_target_id,
      routeTargetPhone: row.route_target_phone,
      departmentName: row.department_name,
      aiPrompt: row.ai_prompt,
      aiFallbackToStaff: row.ai_fallback_to_staff
    }));
  }

  /**
   * Log routing step
   */
  private async logRoutingStep(
    callSid: string,
    routingType: string,
    routingTarget: string,
    routingTargetId: number | null,
    staffUserId: number | null
  ): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO call_routing_history (
          call_sid, routing_type, routing_target, routing_target_id, routed_at
        ) VALUES ($1, $2, $3, $4, NOW())`,
        [callSid, routingType, routingTarget, routingTargetId || staffUserId]
      );
    } catch (error) {
      console.error('Error logging routing step:', error);
    }
  }

  /**
   * Generate error TwiML
   */
  private generateErrorTwiML(message: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="alice">${message}</Say><Hangup/></Response>`;
  }
}

