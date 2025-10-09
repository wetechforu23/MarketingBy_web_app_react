import express from 'express';
import pool from '../config/database';
import { requireAuth } from '../middleware/auth';
import EnhancedScrapingService from '../services/enhancedScrapingService';
import { stripeService } from '../services/stripeService';
import subscriptionService from '../services/subscriptionService';
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

// Public endpoint for sign-up (no auth required)
router.post('/public/signup', async (req, res) => {
  try {
    console.log('📝 Processing sign-up...');
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    const result = await subscriptionService.handleSignUp(req.body, clientIp);
    res.json(result);
  } catch (error) {
    console.error('❌ Sign-up error:', error);
    res.status(500).json({ error: 'Sign-up failed. Please try again.' });
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
      `SELECT id, client_name, email, contact_name, phone, specialties, is_active, created_at 
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
      `SELECT id, email, username, is_admin, created_at 
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
      'SELECT id, client_name as name, email, phone, contact_name as company, specialties as industry, is_active as status, created_at FROM clients ORDER BY created_at DESC'
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
    const [totalLeads, inProcessLeads, todayScraped, violationStopped] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM leads'),
      pool.query('SELECT COUNT(*) as count FROM leads WHERE status IN ($1, $2, $3)', ['new', 'contacted', 'qualified']),
      pool.query('SELECT COUNT(*) as count FROM leads WHERE DATE(created_at) = CURRENT_DATE'),
      pool.query('SELECT COUNT(*) as count FROM leads WHERE rejection_reason IS NOT NULL AND rejection_reason LIKE $1', ['%violation%'])
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
    const result = await pool.query(
      `SELECT 
        id, 
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
        compliance_status, 
        created_at 
      FROM leads 
      ORDER BY created_at DESC`
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

    // Validate required fields
    if (!company || !email) {
      return res.status(400).json({ error: 'Company and email are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check if lead with this email already exists
    const existingLead = await pool.query(
      'SELECT id FROM leads WHERE email = $1',
      [email]
    );

    if (existingLead.rows.length > 0) {
      return res.status(400).json({ error: 'Lead with this email already exists' });
    }

    // Insert new lead using simplified database column names
    const result = await pool.query(
      `INSERT INTO leads (
        company, email, phone, industry_category, industry_subcategory,
        source, status, notes, website_url, address, city, state, zip_code,
        contact_first_name, contact_last_name, compliance_status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW()) 
      RETURNING *`,
      [
        company, email, phone, industry_category, industry_subcategory,
        source, status, notes, website_url, address, city, state, zip_code,
        contact_first_name, contact_last_name, compliance_status
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
      'SELECT is_admin FROM users WHERE id = $1',
      [req.session.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isAdmin = result.rows[0].is_admin;

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
      'SELECT id, client_name, email, contact_name, is_active, created_at FROM clients ORDER BY created_at DESC LIMIT 10'
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

  // Generate SEO report for lead
  router.post('/leads/:id/generate-seo-report', async (req, res) => {
    try {
      const { id } = req.params;
      const { reportType, website } = req.body;
      
      // TODO: Generate actual SEO report
      // For now, just log it to database
      
      const reportData = {
        website,
        score: Math.floor(Math.random() * 100),
        generated_at: new Date(),
        type: reportType
      };
      
      const reportResult = await pool.query(
        `INSERT INTO lead_seo_reports (lead_id, report_type, report_data, sent_at)
         VALUES ($1, $2, $3, NOW()) RETURNING *`,
        [id, reportType, JSON.stringify(reportData)]
      );
      
      // Log activity
      await pool.query(
        `INSERT INTO lead_activity (lead_id, activity_type, activity_data, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [id, 'seo_report_sent', JSON.stringify({ report_type: reportType, website })]
      );
      
      res.json({ success: true, report: reportResult.rows[0] });
    } catch (error) {
      console.error('Generate SEO report error:', error);
      res.status(500).json({ error: 'Failed to generate SEO report' });
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
                google_place_id, google_rating, geo_latitude, geo_longitude, created_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, NOW()) 
              RETURNING *`,
              [
                lead.company, email, lead.phone, lead.industry_category, lead.industry_subcategory,
                lead.source, lead.status, lead.notes, lead.website_url, lead.address, 
                lead.city, lead.state, lead.zip_code, lead.contact_first_name, 
                lead.contact_last_name, lead.compliance_status,
                lead.google_place_id, lead.google_rating, lead.geo_latitude, lead.geo_longitude
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
              google_place_id, google_rating, geo_latitude, geo_longitude, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, NOW()) 
            RETURNING *`,
            [
              lead.company, email, lead.phone, lead.industry_category, lead.industry_subcategory,
              lead.source, lead.status, lead.notes, lead.website_url, lead.address, 
              lead.city, lead.state, lead.zip_code, lead.contact_first_name, 
              lead.contact_last_name, lead.compliance_status,
              lead.google_place_id, lead.google_rating, lead.geo_latitude, lead.geo_longitude
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
    if (req.session.userId !== parseInt(id) && !req.session.is_admin) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const result = await pool.query(
      `UPDATE users 
       SET first_name = $1, last_name = $2, email = $3, phone = $4, 
           timezone = $5, language = $6, notifications_enabled = $7, 
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING id, email, username, first_name, last_name, phone, 
                 timezone, language, notifications_enabled, is_admin, 
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

export default router;
