import express, { Request, Response } from 'express';
import pool from '../config/database';
import { TwilioVoiceService } from '../services/twilioVoiceService';

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

// Twilio webhook: Handle incoming call
router.post('/incoming', async (req: Request, res: Response) => {
  try {
    const { CallSid, From, To, CallStatus } = req.body;

    console.log('📞 Incoming call:', { CallSid, From, To, CallStatus });

    const voiceService = TwilioVoiceService.getInstance();
    const twiml = await voiceService.handleIncomingCall(CallSid, From, To);

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

export default router;

