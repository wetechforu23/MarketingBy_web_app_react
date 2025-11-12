import express, { Request, Response } from 'express';
import pool from '../config/database';
import { TwilioVoiceService } from '../services/twilioVoiceService';
import { WhatsAppService } from '../services/whatsappService';

const router = express.Router();

// ==========================================
// CLIENT CONTACTS DIRECTORY ROUTES
// ==========================================

// Get all contacts for a client
router.get('/contacts', async (req: Request, res: Response) => {
  try {
    const clientId = (req as any).user?.client_id;
    const userRole = (req as any).user?.role;
    
    // Super admin can view any client's contacts
    let targetClientId = clientId;
    if (userRole === 'super_admin' && req.query.clientId) {
      targetClientId = parseInt(req.query.clientId as string);
    }
    
    if (!targetClientId) {
      return res.status(403).json({ error: 'Client ID required' });
    }
    
    const { search, status, groupId, limit = 100, offset = 0 } = req.query;
    
    let query = `
      SELECT c.*, 
             COUNT(DISTINCT comm.id) as total_communications,
             MAX(comm.initiated_at) as last_communication_at
      FROM client_contacts c
      LEFT JOIN client_contact_communications comm ON comm.contact_id = c.id
      WHERE c.client_id = $1
    `;
    const params: any[] = [targetClientId];
    let paramCount = 2;
    
    if (search) {
      query += ` AND (
        LOWER(c.first_name) LIKE $${paramCount} OR
        LOWER(c.last_name) LIKE $${paramCount} OR
        LOWER(c.email) LIKE $${paramCount} OR
        c.phone LIKE $${paramCount} OR
        LOWER(c.company) LIKE $${paramCount}
      )`;
      params.push(`%${(search as string).toLowerCase()}%`);
      paramCount++;
    }
    
    if (status) {
      query += ` AND c.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }
    
    if (groupId) {
      query += ` AND EXISTS (
        SELECT 1 FROM client_contact_group_members g
        WHERE g.contact_id = c.id AND g.group_id = $${paramCount}
      )`;
      params.push(groupId);
      paramCount++;
    }
    
    query += ` GROUP BY c.id ORDER BY c.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(parseInt(limit as string), parseInt(offset as string));
    
    const result = await pool.query(query, params);
    
    res.json({ contacts: result.rows, total: result.rows.length });
  } catch (error: any) {
    console.error('Get contacts error:', error);
    res.status(500).json({ error: 'Failed to get contacts' });
  }
});

// Get single contact
router.get('/contacts/:id', async (req: Request, res: Response) => {
  try {
    const clientId = (req as any).user?.client_id;
    const userRole = (req as any).user?.role;
    const contactId = parseInt(req.params.id);
    
    let query = `SELECT * FROM client_contacts WHERE id = $1`;
    const params: any[] = [contactId];
    
    if (userRole !== 'super_admin') {
      query += ` AND client_id = $2`;
      params.push(clientId);
    }
    
    const result = await pool.query(query, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Get contact error:', error);
    res.status(500).json({ error: 'Failed to get contact' });
  }
});

// Create contact
router.post('/contacts', async (req: Request, res: Response) => {
  try {
    const clientId = (req as any).user?.client_id;
    const userId = (req as any).user?.id;
    
    if (!clientId) {
      return res.status(403).json({ error: 'Client ID required' });
    }
    
    const {
      first_name, last_name, email, phone, company, job_title,
      department, address, city, state, zip_code, country,
      tags, notes, preferred_contact_method
    } = req.body;
    
    if (!first_name || !phone) {
      return res.status(400).json({ error: 'First name and phone are required' });
    }
    
    // Format phone to E.164
    const phoneFormatted = phone.startsWith('+') ? phone : `+1${phone.replace(/\D/g, '')}`;
    const phoneDisplay = phone.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
    
    // Check for duplicate
    const existing = await pool.query(
      `SELECT id FROM client_contacts WHERE client_id = $1 AND phone = $2`,
      [clientId, phoneFormatted]
    );
    
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Contact with this phone number already exists' });
    }
    
    const result = await pool.query(
      `INSERT INTO client_contacts (
        client_id, created_by_user_id, first_name, last_name, email, phone, phone_formatted,
        company, job_title, department, address, city, state, zip_code, country,
        tags, notes, preferred_contact_method, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, 'active')
      RETURNING *`,
      [
        clientId, userId, first_name, last_name || null, email || null, phoneFormatted, phoneDisplay,
        company || null, job_title || null, department || null, address || null,
        city || null, state || null, zip_code || null, country || 'United States',
        tags || [], notes || null, preferred_contact_method || 'phone'
      ]
    );
    
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Create contact error:', error);
    res.status(500).json({ error: 'Failed to create contact' });
  }
});

// Update contact
router.put('/contacts/:id', async (req: Request, res: Response) => {
  try {
    const clientId = (req as any).user?.client_id;
    const userRole = (req as any).user?.role;
    const contactId = parseInt(req.params.id);
    
    // Verify ownership
    const existing = await pool.query(
      `SELECT client_id FROM client_contacts WHERE id = $1`,
      [contactId]
    );
    
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    
    if (userRole !== 'super_admin' && existing.rows[0].client_id !== clientId) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const allowedFields = [
      'first_name', 'last_name', 'email', 'phone', 'company', 'job_title',
      'department', 'address', 'city', 'state', 'zip_code', 'country',
      'tags', 'notes', 'status', 'preferred_contact_method',
      'do_not_call', 'do_not_email', 'do_not_sms'
    ];
    
    const updates: any = {};
    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key)) {
        updates[key] = req.body[key];
      }
    });
    
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    // Format phone if updated
    if (updates.phone) {
      updates.phone = updates.phone.startsWith('+') ? updates.phone : `+1${updates.phone.replace(/\D/g, '')}`;
      updates.phone_formatted = updates.phone.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
    }
    
    const setClause = Object.keys(updates).map((key, idx) => `${key} = $${idx + 2}`).join(', ');
    
    const result = await pool.query(
      `UPDATE client_contacts SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [contactId, ...Object.values(updates)]
    );
    
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Update contact error:', error);
    res.status(500).json({ error: 'Failed to update contact' });
  }
});

// Delete contact
router.delete('/contacts/:id', async (req: Request, res: Response) => {
  try {
    const clientId = (req as any).user?.client_id;
    const userRole = (req as any).user?.role;
    const contactId = parseInt(req.params.id);
    
    // Verify ownership
    const existing = await pool.query(
      `SELECT client_id FROM client_contacts WHERE id = $1`,
      [contactId]
    );
    
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    
    if (userRole !== 'super_admin' && existing.rows[0].client_id !== clientId) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    await pool.query(`DELETE FROM client_contacts WHERE id = $1`, [contactId]);
    
    res.json({ success: true, message: 'Contact deleted' });
  } catch (error: any) {
    console.error('Delete contact error:', error);
    res.status(500).json({ error: 'Failed to delete contact' });
  }
});

// Initiate call to contact
router.post('/contacts/:id/call', async (req: Request, res: Response) => {
  try {
    const clientId = (req as any).user?.client_id;
    const userId = (req as any).user?.id;
    const contactId = parseInt(req.params.id);
    
    // Get contact
    const contactResult = await pool.query(
      `SELECT * FROM client_contacts WHERE id = $1 AND client_id = $2`,
      [contactId, clientId]
    );
    
    if (contactResult.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    
    const contact = contactResult.rows[0];
    
    if (contact.do_not_call) {
      return res.status(400).json({ error: 'Contact has do-not-call enabled' });
    }
    
    // Get agent phone (from user or call settings)
    const userResult = await pool.query(
      `SELECT phone FROM users WHERE id = $1`,
      [userId]
    );
    
    const agentPhone = userResult.rows[0]?.phone || req.body.agentPhone;
    
    if (!agentPhone) {
      return res.status(400).json({ error: 'Agent phone number required' });
    }
    
    // Get call settings for client
    const settingsResult = await pool.query(
      `SELECT * FROM call_settings WHERE client_id = $1 AND is_active = true LIMIT 1`,
      [clientId]
    );
    
    if (settingsResult.rows.length === 0) {
      return res.status(400).json({ error: 'Voice calling not configured for this client' });
    }
    
    const settings = settingsResult.rows[0];
    
    // Initiate call
    const voiceService = TwilioVoiceService.getInstance();
    const callResult = await voiceService.initiateCall({
      clientId: clientId,
      widgetId: settings.widget_id || null,
      fromNumber: contact.phone,
      toNumber: agentPhone,
      callerName: `${contact.first_name} ${contact.last_name || ''}`.trim(),
      recordingEnabled: settings.enable_call_recording || false,
      transcriptionEnabled: settings.enable_call_transcription || false
    });
    
    if (callResult.success && callResult.callSid) {
      // Log communication
      await pool.query(
        `INSERT INTO client_contact_communications (
          contact_id, client_id, initiated_by_user_id, type, direction, status, call_sid
        ) VALUES ($1, $2, $3, 'call', 'outbound', 'initiated', $4)`,
        [contactId, clientId, userId, callResult.callSid]
      );
      
      // Update contact stats
      await pool.query(
        `UPDATE client_contacts SET 
          total_calls = total_calls + 1,
          last_called_at = NOW(),
          last_contacted_at = NOW()
        WHERE id = $1`,
        [contactId]
      );
    }
    
    res.json(callResult);
  } catch (error: any) {
    console.error('Initiate call error:', error);
    res.status(500).json({ error: 'Failed to initiate call' });
  }
});

// Send SMS/Text to contact
router.post('/contacts/:id/text', async (req: Request, res: Response) => {
  try {
    const clientId = (req as any).user?.client_id;
    const userId = (req as any).user?.id;
    const contactId = parseInt(req.params.id);
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    // Get contact
    const contactResult = await pool.query(
      `SELECT * FROM client_contacts WHERE id = $1 AND client_id = $2`,
      [contactId, clientId]
    );
    
    if (contactResult.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    
    const contact = contactResult.rows[0];
    
    if (contact.do_not_sms) {
      return res.status(400).json({ error: 'Contact has do-not-SMS enabled' });
    }
    
    // Send SMS via WhatsApp service (uses Twilio)
    const whatsappService = WhatsAppService.getInstance();
    const smsResult = await whatsappService.sendMessage({
      clientId: clientId,
      widgetId: null as any,
      conversationId: null as any,
      toNumber: contact.phone,
      message: message,
      sentByUserId: userId,
      sentByAgentName: (req as any).user?.name || 'Agent'
    });
    
    if (smsResult.success && smsResult.messageSid) {
      // Log communication
      await pool.query(
        `INSERT INTO client_contact_communications (
          contact_id, client_id, initiated_by_user_id, type, direction, status, message_sid, message_body
        ) VALUES ($1, $2, $3, 'sms', 'outbound', 'sent', $4, $5)`,
        [contactId, clientId, userId, smsResult.messageSid, message]
      );
      
      // Update contact stats
      await pool.query(
        `UPDATE client_contacts SET 
          total_texts = total_texts + 1,
          last_texted_at = NOW(),
          last_contacted_at = NOW()
        WHERE id = $1`,
        [contactId]
      );
    }
    
    res.json(smsResult);
  } catch (error: any) {
    console.error('Send text error:', error);
    res.status(500).json({ error: 'Failed to send text' });
  }
});

// Get contact communication history
router.get('/contacts/:id/communications', async (req: Request, res: Response) => {
  try {
    const clientId = (req as any).user?.client_id;
    const userRole = (req as any).user?.role;
    const contactId = parseInt(req.params.id);
    
    // Verify ownership
    const contactResult = await pool.query(
      `SELECT client_id FROM client_contacts WHERE id = $1`,
      [contactId]
    );
    
    if (contactResult.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    
    if (userRole !== 'super_admin' && contactResult.rows[0].client_id !== clientId) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const result = await pool.query(
      `SELECT * FROM client_contact_communications 
       WHERE contact_id = $1 
       ORDER BY initiated_at DESC 
       LIMIT 100`,
      [contactId]
    );
    
    res.json({ communications: result.rows });
  } catch (error: any) {
    console.error('Get communications error:', error);
    res.status(500).json({ error: 'Failed to get communications' });
  }
});

// Get contact groups
router.get('/contact-groups', async (req: Request, res: Response) => {
  try {
    const clientId = (req as any).user?.client_id;
    const userRole = (req as any).user?.role;
    
    let targetClientId = clientId;
    if (userRole === 'super_admin' && req.query.clientId) {
      targetClientId = parseInt(req.query.clientId as string);
    }
    
    if (!targetClientId) {
      return res.status(403).json({ error: 'Client ID required' });
    }
    
    const result = await pool.query(
      `SELECT g.*, COUNT(m.contact_id) as contact_count
       FROM client_contact_groups g
       LEFT JOIN client_contact_group_members m ON m.group_id = g.id
       WHERE g.client_id = $1
       GROUP BY g.id
       ORDER BY g.is_default DESC, g.name ASC`,
      [targetClientId]
    );
    
    res.json({ groups: result.rows });
  } catch (error: any) {
    console.error('Get groups error:', error);
    res.status(500).json({ error: 'Failed to get groups' });
  }
});

export default router;

