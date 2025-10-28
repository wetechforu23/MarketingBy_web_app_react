import express, { Request, Response } from 'express';
import { BlogService } from '../services/blogService';

const router = express.Router();

// =====================================================
// Middleware to check authentication
// =====================================================
function requireAuth(req: Request, res: Response, next: Function) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// =====================================================
// Blog CRUD Endpoints
// =====================================================

/**
 * GET /api/blogs/:clientId
 * Get all blog posts for a client
 */
router.get('/:clientId', requireAuth, async (req: Request, res: Response) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const { status, limit, offset, search } = req.query;
    
    const result = await BlogService.getBlogPostsByClient(clientId, {
      status: status as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
      search: search as string
    });
    
    res.json({
      success: true,
      posts: result.posts,
      total: result.total
    });
  } catch (error: any) {
    console.error('❌ Error fetching blog posts:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/blogs/post/:postId
 * Get a single blog post by ID
 */
router.get('/post/:postId', requireAuth, async (req: Request, res: Response) => {
  try {
    const postId = parseInt(req.params.postId);
    const post = await BlogService.getBlogPost(postId);
    
    if (!post) {
      return res.status(404).json({ error: 'Blog post not found' });
    }
    
    res.json({ success: true, post });
  } catch (error: any) {
    console.error('❌ Error fetching blog post:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/blogs
 * Create a new blog post (manual entry)
 */
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { client_id, title, content, excerpt, featured_image_url, meta_title, meta_description, meta_keywords, categories, tags } = req.body;
    
    if (!client_id || !title || !content) {
      return res.status(400).json({ error: 'Missing required fields: client_id, title, content' });
    }
    
    const post = await BlogService.createBlogPost({
      client_id,
      title,
      content,
      excerpt,
      featured_image_url,
      meta_title,
      meta_description,
      meta_keywords,
      categories,
      tags,
      author_id: req.session.userId,
      author_name: req.session.userName || 'Admin',
      generated_by: 'manual',
      status: 'draft'
    });
    
    res.json({ success: true, post });
  } catch (error: any) {
    console.error('❌ Error creating blog post:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/blogs/:postId
 * Update a blog post
 */
router.put('/:postId', requireAuth, async (req: Request, res: Response) => {
  try {
    const postId = parseInt(req.params.postId);
    const updates = req.body;
    
    const post = await BlogService.updateBlogPost(postId, updates);
    
    res.json({ success: true, post });
  } catch (error: any) {
    console.error('❌ Error updating blog post:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/blogs/:postId
 * Delete a blog post
 */
router.delete('/:postId', requireAuth, async (req: Request, res: Response) => {
  try {
    const postId = parseInt(req.params.postId);
    await BlogService.deleteBlogPost(postId);
    
    res.json({ success: true, message: 'Blog post deleted' });
  } catch (error: any) {
    console.error('❌ Error deleting blog post:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// AI Generation Endpoint
// =====================================================

/**
 * POST /api/blogs/generate-ai
 * Generate blog post using AI
 */
router.post('/generate-ai', requireAuth, async (req: Request, res: Response) => {
  try {
    const { client_id, prompt, tone, target_word_count } = req.body;
    
    if (!client_id || !prompt) {
      return res.status(400).json({ error: 'Missing required fields: client_id, prompt' });
    }
    
    const post = await BlogService.generateBlogWithAI({
      client_id,
      prompt,
      tone,
      target_word_count,
      author_id: req.session.userId!,
      author_name: req.session.userName || 'Admin'
    });
    
    res.json({ success: true, post });
  } catch (error: any) {
    console.error('❌ Error generating blog with AI:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// Approval Workflow Endpoints
// =====================================================

/**
 * POST /api/blogs/:postId/send-approval
 * Send blog post for client approval
 */
router.post('/:postId/send-approval', requireAuth, async (req: Request, res: Response) => {
  try {
    const postId = parseInt(req.params.postId);
    const token = await BlogService.sendForApproval(postId, true);
    
    const approvalUrl = `${process.env.FRONTEND_URL}/blog/approve/${token}`;
    
    res.json({
      success: true,
      message: 'Blog sent for approval',
      approval_url: approvalUrl,
      token
    });
  } catch (error: any) {
    console.error('❌ Error sending blog for approval:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/blogs/approve/:token
 * Verify approval token and get blog post (for secure link approval)
 */
router.get('/approve/:token', async (req: Request, res: Response) => {
  try {
    const token = req.params.token;
    const post = await BlogService.verifyApprovalToken(token);
    
    if (!post) {
      return res.status(404).json({ error: 'Invalid or expired approval token' });
    }
    
    res.json({ success: true, post });
  } catch (error: any) {
    console.error('❌ Error verifying approval token:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/blogs/:postId/approve
 * Approve a blog post
 */
router.post('/:postId/approve', async (req: Request, res: Response) => {
  try {
    const postId = parseInt(req.params.postId);
    const { feedback, access_method, token } = req.body;
    
    // If using secure link, verify token first
    if (access_method === 'secure_link' && token) {
      const post = await BlogService.verifyApprovalToken(token);
      if (!post || post.id !== postId) {
        return res.status(400).json({ error: 'Invalid approval token' });
      }
    }
    
    await BlogService.approveBlogPost({
      post_id: postId,
      approved_by: req.session?.userId,
      approver_email: req.body.approver_email,
      approver_name: req.body.approver_name,
      feedback,
      access_method: access_method || 'portal_login',
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.json({ success: true, message: 'Blog post approved' });
  } catch (error: any) {
    console.error('❌ Error approving blog post:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/blogs/:postId/reject
 * Reject a blog post
 */
router.post('/:postId/reject', async (req: Request, res: Response) => {
  try {
    const postId = parseInt(req.params.postId);
    const { feedback, access_method, token } = req.body;
    
    if (!feedback) {
      return res.status(400).json({ error: 'Feedback is required when rejecting a blog post' });
    }
    
    // If using secure link, verify token first
    if (access_method === 'secure_link' && token) {
      const post = await BlogService.verifyApprovalToken(token);
      if (!post || post.id !== postId) {
        return res.status(400).json({ error: 'Invalid approval token' });
      }
    }
    
    await BlogService.rejectBlogPost({
      post_id: postId,
      approved_by: req.session?.userId,
      approver_email: req.body.approver_email,
      approver_name: req.body.approver_name,
      feedback,
      access_method: access_method || 'portal_login',
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.json({ success: true, message: 'Blog post rejected' });
  } catch (error: any) {
    console.error('❌ Error rejecting blog post:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// Publishing Endpoints
// =====================================================

/**
 * POST /api/blogs/:postId/publish
 * Publish blog post to WordPress
 */
router.post('/:postId/publish', requireAuth, async (req: Request, res: Response) => {
  try {
    const postId = parseInt(req.params.postId);
    const url = await BlogService.publishToWordPress(postId);
    
    res.json({
      success: true,
      message: 'Blog post published to WordPress',
      url
    });
  } catch (error: any) {
    console.error('❌ Error publishing blog post:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// Analytics Endpoints
// =====================================================

/**
 * POST /api/blogs/track/:postId/view
 * Track blog post view (public endpoint)
 */
router.post('/track/:postId/view', async (req: Request, res: Response) => {
  try {
    const postId = parseInt(req.params.postId);
    const analytics = {
      client_id: req.body.client_id,
      visitor_fingerprint: req.body.visitor_fingerprint,
      session_id: req.body.session_id,
      ip_address: req.ip,
      country: req.body.country,
      city: req.body.city,
      page_url: req.body.page_url,
      referrer_url: req.body.referrer_url || req.headers.referer,
      utm_source: req.body.utm_source,
      utm_medium: req.body.utm_medium,
      utm_campaign: req.body.utm_campaign,
      utm_term: req.body.utm_term,
      utm_content: req.body.utm_content,
      device_type: req.body.device_type,
      browser: req.body.browser,
      os: req.body.os
    };
    
    await BlogService.trackView(postId, analytics);
    
    res.json({ success: true });
  } catch (error: any) {
    console.error('❌ Error tracking blog view:', error);
    res.status(200).json({ success: false }); // Don't fail the page load
  }
});

/**
 * POST /api/blogs/track/:postId/time
 * Update time spent on blog post
 */
router.post('/track/:postId/time', async (req: Request, res: Response) => {
  try {
    const postId = parseInt(req.params.postId);
    const { session_id, time_on_page, scroll_depth } = req.body;
    
    // Update the analytics record
    await BlogService.updateAnalytics(postId, session_id, {
      time_on_page,
      scroll_depth
    });
    
    res.json({ success: true });
  } catch (error: any) {
    console.error('❌ Error updating blog time tracking:', error);
    res.status(200).json({ success: false });
  }
});

/**
 * GET /api/blogs/:postId/analytics
 * Get analytics for a blog post
 */
router.get('/:postId/analytics', requireAuth, async (req: Request, res: Response) => {
  try {
    const postId = parseInt(req.params.postId);
    const analytics = await BlogService.getAnalytics(postId);
    
    res.json({ success: true, analytics });
  } catch (error: any) {
    console.error('❌ Error fetching blog analytics:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// Category Management Endpoints
// =====================================================

/**
 * GET /api/blogs/categories/:clientId
 * Get all categories for a client
 */
router.get('/categories/:clientId', requireAuth, async (req: Request, res: Response) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const categories = await BlogService.getCategories(clientId);
    
    res.json({ success: true, categories });
  } catch (error: any) {
    console.error('❌ Error fetching categories:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/blogs/categories
 * Create a new category
 */
router.post('/categories', requireAuth, async (req: Request, res: Response) => {
  try {
    const { client_id, name, description, parent_id } = req.body;
    
    if (!client_id || !name) {
      return res.status(400).json({ error: 'Missing required fields: client_id, name' });
    }
    
    const category = await BlogService.createCategory({
      client_id,
      name,
      description,
      parent_id
    });
    
    res.json({ success: true, category });
  } catch (error: any) {
    console.error('❌ Error creating category:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

