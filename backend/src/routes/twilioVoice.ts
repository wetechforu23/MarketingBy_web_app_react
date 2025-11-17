import express, { Request, Response } from 'express';
import pool from '../config/database';
import { TwilioVoiceService } from '../services/twilioVoiceService';
import { CallRoutingService } from '../services/callRoutingService';

const router = express.Router();

// ==========================================
// TWILIO VOICE CALLING ROUTES
// ==========================================

// Initiate a call (from widget or admin)
router.post('/initiate', async (req: Request, res: Response) => {
  try {
    const { widgetId, conversationId, fromNumber, toNumber, callerName, recordingEnabled, transcriptionEnabled } = req.body;

    if (!widgetId || !fromNumber || !toNumber) {
      return res.status(400).json({ error: 'widgetId, fromNumber, and toNumber are required' });
    }

    // Get widget and client info
    const widgetResult = await pool.query(
      `SELECT id, client_id FROM widget_configs WHERE id = $1 AND is_active = true`,
      [widgetId]
    );

    if (widgetResult.rows.length === 0) {
      return res.status(404).json({ error: 'Widget not found' });
    }

    const widget = widgetResult.rows[0];

    // Check if voice calling is enabled
    const settingsResult = await pool.query(
      `SELECT enable_voice_calling FROM call_settings WHERE widget_id = $1 AND is_active = true`,
      [widgetId]
    );

    if (settingsResult.rows.length === 0 || !settingsResult.rows[0].enable_voice_calling) {
      return res.status(403).json({ error: 'Voice calling is not enabled for this widget' });
    }

    const voiceService = TwilioVoiceService.getInstance();
    const result = await voiceService.initiateCall({
      clientId: widget.client_id,
      widgetId: widget.id,
      conversationId,
      fromNumber,
      toNumber,
      callerName,
      recordingEnabled: recordingEnabled || false,
      transcriptionEnabled: transcriptionEnabled || false
    });

    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error: any) {
    console.error('Initiate call error:', error);
    res.status(500).json({ error: 'Failed to initiate call' });
  }
});

// Twilio webhook: Handle incoming call (uses new routing service)
router.post('/incoming', async (req: Request, res: Response) => {
  try {
    const { CallSid, From, To, CallStatus } = req.body;

    console.log('📞 Incoming call:', { CallSid, From, To, CallStatus });

    const routingService = CallRoutingService.getInstance();
    const twiml = await routingService.handleIncomingCall(CallSid, From, To);

    res.type('text/xml');
    res.send(twiml);
  } catch (error: any) {
    console.error('Incoming call error:', error);
    res.type('text/xml');
    res.send('<?xml version="1.0" encoding="UTF-8"?><Response><Say>Sorry, there was an error.</Say><Hangup/></Response>');
  }
});

// Twilio webhook: Connect call (TwiML for connecting customer to agent)
router.get('/connect', async (req: Request, res: Response) => {
  try {
    const { from, to, callerName } = req.query;

    // Build TwiML to connect the call
    let twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>';
    
    if (callerName) {
      twiml += `<Say voice="alice">Connecting you to ${callerName}</Say>`;
    }
    
    twiml += `<Dial callerId="${from}">`;
    twiml += `<Number>${to}</Number>`;
    twiml += `</Dial>`;
    twiml += '</Response>';

    res.type('text/xml');
    res.send(twiml);
  } catch (error: any) {
    console.error('Connect call error:', error);
    res.type('text/xml');
    res.send('<?xml version="1.0" encoding="UTF-8"?><Response><Say>Sorry, there was an error connecting your call.</Say><Hangup/></Response>');
  }
});

// Twilio webhook: Call status callback
router.post('/status-callback', async (req: Request, res: Response) => {
  try {
    const { CallSid, CallStatus, CallDuration, From, To } = req.body;

    console.log('📞 Call status update:', { CallSid, CallStatus, CallDuration });

    const voiceService = TwilioVoiceService.getInstance();
    await voiceService.updateCallStatus(
      CallSid,
      CallStatus,
      CallDuration ? parseInt(CallDuration) : undefined
    );

    res.status(200).send('OK');
  } catch (error: any) {
    console.error('Status callback error:', error);
    res.status(200).send('OK'); // Always return 200 to Twilio
  }
});

