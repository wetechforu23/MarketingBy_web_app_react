import express from 'express';
import pool from '../config/database';
import { requireAuth } from '../middleware/auth';
import { SEOService } from '../services/seoService';
import { SEOApiService } from '../services/seoApiService';
import { SEOEmailService } from '../services/seoEmailService';
import { AzureEmailService } from '../services/azureEmailService';
import { MicrosoftGraphEmailService } from '../services/microsoftGraphEmailService';
import { ComplianceCheckService } from '../services/complianceCheckService';

const router = express.Router();

// Apply auth middleware to all SEO routes
router.use(requireAuth);

// Basic SEO analysis
router.post('/analyze', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    const analysis = await SEOService.analyzeWebsite(url);

    // Save analysis to database - use first available client or make client_id nullable
    const result = await pool.query(
      'INSERT INTO seo_audits (client_id, url, overall_score, issues, recommendations, created_at) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id',
      [
        32, // Using first available client ID
        url,
        analysis.score,
        JSON.stringify({
          title: analysis.title,
          description: analysis.description,
          headings: analysis.headings,
          images: analysis.images,
          links: analysis.links,
          performance: analysis.performance,
          technical: analysis.technical,
          content: analysis.content
        }),
        JSON.stringify(analysis.recommendations)
      ]
    );

    res.json({
      success: true,
      analysis,
      auditId: result.rows[0].id
    });

  } catch (error) {
    console.error('SEO analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to analyze website',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Comprehensive website scraping
router.post('/scrape', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    const websiteData = await SEOService.scrapeWebsite(url);

    // Save scraped data to database
    const result = await pool.query(
      'INSERT INTO competitor_analysis (client_id, competitor_name, competitor_domain, analysis_data, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING id',
      [
        req.session.userId, // Using user ID as client ID for now
        new URL(url).hostname,
        new URL(url).hostname,
        JSON.stringify(websiteData)
      ]
    );

    res.json({
      success: true,
      data: websiteData,
      analysisId: result.rows[0].id
    });

  } catch (error) {
    console.error('Website scraping error:', error);
    res.status(500).json({ error: 'Failed to scrape website' });
  }
});

// Get SEO audits
router.get('/audits', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, url, overall_score as score, issues, recommendations, created_at FROM seo_audits ORDER BY created_at DESC LIMIT 50'
    );

    const audits = result.rows.map(audit => ({
      ...audit,
      issues: JSON.parse(audit.issues),
      recommendations: JSON.parse(audit.recommendations)
    }));

    res.json(audits);

  } catch (error) {
    console.error('Get SEO audits error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get competitor analyses
router.get('/competitors', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, competitor_name, competitor_domain, analysis_data, created_at FROM competitor_analysis ORDER BY created_at DESC LIMIT 50'
    );

    const competitors = result.rows.map(comp => ({
      ...comp,
      analysis_data: JSON.parse(comp.analysis_data)
    }));

    res.json(competitors);

  } catch (error) {
    console.error('Get competitor analyses error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get keyword analyses
router.get('/keywords', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, keyword, volume, difficulty, position, created_at FROM keyword_analysis ORDER BY created_at DESC LIMIT 50'
    );

    res.json(result.rows);

  } catch (error) {
    console.error('Get keyword analyses error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get keyword recommendations
router.get('/recommendations', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, keyword, recommendation_type, priority, created_at FROM keyword_recommendations ORDER BY priority DESC, created_at DESC LIMIT 50'
    );

    res.json(result.rows);

  } catch (error) {
    console.error('Get keyword recommendations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate and send comprehensive SEO report
router.post('/generate-report', async (req, res) => {
  try {
    const { url, clientName, clientEmail } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Generate comprehensive SEO report using real APIs
    const seoReport = await SEOApiService.generateSEOReport(url, clientName || 'Dr. Sarah Johnson');

        // Check email marketing compliance before sending
        const complianceService = ComplianceCheckService.getInstance();
        const emailCompliance = await complianceService.checkEmailMarketingCompliance(
          clientEmail,
          'seo_report',
          'Texas'
        );

        if (!emailCompliance.isCompliant) {
          return res.status(403).json({ 
            error: 'Email marketing compliance check failed', 
            compliance: emailCompliance 
          });
        }

        console.log('✅ Email marketing compliance check passed');
        if (emailCompliance.warnings.length > 0) {
          console.log('⚠️ Email compliance warnings:', emailCompliance.warnings);
        }

        // Send email report
        if (clientEmail) {
          let emailSent = false;
          
          // Try Microsoft Graph email service first
          try {
            const microsoftGraphEmailService = new MicrosoftGraphEmailService();
            emailSent = await microsoftGraphEmailService.sendSEOReport(
              clientEmail,
              clientName || 'Dr. Sarah Johnson',
              seoReport
            );
          } catch (error) {
            console.warn('Microsoft Graph email failed, trying Azure Communication Services:', error);
          }
      
      // Try Azure Communication Services email service
      if (!emailSent) {
        try {
          const azureEmailService = AzureEmailService.getInstance();
          const azureResult = await azureEmailService.sendSEOReportEmail(
            clientEmail,
            clientName || 'Dr. Sarah Johnson',
            'Healthcare Practice',
            seoReport.url,
            seoReport.overallScore,
            JSON.stringify(seoReport),
            seoReport.recommendations || [],
            {
              name: 'WeTechForU Team',
              email: 'viral.tarpara@hotmail.com',
              phone: '(555) 123-4567',
              website: 'www.wetechforu.com'
            }
          );
          emailSent = azureResult.success;
        } catch (error) {
          console.warn('Azure Communication Services email failed, trying fallback:', error);
        }
      }
      
      // Fallback to regular email service
      if (!emailSent) {
        try {
          const seoEmailService = SEOEmailService.getInstance();
          const result = await seoEmailService.sendSEOReport({
            leadEmail: clientEmail,
            leadName: clientName || 'Dr. Sarah Johnson',
            clinicName: 'Healthcare Practice',
            websiteUrl: seoReport.url,
            seoScore: seoReport.overallScore,
            reportContent: JSON.stringify(seoReport),
            recommendations: seoReport.recommendations || [],
            senderName: 'WeTechForU Team',
            senderEmail: 'viral.tarpara@hotmail.com',
            senderPhone: '(555) 123-4567',
            senderWebsite: 'www.wetechforu.com'
          });
          emailSent = result.success;
        } catch (error) {
          console.error('Fallback email service failed:', error);
        }
      }

      if (emailSent) {
        res.json({
          success: true,
          message: 'SEO report generated and sent successfully',
          report: seoReport
        });
      } else {
        res.status(500).json({ error: 'Failed to send email report' });
      }
    } else {
      res.json({
        success: true,
        message: 'SEO report generated successfully',
        report: seoReport
      });
    }

  } catch (error) {
    console.error('Generate SEO report error:', error);
    res.status(500).json({ error: 'Failed to generate SEO report' });
  }
});

// Get keyword opportunities
router.get('/keywords/:industry', async (req, res) => {
  try {
    const { industry } = req.params;
    const keywords = SEOApiService.generateKeywordOpportunities(industry);

    res.json(keywords);

  } catch (error) {
    console.error('Get keyword opportunities error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
