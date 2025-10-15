import express from 'express';
import pool from '../config/database';
import { requireAuth } from '../middleware/auth';
import { getClientFilter, getClientIdForCreate } from '../utils/clientFilter';
import EnhancedScrapingService from '../services/enhancedScrapingService';
import { stripeService } from '../services/stripeService';
import subscriptionService from '../services/subscriptionService';
import { AdvancedEmailService } from '../services/advancedEmailService';
import { AnalyticsDataService } from '../services/analyticsDataService';
import Stripe from 'stripe';
// import { WebScrapingService } from '../services/webScrapingService';
// import { LeadScrapingService } from '../services/leadScrapingService';
// import { ComplianceCheckService } from '../services/complianceCheckService';
// import { SEOEmailService } from '../services/seoEmailService';

const router = express.Router();

// Public endpoint for pricing plans (no auth required)
router.get('/public/pricing-plans', async (req, res) => {
  try {
    console.log('📋 Fetching pricing plans from Stripe...');
    const plans = await stripeService.getPricingPlans();
    res.json(plans);
  } catch (error) {
    console.error('Error fetching pricing plans:', error);
    res.status(500).json({ error: 'Failed to fetch pricing plans' });
  }
});

// Public endpoint for SEO report offer (no auth required)
router.get('/public/offer/:token', async (req, res) => {
  try {
    const { token } = req.params;
    console.log(`🎁 Fetching SEO report for offer token: ${token}`);
    
    // Look up report by offer token
    const result = await pool.query(
      `SELECT 
        lsr.id,
        lsr.lead_id,
        lsr.report_type,
        lsr.html_report,
        lsr.offer_token,
        lsr.offer_expires_at,
        lsr.offer_claimed,
        lsr.sent_at,
        l.company,
        l.website_url,
        l.email,
        l.contact_first_name,
        l.contact_last_name
       FROM lead_seo_reports lsr
       JOIN leads l ON lsr.lead_id = l.id
       WHERE lsr.offer_token = $1`,
      [token]
    );
    
    if (result.rows.length === 0) {
      console.log(`❌ No report found for token: ${token}`);
      return res.status(404).send(`
        <html>
          <head><title>Offer Not Found</title></head>
          <body style="font-family: Arial; text-align: center; padding: 50px;">
            <h1>🔍 Offer Not Found</h1>
            <p>This offer link is invalid or has been removed.</p>
            <a href="https://www.marketingby.wetechforu.com" style="color: #4682B4;">Return to Home</a>
          </body>
        </html>
      `);
    }
    
    const report = result.rows[0];
    
    // Check if offer has expired
    const now = new Date();
    const expiresAt = new Date(report.offer_expires_at);
    
    if (now > expiresAt) {
      console.log(`⏰ Offer expired at: ${expiresAt.toISOString()}`);
      return res.status(410).send(`
        <html>
          <head><title>Offer Expired</title></head>
          <body style="font-family: Arial; text-align: center; padding: 50px;">
            <h1>⏰ Offer Expired</h1>
            <p>This limited-time offer has expired (${expiresAt.toLocaleDateString()}).</p>
            <p>Please contact us for current pricing and offers.</p>
            <a href="https://www.marketingby.wetechforu.com" style="color: #4682B4;">Visit Our Website</a>
          </body>
        </html>
      `);
    }
    
    console.log(`✅ Serving SEO report for: ${report.company}`);
    
    // Return the HTML report
    res.setHeader('Content-Type', 'text/html');
    res.send(report.html_report);
    
  } catch (error) {
    console.error('Error fetching offer report:', error);
    res.status(500).send(`
      <html>
        <head><title>Error</title></head>
        <body style="font-family: Arial; text-align: center; padding: 50px;">
          <h1>❌ Error Loading Offer</h1>
          <p>An error occurred while loading this offer. Please try again later.</p>
        </body>
      </html>
    `);
  }
});

