import express from 'express';
import pool from '../config/database';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

/**
 * GET /api/client-dashboard/overview
 * Get comprehensive dashboard data for logged-in client
 * Returns ONLY real data from database - NO MOCK DATA
 */
router.get('/overview', requireAuth, async (req, res) => {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 [BACKEND] Client Dashboard Overview Request');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 [BACKEND] Session Data:', {
      sessionID: req.sessionID,
      userId: req.session.userId,
      role: req.session.role,
      clientId: req.session.clientId,
      username: req.session.username
    });
    
    const clientId = req.session.clientId;
    
    if (!clientId) {
      console.error('❌ [BACKEND] Client ID NOT FOUND in session!');
      console.error('⚠️ [BACKEND] Full session object:', req.session);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      return res.status(403).json({ error: 'Client ID not found in session. Please log in again.' });
    }

    console.log(`✅ [BACKEND] Client ID found: ${clientId}`);

    // 1. Get client information
    const clientResult = await pool.query(
      `SELECT id, client_name as name, email, phone, contact_name, 
              is_active, created_at, website_url, industry, 
              practice_location
       FROM clients 
       WHERE id = $1`,
      [clientId]
    );

    if (clientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const client = clientResult.rows[0];

    // 2. Get leads statistics (REAL DATA)
    const leadsResult = await pool.query(
      `SELECT 
        COUNT(*) as total_leads,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as leads_this_month,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as leads_this_week,
        COUNT(*) FILTER (WHERE status = 'converted') as converted_leads
       FROM leads 
       WHERE client_id = $1`,
      [clientId]
    );

    const leads = leadsResult.rows[0] || {
      total_leads: 0,
      leads_this_month: 0,
      leads_this_week: 0,
      converted_leads: 0
    };

    // 3. Get SEO audit data (REAL DATA)
    const seoResult = await pool.query(
      `SELECT 
        seo_score,
        performance_score,
        accessibility_score,
        best_practices_score,
        created_at
       FROM seo_audits 
       WHERE client_id = $1 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [clientId]
    );

    const seo = seoResult.rows[0] || null;

    // 4. Get Google Analytics data (REAL DATA from analytics_data table)
    const analyticsResult = await pool.query(
      `SELECT 
        SUM(page_views) as total_page_views,
        SUM(sessions) as total_sessions,
        AVG(bounce_rate) as avg_bounce_rate,
        SUM(users) as total_users
       FROM analytics_data 
       WHERE client_id = $1 
         AND date >= NOW() - INTERVAL '30 days'`,
      [clientId]
    );

    const analytics = analyticsResult.rows[0] || {
      total_page_views: 0,
      total_sessions: 0,
      avg_bounce_rate: 0,
      total_users: 0
    };

    // 5. Get Facebook page metrics (REAL DATA)
    const facebookResult = await pool.query(
      `SELECT 
        page_followers,
        page_impressions,
        page_engagement
       FROM facebook_page_metrics 
       WHERE client_id = $1 
       ORDER BY date DESC 
       LIMIT 1`,
      [clientId]
    );

    const facebook = facebookResult.rows[0] || {
      page_followers: 0,
      page_impressions: 0,
      page_engagement: 0
    };

    // 6. Get connected services status (REAL DATA from client_credentials)
    const servicesResult = await pool.query(
      `SELECT service_type, updated_at 
       FROM client_credentials 
       WHERE client_id = $1`,
      [clientId]
    );

    const connectedServices = {
      googleAnalytics: false,
      facebook: false,
      searchConsole: false,
      googleTag: false
    };

    servicesResult.rows.forEach(row => {
      switch (row.service_type) {
        case 'google_analytics':
          connectedServices.googleAnalytics = true;
          break;
        case 'facebook':
          connectedServices.facebook = true;
          break;
        case 'google_search_console':
          connectedServices.searchConsole = true;
          break;
        case 'google_tag':
          connectedServices.googleTag = true;
          break;
      }
    });

    // 7. Get recent reports (REAL DATA)
    const reportsResult = await pool.query(
      `SELECT id, report_name, report_type, created_at 
       FROM lead_seo_reports 
       WHERE lead_id IN (SELECT id FROM leads WHERE client_id = $1)
       ORDER BY created_at DESC 
       LIMIT 5`,
      [clientId]
    );

    // 8. Get blog posts count (REAL DATA)
    const blogsResult = await pool.query(
      `SELECT COUNT(*) as total_blogs
       FROM blogs 
       WHERE client_id = $1`,
      [clientId]
    );

    const blogs = blogsResult.rows[0] || { total_blogs: 0 };

    // 9. Get content library stats (REAL DATA)
    const contentResult = await pool.query(
      `SELECT 
        COUNT(*) as total_content,
        COUNT(*) FILTER (WHERE status = 'published') as published_content,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as content_this_month
       FROM social_media_content 
       WHERE client_id = $1`,
      [clientId]
    );

    const content = contentResult.rows[0] || {
      total_content: 0,
      published_content: 0,
      content_this_month: 0
    };

    // Compile the response
    const dashboardData = {
      client: {
        id: client.id,
        name: client.name,
        email: client.email,
        phone: client.phone,
        website: client.website_url,
        industry: client.industry,
        location: client.practice_location,
        isActive: client.is_active,
        memberSince: client.created_at
      },
      metrics: {
        leads: {
          total: parseInt(leads.total_leads) || 0,
          thisMonth: parseInt(leads.leads_this_month) || 0,
          thisWeek: parseInt(leads.leads_this_week) || 0,
          converted: parseInt(leads.converted_leads) || 0,
          conversionRate: leads.total_leads > 0 
            ? ((leads.converted_leads / leads.total_leads) * 100).toFixed(1)
            : '0.0'
        },
        seo: seo ? {
          score: seo.seo_score || 0,
          performance: seo.performance_score || 0,
          accessibility: seo.accessibility_score || 0,
          bestPractices: seo.best_practices_score || 0,
          lastAudit: seo.created_at
        } : null,
        analytics: {
          pageViews: parseInt(analytics.total_page_views) || 0,
          sessions: parseInt(analytics.total_sessions) || 0,
          bounceRate: parseFloat(analytics.avg_bounce_rate) || 0,
          users: parseInt(analytics.total_users) || 0
        },
        facebook: {
          followers: parseInt(facebook.page_followers) || 0,
          impressions: parseInt(facebook.page_impressions) || 0,
          engagement: parseInt(facebook.page_engagement) || 0
        },
        content: {
          total: parseInt(content.total_content) || 0,
          published: parseInt(content.published_content) || 0,
          thisMonth: parseInt(content.content_this_month) || 0
        },
        blogs: {
          total: parseInt(blogs.total_blogs) || 0
        }
      },
      connectedServices,
      recentReports: reportsResult.rows
    };

    console.log(`✅ [BACKEND] Dashboard overview compiled successfully!`);
    console.log(`📊 [BACKEND] Data Summary:`, {
      clientName: dashboardData.client.name,
      totalLeads: dashboardData.metrics.leads.total,
      seoScore: dashboardData.metrics.seo?.score || 'N/A',
      connectedServices: Object.entries(dashboardData.connectedServices)
        .filter(([_, connected]) => connected)
        .map(([service]) => service)
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    res.json(dashboardData);

  } catch (error) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ [BACKEND] Error fetching client dashboard overview');
    console.error('📛 [BACKEND] Error details:', error);
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    res.status(500).json({ error: 'Failed to load dashboard data' });
  }
});

/**
 * GET /api/client-dashboard/activity
 * Get recent activity for logged-in client
 * Returns ONLY real data - NO MOCK DATA
 */
router.get('/activity', requireAuth, async (req, res) => {
  try {
    const clientId = req.session.clientId;
    
    if (!clientId) {
      return res.status(403).json({ error: 'Client ID not found in session' });
    }

    const activityResult = await pool.query(
      `SELECT 
        la.id,
        la.activity_type,
        la.activity_data,
        la.created_at,
        l.clinic_name as lead_name
       FROM lead_activity la
       JOIN leads l ON la.lead_id = l.id
       WHERE l.client_id = $1
       ORDER BY la.created_at DESC
       LIMIT 10`,
      [clientId]
    );

    res.json({ activities: activityResult.rows });

  } catch (error) {
    console.error('❌ Error fetching activity:', error);
    res.status(500).json({ error: 'Failed to load activity data' });
  }
});

export default router;