// Twilio webhook: Recording callback
router.post('/recording-callback', async (req: Request, res: Response) => {
  try {
    const { CallSid, RecordingSid, RecordingUrl, RecordingDuration, RecordingStatus } = req.body;

    console.log('📼 Recording callback:', { CallSid, RecordingSid, RecordingStatus });

    if (RecordingStatus === 'completed' && RecordingUrl) {
      await pool.query(
        `UPDATE calls SET recording_url = $1, recording_sid = $2 WHERE call_sid = $3`,
        [RecordingUrl, RecordingSid, CallSid]
      );

      // Store in call_recordings table
      await pool.query(
        `INSERT INTO call_recordings (call_id, call_sid, recording_sid, recording_url, recording_duration_seconds, recording_format)
         SELECT id, call_sid, $1, $2, $3, 'mp3'
         FROM calls WHERE call_sid = $4
         ON CONFLICT (recording_sid) DO NOTHING`,
        [RecordingSid, RecordingUrl, RecordingDuration, CallSid]
      );
    }

    res.status(200).send('OK');
  } catch (error: any) {
    console.error('Recording callback error:', error);
    res.status(200).send('OK');
  }
});

// Twilio webhook: Transcription callback
router.post('/transcription-callback', async (req: Request, res: Response) => {
  try {
    const { CallSid, TranscriptionSid, TranscriptionText, TranscriptionStatus } = req.body;

    console.log('📝 Transcription callback:', { CallSid, TranscriptionStatus });

    if (TranscriptionStatus === 'completed' && TranscriptionText) {
      await pool.query(
        `UPDATE calls SET transcription_text = $1 WHERE call_sid = $2`,
        [TranscriptionText, CallSid]
      );

      // Update call_recordings if exists
      await pool.query(
        `UPDATE call_recordings SET transcription_sid = $1, transcription_text = $2, transcription_status = 'completed'
         WHERE call_sid = $3`,
        [TranscriptionSid, TranscriptionText, CallSid]
      );
    }

    res.status(200).send('OK');
  } catch (error: any) {
    console.error('Transcription callback error:', error);
    res.status(200).send('OK');
  }
});

// Get call details
router.get('/calls/:callSid', async (req: Request, res: Response) => {
  try {
    const { callSid } = req.params;

    const voiceService = TwilioVoiceService.getInstance();
    const call = await voiceService.getCallDetails(callSid);

    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }

    res.json(call);
  } catch (error: any) {
    console.error('Get call error:', error);
    res.status(500).json({ error: 'Failed to get call details' });
  }
});

// End a call
router.post('/calls/:callSid/end', async (req: Request, res: Response) => {
  try {
    const { callSid } = req.params;

    const voiceService = TwilioVoiceService.getInstance();
    const success = await voiceService.endCall(callSid);

    if (success) {
      res.json({ success: true, message: 'Call ended' });
    } else {
      res.status(404).json({ error: 'Call not found or already ended' });
    }
  } catch (error: any) {
    console.error('End call error:', error);
    res.status(500).json({ error: 'Failed to end call' });
  }
});

// Get call settings for a widget
router.get('/widgets/:widgetId/settings', async (req: Request, res: Response) => {
  try {
    const { widgetId } = req.params;

    const result = await pool.query(
      `SELECT * FROM call_settings WHERE widget_id = $1 AND is_active = true`,
      [widgetId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Call settings not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Get call settings error:', error);
    res.status(500).json({ error: 'Failed to get call settings' });
  }
});

// Update call settings
router.put('/widgets/:widgetId/settings', async (req: Request, res: Response) => {
  try {
    const { widgetId } = req.params;
    const updates = req.body;

    // Build update query
    const allowedFields = [
      'enable_voice_calling', 'enable_call_recording', 'enable_call_transcription',
      'enable_call_queuing', 'business_hours', 'timezone', 'default_agent_phone',
      'routing_strategy', 'max_queue_size', 'queue_timeout_seconds',
      'max_calls_per_day', 'max_call_duration_minutes', 'call_rate_limit_per_hour',
      'greeting_message', 'greeting_audio_url', 'ivr_menu', 'is_active'
    ];

    const setClause: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        if (key === 'business_hours' || key === 'ivr_menu') {
          setClause.push(`${key} = $${paramCount}`);
          values.push(JSON.stringify(updates[key]));
        } else {
          setClause.push(`${key} = $${paramCount}`);
          values.push(updates[key]);
        }
        paramCount++;
      }
    });

    if (setClause.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    setClause.push(`updated_at = NOW()`);
    values.push(widgetId);

    await pool.query(
      `UPDATE call_settings SET ${setClause.join(', ')} WHERE widget_id = $${paramCount}`,
      values
    );

    res.json({ success: true, message: 'Call settings updated' });
  } catch (error: any) {
    console.error('Update call settings error:', error);
    res.status(500).json({ error: 'Failed to update call settings' });
  }
});

