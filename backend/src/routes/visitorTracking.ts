import express from 'express';
import pool from '../config/database';
import { EmailService } from '../services/emailService';

const router = express.Router();
const emailService = new EmailService();

// ==========================================
// HELPER: Send Visitor Engagement Email
// ==========================================
async function sendVisitorEngagementEmail(
  widget_id: number,
  session_id: string,
  ip_address: string | string[],
  visitor_fingerprint: string | null
) {
  // Normalize IP address (handle string array from x-forwarded-for)
  const normalizedIp = Array.isArray(ip_address) ? ip_address[0] : ip_address;
  try {
    // Get widget and client info
    const widgetInfo = await pool.query(
      `SELECT wc.widget_name, wc.notification_email, wc.enable_email_notifications, wc.client_id,
              c.client_name, c.email as client_email
       FROM widget_configs wc
       LEFT JOIN clients c ON c.id = wc.client_id
       WHERE wc.id = $1`,
      [widget_id]
    );

    if (widgetInfo.rows.length === 0 || !widgetInfo.rows[0].enable_email_notifications) {
      return; // No email needed
    }

    const widget = widgetInfo.rows[0];
    const notifyEmail = widget.notification_email || widget.client_email;

    if (!notifyEmail) {
      console.log('⚠️ No notification email configured for widget');
      return;
    }

    // Get session details
    const sessionInfo = await pool.query(
      `SELECT 
        vs.current_page_url, vs.current_page_title, vs.landing_page_url,
        vs.browser, vs.os, vs.device_type, vs.country, vs.city,
        vs.session_started_at, vs.referrer_url,
        EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - vs.session_started_at))/60 as minutes_on_site
       FROM widget_visitor_sessions vs
       WHERE vs.session_id = $1`,
      [session_id]
    );

    if (sessionInfo.rows.length === 0) return;

    const session = sessionInfo.rows[0];

    // Check if returning visitor (same fingerprint, different session)
    let isReturningVisitor = false;
    let previousVisitCount = 0;

    if (visitor_fingerprint) {
      const previousVisits = await pool.query(
        `SELECT COUNT(*) as visit_count
         FROM widget_visitor_sessions
         WHERE widget_id = $1 
           AND visitor_fingerprint = $2 
           AND session_id != $3
           AND session_started_at < (
             SELECT session_started_at FROM widget_visitor_sessions WHERE session_id = $3
           )`,
        [widget_id, visitor_fingerprint, session_id]
      );

      if (previousVisits.rows.length > 0) {
        previousVisitCount = parseInt(previousVisits.rows[0].visit_count) || 0;
        isReturningVisitor = previousVisitCount > 0;
      }
    }

    // Update session with returning visitor info
    await pool.query(
      `UPDATE widget_visitor_sessions 
       SET is_returning_visitor = $1, previous_visit_count = $2
       WHERE session_id = $3`,
      [isReturningVisitor, previousVisitCount, session_id]
    );

    // Get total active visitors count
    const activeVisitorsResult = await pool.query(
      `SELECT COUNT(*) as active_count
       FROM widget_visitor_sessions
       WHERE widget_id = $1 AND is_active = true`,
      [widget_id]
    );

    const totalActiveVisitors = parseInt(activeVisitorsResult.rows[0]?.active_count) || 1;

    // Get country from IP (simplified - you can use a GeoIP service)
    const country = session.country || 'Unknown';
    const city = session.city || '';
    const location = city ? `${city}, ${country}` : country;

    // Send email notification with CLIENT-BRANDED sender name
    const clientBrandedName = widget.widget_name || widget.client_name || 'Your Website';
    await emailService.sendEmail({
      to: notifyEmail,
      from: `"🔔 ${clientBrandedName} - Visitor Alert" <info@wetechforu.com>`, // ✅ Branded with client name
      subject: `🔔 ${isReturningVisitor ? 'Returning' : 'New'} Visitor on ${clientBrandedName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4682B4;">
            ${isReturningVisitor ? '🔄 Returning Visitor' : '🆕 New Visitor'} Engaged on Your Site!
          </h2>
          
          <div style="background: ${isReturningVisitor ? '#e3f2fd' : '#e8f5e9'}; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${isReturningVisitor ? '#2196f3' : '#4caf50'};">
            <h3 style="margin-top: 0; color: ${isReturningVisitor ? '#1976d2' : '#2e7d32'};">
              ${isReturningVisitor ? '🎉 Welcome Back Visitor!' : '✨ Brand New Visitor!'}
            </h3>
            <p style="margin: 5px 0;"><strong>Time on Site:</strong> ${Math.round(session.minutes_on_site)} minutes ⏱️</p>
            ${isReturningVisitor ? `<p style="margin: 5px 0;"><strong>Previous Visits:</strong> ${previousVisitCount} times before</p>` : ''}
          </div>

          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">📍 Visitor Details:</h3>
            <p style="margin: 8px 0;"><strong>Location:</strong> ${location}</p>
            <p style="margin: 8px 0;"><strong>IP Address:</strong> ${normalizedIp}</p>
            <p style="margin: 8px 0;"><strong>Device:</strong> ${session.device_type || 'Unknown'} (${session.browser || 'Unknown'} on ${session.os || 'Unknown'})</p>
            ${totalActiveVisitors > 1 ? `<p style="margin: 8px 0; color: #ff9800; font-weight: 600;">👥 Total Active Visitors: ${totalActiveVisitors}</p>` : ''}
          </div>

          <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #ffc107;">
            <h3 style="margin-top: 0;">🌐 Browsing Activity:</h3>
            <p style="margin: 5px 0;"><strong>Landing Page:</strong> ${session.landing_page_url || 'Unknown'}</p>
            <p style="margin: 5px 0;"><strong>Current Page:</strong> ${session.current_page_title || session.current_page_url}</p>
            ${session.referrer_url ? `<p style="margin: 5px 0;"><strong>Came From:</strong> ${session.referrer_url}</p>` : ''}
          </div>

          <p style="margin: 20px 0;">
            <a href="https://marketingby.wetechforu.com/app/visitor-monitoring" 
               style="background: #4682B4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              👁️ View Live Visitor Dashboard →
            </a>
          </p>

          <p style="color: #666; font-size: 13px; margin-top: 20px;">
            💡 <strong>Tip:</strong> This visitor has been actively engaged for 5+ minutes. 
            ${isReturningVisitor 
              ? 'They\'ve visited before - might be ready to convert!' 
              : 'First-time visitor showing interest - great opportunity to engage!'
            }
          </p>
        </div>
      `,
      text: `${isReturningVisitor ? 'Returning' : 'New'} visitor on ${widget.widget_name} - ${Math.round(session.minutes_on_site)} minutes on site. Location: ${location}. IP: ${normalizedIp}. ${totalActiveVisitors > 1 ? `${totalActiveVisitors} active visitors.` : ''} View: https://marketingby.wetechforu.com/app/visitor-monitoring`
    });

    console.log(`📧 Visitor engagement email sent for session ${session_id}`);
  } catch (error) {
    console.error('Error sending visitor engagement email:', error);
    throw error;
  }
}

