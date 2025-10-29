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
        cl.business_name as client_name,
        u.name as created_by_name
      FROM social_media_posts p
      JOIN social_media_content c ON p.content_id = c.id
      LEFT JOIN clients cl ON p.client_id = cl.id
      LEFT JOIN users u ON p.created_by = u.id
      WHERE ${whereClause}
      ORDER BY 
        CASE 
          WHEN p.status = 'scheduled' THEN p.scheduled_time
          WHEN p.status = 'posted' THEN p.posted_at
          ELSE p.created_at
        END DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const result = await pool.query(query, [...params, limit, offset]);

    res.json({
      success: true,
      posts: result.rows,
      limit,
      offset
    });
  } catch (error: any) {
    console.error('Error listing posts:', error);
    res.status(500).json({ error: 'Internal server error' });
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

