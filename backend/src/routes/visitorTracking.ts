import express from 'express';
import pool from '../config/database';

const router = express.Router();

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

      console.log(`✅ Updated session: ${session_id}`);
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

export default router;