// ==========================================
// CORS Middleware for ALL visitor tracking routes
// ==========================================
router.use((req, res, next) => {
  // Allow ALL origins for public visitor tracking (customer websites embed the widget)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// ==========================================
// PUBLIC ROUTES - Widget Tracking (No Auth)
// ==========================================

// Track visitor session (start or update)
router.post('/public/widget/:widgetKey/track-session', async (req, res) => {
  try {
    const { widgetKey } = req.params;
    const {
      session_id,
      visitor_fingerprint,
      current_page_url,
      current_page_title,
      referrer_url,
      user_agent,
      browser,
      browser_version,
      os,
      os_version,
      device_type
    } = req.body;

    const ip_address = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    // Get widget ID
    const widgetResult = await pool.query(
      'SELECT id FROM widget_configs WHERE widget_key = $1 AND is_active = true',
      [widgetKey]
    );

    if (widgetResult.rows.length === 0) {
      return res.status(404).json({ error: 'Widget not found' });
    }

    const widget_id = widgetResult.rows[0].id;

    // Check if session exists
    const existingSession = await pool.query(
      'SELECT id, landing_page_url, session_started_at FROM widget_visitor_sessions WHERE session_id = $1',
      [session_id]
    );

    if (existingSession.rows.length > 0) {
      // Update existing session
      await pool.query(
        `UPDATE widget_visitor_sessions 
         SET current_page_url = $1,
             current_page_title = $2,
             last_active_at = CURRENT_TIMESTAMP,
             is_active = true,
             updated_at = CURRENT_TIMESTAMP
         WHERE session_id = $3`,
        [current_page_url, current_page_title, session_id]
      );

      // ✅ CHECK IF VISITOR HAS BEEN HERE 5+ MINUTES (and email not sent yet)
      const sessionStarted = existingSession.rows[0].session_started_at;
      const minutesOnSite = Math.floor((Date.now() - new Date(sessionStarted).getTime()) / 1000 / 60);
      
      if (minutesOnSite >= 5) {
        // Check if email already sent
        const emailCheck = await pool.query(
          'SELECT engagement_email_sent FROM widget_visitor_sessions WHERE session_id = $1',
          [session_id]
        );
        
        if (emailCheck.rows.length > 0 && !emailCheck.rows[0].engagement_email_sent) {
          // Send email notification (async - don't block response)
          sendVisitorEngagementEmail(widget_id, session_id, ip_address, visitor_fingerprint)
            .catch(err => console.error('Failed to send visitor engagement email:', err));
          
          // Mark as sent
          await pool.query(
            'UPDATE widget_visitor_sessions SET engagement_email_sent = true, engagement_email_sent_at = CURRENT_TIMESTAMP WHERE session_id = $1',
            [session_id]
          );
        }
      }

      console.log(`✅ Updated session: ${session_id} (${minutesOnSite} minutes)`);
      res.json({ status: 'updated', session_id });
    } else {
      // Create new session
      await pool.query(
        `INSERT INTO widget_visitor_sessions (
          widget_id, session_id, visitor_fingerprint, ip_address,
          current_page_url, current_page_title, referrer_url, landing_page_url,
          user_agent, browser, browser_version, os, os_version, device_type,
          is_active, last_active_at, session_started_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          widget_id, session_id, visitor_fingerprint, ip_address,
          current_page_url, current_page_title, referrer_url, current_page_url, // landing_page = current_page on first visit
          user_agent, browser, browser_version, os, os_version, device_type
        ]
      );

      console.log(`✅ New visitor session created: ${session_id}`);
      res.json({ status: 'created', session_id });
    }
  } catch (error) {
    console.error('Track session error:', error);
    res.status(500).json({ error: 'Failed to track session' });
  }
});

// Track page view
router.post('/public/widget/:widgetKey/track-pageview', async (req, res) => {
  try {
    const { widgetKey } = req.params;
    const { session_id, page_url, page_title, referrer_url, time_on_page } = req.body;

    const widgetResult = await pool.query(
      'SELECT id FROM widget_configs WHERE widget_key = $1',
      [widgetKey]
    );

    if (widgetResult.rows.length === 0) {
      return res.status(404).json({ error: 'Widget not found' });
    }

    const widget_id = widgetResult.rows[0].id;

    // Insert page view
    await pool.query(
      `INSERT INTO widget_page_views (session_id, widget_id, page_url, page_title, referrer_url, time_on_page_seconds, viewed_at)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
      [session_id, widget_id, page_url, page_title, referrer_url, time_on_page || 0]
    );

    // Update page view count
    await pool.query(
      'UPDATE widget_visitor_sessions SET page_views = page_views + 1, updated_at = CURRENT_TIMESTAMP WHERE session_id = $1',
      [session_id]
    );

    res.json({ status: 'tracked' });
  } catch (error) {
    console.error('Track page view error:', error);
    res.status(500).json({ error: 'Failed to track page view' });
  }
});

// Track visitor event
router.post('/public/widget/:widgetKey/track-event', async (req, res) => {
  try {
    const { widgetKey } = req.params;
    const { session_id, event_type, event_data, page_url } = req.body;

    const widgetResult = await pool.query(
      'SELECT id FROM widget_configs WHERE widget_key = $1',
      [widgetKey]
    );

    if (widgetResult.rows.length === 0) {
      return res.status(404).json({ error: 'Widget not found' });
    }

    const widget_id = widgetResult.rows[0].id;

    await pool.query(
      `INSERT INTO widget_visitor_events (session_id, widget_id, event_type, event_data, page_url, created_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
      [session_id, widget_id, event_type, JSON.stringify(event_data), page_url]
    );

    // Update session if chat opened
    if (event_type === 'chat_opened') {
      await pool.query(
        'UPDATE widget_visitor_sessions SET has_chatted = true WHERE session_id = $1',
        [session_id]
      );
    }

    res.json({ status: 'tracked' });
  } catch (error) {
    console.error('Track event error:', error);
    res.status(500).json({ error: 'Failed to track event' });
  }
});

// ==========================================
// ADMIN ROUTES - Dashboard Monitoring (Requires Auth)
// ==========================================

// Get active visitors for widget
router.get('/widgets/:widgetId/active-visitors', async (req, res) => {
  try {
    const { widgetId } = req.params;
    const { limit = 100 } = req.query;

    console.log(`📊 Fetching active visitors for widget ${widgetId}...`);

    const result = await pool.query(
      `SELECT 
        vs.*,
        wc.widget_name,
        wconv.id as conversation_id,
        (SELECT COUNT(*) FROM widget_messages WHERE conversation_id = wconv.id) as message_count,
        EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - vs.session_started_at))::INTEGER as time_on_site_seconds
       FROM widget_visitor_sessions vs
       LEFT JOIN widget_configs wc ON vs.widget_id = wc.id
       LEFT JOIN widget_conversations wconv ON vs.conversation_id = wconv.id
       WHERE vs.widget_id = $1 
         AND vs.is_active = true
         AND vs.last_active_at > NOW() - INTERVAL '5 minutes'
       ORDER BY vs.last_active_at DESC
       LIMIT $2`,
      [widgetId, limit]
    );

    console.log(`✅ Found ${result.rows.length} active visitors`);
    res.json(result.rows);
  } catch (error) {
    console.error('Get active visitors error:', error);
    res.status(500).json({ error: 'Failed to fetch active visitors' });
  }
});

// Get visitor session details
router.get('/sessions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const sessionResult = await pool.query(
      `SELECT 
        vs.*,
        wc.widget_name,
        wconv.id as conversation_id,
        EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - vs.session_started_at))::INTEGER as time_on_site_seconds
       FROM widget_visitor_sessions vs
       LEFT JOIN widget_configs wc ON vs.widget_id = wc.id
       LEFT JOIN widget_conversations wconv ON vs.conversation_id = wconv.id
       WHERE vs.session_id = $1`,
      [sessionId]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Get page views
    const pageViewsResult = await pool.query(
      `SELECT * FROM widget_page_views 
       WHERE session_id = $1 
       ORDER BY viewed_at DESC`,
      [sessionId]
    );

    // Get events
    const eventsResult = await pool.query(
      `SELECT * FROM widget_visitor_events 
       WHERE session_id = $1 
       ORDER BY created_at DESC`,
      [sessionId]
    );

    res.json({
      session: sessionResult.rows[0],
      page_views: pageViewsResult.rows,
      events: eventsResult.rows
    });
  } catch (error) {
    console.error('Get session details error:', error);
    res.status(500).json({ error: 'Failed to fetch session details' });
  }
});

// Get visitor statistics for widget
router.get('/widgets/:widgetId/visitor-stats', async (req, res) => {
  try {
    const { widgetId } = req.params;
    const { period = '24h' } = req.query;

    let timeFilter = "NOW() - INTERVAL '24 hours'";
    if (period === '7d') timeFilter = "NOW() - INTERVAL '7 days'";
    if (period === '30d') timeFilter = "NOW() - INTERVAL '30 days'";

    const stats = await pool.query(
      `SELECT 
        COUNT(DISTINCT session_id) as total_visitors,
        COUNT(DISTINCT session_id) FILTER (WHERE is_active = true AND last_active_at > NOW() - INTERVAL '5 minutes') as active_visitors,
        COUNT(DISTINCT session_id) FILTER (WHERE has_chatted = true) as visitors_who_chatted,
        ROUND(AVG(total_time_seconds))::INTEGER as avg_time_on_site,
        ROUND(AVG(page_views))::INTEGER as avg_page_views,
        COUNT(DISTINCT country) as countries_count
       FROM widget_visitor_sessions
       WHERE widget_id = $1
         AND session_started_at > ${timeFilter}`,
      [widgetId]
    );

    res.json(stats.rows[0]);
  } catch (error) {
    console.error('Get visitor stats error:', error);
    res.status(500).json({ error: 'Failed to fetch visitor statistics' });
  }
});

// Mark session as inactive (admin can manually close)
router.post('/sessions/:sessionId/deactivate', async (req, res) => {
  try {
    const { sessionId } = req.params;

    await pool.query(
      `UPDATE widget_visitor_sessions 
       SET is_active = false, 
           session_ended_at = CURRENT_TIMESTAMP 
       WHERE session_id = $1`,
      [sessionId]
    );

    res.json({ status: 'deactivated' });
  } catch (error) {
    console.error('Deactivate session error:', error);
    res.status(500).json({ error: 'Failed to deactivate session' });
  }
});

// 🗑️ DELETE VISITOR SESSION (Admin only)
router.delete('/sessions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    console.log(`🗑️ Deleting visitor session: ${sessionId}`);

    // Delete related page views first (foreign key constraint)
    await pool.query(
      'DELETE FROM widget_page_views WHERE session_id = $1',
      [sessionId]
    );

    // Delete related events
    await pool.query(
      'DELETE FROM widget_visitor_events WHERE session_id = $1',
      [sessionId]
    );

    // Delete the session
    const result = await pool.query(
      'DELETE FROM widget_visitor_sessions WHERE session_id = $1 RETURNING *',
      [sessionId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Visitor session not found' });
    }

    console.log(`✅ Visitor session deleted: ${sessionId}`);
    res.json({ success: true, message: 'Visitor session deleted successfully' });
  } catch (error) {
    console.error('Delete visitor session error:', error);
    res.status(500).json({ error: 'Failed to delete visitor session' });
  }
});

export default router;

