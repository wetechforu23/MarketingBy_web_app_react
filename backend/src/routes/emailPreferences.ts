import express, { Request, Response } from 'express';
import pool from '../config/database';
import crypto from 'crypto';

const router = express.Router();

// Generate unsubscribe token
function generateUnsubscribeToken(email: string): string {
  const hash = crypto.createHash('sha256');
  hash.update(email + process.env.EMAIL_SECRET_KEY || 'default-secret');
  return hash.digest('hex');
}

// Verify unsubscribe token
function verifyUnsubscribeToken(email: string, token: string): boolean {
  const expectedToken = generateUnsubscribeToken(email);
  return token === expectedToken;
}

// Update email preferences
router.post('/preferences', async (req: Request, res: Response) => {
  try {
    const { email, token, preferences } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Verify token if provided
    if (token && !verifyUnsubscribeToken(email, token)) {
      return res.status(403).json({ error: 'Invalid token' });
    }

    // Update or create email preferences
    await pool.query(
      `INSERT INTO email_preferences (email, educational_content, product_updates, events, monthly_digest, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (email) 
       DO UPDATE SET
         educational_content = $2,
         product_updates = $3,
         events = $4,
         monthly_digest = $5,
         is_unsubscribed = false,
         pause_until = NULL,
         updated_at = NOW()`,
      [
        email.toLowerCase(),
        preferences.educational_content || false,
        preferences.product_updates || false,
        preferences.events || false,
        preferences.monthly_digest || false
      ]
    );

    res.json({ 
      success: true, 
      message: 'Email preferences updated successfully' 
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// Pause emails for specified days
router.post('/pause', async (req: Request, res: Response) => {
  try {
    const { email, token, days = 90 } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Verify token if provided
    if (token && !verifyUnsubscribeToken(email, token)) {
      return res.status(403).json({ error: 'Invalid token' });
    }

    const pauseUntil = new Date();
    pauseUntil.setDate(pauseUntil.getDate() + days);

    await pool.query(
      `INSERT INTO email_preferences (email, pause_until, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (email)
       DO UPDATE SET
         pause_until = $2,
         is_unsubscribed = false,
         updated_at = NOW()`,
      [email.toLowerCase(), pauseUntil]
    );

    res.json({ 
      success: true, 
      message: `Emails paused until ${pauseUntil.toLocaleDateString()}`,
      pause_until: pauseUntil
    });
  } catch (error) {
    console.error('Pause emails error:', error);
    res.status(500).json({ error: 'Failed to pause emails' });
  }
});

// Complete unsubscribe
router.post('/unsubscribe', async (req: Request, res: Response) => {
  try {
    const { email, token } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Verify token if provided
    if (token && !verifyUnsubscribeToken(email, token)) {
      return res.status(403).json({ error: 'Invalid token' });
    }

    await pool.query(
      `INSERT INTO email_preferences (email, is_unsubscribed, unsubscribed_at, updated_at)
       VALUES ($1, true, NOW(), NOW())
       ON CONFLICT (email)
       DO UPDATE SET
         is_unsubscribed = true,
         unsubscribed_at = NOW(),
         educational_content = false,
         product_updates = false,
         events = false,
         monthly_digest = false,
         pause_until = NULL,
         updated_at = NOW()`,
      [email.toLowerCase()]
    );

    res.json({ 
      success: true, 
      message: 'Successfully unsubscribed from all marketing emails' 
    });
  } catch (error) {
    console.error('Unsubscribe error:', error);
    res.status(500).json({ error: 'Failed to unsubscribe' });
  }
});

// Generate unsubscribe link (for use in email templates)
router.post('/generate-link', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const token = generateUnsubscribeToken(email);
    const baseUrl = process.env.FRONTEND_URL || 'https://marketingby.wetechforu.com';
    const unsubscribeLink = `${baseUrl}/unsubscribe?email=${encodeURIComponent(email)}&token=${token}`;

    res.json({ 
      success: true, 
      link: unsubscribeLink,
      token 
    });
  } catch (error) {
    console.error('Generate link error:', error);
    res.status(500).json({ error: 'Failed to generate link' });
  }
});

// Check email preferences (for email sending logic)
router.get('/check/:email', async (req: Request, res: Response) => {
  try {
    const { email } = req.params;

    const result = await pool.query(
      `SELECT * FROM email_preferences WHERE email = $1`,
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      // No preferences set, assume opted in
      return res.json({
        can_send: true,
        preferences: {
          educational_content: true,
          product_updates: true,
          events: true,
          monthly_digest: false
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

    // Check if paused
    if (prefs.pause_until && new Date(prefs.pause_until) > new Date()) {
      return res.json({
        can_send: false,
        reason: 'paused',
        pause_until: prefs.pause_until
      });
    }

    res.json({
      can_send: true,
      preferences: {
        educational_content: prefs.educational_content,
        product_updates: prefs.product_updates,
        events: prefs.events,
        monthly_digest: prefs.monthly_digest
      }
    });
  } catch (error) {
    console.error('Check preferences error:', error);
    res.status(500).json({ error: 'Failed to check preferences' });
  }
});

export default router;

