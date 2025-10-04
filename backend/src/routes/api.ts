import express from 'express';
import pool from '../config/database';
import { requireAuth } from '../middleware/auth';
import { LeadScrapingService } from '../services/leadScrapingService';
import { ComplianceCheckService } from '../services/complianceCheckService';

const router = express.Router();

// Apply auth middleware to all API routes
router.use(requireAuth);

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

// Get leads
router.get('/leads', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, clinic_name as name, contact_email as email, contact_phone as phone, clinic_name as company, industry_category, industry_subcategory, lead_source as source, status, notes, created_at FROM leads ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get leads error:', error);
    res.status(500).json({ error: 'Internal server error' });
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

  // Scrape leads from website
  router.post('/scrape-website-leads', async (req, res) => {
    try {
      const { url, maxLeads = 10, state = 'Texas' } = req.body;

      if (!url) {
        return res.status(400).json({ error: 'URL is required' });
      }

      // Check compliance before scraping
      const complianceService = ComplianceCheckService.getInstance();
      const complianceResult = await complianceService.checkWebsiteScrapingCompliance(url, state);
      
      if (!complianceResult.isCompliant) {
        return res.status(403).json({ 
          error: 'Compliance check failed', 
          compliance: complianceResult 
        });
      }

      console.log('✅ Compliance check passed for website scraping');
      if (complianceResult.warnings.length > 0) {
        console.log('⚠️ Compliance warnings:', complianceResult.warnings);
      }

      const leads = await LeadScrapingService.scrapeLeadsFromWebsite(url, maxLeads);

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
      const complianceService = ComplianceCheckService.getInstance();
      const complianceResult = await complianceService.checkComplianceForAction('zipcode_scraping', state);
      
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

      const leads = await LeadScrapingService.scrapeLeadsByZipCode(options);

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
      const credits = await LeadScrapingService.checkAPICredits();
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
      const complianceService = ComplianceCheckService.getInstance();
      const settings = complianceService.getComplianceSettings(state as string);
      
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
      
      const complianceService = ComplianceCheckService.getInstance();
      const result = await complianceService.checkComplianceForAction(action, state, additionalData);
      
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

  export default router;
