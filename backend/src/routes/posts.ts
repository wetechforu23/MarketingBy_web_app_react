import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { getClientFilter } from '../utils/clientFilter';
import * as postingService from '../services/socialMediaPostingService';
import pool from '../config/database';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// ============================================================================
// POST MANAGEMENT ROUTES
// ============================================================================

/**
 * GET: List posts (scheduled and posted)
 * GET /api/posts
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const clientFilter = getClientFilter(req, 'p');
    
    const status = req.query.status as string;
    const platform = req.query.platform as string;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

    let whereConditions = [clientFilter.whereClause];
    let params: any[] = [...clientFilter.params];
    let paramIndex = params.length + 1;

    if (status) {
      whereConditions.push(`p.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (platform) {
      whereConditions.push(`p.platform = $${paramIndex}`);
      params.push(platform);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    const query = `
      SELECT 
        p.*,
        c.title as content_title,
        c.content_text,
        c.media_urls,
        cl.client_name as client_name,
        u.name as created_by_name
      FROM social_media_posts p
      JOIN social_media_content c ON p.content_id = c.id
      LEFT JOIN clients cl ON p.client_id = cl.id
      LEFT JOIN users u ON p.created_by = u.id
      WHERE ${whereClause}
      ORDER BY 
        CASE 
          WHEN p.status = 'scheduled' AND p.scheduled_time IS NOT NULL THEN p.scheduled_time
          WHEN p.status = 'posted' AND p.posted_at IS NOT NULL THEN p.posted_at
          ELSE p.created_at
        END DESC NULLS LAST
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    console.log('📋 Fetching posts with query:', query);
    console.log('📋 Query params:', [...params, limit, offset]);
    console.log('📋 Status filter:', status);
    console.log('📋 Client filter:', clientFilter);

    const result = await pool.query(query, [...params, limit, offset]);

    console.log(`✅ Found ${result.rows.length} posts`);
    if (result.rows.length > 0) {
      console.log('📋 Sample post:', {
        id: result.rows[0].id,
        status: result.rows[0].status,
        platform: result.rows[0].platform,
        scheduled_time: result.rows[0].scheduled_time,
        content_title: result.rows[0].content_title
      });
    }

    res.json({
      success: true,
      posts: result.rows,
      limit,
      offset
    });
  } catch (error: any) {
    console.error('❌ Error listing posts:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * GET: Single post details
 * GET /api/posts/:id
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const postId = parseInt(req.params.id);
    const result = await postingService.getPostDetails(postId);

    if (!result.success) {
      return res.status(404).json({ error: result.error });
    }

    // Check access
    const post = result.post;
    const clientFilter = getClientFilter(req, 'p');
    
    // Simple access check
    const accessCheck = await pool.query(
      `SELECT 1 FROM social_media_posts p WHERE p.id = $1 AND ${clientFilter.whereClause}`,
      [postId, ...clientFilter.params]
    );

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(result);
  } catch (error: any) {
    console.error('Error getting post details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT: Reschedule a post
 * PUT /api/posts/:id/reschedule
 */
router.put('/:id/reschedule', async (req: Request, res: Response) => {
  try {
    const postId = parseInt(req.params.id);
    const { scheduledTime } = req.body;

    if (!scheduledTime) {
      return res.status(400).json({ error: 'scheduledTime is required' });
    }

    const result = await postingService.reschedulePost(postId, new Date(scheduledTime));

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json(result);
  } catch (error: any) {
    console.error('Error rescheduling post:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE: Cancel a scheduled post
 * DELETE /api/posts/:id
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const postId = parseInt(req.params.id);
    const result = await postingService.cancelScheduledPost(postId);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json(result);
  } catch (error: any) {
    console.error('Error cancelling post:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST: Retry a failed post
 * POST /api/posts/:id/retry
 */
router.post('/:id/retry', async (req: Request, res: Response) => {
  try {
    const postId = parseInt(req.params.id);
    const result = await postingService.retryFailedPost(postId);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json(result);
  } catch (error: any) {
    console.error('Error retrying post:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET: Debug - Check all scheduled posts (no filters)
 * GET /api/posts/debug/scheduled
 */
router.get('/debug/scheduled', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        p.id,
        p.client_id,
        p.content_id,
        p.platform,
        p.status,
        p.scheduled_time,
        p.created_at,
        c.title as content_title,
        cl.client_name
      FROM social_media_posts p
      JOIN social_media_content c ON p.content_id = c.id
      LEFT JOIN clients cl ON p.client_id = cl.id
      WHERE p.status = 'scheduled'
      ORDER BY p.scheduled_time ASC
      LIMIT 50
    `);

    console.log(`🔍 [DEBUG] Found ${result.rows.length} scheduled posts (no filters)`);
    
    res.json({
      success: true,
      count: result.rows.length,
      posts: result.rows
    });
  } catch (error: any) {
    console.error('❌ [DEBUG] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET: Posting statistics
 * GET /api/posts/stats
 */
router.get('/stats/overview', async (req: Request, res: Response) => {
  try {
    const clientId = req.session.role === 'super_admin' ? undefined : req.session.clientId;
    const result = await postingService.getPostingStats(clientId);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json(result);
  } catch (error: any) {
    console.error('Error getting posting stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

