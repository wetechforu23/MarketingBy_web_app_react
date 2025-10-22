import express, { Request, Response } from 'express';
import pool from '../config/database';
import crypto from 'crypto';

const router = express.Router();

// Generate unsubscribe token
function generateUnsubscribeToken(phone: string): string {
  const hash = crypto.createHash('sha256');
  hash.update(phone + process.env.SMS_SECRET_KEY || 'default-secret');
  return hash.digest('hex');
}

// Verify unsubscribe token
function verifyUnsubscribeToken(phone: string, token: string): boolean {
  const expectedToken = generateUnsubscribeToken(phone);
  return token === expectedToken;
}

// Normalize phone number (remove non-digits)
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

// Update SMS preferences
router.post('/preferences', async (req: Request, res: Response) => {
  try {
    const { phone, token, preferences } = req.body;

    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    const normalizedPhone = normalizePhone(phone);

    // Verify token if provided
    if (token && !verifyUnsubscribeToken(normalizedPhone, token)) {
      return res.status(403).json({ error: 'Invalid token' });
    }

    // Update or create SMS preferences
    await pool.query(
      `INSERT INTO sms_preferences (phone, promotional, appointment_reminders, urgent_updates, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (phone) 
       DO UPDATE SET
         promotional = $2,
         appointment_reminders = $3,
         urgent_updates = $4,
         is_unsubscribed = false,
         updated_at = NOW()`,
      [
        normalizedPhone,
        preferences.promotional || false,
        preferences.appointment_reminders || false,
        preferences.urgent_updates || false
      ]
    );

    res.json({ 
      success: true, 
      message: 'SMS preferences updated successfully' 
    });
  } catch (error) {
    console.error('Update SMS preferences error:', error);
    res.status(500).json({ error: 'Failed to update SMS preferences' });
  }
});

// Complete unsubscribe from SMS
router.post('/unsubscribe', async (req: Request, res: Response) => {
  try {
    const { phone, token } = req.body;

    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    const normalizedPhone = normalizePhone(phone);

    // Verify token if provided
    if (token && !verifyUnsubscribeToken(normalizedPhone, token)) {
      return res.status(403).json({ error: 'Invalid token' });
    }

    await pool.query(
      `INSERT INTO sms_preferences (phone, is_unsubscribed, unsubscribed_at, updated_at)
       VALUES ($1, true, NOW(), NOW())
       ON CONFLICT (phone)
       DO UPDATE SET
         is_unsubscribed = true,
         unsubscribed_at = NOW(),
         promotional = false,
         appointment_reminders = false,
         urgent_updates = false,
         updated_at = NOW()`,
      [normalizedPhone]
    );

    res.json({ 
      success: true, 
      message: 'Successfully unsubscribed from all text messages' 
    });
  } catch (error) {
    console.error('SMS unsubscribe error:', error);
    res.status(500).json({ error: 'Failed to unsubscribe from SMS' });
  }
});

// Generate unsubscribe link (for use in SMS messages)
router.post('/generate-link', async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    const normalizedPhone = normalizePhone(phone);
    const token = generateUnsubscribeToken(normalizedPhone);
    const baseUrl = process.env.FRONTEND_URL || 'https://marketingby.wetechforu.com';
    const unsubscribeLink = `${baseUrl}/unsubscribe?phone=${encodeURIComponent(phone)}&token=${token}`;

    res.json({ 
      success: true, 
      link: unsubscribeLink,
      token 
    });
  } catch (error) {
    console.error('Generate SMS link error:', error);
    res.status(500).json({ error: 'Failed to generate link' });
  }
});

// Check SMS preferences (for SMS sending logic)
router.get('/check/:phone', async (req: Request, res: Response) => {
  try {
    const { phone } = req.params;
    const normalizedPhone = normalizePhone(phone);

    const result = await pool.query(
      `SELECT * FROM sms_preferences WHERE phone = $1`,
      [normalizedPhone]
    );

    if (result.rows.length === 0) {
      // No preferences set, assume opted in for essential messages only
      return res.json({
        can_send: true,
        preferences: {
          promotional: false,
          appointment_reminders: true,
          urgent_updates: true
        }
      });
    }

    const prefs = result.rows[0];
    
    // Check if unsubscribed
    if (prefs.is_unsubscribed) {
      return res.json({
        can_send: false,
        reason: 'unsubscribed'
      });
    }

    res.json({
      can_send: true,
      preferences: {
        promotional: prefs.promotional,
        appointment_reminders: prefs.appointment_reminders,
        urgent_updates: prefs.urgent_updates
      }
    });
  } catch (error) {
    console.error('Check SMS preferences error:', error);
    res.status(500).json({ error: 'Failed to check SMS preferences' });
  }
});

export default router;

