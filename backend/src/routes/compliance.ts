import express from 'express';
import pool from '../config/database';
import { requireAuth } from '../middleware/auth';
import { ComplianceService } from '../services/complianceService';
import { CalendarService } from '../services/calendarService';
import { AzureEmailService } from '../services/azureEmailService';
import { MicrosoftGraphEmailService } from '../services/microsoftGraphEmailService';

const router = express.Router();
const calendarService = new CalendarService();

// Apply auth middleware to all compliance routes
router.use(requireAuth);

// Check Texas compliance for a website
router.post('/check', async (req, res) => {
  try {
    const { url, websiteData } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Perform compliance check
    const complianceCheck = await ComplianceService.checkTexasCompliance(websiteData);

    // Save compliance check to database
    const result = await pool.query(
      'INSERT INTO compliance_records (lead_id, compliance_score, issues, recommendations, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING id',
      [
        134, // Using first available lead ID
        complianceCheck.score,
        JSON.stringify(complianceCheck.issues),
        JSON.stringify(complianceCheck.recommendations)
      ]
    );

    res.json({
      success: true,
      compliance: complianceCheck,
      recordId: result.rows[0].id
    });

  } catch (error) {
    console.error('Compliance check error:', error);
    res.status(500).json({ 
      error: 'Failed to perform compliance check',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Capture lead information
router.post('/capture-lead', async (req, res) => {
  try {
    const { name, email, phone, company, website, industry, source, notes } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    const leadData = {
      name,
      email,
      phone,
      company,
      website,
      industry,
      source: source || 'Website Form',
      notes
    };

    const success = await ComplianceService.captureLead(leadData);

    if (success) {
      res.json({ success: true, message: 'Lead captured successfully' });
    } else {
      res.status(500).json({ error: 'Failed to capture lead' });
    }

  } catch (error) {
    console.error('Lead capture error:', error);
    res.status(500).json({ error: 'Failed to capture lead' });
  }
});

// Send compliance report
router.post('/send-report', async (req, res) => {
  try {
    const { email, complianceCheck, websiteUrl } = req.body;

    if (!email || !complianceCheck || !websiteUrl) {
      return res.status(400).json({ error: 'Email, compliance check, and website URL are required' });
    }

    const success = await ComplianceService.sendComplianceReport(email, complianceCheck, websiteUrl);

    if (success) {
      res.json({ success: true, message: 'Compliance report sent successfully' });
    } else {
      res.status(500).json({ error: 'Failed to send compliance report' });
    }

  } catch (error) {
    console.error('Send compliance report error:', error);
    res.status(500).json({ error: 'Failed to send compliance report' });
  }
});

// Schedule consultation
router.post('/schedule-consultation', async (req, res) => {
  try {
    const { clientEmail, clientName, websiteUrl, complianceScore } = req.body;

    if (!clientEmail || !clientName || !websiteUrl) {
      return res.status(400).json({ error: 'Client email, name, and website URL are required' });
    }

    const calendarService = new CalendarService();
    const bookingRequest = {
      title: `Compliance Consultation - ${clientName}`,
      description: `Compliance consultation for ${clientName} regarding ${websiteUrl}`,
      preferredDate: new Date().toISOString().split('T')[0],
      preferredTime: '10:00',
      duration: 60,
      meetingType: 'consultation' as const,
      contactEmail: clientEmail,
      notes: `Compliance Score: ${complianceScore || 0}`
    };
    const result = await calendarService.processBookingRequest(bookingRequest);
    const success = !!result;

    if (success) {
      res.json({ success: true, message: 'Consultation scheduled successfully' });
    } else {
      res.status(500).json({ error: 'Failed to schedule consultation' });
    }

  } catch (error) {
    console.error('Schedule consultation error:', error);
    res.status(500).json({ error: 'Failed to schedule consultation' });
  }
});

// Get compliance records
router.get('/records', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, compliance_score, hipaa_compliant, texas_compliant, issues_found, recommendations, created_at FROM compliance_records ORDER BY created_at DESC LIMIT 50'
    );

    const records = result.rows.map(record => ({
      ...record,
      issues_found: JSON.parse(record.issues_found),
      recommendations: JSON.parse(record.recommendations)
    }));

    res.json(records);

  } catch (error) {
    console.error('Get compliance records error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get leads
router.get('/leads', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, clinic_name, contact_email, contact_phone, website_url, industry_category, lead_source, compliance_status, created_at FROM leads ORDER BY created_at DESC LIMIT 50'
    );

    res.json(result.rows);

  } catch (error) {
    console.error('Get leads error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get available calendar slots
router.get('/available-slots', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);
    
    const slots = await calendarService.getAvailableSlots(startDate as string, 60);
    res.json(slots);
  } catch (error) {
    console.error('Get available slots error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Schedule consultation with specific time slot
router.post('/schedule-consultation-slot', async (req, res) => {
  try {
    const {
      clientEmail,
      clientName,
      startTime,
      endTime,
      websiteUrl,
      complianceScore,
      notes
    } = req.body;

    if (!clientEmail || !clientName || !startTime || !endTime) {
      return res.status(400).json({ error: 'Client email, name, start time, and end time are required' });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    // Check if the time slot is available
    const dateOnly = startTime.split('T')[0]; // Extract date part
    const availableSlots = await calendarService.getAvailableSlots(dateOnly, 60);
    const timeOnly = startTime.split('T')[1]?.split('.')[0] || '10:00'; // Extract time part
    const slotAvailable = availableSlots.includes(timeOnly);

    if (!slotAvailable) {
      return res.status(400).json({ error: 'Selected time slot is not available' });
    }

    const bookingRequest = {
      title: `Compliance Consultation - ${clientName}`,
      description: `Compliance consultation for ${clientName} regarding ${websiteUrl}`,
      preferredDate: startTime.split('T')[0],
      preferredTime: startTime.split('T')[1]?.split('.')[0] || '10:00',
      duration: 60,
      meetingType: 'consultation' as const,
      contactEmail: clientEmail,
      notes: notes || `Compliance Score: ${complianceScore || 0}`
    };
    const result = await calendarService.processBookingRequest(bookingRequest);
    const success = !!result; // Force restart

    if (success) {
      res.json({ success: true, message: 'Consultation scheduled successfully' });
    } else {
      res.status(500).json({ error: 'Failed to schedule consultation' });
    }
  } catch (error) {
    console.error('Schedule consultation slot error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
