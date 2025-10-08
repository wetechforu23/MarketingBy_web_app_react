import express from 'express';
import { requireAuth } from '../middleware/auth';
import { EmailService } from '../services/emailService';

const router = express.Router();

// Apply auth middleware to all email routes
router.use(requireAuth);

// Test email connection
router.get('/test', async (req, res) => {
  try {
    const emailService = new EmailService();
    const isConnected = await emailService.testConnection();
    
    res.json({
      success: isConnected,
      message: isConnected ? 'Email service is working' : 'Email service connection failed'
    });
  } catch (error) {
    console.error('Email test error:', error);
    res.status(500).json({ error: 'Failed to test email service' });
  }
});

// Send custom email
router.post('/send', async (req, res) => {
  try {
    const { to, subject, text, html } = req.body;

    if (!to || !subject || (!text && !html)) {
      return res.status(400).json({ error: 'Missing required fields: to, subject, and text or html' });
    }

    const emailService = new EmailService();
    const success = await emailService.sendEmail({ to, subject, text, html });

    if (success) {
      res.json({ success: true, message: 'Email sent successfully' });
    } else {
      res.status(500).json({ error: 'Failed to send email' });
    }
  } catch (error) {
    console.error('Send email error:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

// Send welcome email
router.post('/welcome', async (req, res) => {
  try {
    const { to, username } = req.body;

    if (!to || !username) {
      return res.status(400).json({ error: 'Missing required fields: to, username' });
    }

    const emailService = new EmailService();
    const success = await emailService.sendWelcomeEmail(to, username);

    if (success) {
      res.json({ success: true, message: 'Welcome email sent successfully' });
    } else {
      res.status(500).json({ error: 'Failed to send welcome email' });
    }
  } catch (error) {
    console.error('Send welcome email error:', error);
    res.status(500).json({ error: 'Failed to send welcome email' });
  }
});

// Send SEO results email
router.post('/seo-results', async (req, res) => {
  try {
    const { to, url, score, recommendations } = req.body;

    if (!to || !url || score === undefined) {
      return res.status(400).json({ error: 'Missing required fields: to, url, score' });
    }

    const emailService = new EmailService();
    const success = await emailService.sendSEOResultsEmail(to, url, score, recommendations || []);

    if (success) {
      res.json({ success: true, message: 'SEO results email sent successfully' });
    } else {
      res.status(500).json({ error: 'Failed to send SEO results email' });
    }
  } catch (error) {
    console.error('Send SEO results email error:', error);
    res.status(500).json({ error: 'Failed to send SEO results email' });
  }
});

// Send campaign update email
router.post('/campaign-update', async (req, res) => {
  try {
    const { to, campaignName, status } = req.body;

    if (!to || !campaignName || !status) {
      return res.status(400).json({ error: 'Missing required fields: to, campaignName, status' });
    }

    const emailService = new EmailService();
    const success = await emailService.sendCampaignUpdateEmail(to, campaignName, status);

    if (success) {
      res.json({ success: true, message: 'Campaign update email sent successfully' });
    } else {
      res.status(500).json({ error: 'Failed to send campaign update email' });
    }
  } catch (error) {
    console.error('Send campaign update email error:', error);
    res.status(500).json({ error: 'Failed to send campaign update email' });
  }
});

// Send lead notification email
router.post('/lead-notification', async (req, res) => {
  try {
    const { to, leadName, leadEmail, source } = req.body;

    if (!to || !leadName || !leadEmail) {
      return res.status(400).json({ error: 'Missing required fields: to, leadName, leadEmail' });
    }

    const emailService = new EmailService();
    const success = await emailService.sendLeadNotificationEmail(to, leadName, leadEmail, source || 'Unknown');

    if (success) {
      res.json({ success: true, message: 'Lead notification email sent successfully' });
    } else {
      res.status(500).json({ error: 'Failed to send lead notification email' });
    }
  } catch (error) {
    console.error('Send lead notification email error:', error);
    res.status(500).json({ error: 'Failed to send lead notification email' });
  }
});

export default router;