// Get call history for a widget
router.get('/widgets/:widgetId/calls', async (req: Request, res: Response) => {
  try {
    const { widgetId } = req.params;
    const { limit = 50, offset = 0, status, direction } = req.query;

    let query = `
      SELECT * FROM calls
      WHERE widget_id = $1
    `;
    const params: any[] = [widgetId];
    let paramCount = 2;

    if (status) {
      query += ` AND status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (direction) {
      query += ` AND direction = $${paramCount}`;
      params.push(direction);
      paramCount++;
    }

    query += ` ORDER BY initiated_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(parseInt(limit as string), parseInt(offset as string));

    const result = await pool.query(query, params);

    res.json({ calls: result.rows, total: result.rows.length });
  } catch (error: any) {
    console.error('Get call history error:', error);
    res.status(500).json({ error: 'Failed to get call history' });
  }
});

// ==========================================
// NEW CALL ROUTING ENDPOINTS
// ==========================================

// Process IVR digit selection
router.post('/ivr-gather', async (req: Request, res: Response) => {
  try {
    const { Digits, CallSid } = req.body;
    const { callSid, clientId } = req.query;

    const actualCallSid = CallSid || callSid;
    const digit = Digits || req.query.digit;

    if (!actualCallSid || !digit) {
      return res.type('text/xml').send(
        '<?xml version="1.0" encoding="UTF-8"?><Response><Say>Invalid input. Please try again.</Say><Hangup/></Response>'
      );
    }

    // Get call settings to find settings ID
    const callResult = await pool.query(
      `SELECT client_id, widget_id FROM calls WHERE call_sid = $1 LIMIT 1`,
      [actualCallSid]
    );

    if (callResult.rows.length === 0) {
      return res.type('text/xml').send(
        '<?xml version="1.0" encoding="UTF-8"?><Response><Say>Call not found.</Say><Hangup/></Response>'
      );
    }

    const call = callResult.rows[0];
    const actualClientId = parseInt(clientId as string) || call.client_id;

    const settingsResult = await pool.query(
      `SELECT id FROM call_settings WHERE widget_id = $1 AND is_active = true LIMIT 1`,
      [call.widget_id]
    );

    const settingsId = settingsResult.rows[0]?.id;

    const routingService = CallRoutingService.getInstance();
    const twiml = await routingService.processIVRDigit(actualCallSid, digit, actualClientId, settingsId);

    res.type('text/xml');
    res.send(twiml);
  } catch (error: any) {
    console.error('IVR gather error:', error);
    res.type('text/xml').send(
      '<?xml version="1.0" encoding="UTF-8"?><Response><Say>Error processing your selection.</Say><Hangup/></Response>'
    );
  }
});

// Route to staff (fallback or direct routing)
router.get('/route-to-staff', async (req: Request, res: Response) => {
  try {
    const { callSid, clientId, staffId } = req.query;

    if (!callSid || !clientId) {
      return res.type('text/xml').send(
        '<?xml version="1.0" encoding="UTF-8"?><Response><Say>Invalid request.</Say><Hangup/></Response>'
      );
    }

    const routingService = CallRoutingService.getInstance();
    const twiml = await routingService.routeToStaffByClient(
      callSid as string,
      parseInt(clientId as string),
      staffId ? parseInt(staffId as string) : null
    );

    res.type('text/xml');
    res.send(twiml);
  } catch (error: any) {
    console.error('Route to staff error:', error);
    res.type('text/xml').send(
      '<?xml version="1.0" encoding="UTF-8"?><Response><Say>Error routing your call.</Say><Hangup/></Response>'
    );
  }
});

// Handle AI speech input
router.post('/ai-gather', async (req: Request, res: Response) => {
  try {
    const { SpeechResult, CallSid } = req.body;
    const { callSid, clientId, optionId } = req.query;

    const actualCallSid = CallSid || callSid;
    const speechInput = SpeechResult || '';

    if (!actualCallSid) {
      return res.type('text/xml').send(
        '<?xml version="1.0" encoding="UTF-8"?><Response><Say>Call not found.</Say><Hangup/></Response>'
      );
    }

    // TODO: Integrate with AI service (similar to chat widget AI)
    // For now, if AI can't answer, route to staff
    const callResult = await pool.query(
      `SELECT client_id FROM calls WHERE call_sid = $1 LIMIT 1`,
      [actualCallSid]
    );

    if (callResult.rows.length === 0) {
      return res.type('text/xml').send(
        '<?xml version="1.0" encoding="UTF-8"?><Response><Say>Call not found.</Say><Hangup/></Response>'
      );
    }

    const actualClientId = parseInt(clientId as string) || callResult.rows[0].client_id;

    // Check if AI can handle this (simplified - integrate with actual AI service)
    const aiCanAnswer = false; // TODO: Call AI service to check

    if (!aiCanAnswer) {
      // Route to staff
      const routingService = CallRoutingService.getInstance();
      const twiml = await routingService.routeToStaffByClient(actualCallSid, actualClientId, null);
      res.type('text/xml');
      res.send(twiml);
    } else {
      // AI can answer - provide response
      res.type('text/xml').send(
        `<?xml version="1.0" encoding="UTF-8"?><Response><Say>${speechInput}</Say><Gather input="speech" action="/api/twilio/voice/ai-gather?callSid=${actualCallSid}&clientId=${actualClientId}" method="POST" speechTimeout="auto" timeout="10"><Say>Is there anything else I can help you with?</Say></Gather><Say>Thank you for calling. Goodbye.</Say></Response>`
      );
    }
  } catch (error: any) {
    console.error('AI gather error:', error);
    res.type('text/xml').send(
      '<?xml version="1.0" encoding="UTF-8"?><Response><Say>Let me connect you with a staff member.</Say><Redirect>/api/twilio/voice/route-to-staff?callSid=${req.query.callSid}&clientId=${req.query.clientId}</Redirect></Response>'
    );
  }
});

// Handle voicemail recording
router.post('/voicemail', async (req: Request, res: Response) => {
  try {
    const { CallSid, RecordingUrl, RecordingDuration, TranscriptionText } = req.body;
    const { callSid, clientId, ivrOptionId } = req.query;

    const actualCallSid = CallSid || callSid;

    if (!actualCallSid) {
      return res.status(400).json({ error: 'Call SID required' });
    }

    // Get call info
    const callResult = await pool.query(
      `SELECT id, from_number, caller_name FROM calls WHERE call_sid = $1 LIMIT 1`,
      [actualCallSid]
    );

    if (callResult.rows.length === 0) {
      return res.status(404).json({ error: 'Call not found' });
    }

    const call = callResult.rows[0];
    const actualClientId = parseInt(clientId as string) || null;

    // Store voicemail
    await pool.query(
      `INSERT INTO voicemail_messages (
        call_id, call_sid, caller_phone, caller_name,
        recording_url, recording_duration_seconds, transcription_text,
        ivr_option_id, department, received_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NULL, NOW())`,
      [
        call.id,
        actualCallSid,
        call.from_number,
        call.caller_name,
        RecordingUrl,
        RecordingDuration ? parseInt(RecordingDuration) : null,
        TranscriptionText,
        ivrOptionId ? parseInt(ivrOptionId as string) : null
      ]
    );

    // Send email notification if configured
    if (actualClientId) {
      const settingsResult = await pool.query(
        `SELECT voicemail_email FROM call_settings WHERE client_id = $1 AND is_active = true LIMIT 1`,
        [actualClientId]
      );

      if (settingsResult.rows.length > 0 && settingsResult.rows[0].voicemail_email) {
        // TODO: Send email notification
        console.log('📧 Voicemail notification should be sent to:', settingsResult.rows[0].voicemail_email);
      }
    }

    res.status(200).send('OK');
  } catch (error: any) {
    console.error('Voicemail error:', error);
    res.status(200).send('OK'); // Always return OK to Twilio
  }
});

// Call status update (for routing fallbacks)
router.get('/call-status', async (req: Request, res: Response) => {
  try {
    const { callSid, DialCallStatus, DialCallDuration } = req.query;

    if (DialCallStatus === 'no-answer' || DialCallStatus === 'busy' || DialCallStatus === 'failed') {
      // Call didn't connect, try next staff or voicemail
      const callResult = await pool.query(
        `SELECT client_id FROM calls WHERE call_sid = $1 LIMIT 1`,
        [callSid]
      );

      if (callResult.rows.length > 0) {
        const routingService = CallRoutingService.getInstance();
        const twiml = await routingService.routeToStaffByClient(
          callSid as string,
          callResult.rows[0].client_id,
          null
        );
        res.type('text/xml');
        res.send(twiml);
        return;
      }
    }

    // Call connected successfully
    res.type('text/xml').send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
  } catch (error: any) {
    console.error('Call status error:', error);
    res.type('text/xml').send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
  }
});

export default router;