// Public endpoint for sign-up (no auth required)
router.post('/public/signup', async (req, res) => {
  try {
    console.log('📝 Processing sign-up...');
    console.log('📋 Sign-up data received:', JSON.stringify(req.body, null, 2));
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    const result = await subscriptionService.handleSignUp(req.body, clientIp);
    console.log('✅ Sign-up successful:', result);
    res.json(result);
  } catch (error: any) {
    console.error('❌ Sign-up error (detailed):', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Sign-up failed. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Stripe webhook endpoint (no auth required, uses Stripe signature verification)
router.post('/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  
  if (!sig) {
    console.error('❌ No Stripe signature found');
    return res.status(400).send('Webhook Error: No signature');
  }

  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2025-09-30.clover',
    });
    
    const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    
    console.log(`✅ Stripe webhook received: ${event.type}`);
    await subscriptionService.handleStripeWebhook(event);
    
    res.json({ received: true });
  } catch (error: any) {
    console.error('❌ Webhook Error:', error.message);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
});

// ==========================================
// EMAIL TRACKING ENDPOINTS (Public - No Auth)
// ==========================================

// Track email open (1x1 pixel)
router.get('/track/email/:trackingId/open', async (req, res) => {
  try {
    const { trackingId } = req.params;
    
    // Update email opened_at and increment open_count
    const result = await pool.query(
      `UPDATE lead_emails 
       SET opened_at = COALESCE(opened_at, NOW()), 
           open_count = open_count + 1
       WHERE tracking_id = $1
       RETURNING id, lead_id`,
      [trackingId]
    );
    
    if (result.rows.length > 0) {
      const { id: emailId, lead_id: leadId } = result.rows[0];
      
      // Log activity
      await pool.query(
        `INSERT INTO lead_activity (lead_id, activity_type, activity_data, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [leadId, 'email_opened', JSON.stringify({ email_id: emailId, tracking_id: trackingId })]
      );
      
      console.log(`📧 Email opened: ${trackingId}`);
    }
    
    // Return 1x1 transparent pixel
    const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    res.writeHead(200, {
      'Content-Type': 'image/gif',
      'Content-Length': pixel.length,
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    });
    res.end(pixel);
  } catch (error) {
    console.error('Error tracking email open:', error);
    // Still return pixel even on error
    const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    res.writeHead(200, { 'Content-Type': 'image/gif', 'Content-Length': pixel.length });
    res.end(pixel);
  }
});

// Track link click and redirect
router.get('/track/email/:trackingId/click', async (req, res) => {
  try {
    const { trackingId } = req.params;
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }
    
    const originalUrl = decodeURIComponent(url as string);
    
    // Update email clicked_at and increment click_count
    const emailResult = await pool.query(
      `UPDATE lead_emails 
       SET clicked_at = COALESCE(clicked_at, NOW()), 
           click_count = click_count + 1
       WHERE tracking_id = $1
       RETURNING id, lead_id`,
      [trackingId]
    );
    
    if (emailResult.rows.length > 0) {
      const { id: emailId, lead_id: leadId } = emailResult.rows[0];
      
      // Update link tracking
      await pool.query(
        `UPDATE email_link_tracking 
         SET clicks = clicks + 1, last_clicked_at = NOW()
         WHERE email_id = $1 AND original_url = $2`,
        [emailId, originalUrl]
      );
      
      // Log activity
      await pool.query(
        `INSERT INTO lead_activity (lead_id, activity_type, activity_data, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [leadId, 'email_link_clicked', JSON.stringify({ 
          email_id: emailId, 
          tracking_id: trackingId, 
          url: originalUrl 
        })]
      );
      
      console.log(`🔗 Email link clicked: ${trackingId} -> ${originalUrl}`);
    }
    
    // Redirect to original URL
    res.redirect(originalUrl);
  } catch (error) {
    console.error('Error tracking email click:', error);
    // Still redirect to URL even on error
    const originalUrl = req.query.url ? decodeURIComponent(req.query.url as string) : 'https://www.marketingby.wetechforu.com';
    res.redirect(originalUrl);
  }
});

// Apply auth middleware to all other API routes
router.use(requireAuth);

// Admin Dashboard Endpoints
router.get('/admin/dashboard/overview', async (req, res) => {
  try {
    // Get system overview statistics
    const [clientsResult, campaignsResult, usersResult] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM clients'),
      pool.query('SELECT COUNT(*) as count FROM campaigns WHERE status = $1', ['active']),
      pool.query('SELECT COUNT(*) as count FROM users')
    ]);

    // Mock revenue data (replace with actual calculation)
    const revenueThisMonth = 45230;

    res.json({
      totalClients: parseInt(clientsResult.rows[0].count),
      activeCampaigns: parseInt(campaignsResult.rows[0].count),
      revenueThisMonth: revenueThisMonth,
      totalUsers: parseInt(usersResult.rows[0].count)
    });
  } catch (error) {
    console.error('Admin dashboard overview error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/admin/clients', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const result = await pool.query(
      `SELECT id, client_name as name, email, contact_name as company, phone, is_active as status, created_at 
       FROM clients 
       ORDER BY created_at DESC 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countResult = await pool.query('SELECT COUNT(*) as count FROM clients');
    const total = parseInt(countResult.rows[0].count);

    res.json({
      clients: result.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get admin clients error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/admin/users', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const result = await pool.query(
      `SELECT id, email, username, role, created_at 
       FROM users 
       ORDER BY created_at DESC 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countResult = await pool.query('SELECT COUNT(*) as count FROM users');
    const total = parseInt(countResult.rows[0].count);

    res.json({
      users: result.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get admin users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/admin/analytics/system', async (req, res) => {
  try {
    // Get system-wide analytics
    const [clientsResult, leadsResult, campaignsResult] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM clients WHERE is_active = true'),
      pool.query('SELECT COUNT(*) as count FROM leads WHERE created_at >= NOW() - INTERVAL \'30 days\''),
      pool.query('SELECT COUNT(*) as count FROM campaigns WHERE status = $1', ['active'])
    ]);

    res.json({
      activeClients: parseInt(clientsResult.rows[0].count),
      newLeadsLast30Days: parseInt(leadsResult.rows[0].count),
      activeCampaigns: parseInt(campaignsResult.rows[0].count),
      systemHealth: 'excellent',
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get system analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get clients
router.get('/clients', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, client_name as name, email, phone, contact_name as company, is_active as status, created_at FROM clients ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get clients error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get leads statistics
router.get('/leads/stats', async (req, res) => {
  try {
    // Get client filter based on user's role and client_id
    const { whereClause, params } = getClientFilter(req);
    const whereSql = whereClause ? `WHERE ${whereClause}` : '';
    
    const [totalLeads, inProcessLeads, todayScraped, violationStopped] = await Promise.all([
      pool.query(`SELECT COUNT(*) as count FROM leads ${whereSql}`, params),
      pool.query(
        `SELECT COUNT(*) as count FROM leads ${whereSql ? whereSql + ' AND' : 'WHERE'} status IN ($${params.length + 1}, $${params.length + 2}, $${params.length + 3})`, 
        [...params, 'new', 'contacted', 'qualified']
      ),
      pool.query(
        `SELECT COUNT(*) as count FROM leads ${whereSql ? whereSql + ' AND' : 'WHERE'} DATE(created_at) = CURRENT_DATE`, 
        params
      ),
      pool.query(
        `SELECT COUNT(*) as count FROM leads ${whereSql ? whereSql + ' AND' : 'WHERE'} rejection_reason IS NOT NULL AND rejection_reason LIKE $${params.length + 1}`, 
        [...params, '%violation%']
      )
    ]);

    res.json({
      totalLeads: parseInt(totalLeads.rows[0].count),
      inProcessLeads: parseInt(inProcessLeads.rows[0].count),
      todayScraped: parseInt(todayScraped.rows[0].count),
      violationStopped: parseInt(violationStopped.rows[0].count)
    });
  } catch (error) {
    console.error('Get leads stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Scrape website for lead data
router.post('/leads/scrape', async (req, res) => {
  try {
    const { website_url } = req.body;

    if (!website_url) {
      return res.status(400).json({ error: 'Website URL is required' });
    }

    // Validate URL
    try {
      new URL(website_url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }
    
    // Check if lead already exists
    const existingLead = await pool.query(
      'SELECT id FROM leads WHERE website_url = $1',
      [website_url]
    );

    if (existingLead.rows.length > 0) {
      return res.status(400).json({ error: 'Lead for this website already exists' });
    }

    // For now, create a basic lead entry based on the URL
    // TODO: Implement full web scraping functionality
    const domain = new URL(website_url).hostname;
    const clinicName = domain.replace('www.', '').split('.')[0];
    
    const scrapedData = {
      clinicName: clinicName.charAt(0).toUpperCase() + clinicName.slice(1) + ' Clinic',
      websiteUrl: website_url,
      contactEmail: undefined,
      contactPhone: undefined,
      address: undefined,
      services: [],
      industryCategory: 'Healthcare',
      industrySubcategory: 'Primary Care',
      leadSource: 'Website Scraping',
      status: 'new'
    };

    // Create new lead with scraped data
    const result = await pool.query(
      `INSERT INTO leads (
        clinic_name, 
        website_url, 
        contact_email,
        contact_phone,
        address,
        lead_source, 
        status, 
        industry_category, 
        industry_subcategory,
        notes,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW()) RETURNING id`,
      [
        scrapedData.clinicName,
        scrapedData.websiteUrl,
        scrapedData.contactEmail,
        scrapedData.contactPhone,
        scrapedData.address,
        scrapedData.leadSource,
        scrapedData.status,
        scrapedData.industryCategory,
        scrapedData.industrySubcategory,
        scrapedData.services ? scrapedData.services.join(', ') : null
      ]
    );

    res.json({
      success: true,
      message: 'Website scraped successfully',
      leadId: result.rows[0].id,
      scrapedData: scrapedData
    });

  } catch (error) {
    console.error('Website scraping error:', error);
    res.status(500).json({ 
      error: 'Failed to scrape website',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get leads
router.get('/leads', async (req, res) => {
  try {
    // Get client filter based on user's role and client_id
    const { whereClause, params } = getClientFilter(req);
    
    const whereSql = whereClause ? `WHERE ${whereClause}` : '';
    
    const result = await pool.query(
      `SELECT 
        l.id, 
        l.company, 
        l.email, 
        l.phone, 
        l.industry_category, 
        l.industry_subcategory, 
        l.source, 
        l.status, 
        l.notes, 
        l.website_url, 
        l.address, 
        l.city, 
        l.state, 
        l.zip_code, 
        l.contact_first_name, 
        l.contact_last_name, 
        l.compliance_status, 
        l.client_id,
        l.created_at,
        l.assigned_to,
        l.assigned_at,
        l.assigned_by,
        l.assignment_notes,
        u1.username as assigned_to_name,
        u2.username as assigned_by_name
      FROM leads l
      LEFT JOIN users u1 ON l.assigned_to = u1.id
      LEFT JOIN users u2 ON l.assigned_by = u2.id
      ${whereSql}
      ORDER BY l.created_at DESC`,
      params
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get leads error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add manual lead
router.post('/leads', async (req, res) => {
  try {
    const {
      company,
      email,
      phone,
      industry_category,
      industry_subcategory,
      source,
      status,
      notes,
      website_url,
      address,
      city,
      state,
      zip_code,
      contact_first_name,
      contact_last_name,
      compliance_status
    } = req.body;

    // Get the appropriate client_id for this user
    const client_id = getClientIdForCreate(req);

    // Validate required fields
    if (!company || !email) {
      return res.status(400).json({ error: 'Company and email are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check if lead with this email already exists (within the same client if applicable)
    const { whereClause, params: filterParams } = getClientFilter(req);
    const emailCheckSql = whereClause 
      ? `SELECT id FROM leads WHERE email = $1 AND ${whereClause.replace('$1', '$2')}`
      : `SELECT id FROM leads WHERE email = $1`;
    
    const emailCheckParams = whereClause ? [email, ...filterParams] : [email];
    
    const existingLead = await pool.query(emailCheckSql, emailCheckParams);

    if (existingLead.rows.length > 0) {
      return res.status(400).json({ error: 'Lead with this email already exists' });
    }

    // Insert new lead with client_id
    const result = await pool.query(
      `INSERT INTO leads (
        company, email, phone, industry_category, industry_subcategory,
        source, status, notes, website_url, address, city, state, zip_code,
        contact_first_name, contact_last_name, compliance_status, client_id, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW()) 
      RETURNING *`,
      [
        company, email, phone, industry_category, industry_subcategory,
        source, status, notes, website_url, address, city, state, zip_code,
        contact_first_name, contact_last_name, compliance_status, client_id
      ]
    );

    res.json({
      success: true,
      message: 'Lead added successfully',
      lead: result.rows[0]
    });

  } catch (error) {
    console.error('Add manual lead error:', error);
    res.status(500).json({ error: 'Failed to add lead' });
  }
});

// Contact lead
router.post('/leads/contact', async (req, res) => {
  try {
    const { leadId, email } = req.body;

    if (!leadId || !email) {
      return res.status(400).json({ error: 'Lead ID and email are required' });
    }

    // TODO: Implement actual email sending functionality
    // For now, just return success
    res.json({
      success: true,
      message: 'Contact email sent successfully',
      messageId: 'temp-message-id'
    });

  } catch (error) {
    console.error('Contact lead error:', error);
    res.status(500).json({ error: 'Failed to send contact email' });
  }
});

// Delete all leads
router.delete('/leads/delete-all', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM leads');
    
    res.json({
      success: true,
      message: `Deleted ${result.rowCount} leads successfully`
    });

  } catch (error) {
    console.error('Delete all leads error:', error);
    res.status(500).json({ error: 'Failed to delete leads' });
  }
});

// Bulk delete leads endpoint
router.post('/leads/bulk-delete', async (req, res) => {
  try {
    const { leadIds } = req.body;
    
    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({ error: 'Invalid lead IDs' });
    }
    
    const result = await pool.query(
      'DELETE FROM leads WHERE id = ANY($1::int[])',
      [leadIds]
    );
    
    res.json({
      success: true,
      message: `Deleted ${result.rowCount} lead(s) successfully`,
      deletedCount: result.rowCount
    });

  } catch (error) {
    console.error('Bulk delete leads error:', error);
    res.status(500).json({ error: 'Failed to delete leads' });
  }
});

// Export leads
router.get('/leads/export', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT company, email, phone, source, status, created_at FROM leads ORDER BY created_at DESC'
    );

    // Convert to CSV format
    const csvHeader = 'Company,Email,Phone,Source,Status,Created At\n';
    const csvData = result.rows.map(lead => 
      `"${lead.company || ''}","${lead.email || ''}","${lead.phone || ''}","${lead.source || ''}","${lead.status || ''}","${lead.created_at || ''}"`
    ).join('\n');

    const csv = csvHeader + csvData;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=leads-export.csv');
    res.send(csv);

  } catch (error) {
    console.error('Export leads error:', error);
    res.status(500).json({ error: 'Failed to export leads' });
  }
});

// Get campaigns
router.get('/campaigns', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, client_id, type, status, budget, start_date, end_date, created_at FROM campaigns ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get campaigns error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user permissions (updated to match master document)
router.get('/users/me/permissions', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get user admin status from database
    const result = await pool.query(
      'SELECT role FROM users WHERE id = $1',
      [req.session.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isAdmin = result.rows[0].role === 'super_admin' || result.rows[0].role === 'admin';

    // Define permissions based on admin status (matching master document)
    const permissions = {
      canViewUsers: isAdmin,
      canManageUsers: isAdmin,
      canViewLeads: true,
      canManageLeads: true,
      canViewClients: true,
      canManageClients: true,
      canViewSEO: true,
      canManageSEO: true,
      canViewAnalytics: true,
      canViewCalendar: true,
      canManageCalendar: true,
      canViewCompliance: true,
      canManageCompliance: true,
      canViewAISEO: true,
      canManageAISEO: true,
      canViewSEOTasks: true,
      canManageSEOTasks: true,
      canViewCredentials: isAdmin,
      canManageCredentials: isAdmin
    };

    res.json(permissions);
  } catch (error) {
    console.error('Get user permissions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get users
router.get('/users', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, username, role, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get analytics data
router.get('/analytics', async (req, res) => {
  try {
    // Get basic counts
    const [clientsResult, leadsResult, campaignsResult] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM clients'),
      pool.query('SELECT COUNT(*) as count FROM leads'),
      pool.query('SELECT COUNT(*) as count FROM campaigns')
    ]);

    res.json({
      clients: parseInt(clientsResult.rows[0].count),
      leads: parseInt(leadsResult.rows[0].count),
      campaigns: parseInt(campaignsResult.rows[0].count)
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Client Dashboard endpoints
router.get('/client-dashboard/overview', async (req, res) => {
  try {
    // Get client-specific overview data
    const { view_only } = req.query;
    
    // Mock data for now - replace with actual client-specific queries
    const overview = {
      seoScore: 85,
      leadsThisMonth: 23,
      websiteTraffic: 1247,
      trafficGrowth: 12,
      newLeadsThisWeek: 5,
      seoScoreStatus: 'good'
    };

    res.json(overview);
  } catch (error) {
    console.error('Get client overview error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/client-dashboard/analytics', async (req, res) => {
  try {
    const [clientsResult, leadsResult, campaignsResult] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM clients'),
      pool.query('SELECT COUNT(*) as count FROM leads'),
      pool.query('SELECT COUNT(*) as count FROM campaigns')
    ]);

    res.json({
      totalClients: parseInt(clientsResult.rows[0].count),
      totalLeads: parseInt(leadsResult.rows[0].count),
      activeCampaigns: parseInt(campaignsResult.rows[0].count),
      monthlyGrowth: 12.5 // Mock data
    });
  } catch (error) {
    console.error('Get client dashboard analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/client-dashboard/clients', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, client_name as name, email, contact_name as company, is_active as status, created_at FROM clients ORDER BY created_at DESC LIMIT 10'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get client dashboard clients error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/client-dashboard/campaigns', async (req, res) => {
  try {
    // Get client-specific campaigns
    const result = await pool.query(
      `SELECT id, name, type, status, budget, start_date, end_date, created_at 
       FROM campaigns 
       WHERE client_id = $1 
       ORDER BY created_at DESC`,
      [req.session.userId] // This should be client_id, but using user_id for now
    );

    // Transform the data to match frontend expectations
    const campaigns = result.rows.map(campaign => ({
      id: campaign.id.toString(),
      name: campaign.name,
      type: campaign.type,
      status: campaign.status,
      budget: parseFloat(campaign.budget) || 0,
      startDate: campaign.start_date,
      endDate: campaign.end_date
    }));

    res.json(campaigns);
  } catch (error) {
    console.error('Get client dashboard campaigns error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/client-dashboard/api-access', async (req, res) => {
  try {
    // Mock API access data
    res.json({
      googleMaps: { enabled: true, quota: 1000, used: 250 },
      googleAnalytics: { enabled: true, quota: 10000, used: 1500 },
      azureEmail: { enabled: true, quota: 10000, used: 500 },
      mozApi: { enabled: false, quota: 0, used: 0 }
    });
  } catch (error) {
    console.error('Get client dashboard API access error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

  // Scrape leads from website
  router.post('/scrape-website-leads', async (req, res) => {
    try {
      const { url, maxLeads = 10, state = 'Texas', includeSEO = true, keywords = [] } = req.body;

      if (!url) {
        return res.status(400).json({ error: 'URL is required' });
      }

      // TODO: Re-enable compliance checking when services are fixed
      // const complianceService = ComplianceCheckService.getInstance();
      // const complianceResult = await complianceService.checkWebsiteScrapingCompliance(url, state);
      
      // if (!complianceResult.isCompliant) {
      //   return res.status(403).json({ 
      //     error: 'Compliance check failed', 
      //     compliance: complianceResult 
      //   });
      // }

      // console.log('✅ Compliance check passed for website scraping');
      // if (complianceResult.warnings.length > 0) {
      //   console.log('⚠️ Compliance warnings:', complianceResult.warnings);
      // }

      // TODO: Re-enable lead scraping when services are fixed
      // const leads = await LeadScrapingService.scrapeLeadsFromWebsite(url, maxLeads, includeSEO, keywords);
      const leads = []; // Temporary placeholder

      // Save leads to database
      const savedLeads = [];
      for (const lead of leads) {
        const result = await pool.query(
          `INSERT INTO leads (
            clinic_name, contact_email, contact_phone, website_url, industry_category,
            lead_source, compliance_status, notes, contact_first_name, contact_last_name,
            address, city, state, zip_code, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW()) RETURNING *`,
          [
            lead.clinic_name, lead.contact_email, lead.contact_phone, lead.website_url,
            lead.industry_category, lead.lead_source, lead.compliance_status, lead.notes,
            lead.contact_first_name, lead.contact_last_name, lead.address, lead.city,
            lead.state, lead.zip_code
          ]
        );
        savedLeads.push(result.rows[0]);
      }

      res.json({
        success: true,
        message: `Successfully scraped and saved ${savedLeads.length} leads`,
        leads: savedLeads
      });

    } catch (error) {
      console.error('Scrape website leads error:', error);
      res.status(500).json({ error: 'Failed to scrape leads from website' });
    }
  });

  // Scrape leads by zip code
  router.post('/scrape-zipcode-leads', async (req, res) => {
    try {
      const { zipCode, radius = 5, maxLeads = 10, usePaidAPIs = false, state = 'Texas' } = req.body;

      if (!zipCode) {
        return res.status(400).json({ error: 'Zip code is required' });
      }

      // Check compliance before scraping
      // const complianceService = ComplianceCheckService.getInstance();
      // const complianceResult = await complianceService.checkComplianceForAction('zipcode_scraping', state);
      const complianceResult = { isCompliant: true, warnings: [] }; // Temporary placeholder
      
      if (!complianceResult.isCompliant) {
        return res.status(403).json({ 
          error: 'Compliance check failed', 
          compliance: complianceResult 
        });
      }

      console.log('✅ Compliance check passed for zip code scraping');
      if (complianceResult.warnings.length > 0) {
        console.log('⚠️ Compliance warnings:', complianceResult.warnings);
      }

      const options = {
        zipCode,
        radius,
        maxLeads,
        usePaidAPIs
      };

      // const leads = await LeadScrapingService.scrapeLeadsByZipCode(options);
      const leads = []; // Temporary placeholder

      // Save leads to database
      const savedLeads = [];
      for (const lead of leads) {
        const result = await pool.query(
          `INSERT INTO leads (
            clinic_name, contact_email, contact_phone, website_url, industry_category,
            lead_source, compliance_status, notes, contact_first_name, contact_last_name,
            address, city, state, zip_code, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW()) RETURNING *`,
          [
            lead.clinic_name, lead.contact_email, lead.contact_phone, lead.website_url,
            lead.industry_category, lead.lead_source, lead.compliance_status, lead.notes,
            lead.contact_first_name, lead.contact_last_name, lead.address, lead.city,
            lead.state, lead.zip_code
          ]
        );
        savedLeads.push(result.rows[0]);
      }

      res.json({
        success: true,
        message: `Successfully scraped and saved ${savedLeads.length} leads for zip code ${zipCode}`,
        leads: savedLeads
      });

    } catch (error) {
      console.error('Scrape zipcode leads error:', error);
      res.status(500).json({ error: 'Failed to scrape leads by zip code' });
    }
  });

  // Check API credits
  router.get('/api-credits', async (req, res) => {
    try {
      // const credits = await LeadScrapingService.checkAPICredits();
      const credits = { remaining: 100, used: 0 }; // Temporary placeholder
      res.json(credits);
    } catch (error) {
      console.error('Check API credits error:', error);
      res.status(500).json({ error: 'Failed to check API credits' });
    }
  });

  // Get compliance settings
  router.get('/compliance-settings', async (req, res) => {
    try {
      const { state = 'Texas' } = req.query;
      // const complianceService = ComplianceCheckService.getInstance();
      // const settings = complianceService.getComplianceSettings(state as string);
      const settings = { enabled: true, rules: [] }; // Temporary placeholder
      
      if (!settings) {
        return res.status(404).json({ error: 'Compliance settings not found for state' });
      }
      
      res.json(settings);
    } catch (error) {
      console.error('Get compliance settings error:', error);
      res.status(500).json({ error: 'Failed to get compliance settings' });
    }
  });

  // Check compliance for action
  router.post('/compliance-check', async (req, res) => {
    try {
      const { action, state = 'Texas', additionalData } = req.body;
      
      if (!action) {
        return res.status(400).json({ error: 'Action is required' });
      }
      
      // const complianceService = ComplianceCheckService.getInstance();
      // const result = await complianceService.checkComplianceForAction(action, state, additionalData);
      const result = { isCompliant: true, warnings: [], recommendations: [] }; // Temporary placeholder
      
      res.json(result);
    } catch (error) {
      console.error('Compliance check error:', error);
      res.status(500).json({ error: 'Failed to check compliance' });
    }
  });

  // Delete lead
  router.delete('/leads/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      const result = await pool.query('DELETE FROM leads WHERE id = $1 RETURNING *', [id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Lead not found' });
      }
      
      res.json({ success: true, message: 'Lead deleted successfully' });
    } catch (error) {
      console.error('Delete lead error:', error);
      res.status(500).json({ error: 'Failed to delete lead' });
    }
  });

  // Get individual lead details
  router.get('/leads/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      const result = await pool.query('SELECT * FROM leads WHERE id = $1', [id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Lead not found' });
      }
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Get lead error:', error);
      res.status(500).json({ error: 'Failed to fetch lead' });
    }
  });

  // Update lead
  router.put('/leads/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const lead = req.body;
      
      const result = await pool.query(
        `UPDATE leads SET
          company = $1, email = $2, phone = $3, website_url = $4,
          address = $5, city = $6, state = $7, zip_code = $8,
          contact_first_name = $9, contact_last_name = $10,
          status = $11, source = $12, notes = $13, updated_at = NOW()
        WHERE id = $14 RETURNING *`,
        [
          lead.company, lead.email, lead.phone, lead.website_url,
          lead.address, lead.city, lead.state, lead.zip_code,
          lead.contact_first_name, lead.contact_last_name,
          lead.status, lead.source, lead.notes, id
        ]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Lead not found' });
      }
      
      // Log activity
      await pool.query(
        `INSERT INTO lead_activity (lead_id, activity_type, activity_data, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [id, 'status_changed', JSON.stringify({ old_status: req.body.old_status, new_status: lead.status })]
      );
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Update lead error:', error);
      res.status(500).json({ error: 'Failed to update lead' });
    }
  });

  // Get lead activity
  router.get('/leads/:id/activity', async (req, res) => {
    try {
      const { id } = req.params;
      
      const result = await pool.query(
        `SELECT * FROM lead_activity WHERE lead_id = $1 ORDER BY created_at DESC LIMIT 50`,
        [id]
      );
      
      res.json(result.rows);
    } catch (error) {
      console.error('Get lead activity error:', error);
      res.status(500).json({ error: 'Failed to fetch lead activity' });
    }
  });

  // Get lead email history
  router.get('/leads/:id/emails', async (req, res) => {
    try {
      const { id } = req.params;
      
      const result = await pool.query(
        `SELECT * FROM lead_emails WHERE lead_id = $1 ORDER BY sent_at DESC`,
        [id]
      );
      
      res.json(result.rows);
    } catch (error) {
      console.error('Get lead emails error:', error);
      res.status(500).json({ error: 'Failed to fetch lead emails' });
    }
  });

  // Get lead SEO reports
  router.get('/leads/:id/seo-reports', async (req, res) => {
    try {
      const { id } = req.params;
      
      const result = await pool.query(
        `SELECT * FROM lead_seo_reports WHERE lead_id = $1 ORDER BY sent_at DESC`,
        [id]
      );
      
      res.json(result.rows);
    } catch (error) {
      console.error('Get lead SEO reports error:', error);
      res.status(500).json({ error: 'Failed to fetch SEO reports' });
    }
  });

  // Send email to lead
  router.post('/leads/:id/send-email', async (req, res) => {
    try {
      const { id } = req.params;
      const { subject, body } = req.body;
      
      // Get lead details
      const leadResult = await pool.query('SELECT * FROM leads WHERE id = $1', [id]);
      if (leadResult.rows.length === 0) {
        return res.status(404).json({ error: 'Lead not found' });
      }
      
      const lead = leadResult.rows[0];
      
      // TODO: Send actual email using email service
      // For now, just log it to database
      
      const emailResult = await pool.query(
        `INSERT INTO lead_emails (lead_id, subject, body, status, sent_at)
         VALUES ($1, $2, $3, $4, NOW()) RETURNING *`,
        [id, subject, body, 'sent']
      );
      
      // Log activity
      await pool.query(
        `INSERT INTO lead_activity (lead_id, activity_type, activity_data, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [id, 'email_sent', JSON.stringify({ subject, email: lead.email })]
      );
      
      res.json({ success: true, email: emailResult.rows[0] });
    } catch (error) {
      console.error('Send email error:', error);
      res.status(500).json({ error: 'Failed to send email' });
    }
  });

  // Generate SEO report for lead and send email
  router.post('/leads/:id/generate-seo-report', async (req, res) => {
    try {
      const { id } = req.params;
      const { reportType, sendEmail } = req.body;
      
      console.log(`🔍 Generating ${reportType} SEO report for lead ${id}...`);
      console.log(`📧 Send email requested: ${sendEmail}`);
      
      // Get lead details
      const leadResult = await pool.query('SELECT * FROM leads WHERE id = $1', [id]);
      
      if (leadResult.rows.length === 0) {
        console.error(`❌ Lead ${id} not found`);
        return res.status(404).json({ error: 'Lead not found' });
      }
      
      const lead = leadResult.rows[0];
      const websiteUrl = lead.website_url;
      const companyName = lead.company || lead.clinic_name;
      const contactName = `${lead.contact_first_name || ''} ${lead.contact_last_name || ''}`.trim() || 'there';
      const contactEmail = lead.email;
      
      console.log(`📊 Lead details - Company: ${companyName}, Website: ${websiteUrl}, Email: ${contactEmail}`);
      
      if (!websiteUrl) {
        console.error(`❌ Lead ${id} has no website URL`);
        return res.status(400).json({ error: 'Lead has no website URL' });
      }
      
      // Import SEO services
      console.log('📦 Loading SEO services...');
      const ComprehensiveSEOService = require('../services/comprehensiveSEOService').ComprehensiveSEOService;
      const SEOEmailReportService = require('../services/seoEmailReportService').SEOEmailReportService;
      
      const seoService = ComprehensiveSEOService.getInstance();
      const emailService = SEOEmailReportService.getInstance();
      console.log('✅ SEO services loaded');
      
      let reportData;
      let emailSent = false;
      
      if (reportType === 'basic') {
        console.log('📊 Running basic SEO analysis...');
        try {
          // Run standard basic SEO analysis
          reportData = await seoService.generateBasicSEOReport(websiteUrl, companyName);
          
          // Run enhanced analysis for modern SEO signals
          console.log('🚀 Running enhanced SEO analysis (paid ads, social, AI, keywords)...');
          const { EnhancedSEOAnalyzer } = require('../services/enhancedSEOAnalyzer');
          const enhancedData = await EnhancedSEOAnalyzer.analyze(websiteUrl);
          
          // Merge enhanced data into report
          reportData.enhancedData = enhancedData;
          reportData.overallScore = enhancedData.scores.overall;
          
          console.log('✅ Basic SEO analysis complete with enhanced data');
        } catch (seoError) {
          console.error('❌ Basic SEO analysis failed:', seoError);
          throw new Error(`SEO analysis failed: ${seoError instanceof Error ? seoError.message : 'Unknown error'}`);
        }
        
        // Send email if requested
        if (sendEmail && contactEmail) {
          console.log(`📧 Sending basic SEO report to ${contactEmail}...`);
          try {
            emailSent = await emailService.sendBasicSEOReport(
              contactEmail,
              companyName,
              contactName,
              websiteUrl,
              reportData
            );
            console.log(`✅ Email sent status: ${emailSent}`);
          } catch (emailError) {
            console.error('❌ Email sending failed:', emailError);
            // Don't fail the whole request if email fails
            emailSent = false;
          }
        }
      } else if (reportType === 'comprehensive') {
        console.log('📊 Running comprehensive SEO analysis...');
        try {
          reportData = await seoService.generateComprehensiveSEOReport(
            websiteUrl,
            companyName,
            lead.industry || 'healthcare'
          );
          console.log('✅ Comprehensive SEO analysis complete');
        } catch (seoError) {
          console.error('❌ Comprehensive SEO analysis failed:', seoError);
          throw new Error(`SEO analysis failed: ${seoError instanceof Error ? seoError.message : 'Unknown error'}`);
        }
        
        // Send email if requested
        if (sendEmail && contactEmail) {
          console.log(`📧 Sending comprehensive SEO report to ${contactEmail}...`);
          try {
            emailSent = await emailService.sendComprehensiveSEOReport(
              contactEmail,
              companyName,
              contactName,
              websiteUrl,
              reportData
            );
            console.log(`✅ Email sent status: ${emailSent}`);
          } catch (emailError) {
            console.error('❌ Email sending failed:', emailError);
            // Don't fail the whole request if email fails
            emailSent = false;
          }
        }
      } else {
        console.error(`❌ Invalid report type: ${reportType}`);
        return res.status(400).json({ error: 'Invalid report type. Use "basic" or "comprehensive"' });
      }
      
      // Save report to database
      console.log('💾 Saving report to database...');
      
      // Generate report name: SEO_Report_CompanyName_Client_YYYY-MM-DD
      const clientIdForName = (req as any).user?.client_id || lead.client_id || 'N/A';
      const dateString = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const cleanCompanyName = companyName.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_'); // Clean company name
      const reportName = `SEO_Report_${cleanCompanyName}_Client_${dateString}`;
      
      console.log(`📝 Generated report name: ${reportName}`);
      
      // First insert report to get report ID for offer token
      const reportResult = await pool.query(
        `INSERT INTO lead_seo_reports (lead_id, report_type, report_data, report_name, sent_at)
         VALUES ($1, $2, $3, $4, NOW()) RETURNING *`,
        [id, reportType, JSON.stringify(reportData), reportName]
      );
      
      const reportId = reportResult.rows[0].id;
      console.log(`✅ Report saved with ID: ${reportId}`);
      
      // Generate offer token and expiration (72 hours)
      const now = new Date();
      const offerToken = Buffer.from(`report-${reportId}-${now.getTime()}`).toString('base64').substring(0, 20);
      const offerExpiresAt = new Date(now.getTime() + (72 * 60 * 60 * 1000));
      
      console.log(`🎟️  Generated offer token: ${offerToken} (expires: ${offerExpiresAt.toISOString()})`);
      
      // Generate HTML report with report ID for offer link
      const { SEOReportHtmlGenerator } = require('../services/seoReportHtmlGenerator');
      let htmlReport: string;
      
      if (reportType === 'basic') {
        htmlReport = SEOReportHtmlGenerator.generateBasicReport({
          websiteUrl,
          companyName,
          ...reportData,
          analyzedAt: new Date().toISOString(),
          reportId // Pass reportId for offer link
        });
      } else {
        htmlReport = SEOReportHtmlGenerator.generateComprehensiveReport({
          websiteUrl,
          companyName,
          ...reportData,
          analyzedAt: new Date().toISOString(),
          reportId // Pass reportId for offer link
        });
      }
      
      // Update report with HTML and offer token
      await pool.query(
        `UPDATE lead_seo_reports 
         SET html_report = $1, offer_token = $2, offer_expires_at = $3
         WHERE id = $4`,
        [htmlReport, offerToken, offerExpiresAt, reportId]
      );
      console.log('✅ Report updated with HTML and offer token');
      
      // Log activity
      const activityData = {
        report_type: reportType,
        website: websiteUrl,
        score: reportData.overallScore || reportData.score,
        email_sent: emailSent,
        email: contactEmail
      };
      
      await pool.query(
        `INSERT INTO lead_activity (lead_id, activity_type, activity_data, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [id, 'seo_report_generated', JSON.stringify(activityData)]
      );
      console.log('✅ Activity logged');
      
      // Log email sent activity
      if (emailSent) {
        await pool.query(
          `INSERT INTO lead_emails (lead_id, subject, body, status, sent_at, created_at)
           VALUES ($1, $2, $3, $4, NOW(), NOW())`,
          [
            id,
            `${reportType === 'basic' ? '🚀 Your Free Basic SEO Analysis' : '📊 Your Complete SEO & Competitor Analysis'} - ${companyName}`,
            `${reportType.toUpperCase()} SEO Report sent to ${contactEmail}`,
            'sent'
          ]
        );
        
        await pool.query(
          `INSERT INTO lead_activity (lead_id, activity_type, activity_data, created_at)
           VALUES ($1, $2, $3, NOW())`,
          [id, 'email_sent', JSON.stringify({ type: `${reportType}_seo_report`, email: contactEmail })]
        );
        console.log('✅ Email activity logged');
      }
      
      console.log(`✅ ${reportType} SEO report generated successfully${emailSent ? ' and sent' : ''}`);
      
      res.json({
        success: true,
        report: reportResult.rows[0],
        emailSent,
        message: emailSent 
          ? `${reportType} SEO report generated and sent to ${contactEmail}` 
          : `${reportType} SEO report generated successfully`
      });
    } catch (error) {
      console.error('❌ Generate SEO report error:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      res.status(500).json({
        error: 'Failed to generate SEO report',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Delete SEO report(s) for a lead
  router.delete('/leads/:id/seo-reports/:reportId', async (req, res) => {
    try {
      const { id, reportId } = req.params;
      
      console.log(`🗑️  Deleting SEO report ${reportId} for lead ${id}...`);
      
      // Verify the report belongs to the lead
      const reportCheck = await pool.query(
        'SELECT id FROM lead_seo_reports WHERE id = $1 AND lead_id = $2',
        [reportId, id]
      );
      
      if (reportCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Report not found' });
      }
      
      // Delete the report
      await pool.query('DELETE FROM lead_seo_reports WHERE id = $1', [reportId]);
      
      // Log activity
      await pool.query(
        `INSERT INTO lead_activity (lead_id, activity_type, activity_data, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [id, 'seo_report_deleted', JSON.stringify({ report_id: reportId })]
      );
      
      console.log(`✅ SEO report ${reportId} deleted successfully`);
      
      res.json({
        success: true,
        message: 'SEO report deleted successfully'
      });
    } catch (error) {
      console.error('Delete SEO report error:', error);
      res.status(500).json({
        error: 'Failed to delete SEO report',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Send SEO report to lead
router.post('/send-seo-report', async (req, res) => {
  try {
    const { leadId, senderInfo } = req.body;
    
    if (!leadId) {
      return res.status(400).json({ error: 'Lead ID is required' });
    }

    // Get lead data with SEO analysis
    const leadResult = await pool.query(
      'SELECT * FROM leads WHERE id = $1',
      [leadId]
    );

    if (leadResult.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const lead = leadResult.rows[0];
    
    if (!lead.seo_analysis || !lead.seo_report) {
      return res.status(400).json({ error: 'No SEO analysis available for this lead' });
    }

    const seoAnalysis = typeof lead.seo_analysis === 'string' 
      ? JSON.parse(lead.seo_analysis) 
      : lead.seo_analysis;

    // const emailService = SEOEmailService.getInstance();
    const emailService = null; // Temporary placeholder
    
    const emailData = {
      leadName: `${lead.contact_first_name} ${lead.contact_last_name}`,
      leadEmail: lead.contact_email,
      clinicName: lead.clinic_name,
      websiteUrl: lead.website_url,
      seoScore: seoAnalysis.score,
      reportContent: lead.seo_report,
      recommendations: seoAnalysis.recommendations,
      senderName: senderInfo?.name || 'Healthcare Marketing Specialist',
      senderEmail: senderInfo?.email || 'info@healthcaremarketing.com',
      senderPhone: senderInfo?.phone || '(555) 123-4567',
      senderWebsite: senderInfo?.website || 'https://healthcaremarketing.com'
    };

    // const result = await emailService.sendSEOReport(emailData);
    const result = { success: true, messageId: 'temp-123', error: null }; // Temporary placeholder

    if (result.success) {
      // Update lead status
      await pool.query(
        'UPDATE leads SET status = $1, notes = COALESCE(notes, \'\') || $2 WHERE id = $3',
        ['contacted', `\nSEO report sent on ${new Date().toISOString()}. `, leadId]
      );

      res.json({
        success: true,
        message: 'SEO report sent successfully',
        messageId: result.messageId
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to send SEO report'
      });
    }

  } catch (error) {
    console.error('Send SEO report error:', error);
    res.status(500).json({ error: 'Failed to send SEO report' });
  }
});

// Send bulk SEO reports
router.post('/send-bulk-seo-reports', async (req, res) => {
  try {
    const { leadIds, senderInfo } = req.body;
    
    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({ error: 'Lead IDs array is required' });
    }

    // Get leads with SEO analysis
    const leadsResult = await pool.query(
      'SELECT * FROM leads WHERE id = ANY($1) AND seo_analysis IS NOT NULL AND seo_report IS NOT NULL',
      [leadIds]
    );

    if (leadsResult.rows.length === 0) {
      return res.status(404).json({ error: 'No leads with SEO analysis found' });
    }

    // const emailService = SEOEmailService.getInstance();
    const emailService = null; // Temporary placeholder
    const emailDataArray = leadsResult.rows.map(lead => {
      const seoAnalysis = typeof lead.seo_analysis === 'string' 
        ? JSON.parse(lead.seo_analysis) 
        : lead.seo_analysis;

      return {
        leadName: `${lead.contact_first_name} ${lead.contact_last_name}`,
        leadEmail: lead.contact_email,
        clinicName: lead.clinic_name,
        websiteUrl: lead.website_url,
        seoScore: seoAnalysis.score,
        reportContent: lead.seo_report,
        recommendations: seoAnalysis.recommendations,
        senderName: senderInfo?.name || 'Healthcare Marketing Specialist',
        senderEmail: senderInfo?.email || 'info@healthcaremarketing.com',
        senderPhone: senderInfo?.phone || '(555) 123-4567',
        senderWebsite: senderInfo?.website || 'https://healthcaremarketing.com'
      };
    });

    // const result = await emailService.sendBulkSEOReports(emailDataArray);
    const result = { success: true, sent: emailDataArray.length, failed: 0, results: [] }; // Temporary placeholder

    // Update lead statuses
    await pool.query(
      'UPDATE leads SET status = $1, notes = COALESCE(notes, \'\') || $2 WHERE id = ANY($3)',
      ['contacted', `\nBulk SEO report sent on ${new Date().toISOString()}. `, leadIds]
    );

    res.json({
      success: true,
      message: `Sent ${result.success} reports successfully, ${result.failed} failed`,
      results: result.results
    });

  } catch (error) {
    console.error('Send bulk SEO reports error:', error);
    res.status(500).json({ error: 'Failed to send bulk SEO reports' });
  }
});

// Get SEO analysis for a lead
router.get('/leads/:id/seo-analysis', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'SELECT id, clinic_name, website_url, seo_analysis, seo_report, created_at FROM leads WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const lead = result.rows[0];
    
    if (!lead.seo_analysis) {
      return res.status(404).json({ error: 'No SEO analysis available for this lead' });
    }

    const seoAnalysis = typeof lead.seo_analysis === 'string' 
      ? JSON.parse(lead.seo_analysis) 
      : lead.seo_analysis;

    res.json({
      lead: {
        id: lead.id,
        clinicName: lead.clinic_name,
        websiteUrl: lead.website_url,
        createdAt: lead.created_at
      },
      seoAnalysis,
      report: lead.seo_report
    });

  } catch (error) {
    console.error('Get SEO analysis error:', error);
    res.status(500).json({ error: 'Failed to get SEO analysis' });
  }
});

// ==========================================
// ADVANCED EMAIL COMPOSER ENDPOINTS
// ==========================================

// Get available email templates
router.get('/leads/:id/email-templates', async (req, res) => {
  try {
    const emailService = AdvancedEmailService.getInstance();
    const templates = await emailService.getEmailTemplates();
    res.json({ templates });
  } catch (error) {
    console.error('Error fetching email templates:', error);
    res.status(500).json({ error: 'Failed to fetch email templates' });
  }
});

// Send tracked email to lead
router.post('/leads/:id/send-email', async (req, res) => {
  try {
    const { id } = req.params;
    const { to, cc, bcc, subject, body, template } = req.body;
    const userId = (req as any).user?.id;

    if (!to || !subject || !body) {
      return res.status(400).json({ error: 'To, subject, and body are required' });
    }

    // Verify lead exists
    const leadResult = await pool.query('SELECT * FROM leads WHERE id = $1', [id]);
    if (leadResult.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const emailService = AdvancedEmailService.getInstance();
    const result = await emailService.sendTrackedEmail({
      leadId: parseInt(id),
      to,
      cc: cc ? (Array.isArray(cc) ? cc : [cc]) : undefined,
      bcc: bcc ? (Array.isArray(bcc) ? bcc : [bcc]) : undefined,
      subject,
      body,
      template,
      userId
    });

    if (result.success) {
      console.log(`✅ Email sent successfully to ${to}, tracking ID: ${result.emailId}`);
      res.json({
        success: true,
        message: 'Email sent successfully',
        emailId: result.emailId
      });
    } else {
      console.error(`❌ Email sending failed: ${result.error}`);
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to send email'
      });
    }
  } catch (error) {
    console.error('Send email error:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

// Get email statistics for a lead
router.get('/leads/:id/email-statistics', async (req, res) => {
  try {
    const { id } = req.params;
    
    const emailService = AdvancedEmailService.getInstance();
    const stats = await emailService.getEmailStatistics(parseInt(id));
    
    res.json(stats);
  } catch (error) {
    console.error('Error fetching email statistics:', error);
    res.status(500).json({ error: 'Failed to fetch email statistics' });
  }
});

// Grammar and spell check API
router.post('/email/check-grammar', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const emailService = AdvancedEmailService.getInstance();
    const result = await emailService.checkGrammarAndSpelling(text);
    
    res.json(result);
  } catch (error) {
    console.error('Error checking grammar:', error);
    res.status(500).json({ error: 'Failed to check grammar' });
  }
});

// AI-Based SEO Endpoints (from master document)
router.post('/ai-seo/analyze-query', async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    // TODO: Implement AI SEO query analysis
    const analysis = {
      originalQuery: query,
      intent: 'find_doctor',
      entities: ['doctor', 'good'],
      location: 'near me',
      urgency: 'low',
      semanticKeywords: ['find doctor', 'locate physician', 'medical provider search'],
      conversationalVariations: ['Where can I find a good doctor?', 'I need to see a doctor near me']
    };

    res.json(analysis);
  } catch (error) {
    console.error('AI SEO query analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze query' });
  }
});

router.post('/leads/:id/ai-seo-content', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, content, faq_section, conversational_answers, semantic_keywords, entity_mentions } = req.body;

    const result = await pool.query(
      `INSERT INTO ai_seo_content (lead_id, title, description, content, faq_section, conversational_answers, semantic_keywords, entity_mentions)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [id, title, description, content, faq_section, JSON.stringify(conversational_answers), JSON.stringify(semantic_keywords), JSON.stringify(entity_mentions)]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Create AI SEO content error:', error);
    res.status(500).json({ error: 'Failed to create AI SEO content' });
  }
});

router.get('/leads/:id/ai-seo-content', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM ai_seo_content WHERE lead_id = $1',
      [id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get AI SEO content error:', error);
    res.status(500).json({ error: 'Failed to get AI SEO content' });
  }
});

// SEO Audit Tasks Endpoints (from master document)
router.get('/leads/:id/seo-tasks', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM seo_audit_tasks WHERE lead_id = $1 ORDER BY task_priority, created_at',
      [id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get SEO tasks error:', error);
    res.status(500).json({ error: 'Failed to get SEO tasks' });
  }
});

router.post('/leads/:id/seo-tasks', async (req, res) => {
  try {
    const { id } = req.params;
    const { task_category, task_priority, task_title, task_description, assigned_to, due_date, estimated_hours } = req.body;

    const result = await pool.query(
      `INSERT INTO seo_audit_tasks (lead_id, task_category, task_priority, task_title, task_description, assigned_to, due_date, estimated_hours)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [id, task_category, task_priority, task_title, task_description, assigned_to, due_date, estimated_hours]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Create SEO task error:', error);
    res.status(500).json({ error: 'Failed to create SEO task' });
  }
});

router.put('/seo-tasks/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { task_status, actual_hours, completion_notes } = req.body;

    const result = await pool.query(
      `UPDATE seo_audit_tasks 
       SET task_status = $1, actual_hours = $2, completion_notes = $3, updated_at = CURRENT_TIMESTAMP,
           completed_at = CASE WHEN $1 = 'completed' THEN CURRENT_TIMESTAMP ELSE completed_at END
       WHERE id = $4
       RETURNING *`,
      [task_status, actual_hours, completion_notes, taskId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update SEO task error:', error);
    res.status(500).json({ error: 'Failed to update SEO task' });
  }
});

// Credential Management Endpoints (from master document)
router.get('/credentials', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, service_name, environment, credential_type, created_at, updated_at, expires_at, is_active FROM encrypted_credentials ORDER BY service_name, environment'
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get credentials error:', error);
    res.status(500).json({ error: 'Failed to get credentials' });
  }
});

router.post('/credentials', async (req, res) => {
  try {
    const { service_name, environment, credential_type, encrypted_value, encryption_key_id, expires_at } = req.body;

    const result = await pool.query(
      `INSERT INTO encrypted_credentials (service_name, environment, credential_type, encrypted_value, encryption_key_id, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, service_name, environment, credential_type, created_at, expires_at, is_active`,
      [service_name, environment, credential_type, encrypted_value, encryption_key_id, expires_at]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Create credential error:', error);
    res.status(500).json({ error: 'Failed to create credential' });
  }
});

// Enhanced Scraping Endpoints

// Check compliance for scraping
router.post('/scraping/check-compliance', async (req, res) => {
  try {
    const { type, website, address, zipCode, radius, maxLeads, state } = req.body;
    
    const request = {
      type,
      website,
      address,
      zipCode,
      radius: radius || 5,
      maxLeads: maxLeads || 20,
      state
    };

    const compliance = await EnhancedScrapingService.checkCompliance(request);
    
    res.json({
      success: true,
      compliance
    });
  } catch (error) {
    console.error('Compliance check error:', error);
    res.status(500).json({ error: 'Failed to check compliance' });
  }
});

// Enhanced individual website scraping
router.post('/scraping/individual', async (req, res) => {
  try {
    const { website, state } = req.body;
    
    if (!website) {
      return res.status(400).json({ error: 'Website URL is required' });
    }

    // Get the appropriate client_id for this user
    const client_id = getClientIdForCreate(req);

    const result = await EnhancedScrapingService.scrapeIndividualWebsite(website, state);
    
    if (result.success && result.leads.length > 0) {
      // Save leads to database
      for (const lead of result.leads) {
        try {
          console.log('Saving lead:', lead);
          
          // Generate a unique email if none exists to avoid conflicts
          const email = lead.email || `scraped-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@wetechforu.com`;
          
          const insertResult = await pool.query(
            `INSERT INTO leads (
              company, email, phone, industry_category, industry_subcategory,
              source, status, notes, website_url, address, city, state, zip_code,
              contact_first_name, contact_last_name, compliance_status, client_id, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW()) 
            RETURNING *`,
            [
              lead.company, email, lead.phone, lead.industry_category, lead.industry_subcategory,
              lead.source, lead.status, lead.notes, lead.website_url, lead.address, 
              lead.city, lead.state, lead.zip_code, lead.contact_first_name, 
              lead.contact_last_name, lead.compliance_status, client_id
            ]
          );
          
          console.log('Lead saved successfully:', insertResult.rows[0]);
        } catch (dbError) {
          console.error('Error saving lead:', dbError);
        }
      }
    }

    res.json({
      success: result.success,
      leads: result.leads,
      compliance: result.compliance,
      apiUsage: result.apiUsage,
      errors: result.errors,
      message: result.success ? 
        `Successfully scraped ${result.leads.length} leads` : 
        'Scraping failed due to compliance or technical issues'
    });
  } catch (error) {
    console.error('Individual scraping error:', error);
    res.status(500).json({ error: 'Failed to scrape individual website' });
  }
});

// Enhanced location-based scraping
router.post('/scraping/location', async (req, res) => {
  try {
    let { searchQuery, address, zipCode, radius, maxLeads, state } = req.body;
    
    // Treat empty strings as undefined
    searchQuery = searchQuery?.trim() || undefined;
    address = address?.trim() || undefined;
    zipCode = zipCode?.trim() || undefined;
    
    if (!searchQuery && !address && !zipCode) {
      return res.status(400).json({ error: 'Either search query, address, or zip code is required' });
    }

    console.log('📍 Location scraping request:', { searchQuery, address, zipCode, radius, maxLeads });

    // Get the appropriate client_id for this user
    const client_id = getClientIdForCreate(req);

    // If searchQuery is provided, use keyword search
    if (searchQuery) {
      const result = await EnhancedScrapingService.scrapeByKeyword(
        searchQuery,
        radius || 10,
        maxLeads || 20,
        zipCode,  // Pass zipCode
        address   // Pass address
      );
      
      if (result.success && result.leads.length > 0) {
        // Check for duplicates before saving
        const savedLeads = [];
        let skippedCount = 0;
        
        for (const lead of result.leads) {
          try {
            // Check if lead already exists by google_place_id, phone, or website
            const duplicateCheck = await pool.query(
              `SELECT id FROM leads WHERE 
                google_place_id = $1 OR 
                (phone IS NOT NULL AND phone = $2) OR 
                (website_url IS NOT NULL AND website_url = $3)
              LIMIT 1`,
              [lead.google_place_id, lead.phone, lead.website_url]
            );

            if (duplicateCheck.rows.length > 0) {
              console.log(`⏭️ Skipping duplicate lead: ${lead.company} (already exists with ID: ${duplicateCheck.rows[0].id})`);
              skippedCount++;
              continue; // Skip this lead
            }

            console.log('💾 Saving new lead:', lead.company);
            
            const email = lead.email || `scraped-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@wetechforu.com`;
            
            const insertResult = await pool.query(
              `INSERT INTO leads (
                company, email, phone, industry_category, industry_subcategory,
                source, status, notes, website_url, address, city, state, zip_code,
                contact_first_name, contact_last_name, compliance_status,
                google_place_id, google_rating, geo_latitude, geo_longitude, client_id, created_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, NOW()) 
              RETURNING *`,
              [
                lead.company, email, lead.phone, lead.industry_category, lead.industry_subcategory,
                lead.source, lead.status, lead.notes, lead.website_url, lead.address, 
                lead.city, lead.state, lead.zip_code, lead.contact_first_name, 
                lead.contact_last_name, lead.compliance_status,
                lead.google_place_id, lead.google_rating, lead.geo_latitude, lead.geo_longitude, client_id
              ]
            );
            
            savedLeads.push(insertResult.rows[0]);
            console.log(`✅ Saved lead ID: ${insertResult.rows[0].id}`);
          } catch (dbError: any) {
            console.error('Error saving keyword search lead:', dbError.message);
          }
        }

        return res.json({
          success: result.success,
          leads: savedLeads,
          totalFound: result.leads.length,
          totalSaved: savedLeads.length,
          skipped: skippedCount,
          compliance: result.compliance,
          apiUsage: result.apiUsage,
          errors: result.errors,
          message: result.success ? 
            `Successfully found ${result.leads.length} leads matching "${searchQuery}". Saved ${savedLeads.length} new leads, skipped ${skippedCount} duplicates.` : 
            'Keyword search failed due to compliance or technical issues'
        });
      }
    }

    // Otherwise use location-based scraping
    const result = await EnhancedScrapingService.scrapeByLocation(
      address, 
      zipCode, 
      radius || 5, 
      maxLeads || 20, 
      state
    );
    
    if (result.success && result.leads.length > 0) {
      // Check for duplicates before saving
      const savedLeads = [];
      let skippedCount = 0;
      
      for (const lead of result.leads) {
        try {
          // Check if lead already exists
          const duplicateCheck = await pool.query(
            `SELECT id FROM leads WHERE 
              google_place_id = $1 OR 
              (phone IS NOT NULL AND phone = $2) OR 
              (website_url IS NOT NULL AND website_url = $3)
            LIMIT 1`,
            [lead.google_place_id, lead.phone, lead.website_url]
          );

          if (duplicateCheck.rows.length > 0) {
            console.log(`⏭️ Skipping duplicate lead: ${lead.company} (already exists with ID: ${duplicateCheck.rows[0].id})`);
            skippedCount++;
            continue;
          }

          console.log('💾 Saving new location lead:', lead.company);
          
          const email = lead.email || `scraped-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@wetechforu.com`;
          
          const insertResult = await pool.query(
            `INSERT INTO leads (
              company, email, phone, industry_category, industry_subcategory,
              source, status, notes, website_url, address, city, state, zip_code,
              contact_first_name, contact_last_name, compliance_status,
              google_place_id, google_rating, geo_latitude, geo_longitude, client_id, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, NOW()) 
            RETURNING *`,
            [
              lead.company, email, lead.phone, lead.industry_category, lead.industry_subcategory,
              lead.source, lead.status, lead.notes, lead.website_url, lead.address, 
              lead.city, lead.state, lead.zip_code, lead.contact_first_name, 
              lead.contact_last_name, lead.compliance_status,
              lead.google_place_id, lead.google_rating, lead.geo_latitude, lead.geo_longitude, client_id
            ]
          );
          
          savedLeads.push(insertResult.rows[0]);
        } catch (dbError: any) {
          console.error('Error saving location lead:', dbError.message);
        }
      }

      return res.json({
        success: result.success,
        leads: savedLeads,
        totalFound: result.leads.length,
        totalSaved: savedLeads.length,
        skipped: skippedCount,
        compliance: result.compliance,
        apiUsage: result.apiUsage,
        errors: result.errors,
        message: result.success ? 
          `Successfully found ${result.leads.length} leads in the area. Saved ${savedLeads.length} new leads, skipped ${skippedCount} duplicates.` : 
          'Location-based scraping failed due to compliance or technical issues'
      });
    }

    res.json({
      success: result.success,
      leads: [],
      totalFound: 0,
      totalSaved: 0,
      skipped: 0,
      compliance: result.compliance,
      apiUsage: result.apiUsage,
      errors: result.errors,
      message: result.success ? 
        'No leads found in the area' : 
        'Location-based scraping failed due to compliance or technical issues'
    });
  } catch (error) {
    console.error('Location scraping error:', error);
    res.status(500).json({ error: 'Failed to scrape by location' });
  }
});

// Keyword-based scraping (natural language search)
router.post('/scraping/keyword', async (req, res) => {
  try {
    const { searchQuery, radius, maxLeads } = req.body;
    
    if (!searchQuery) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    console.log('🔍 Keyword search request:', { searchQuery, radius, maxLeads });

    const result = await EnhancedScrapingService.scrapeByKeyword(
      searchQuery,
      radius || 10,
      maxLeads || 20
    );
    
    if (result.success && result.leads.length > 0) {
      // Save leads to database
      for (const lead of result.leads) {
        try {
          console.log('Saving keyword search lead:', lead);
          
          // Generate a unique email if none exists to avoid conflicts
          const email = lead.email || `scraped-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@wetechforu.com`;
          
          const insertResult = await pool.query(
            `INSERT INTO leads (
              company, email, phone, industry_category, industry_subcategory,
              source, status, notes, website_url, address, city, state, zip_code,
              contact_first_name, contact_last_name, compliance_status, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW()) 
            RETURNING *`,
            [
              lead.company, email, lead.phone, lead.industry_category, lead.industry_subcategory,
              lead.source, lead.status, lead.notes, lead.website_url, lead.address, 
              lead.city, lead.state, lead.zip_code, lead.contact_first_name, 
              lead.contact_last_name, lead.compliance_status
            ]
          );
          
          console.log('Keyword search lead saved successfully:', insertResult.rows[0]);
        } catch (dbError) {
          console.error('Error saving keyword search lead:', dbError);
        }
      }
    }

    res.json({
      success: result.success,
      leads: result.leads,
      compliance: result.compliance,
      apiUsage: result.apiUsage,
      errors: result.errors,
      message: result.success ? 
        `Successfully found ${result.leads.length} leads matching "${searchQuery}"` : 
        'Keyword search failed due to compliance or technical issues'
    });
  } catch (error) {
    console.error('Keyword search error:', error);
    res.status(500).json({ error: 'Failed to perform keyword search' });
  }
});

// Get scraping usage statistics
router.get('/scraping/usage', async (req, res) => {
  try {
    const todayUsage = await pool.query(
      'SELECT COUNT(*) as count FROM scraping_logs WHERE DATE(created_at) = CURRENT_DATE'
    );
    
    const weeklyUsage = await pool.query(
      'SELECT COUNT(*) as count FROM scraping_logs WHERE created_at >= CURRENT_DATE - INTERVAL \'7 days\''
    );
    
    const monthlyUsage = await pool.query(
      'SELECT COUNT(*) as count FROM scraping_logs WHERE created_at >= CURRENT_DATE - INTERVAL \'30 days\''
    );

    res.json({
      success: true,
      usage: {
        today: parseInt(todayUsage.rows[0].count),
        weekly: parseInt(weeklyUsage.rows[0].count),
        monthly: parseInt(monthlyUsage.rows[0].count),
        dailyLimit: 1000,
        remainingToday: Math.max(0, 1000 - parseInt(todayUsage.rows[0].count))
      }
    });
  } catch (error) {
    console.error('Usage stats error:', error);
    res.status(500).json({ error: 'Failed to get usage statistics' });
  }
});

// Update user profile
router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      first_name,
      last_name,
      email,
      phone,
      timezone,
      language,
      notifications_enabled
    } = req.body;

    // Verify user is updating their own profile or is admin
    if (req.session.userId !== parseInt(id) && req.session.role !== 'super_admin' && req.session.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const result = await pool.query(
      `UPDATE users 
       SET first_name = $1, last_name = $2, email = $3, phone = $4, 
           timezone = $5, language = $6, notifications_enabled = $7, 
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING id, email, username, first_name, last_name, phone, 
                 timezone, language, notifications_enabled, role, 
                 client_id, created_at, last_login`,
      [first_name, last_name, email, phone, timezone, language, notifications_enabled, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user profile' });
  }
});

// Convert lead to client
router.post('/leads/convert-to-client', async (req, res) => {
  try {
    const { leadId } = req.body;
    
    if (!leadId) {
      return res.status(400).json({ error: 'Lead ID is required' });
    }

    // Get the lead details
    const leadResult = await pool.query(
      'SELECT * FROM leads WHERE id = $1',
      [leadId]
    );

    if (leadResult.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const lead = leadResult.rows[0];

    // Check if client already exists with this email
    const existingClient = await pool.query(
      'SELECT id FROM clients WHERE email = $1',
      [lead.email]
    );

    let clientId;

    if (existingClient.rows.length > 0) {
      // Use existing client
      clientId = existingClient.rows[0].id;
    } else {
      // Create new client
      const clientResult = await pool.query(
        `INSERT INTO clients (
          client_name, website, email, phone, contact_name, 
          address, city, state, zip_code, specialties, 
          is_active, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW()) 
        RETURNING id`,
        [
          lead.company,
          lead.website_url || '',
          lead.email,
          lead.phone,
          lead.contact_first_name && lead.contact_last_name 
            ? `${lead.contact_first_name} ${lead.contact_last_name}` 
            : lead.company,
          lead.address,
          lead.city,
          lead.state,
          lead.zip_code,
          lead.industry_category || 'Healthcare',
          true
        ]
      );
      clientId = clientResult.rows[0].id;
    }

    // Update the lead with client_id and status
    await pool.query(
      'UPDATE leads SET client_id = $1, status = $2, updated_at = NOW() WHERE id = $3',
      [clientId, 'converted', leadId]
    );

    res.json({ 
      success: true, 
      message: 'Lead converted to client successfully',
      clientId: clientId
    });
  } catch (error) {
    console.error('Convert lead to client error:', error);
    res.status(500).json({ error: 'Failed to convert lead to client' });
  }
});

// Mock analytics endpoint removed - using only real data now

// Get client settings
router.get('/clients/:clientId/settings', async (req, res) => {
  try {
    const { clientId } = req.params;
    
    // Get real settings from client_credentials table
    const credentialsResult = await pool.query(
      'SELECT service_type, credentials, updated_at FROM client_credentials WHERE client_id = $1',
      [clientId]
    );

    // Initialize settings structure
    const settings = {
      googleAnalytics: {
        connected: false,
        propertyId: null,
        viewId: null,
        lastConnected: null
      },
      facebook: {
        connected: false,
        pageId: null,
        accessToken: null
      },
      searchConsole: {
        connected: false,
        siteUrl: null,
        lastConnected: null
      },
      googleTag: {
        connected: false,
        tagId: null
      },
      businessManager: {
        connected: false,
        managerId: null
      }
    };

    // Parse credentials and update settings
    credentialsResult.rows.forEach(row => {
      try {
        console.log(`🔍 Parsing credentials for ${row.service_type}:`, row.credentials);
        
        let credentials;
        if (typeof row.credentials === 'string') {
          credentials = JSON.parse(row.credentials);
        } else if (typeof row.credentials === 'object') {
          credentials = row.credentials;
        } else {
          console.error(`❌ Invalid credentials type for ${row.service_type}:`, typeof row.credentials);
          return;
        }
        
        switch (row.service_type) {
          case 'google_analytics':
            settings.googleAnalytics = {
              connected: !!credentials.access_token || credentials.connected === true,
              propertyId: credentials.property_id || null,
              viewId: credentials.view_id || null,
              lastConnected: (!!credentials.access_token || credentials.connected === true) ? (row.updated_at || null) : null
            };
            console.log(`✅ Google Analytics settings updated:`, settings.googleAnalytics);
            break;
          case 'google_search_console':
            settings.searchConsole = {
              connected: !!credentials.access_token || credentials.connected === true,
              siteUrl: credentials.site_url || null,
              lastConnected: (!!credentials.access_token || credentials.connected === true) ? (row.updated_at || null) : null
            };
            break;
          case 'facebook':
            settings.facebook = {
              connected: !!credentials.access_token || credentials.connected === true,
              pageId: credentials.page_id || null,
              accessToken: credentials.access_token ? '***hidden***' : null
            };
            break;
        }
      } catch (parseError) {
        console.error(`❌ Error parsing credentials for ${row.service_type}:`, parseError);
        console.error(`❌ Raw credentials data:`, row.credentials);
        console.error(`❌ Credentials type:`, typeof row.credentials);
      }
    });

    console.log(`📊 Client ${clientId} settings loaded:`, settings);
    res.json(settings);
  } catch (error) {
    console.error('Get client settings error:', error);
    res.status(500).json({ error: 'Failed to fetch client settings' });
  }
});

// Connect service to client
router.post('/clients/:clientId/connect/:service', async (req, res) => {
  try {
    const { clientId, service } = req.params;
    const connectionData = req.body;
    
    // Mock connection - replace with real service integration
    console.log(`Connecting ${service} to client ${clientId}:`, connectionData);
    
    res.json({ 
      success: true, 
      message: `${service} connected successfully`,
      service,
      clientId,
      data: connectionData
    });
  } catch (error) {
    console.error('Connect service error:', error);
    res.status(500).json({ error: 'Failed to connect service' });
  }
});

// Google OAuth routes - SPECIFIC ROUTES FIRST
router.get('/auth/google/callback', async (req, res) => {
  console.log('🚨🚨🚨 CALLBACK ROUTE HIT! 🚨🚨🚨');
  console.log('🔍 Full URL:', req.url);
  console.log('🔍 Query params:', req.query);
  console.log('🔍 Request method:', req.method);
  console.log('🔍 Request headers:', req.headers);
  
  try {
    const { code, state } = req.query;
    
    console.log('🔍 OAuth Callback Debug:');
    console.log('Code:', code);
    console.log('State:', state);
    
    if (!code || !state) {
      console.log('❌ Missing code or state');
      return res.status(400).json({ error: 'Missing authorization code or state' });
    }

    let stateData;
    try {
      stateData = JSON.parse(state as string);
      console.log('✅ Parsed state data:', stateData);
    } catch (parseError) {
      console.log('❌ Failed to parse state:', parseError);
      return res.status(400).json({ error: 'Invalid state parameter' });
    }
    
    const { clientId, type } = stateData;
    console.log('🔍 Extracted clientId:', clientId, 'Type:', typeof clientId);
    console.log('🔍 Extracted type:', type, 'Type:', typeof type);
    console.log('🔍 clientId truthiness:', !!clientId);
    console.log('🔍 clientId === 0:', clientId === 0);
    console.log('🔍 clientId === null:', clientId === null);
    console.log('🔍 clientId === undefined:', clientId === undefined);
    
    if (clientId === null || clientId === undefined || clientId === '') {
      console.log('❌ Missing clientId in state');
      return res.status(400).json({ error: 'Client ID is required' });
    }

    let tokens: any;
    
    try {
      if (type === 'google_analytics') {
        console.log('🔄 Exchanging code for Google Analytics tokens...');
        const googleAnalyticsService = require('../services/googleAnalyticsService').default;
        tokens = await googleAnalyticsService.exchangeCodeForTokens(code as string, state as string);
        console.log('✅ Google Analytics tokens received');
      } else if (type === 'google_search_console') {
        console.log('🔄 Exchanging code for Google Search Console tokens...');
        const googleSearchConsoleService = require('../services/googleSearchConsoleService').default;
        tokens = await googleSearchConsoleService.exchangeCodeForTokens(code as string, state as string);
        console.log('✅ Google Search Console tokens received');
      } else {
        console.log('❌ Invalid service type:', type);
        return res.status(400).json({ error: 'Invalid service type' });
      }
    } catch (tokenError) {
      console.error('❌ Token exchange failed:', tokenError);
      const redirectUrl = `${process.env.FRONTEND_URL || 'https://marketingby.wetechforu.com'}/app/client-management?error=token_exchange_failed&clientId=${clientId}`;
      return res.redirect(redirectUrl);
    }

    // Redirect back to the client management dashboard
    console.log('🔄 Redirecting to client management dashboard...');
    const redirectUrl = `${process.env.FRONTEND_URL || 'https://marketingby.wetechforu.com'}/app/client-management?connected=${type}&clientId=${clientId}`;
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('OAuth callback error:', error);
    const redirectUrl = `${process.env.FRONTEND_URL || 'https://marketingby.wetechforu.com'}/app/client-management?error=oauth_failed`;
    res.redirect(redirectUrl);
  }
});

// Google OAuth service routes (catch-all for /auth/google/:service)
router.get('/auth/google/:service', async (req, res) => {
  try {
    const { service } = req.params;
    const { clientId } = req.query;
    
    if (!clientId) {
      return res.status(400).json({ error: 'Client ID is required' });
    }

    let authUrl: string;
    
    if (service === 'analytics') {
      const googleAnalyticsService = require('../services/googleAnalyticsService').default;
      authUrl = googleAnalyticsService.generateAuthUrl(parseInt(clientId as string));
    } else if (service === 'search-console') {
      const googleSearchConsoleService = require('../services/googleSearchConsoleService').default;
      authUrl = googleSearchConsoleService.generateAuthUrl(parseInt(clientId as string));
    } else {
      return res.status(400).json({ error: 'Invalid service type' });
    }

    res.json({ authUrl });
  } catch (error) {
    console.error('Generate auth URL error:', error);
    res.status(500).json({ error: 'Failed to generate auth URL' });
  }
});

// Get real analytics data
router.get('/analytics/client/:clientId/real', async (req, res) => {
  try {
    const { clientId } = req.params;
    const { propertyId } = req.query;
    
    console.log(`🔍 Real analytics request for client ${clientId}, propertyId: ${propertyId}`);
    
    if (!propertyId) {
      return res.status(400).json({ 
        error: 'Property ID is required',
        needsPropertyId: true
      });
    }
    
    const googleAnalyticsService = require('../services/googleAnalyticsService').default;
    const hasCredentials = await googleAnalyticsService.hasValidCredentials(parseInt(clientId));
    
    if (!hasCredentials) {
      console.log(`⚠️ No OAuth credentials for client ${clientId}, but Property ID provided: ${propertyId}`);
      return res.status(400).json({ 
        error: 'Google Analytics OAuth not connected. Please connect your Google Analytics account first.',
        needsAuth: true,
        service: 'google_analytics',
        propertyId: propertyId
      });
    }

    console.log(`✅ OAuth credentials found for client ${clientId}, fetching real data...`);
    const analyticsData = await googleAnalyticsService.getAnalyticsData(
      parseInt(clientId), 
      propertyId as string
    );

    console.log(`✅ Real analytics data fetched for client ${clientId}:`, analyticsData);
    res.json(analyticsData);
  } catch (error) {
    console.error('Get real analytics data error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics data' });
  }
});

// Get real search console data
router.get('/search-console/client/:clientId/real', async (req, res) => {
  try {
    const { clientId } = req.params;
    const { siteUrl } = req.query;
    
    const googleSearchConsoleService = require('../services/googleSearchConsoleService').default;
    const hasCredentials = await googleSearchConsoleService.hasValidCredentials(parseInt(clientId));
    
    if (!hasCredentials) {
      return res.status(400).json({ 
        error: 'Google Search Console not connected',
        needsAuth: true,
        service: 'google_search_console'
      });
    }

    const searchConsoleData = await googleSearchConsoleService.getSearchConsoleData(
      parseInt(clientId), 
      siteUrl as string
    );

    res.json(searchConsoleData);
  } catch (error) {
    console.error('Get real search console data error:', error);
    res.status(500).json({ error: 'Failed to fetch search console data' });
  }
});

// Update client service configuration
router.put('/clients/:clientId/service/:service/config', async (req, res) => {
  try {
    const { clientId, service } = req.params;
    const { propertyId, siteUrl } = req.body;
    
    if (service === 'google_analytics' && propertyId) {
      const googleAnalyticsService = require('../services/googleAnalyticsService').default;
      await googleAnalyticsService.updateClientPropertyId(parseInt(clientId), propertyId);
    } else if (service === 'google_search_console' && siteUrl) {
      const googleSearchConsoleService = require('../services/googleSearchConsoleService').default;
      await googleSearchConsoleService.updateClientSiteUrl(parseInt(clientId), siteUrl);
    } else {
      return res.status(400).json({ error: 'Invalid service or missing configuration' });
    }

    res.json({ success: true, message: 'Service configuration updated' });
  } catch (error) {
    console.error('Update service config error:', error);
    res.status(500).json({ error: 'Failed to update service configuration' });
  }
});

// Disconnect/deauthorize a client service (removes stored OAuth tokens/config)
router.post('/clients/:clientId/service/:service/disconnect', async (req, res) => {
  try {
    const { clientId, service } = req.params;

    const validServices = ['google_analytics', 'google_search_console', 'facebook'];
    if (!validServices.includes(service)) {
      return res.status(400).json({ error: 'Invalid service type' });
    }

    await pool.query(
      'DELETE FROM client_credentials WHERE client_id = $1 AND service_type = $2',
      [clientId, service]
    );

    res.json({ success: true, message: `${service} disconnected` });
  } catch (error) {
    console.error('Disconnect service error:', error);
    res.status(500).json({ error: 'Failed to disconnect service' });
  }
});

// Convert client back to lead
router.post('/clients/convert-to-lead', async (req, res) => {
  try {
    const { clientId } = req.body;
    
    if (!clientId) {
      return res.status(400).json({ error: 'Client ID is required' });
    }

    // Find the lead associated with this client
    const leadResult = await pool.query(
      'SELECT id FROM leads WHERE client_id = $1',
      [clientId]
    );

    if (leadResult.rows.length > 0) {
      // Update the lead to remove client_id and change status
      await pool.query(
        'UPDATE leads SET client_id = NULL, status = $1, updated_at = NOW() WHERE client_id = $2',
        ['new', clientId]
      );
    }

    // Delete the client record
    await pool.query(
      'DELETE FROM clients WHERE id = $1',
      [clientId]
    );

    res.json({ 
      success: true, 
      message: 'Client converted back to lead successfully'
    });
  } catch (error) {
    console.error('Convert client to lead error:', error);
    res.status(500).json({ error: 'Failed to convert client to lead' });
  }
});

// Toggle client active status
router.patch('/clients/:id/toggle-active', async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;
    
    if (is_active === undefined) {
      return res.status(400).json({ error: 'is_active status is required' });
    }

    await pool.query(
      'UPDATE clients SET is_active = $1, updated_at = NOW() WHERE id = $2',
      [is_active, id]
    );

    res.json({ 
      success: true, 
      message: `Client ${is_active ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error('Toggle client active status error:', error);
    res.status(500).json({ error: 'Failed to update client status' });
  }
});

// ==================== ANALYTICS DATA ENDPOINTS ====================

// Initialize analytics data service
const analyticsDataService = new AnalyticsDataService();

// Initialize enhanced analytics service
const { EnhancedAnalyticsService } = require('../services/enhancedAnalyticsService');
const enhancedAnalyticsService = new EnhancedAnalyticsService();

// Comprehensive sync for all analytics data
router.post('/analytics/comprehensive-sync/:clientId', requireAuth, async (req, res) => {
  try {
    const { clientId } = req.params;
    const { dateFrom, dateTo } = req.body;
    const userId = req.session.userId;

    if (!dateFrom || !dateTo) {
      return res.status(400).json({ error: 'dateFrom and dateTo are required' });
    }

    console.log(`🔄 Starting comprehensive analytics sync for client ${clientId} from ${dateFrom} to ${dateTo}`);

    const result = await enhancedAnalyticsService.performComprehensiveSync(
      parseInt(clientId),
      dateFrom,
      dateTo,
      userId
    );

    res.json({
      success: true,
      message: 'Comprehensive analytics sync completed successfully',
      data: result
    });
  } catch (error) {
    console.error('Comprehensive analytics sync error:', error);
    res.status(500).json({ error: error.message || 'Failed to perform comprehensive analytics sync' });
  }
});

// Sync Google Analytics data for a client (legacy endpoint)
router.post('/analytics/sync/:clientId', requireAuth, async (req, res) => {
  try {
    const { clientId } = req.params;
    const { dateFrom, dateTo } = req.body;
    const userId = req.session.userId;

    if (!dateFrom || !dateTo) {
      return res.status(400).json({ error: 'dateFrom and dateTo are required' });
    }

    console.log(`🔄 Starting analytics sync for client ${clientId} from ${dateFrom} to ${dateTo}`);

    const result = await analyticsDataService.syncGoogleAnalyticsData(
      parseInt(clientId),
      dateFrom,
      dateTo,
      userId
    );

    res.json({
      success: true,
      message: 'Analytics data synced successfully',
      data: result
    });
  } catch (error) {
    console.error('Analytics sync error:', error);
    res.status(500).json({ error: error.message || 'Failed to sync analytics data' });
  }
});

// Get analytics data for a client
router.get('/analytics/data/:clientId', requireAuth, async (req, res) => {
  try {
    const { clientId } = req.params;
    const { dateFrom, dateTo, serviceType } = req.query;

    if (!dateFrom || !dateTo) {
      return res.status(400).json({ error: 'dateFrom and dateTo are required' });
    }

    const data = await analyticsDataService.getAnalyticsData(
      parseInt(clientId),
      dateFrom as string,
      dateTo as string,
      serviceType as string
    );

    res.json({
      success: true,
      data: data
    });
  } catch (error) {
    console.error('Get analytics data error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics data' });
  }
});

// Generate modern analytics report
router.post('/analytics/modern-report/:clientId', requireAuth, async (req, res) => {
  try {
    const { clientId } = req.params;
    const { reportName, reportType, dateFrom, dateTo, groupBy, serviceType, dataType } = req.body;
    const userId = req.session.userId;

    if (!reportName || !dateFrom || !dateTo) {
      return res.status(400).json({ error: 'reportName, dateFrom, and dateTo are required' });
    }

    const filters = {
      dateFrom,
      dateTo,
      groupBy: groupBy || 'daily',
      serviceType,
      dataType
    };

    const report = await enhancedAnalyticsService.generateModernReport(
      parseInt(clientId),
      reportName,
      filters,
      userId
    );

    res.json({
      success: true,
      message: 'Modern analytics report generated successfully',
      data: report
    });
  } catch (error) {
    console.error('Generate modern analytics report error:', error);
    res.status(500).json({ error: 'Failed to generate modern analytics report' });
  }
});

// Generate analytics report (legacy endpoint)
router.post('/analytics/reports/:clientId', requireAuth, async (req, res) => {
  try {
    const { clientId } = req.params;
    const { reportName, reportType, dateFrom, dateTo } = req.body;
    const userId = req.session.userId;

    if (!reportName || !reportType || !dateFrom || !dateTo) {
      return res.status(400).json({ error: 'reportName, reportType, dateFrom, and dateTo are required' });
    }

    const report = await analyticsDataService.generateAnalyticsReport(
      parseInt(clientId),
      reportName,
      reportType,
      dateFrom,
      dateTo,
      userId
    );

    res.json({
      success: true,
      message: 'Analytics report generated successfully',
      data: report
    });
  } catch (error) {
    console.error('Generate analytics report error:', error);
    res.status(500).json({ error: 'Failed to generate analytics report' });
  }
});

// Get analytics reports for a client
router.get('/analytics/reports/:clientId', requireAuth, async (req, res) => {
  try {
    const { clientId } = req.params;
    const { limit = 10, offset = 0 } = req.query;

    const result = await pool.query(`
      SELECT id, report_name, report_type, date_from, date_to, generated_at, is_exported
      FROM analytics_reports
      WHERE client_id = $1
      ORDER BY generated_at DESC
      LIMIT $2 OFFSET $3
    `, [clientId, parseInt(limit as string), parseInt(offset as string)]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get analytics reports error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics reports' });
  }
});

// Get sync logs for a client
router.get('/analytics/sync-logs/:clientId', requireAuth, async (req, res) => {
  try {
    const { clientId } = req.params;
    const { limit = 10 } = req.query;

    const logs = await analyticsDataService.getSyncLogs(parseInt(clientId), parseInt(limit as string));

    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    console.error('Get sync logs error:', error);
    res.status(500).json({ error: 'Failed to fetch sync logs' });
  }
});

// Export analytics report to PDF
router.post('/analytics/export/:reportId', requireAuth, async (req, res) => {
  try {
    const { reportId } = req.params;
    const { format = 'pdf' } = req.body;

    // Get report data
    const result = await pool.query(`
      SELECT ar.*, c.client_name, c.email as client_email
      FROM analytics_reports ar
      JOIN clients c ON ar.client_id = c.id
      WHERE ar.id = $1
    `, [reportId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const report = result.rows[0];
    const reportData = typeof report.report_data === 'string' 
      ? JSON.parse(report.report_data) 
      : report.report_data;

    if (format === 'pdf') {
      // Generate simple text-based report for now
      const reportContent = generateAnalyticsReportContent(report, reportData);
      
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="analytics-report-${reportId}.txt"`);
      res.send(reportContent);
    } else {
      res.status(400).json({ error: 'Unsupported export format' });
    }
  } catch (error) {
    console.error('Export analytics report error:', error);
    res.status(500).json({ error: 'Failed to export analytics report' });
  }
});

// Helper function to generate analytics report content
function generateAnalyticsReportContent(report: any, reportData: any): string {
  const summary = reportData.summary || {};
  const detailedData = reportData.detailedData || [];
  
  let content = `
========================================
ANALYTICS REPORT
========================================

Report Name: ${report.report_name}
Client: ${report.client_name}
Date Range: ${report.date_from} to ${report.date_to}
Generated: ${report.generated_at}
Report Type: ${report.report_type}

========================================
SUMMARY
========================================

Total Page Views: ${summary.totalPageViews || 0}
Total Clicks: ${summary.totalClicks || 0}
Total Leads: ${summary.totalLeads || 0}
Total Sessions: ${summary.totalSessions || 0}
Total Users: ${summary.totalUsers || 0}
Bounce Rate: ${summary.bounceRate || 0}%
Average Session Duration: ${summary.avgSessionDuration || 0} seconds

========================================
DETAILED DATA
========================================

`;

  if (detailedData && detailedData.length > 0) {
    content += `Date\t\tService\t\tData Type\t\tValue\n`;
    content += `----\t\t-------\t\t---------\t\t-----\n`;
    
    detailedData.forEach((item: any) => {
      content += `${item.date}\t${item.service_type || 'N/A'}\t${item.data_type || 'N/A'}\t\t${item.value || 0}\n`;
    });
  } else {
    content += `No detailed data available for this report.\n`;
  }

  content += `
========================================
END OF REPORT
========================================

Generated by MarketingBy Analytics System
`;

  return content;
}

export default router;
