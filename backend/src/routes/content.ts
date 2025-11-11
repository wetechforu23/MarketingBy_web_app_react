import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import pool from '../config/database';
import * as contentService from '../services/contentManagementService';
import * as approvalService from '../services/approvalWorkflowService';
import * as validationService from '../services/platformValidationService';
import * as postingService from '../services/socialMediaPostingService';

const router = Router();

// Public routes (no authentication required)
/**
 * GET /api/content/approve/:token
 * Verify approval token and get content (for secure link approval)
 */
router.get('/approve/:token', async (req: Request, res: Response) => {
  try {
    const token = req.params.token;
    const content = await approvalService.verifyApprovalToken(token);

    if (!content) {
      return res.status(404).json({ error: 'Invalid or expired approval token' });
    }

    res.json({ success: true, content });
  } catch (error: any) {
    console.error('❌ Error verifying approval token:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/content/:id/approve-client
 * Approve content (supports both secure link AND portal approval)
 */
router.post('/:id/approve-client', async (req: Request, res: Response) => {
  try {
    const contentId = parseInt(req.params.id);
    const { notes, token, approver_name, approver_email, access_method } = req.body;
    const userId = req.session?.userId;

    // If using secure link, verify token first (no auth required)
    if (access_method === 'secure_link' && token) {
      const verifiedContent = await approvalService.verifyApprovalToken(token);
      if (!verifiedContent || verifiedContent.id !== contentId) {
        return res.status(400).json({ error: 'Invalid approval token' });
      }

      // Try to find user by email for secure link approvals
      let approverUserId = null;
      if (approver_email) {
        try {
          const userResult = await pool.query(
            'SELECT id FROM users WHERE email = $1 LIMIT 1',
            [approver_email]
          );
          if (userResult.rows.length > 0) {
            approverUserId = userResult.rows[0].id;
          }
        } catch (error) {
          console.warn('Could not find user by email for secure link approval:', approver_email);
        }
      }

      // If user not found by email, get client admin user ID from content's client_id
      if (!approverUserId && verifiedContent.client_id) {
        try {
          const clientAdminResult = await pool.query(
            `SELECT id FROM users 
             WHERE client_id = $1 
             AND role = 'client_admin' 
             AND is_active = true 
             ORDER BY id DESC 
             LIMIT 1`,
            [verifiedContent.client_id]
          );
          if (clientAdminResult.rows.length > 0) {
            approverUserId = clientAdminResult.rows[0].id;
            console.log('📋 Using client admin user ID for secure link approval:', approverUserId);
          }
        } catch (error) {
          console.warn('Could not find client admin user for secure link approval:', error);
        }
      }

      // If still no user found, this is an error - we need a user ID
      if (!approverUserId) {
        return res.status(400).json({ 
          error: 'Unable to determine approver. Please ensure you are using the correct email address.' 
        });
      }

      const result = await approvalService.approveClient({
        contentId,
        approvedBy: approverUserId,
        notes,
        approverName: approver_name,
        approverEmail: approver_email,
        accessMethod: 'secure_link'
      });

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      return res.json(result);
    } else {
      // Portal approval - require authentication
      // Check if session exists and user is authenticated
      if (!req.session || !userId) {
        console.error('❌ Portal approval failed - no session or userId:', {
          hasSession: !!req.session,
          userId: userId,
          sessionId: req.session?.id,
          role: req.session?.role
        });
        return res.status(401).json({ error: 'Authentication required for portal approvals. Please log in and try again.' });
      }
      
      if (!approvalService.canUserApprove(req.session.role, 'client')) {
        return res.status(403).json({ error: 'You do not have permission to approve content' });
      }

      const result = await approvalService.approveClient({
        contentId,
        approvedBy: userId,
        notes,
        approverName: approver_name,
        approverEmail: approver_email,
        accessMethod: 'portal_login'
      });

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      return res.json(result);
    }
  } catch (error: any) {
    console.error('Error approving content (client):', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/content/:id/reject-client
 * Reject content (supports both secure link AND portal rejection)
 */
router.post('/:id/reject-client', async (req: Request, res: Response) => {
  try {
    const contentId = parseInt(req.params.id);
    const { notes, requestedChanges, token, approver_name, approver_email, access_method } = req.body;
    const userId = req.session?.userId;

    // Notes/feedback is optional for rejection

    // If using secure link, verify token first (no auth required)
    if (access_method === 'secure_link' && token) {
      const verifiedContent = await approvalService.verifyApprovalToken(token);
      if (!verifiedContent || verifiedContent.id !== contentId) {
        return res.status(400).json({ error: 'Invalid approval token' });
      }

      // Try to find user by email for secure link approvals
      let approverUserId = null;
      if (approver_email) {
        try {
          const userResult = await pool.query(
            'SELECT id FROM users WHERE email = $1 LIMIT 1',
            [approver_email]
          );
          if (userResult.rows.length > 0) {
            approverUserId = userResult.rows[0].id;
          }
        } catch (error) {
          console.warn('Could not find user by email for secure link rejection:', approver_email);
        }
      }

      // If user not found by email, get client admin user ID from content's client_id
      if (!approverUserId && verifiedContent.client_id) {
        try {
          const clientAdminResult = await pool.query(
            `SELECT id FROM users 
             WHERE client_id = $1 
             AND role = 'client_admin' 
             AND is_active = true 
             ORDER BY id DESC 
             LIMIT 1`,
            [verifiedContent.client_id]
          );
          if (clientAdminResult.rows.length > 0) {
            approverUserId = clientAdminResult.rows[0].id;
            console.log('📋 Using client admin user ID for secure link rejection:', approverUserId);
          }
        } catch (error) {
          console.warn('Could not find client admin user for secure link rejection:', error);
        }
      }

      // If still no user found, this is an error - we need a user ID
      if (!approverUserId) {
        return res.status(400).json({ 
          error: 'Unable to determine approver. Please ensure you are using the correct email address.' 
        });
      }

      const result = await approvalService.rejectClient({
        contentId,
        approvedBy: approverUserId,
        notes,
        requestedChanges,
        approverName: approver_name,
        approverEmail: approver_email,
        accessMethod: 'secure_link'
      });

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      return res.json(result);
    } else {
      // Portal rejection - require authentication
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required for portal rejections' });
      }
      
      if (!approvalService.canUserApprove(req.session.role, 'client')) {
        return res.status(403).json({ error: 'You do not have permission to reject content' });
      }

      const result = await approvalService.rejectClient({
        contentId,
        approvedBy: userId,
        notes,
        requestedChanges,
        approverName: approver_name,
        approverEmail: approver_email,
        accessMethod: 'portal_login'
      });

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      return res.json(result);
    }
  } catch (error: any) {
    console.error('Error rejecting content (client):', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// All other routes require authentication
router.use(requireAuth);

// ============================================================================
// CONTENT MANAGEMENT ROUTES
// ============================================================================

/**
 * CREATE: New content
 * POST /api/content
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { clientId, title, contentType, contentText, destinationUrl, mediaUrls, hashtags, mentions, targetPlatforms } = req.body;
    const userId = req.session.userId!;

    // Validate required fields
    if (!clientId || !title || !contentType) {
      return res.status(400).json({ error: 'Missing required fields: clientId, title, contentType' });
    }

    // Check client access
    const role = req.session.role;
    if (role !== 'super_admin' && !role?.startsWith('wtfu_')) {
      if (req.session.clientId !== clientId) {
        return res.status(403).json({ error: 'Access denied to this client' });
      }
    }

    const result = await contentService.createContent({
      clientId,
      title,
      contentType,
      contentText,
      destinationUrl,
      mediaUrls,
      hashtags,
      mentions,
      targetPlatforms,
      createdBy: userId
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.status(201).json(result);
  } catch (error: any) {
    console.error('Error creating content:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * LIST: Get all content (filtered)
 * GET /api/content
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const filters = {
      clientId: req.query.client_id ? parseInt(req.query.client_id as string) : undefined,
      status: req.query.status as string,
      platform: req.query.platform as string,
      createdBy: req.query.createdBy ? parseInt(req.query.createdBy as string) : undefined,
      search: req.query.search as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0
    };

    console.log('📋 Content filters:', filters);
    console.log('👤 User session:', {
      userId: req.session.userId,
      role: req.session.role,
      clientId: req.session.clientId
    });
    
    const result = await contentService.listContent(req, filters);

    if (!result.success) {
      console.error('❌ Content listing failed:', result.error);
      console.error('❌ Filters:', filters);
      console.error('❌ Session:', {
        userId: req.session.userId,
        role: req.session.role,
        clientId: req.session.clientId
      });
      return res.status(400).json({ error: result.error || 'Failed to fetch content' });
    }

    console.log('✅ Content listing success:', {
      contentCount: result.content?.length || 0,
      total: result.total,
      hasMore: result.hasMore
    });

    res.json(result);
  } catch (error: any) {
    console.error('Error listing content:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET: Single content by ID
 * GET /api/content/:id
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const contentId = parseInt(req.params.id);
    const result = await contentService.getContentById(contentId, req);

    if (!result.success) {
      return res.status(404).json({ error: result.error });
    }

    res.json(result);
  } catch (error: any) {
    console.error('Error getting content:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * UPDATE: Content
 * PUT /api/content/:id
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const contentId = parseInt(req.params.id);
    const updates = req.body;

    const result = await contentService.updateContent(contentId, updates, req);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json(result);
  } catch (error: any) {
    console.error('Error updating content:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE: Content
 * DELETE /api/content/:id
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const contentId = parseInt(req.params.id);
    const result = await contentService.deleteContent(contentId, req);

    if (!result.success) {
      const errorMessage = 'error' in result ? result.error : 'message' in result ? result.message : 'Failed to delete content';
      return res.status(400).json({ error: errorMessage });
    }

    res.json(result);
  } catch (error: any) {
    console.error('Error deleting content:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DUPLICATE: Content
 * POST /api/content/:id/duplicate
 */
router.post('/:id/duplicate', async (req: Request, res: Response) => {
  try {
    const contentId = parseInt(req.params.id);
    const result = await contentService.duplicateContent(contentId, req);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.status(201).json(result);
  } catch (error: any) {
    console.error('Error duplicating content:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// VALIDATION ROUTES
// ============================================================================

/**
 * VALIDATE: Content for platforms
 * POST /api/content/:id/validate
 */
router.post('/:id/validate', async (req: Request, res: Response) => {
  try {
    const contentId = parseInt(req.params.id);
    const result = await contentService.getContentById(contentId, req);

    if (!result.success) {
      return res.status(404).json({ error: 'Content not found' });
    }

    const content = result.content;
    const platforms = content.target_platforms || [];

    const validation = await validationService.getValidationSummary(platforms, {
      contentText: content.content_text,
      mediaUrls: content.media_urls,
      hashtags: content.hashtags,
      mentions: content.mentions,
      contentType: content.content_type
    });

    res.json(validation);
  } catch (error: any) {
    console.error('Error validating content:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// APPROVAL WORKFLOW ROUTES
// ============================================================================

/**
 * SUBMIT: For approval
 * POST /api/content/:id/submit-approval
 */
router.post('/:id/submit-approval', async (req: Request, res: Response) => {
  try {
    const contentId = parseInt(req.params.id);
    const userId = req.session.userId!;

    const result = await approvalService.submitForWTFUApproval(contentId, userId);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json(result);
  } catch (error: any) {
    console.error('Error submitting for approval:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * APPROVE: WeTechForU approval
 * POST /api/content/:id/approve-wtfu
 */
router.post('/:id/approve-wtfu', async (req: Request, res: Response) => {
  try {
    const contentId = parseInt(req.params.id);
    const userId = req.session.userId!;
    const { notes } = req.body;

    // Check permission
    if (!approvalService.canUserApprove(req.session.role, 'wtfu')) {
      return res.status(403).json({ error: 'You do not have permission to approve content' });
    }

    const result = await approvalService.approveWTFU({
      contentId,
      approvedBy: userId,
      notes
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json(result);
  } catch (error: any) {
    console.error('Error approving content (WTFU):', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * REJECT: WeTechForU rejection
 * POST /api/content/:id/reject-wtfu
 */
router.post('/:id/reject-wtfu', async (req: Request, res: Response) => {
  try {
    const contentId = parseInt(req.params.id);
    const userId = req.session.userId!;
    const { notes, requestedChanges } = req.body;

    // Check permission
    if (!approvalService.canUserApprove(req.session.role, 'wtfu')) {
      return res.status(403).json({ error: 'You do not have permission to reject content' });
    }

    const result = await approvalService.rejectWTFU({
      contentId,
      approvedBy: userId,
      notes,
      requestedChanges
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json(result);
  } catch (error: any) {
    console.error('Error rejecting content (WTFU):', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/content/:id/approval-link
 * Get approval link for existing content (if token exists)
 */
router.get('/:id/approval-link', requireAuth, async (req: Request, res: Response) => {
  try {
    const contentId = parseInt(req.params.id);
    
    // Check if content has approval token
    const result = await pool.query(
      `SELECT approval_token, approval_token_expires_at, status
       FROM social_media_content
       WHERE id = $1`,
      [contentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Content not found' });
    }

    const content = result.rows[0];

    if (!content.approval_token) {
      return res.json({
        success: false,
        message: 'No approval token found. Content may need to be sent for approval first.'
      });
    }

    // Check if token is expired
    if (content.approval_token_expires_at && new Date(content.approval_token_expires_at) < new Date()) {
      return res.json({
        success: false,
        message: 'Approval token has expired'
      });
    }

    const approvalUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/content/approve/${content.approval_token}`;

    res.json({
      success: true,
      approval_url: approvalUrl,
      token: content.approval_token,
      expires_at: content.approval_token_expires_at
    });
  } catch (error: any) {
    console.error('❌ Error getting approval link:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/content/:id/send-approval-link
 * Send content for approval with secure link (email method)
 */
router.post('/:id/send-approval-link', requireAuth, async (req: Request, res: Response) => {
  try {
    const contentId = parseInt(req.params.id);
    const { sendEmail } = req.body;

    const result = await approvalService.sendForApprovalWithLink(
      contentId, 
      sendEmail !== false // Default to true
    );

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({
      success: true,
      message: 'Content sent for approval via secure link',
      approval_url: result.approvalUrl,
      token: result.token
    });
  } catch (error: any) {
    console.error('❌ Error sending approval link:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


/**
 * REQUEST CHANGES: Either WTFU or client
 * POST /api/content/:id/request-changes
 */
router.post('/:id/request-changes', async (req: Request, res: Response) => {
  try {
    const contentId = parseInt(req.params.id);
    const userId = req.session.userId!;
    const { notes, requestedChanges } = req.body;

    const result = await approvalService.requestChanges({
      contentId,
      approvedBy: userId,
      notes,
      requestedChanges
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json(result);
  } catch (error: any) {
    console.error('Error requesting changes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET: Approval history
 * GET /api/content/:id/approval-history
 */
router.get('/:id/approval-history', async (req: Request, res: Response) => {
  try {
    const contentId = parseInt(req.params.id);
    const result = await approvalService.getApprovalHistory(contentId);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json(result);
  } catch (error: any) {
    console.error('Error getting approval history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// SCHEDULING & POSTING ROUTES
// ============================================================================

/**
 * SCHEDULE: Post(s) for content
 * POST /api/content/:id/schedule
 */
router.post('/:id/schedule', async (req: Request, res: Response) => {
  try {
    const contentId = parseInt(req.params.id);
    const { platforms, scheduledTime } = req.body;

    console.log(`📅 Scheduling post for content ${contentId}`, { platforms, scheduledTime });

    // Get content
    const contentResult = await contentService.getContentById(contentId, req);
    if (!contentResult.success) {
      console.error(`❌ Content ${contentId} not found`);
      return res.status(404).json({ error: 'Content not found' });
    }

    const content = contentResult.content;
    console.log(`✅ Content found: ${content.title}, status: ${content.status}`);

    // Check if approved
    if (content.status !== 'approved') {
      console.error(`❌ Content ${contentId} is not approved. Status: ${content.status}`);
      return res.status(400).json({ error: 'Content must be approved before scheduling' });
    }

    // Schedule for each platform
    const results = [];
    const platformList = platforms || content.target_platforms;

    console.log(`📱 Scheduling for platforms:`, platformList);

    for (const platform of platformList) {
      try {
        const result = await postingService.schedulePost({
          contentId,
          clientId: content.client_id,
          platform,
          message: content.content_text,
          mediaUrls: content.media_urls,
          scheduledTime: scheduledTime ? new Date(scheduledTime) : undefined
        });

        console.log(`✅ Scheduled ${platform}:`, result);
        if (result.success && result.post) {
          console.log(`   📝 Post ID: ${result.post.id}, Status: ${result.post.status}, Scheduled Time: ${result.post.scheduled_time}`);
        }
        results.push({ platform, ...result });
      } catch (platformError: any) {
        console.error(`❌ Error scheduling for ${platform}:`, platformError);
        results.push({ 
          platform, 
          success: false, 
          error: platformError.message 
        });
      }
    }

    console.log(`✅ Scheduling complete. Results:`, results);
    res.json({ success: true, results });
  } catch (error: any) {
    console.error('❌ Error scheduling posts:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * POST NOW: Immediately post content
 * POST /api/content/:id/post-now
 * Workflow: Only super admin/WeTechForU users can post to social media after client approval
 */
router.post('/:id/post-now', async (req: Request, res: Response) => {
  try {
    const contentId = parseInt(req.params.id);
    const { platforms } = req.body;
    const role = req.session.role;
    const userId = req.session.userId!;

    // Get content first to check permissions
    const contentResult = await contentService.getContentById(contentId, req);
    if (!contentResult.success) {
      return res.status(404).json({ error: 'Content not found' });
    }

    const content = contentResult.content;

    // Permission check: 
    // 1. Super Admin/WeTechForU users can always post
    // 2. Clients can post content they created (created_by = userId)
    const isAdminUser = role === 'super_admin' || role?.startsWith('wtfu_');
    const isContentCreator = content.created_by === userId;
    
    if (!isAdminUser && !isContentCreator) {
      return res.status(403).json({ 
        error: 'Only WeTechForU team members or the content creator can post to social media' 
      });
    }

    // For admin users: content must be approved
    // For content creators: can post even if draft (they own it)
    if (isAdminUser && content.status !== 'approved') {
      return res.status(400).json({ error: 'Content must be approved before posting' });
    }
    
    // If client created content, allow posting even from draft status
    // (optional: you can still require approval if needed)
    if (isContentCreator && content.status === 'draft') {
      // Option 1: Allow direct posting (client owns it)
      // Option 2: Require approval first - uncomment below if needed
      // return res.status(400).json({ error: 'Content must be approved before posting' });
    }

    // Post immediately (no scheduled time)
    const results = [];
    const platformList = platforms || content.target_platforms;

    if (!platformList || platformList.length === 0) {
      return res.status(400).json({ error: 'No platforms selected. Please select at least one platform to post to.' });
    }

    console.log(`🚀 Posting content ${contentId} to platforms:`, platformList);

    for (const platform of platformList) {
      try {
        console.log(`📤 Posting to ${platform}...`);
        const result = await postingService.schedulePost({
          contentId,
          clientId: content.client_id,
          platform,
          message: content.content_text,
          mediaUrls: content.media_urls,
          skipApprovalCheck: isContentCreator && content.status === 'draft' // Allow content creators to post from draft
        });

        if (result.success) {
          console.log(`✅ Successfully posted to ${platform}`);
        } else {
          console.error(`❌ Failed to post to ${platform}:`, result.error);
        }

        results.push({ platform, ...result });
      } catch (platformError: any) {
        console.error(`❌ Error posting to ${platform}:`, platformError);
        results.push({ 
          platform, 
          success: false, 
          error: platformError.message || 'Unknown error' 
        });
      }
    }

    // Check if any posts succeeded
    const hasSuccess = results.some(r => r.success);
    const hasFailure = results.some(r => !r.success);

    if (hasFailure && !hasSuccess) {
      // All failed
      return res.status(500).json({ 
        success: false,
        error: 'Failed to post to all platforms',
        results 
      });
    }

    res.json({ 
      success: true, 
      results,
      message: hasFailure 
        ? `Posted to some platforms. Check results for details.`
        : `Successfully posted to all ${results.length} platform(s).`
    });
  } catch (error: any) {
    console.error('❌ Error posting content:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// ============================================================================
// DEBUG & TESTING ENDPOINTS
// ============================================================================

/**
 * DEBUG: Test file detection and uploads directory
 * GET /api/content/debug/uploads
 */
router.get('/debug/uploads', requireAuth, async (req: Request, res: Response) => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    // Get uploads directory path
    const uploadsDir = path.join(__dirname, '../../uploads');
    const uploadsDirFromService = path.join(__dirname, '../../uploads');
    
    const debugInfo: any = {
      uploadsDirectory: uploadsDir,
      directoryExists: fs.existsSync(uploadsDir),
      files: [],
      fileCount: 0,
      testImageUrl: '/uploads/test-image.png',
      resolvedPath: null,
      pathExists: false
    };
    
    // List files in uploads directory
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      debugInfo.files = files.slice(0, 10); // First 10 files
      debugInfo.fileCount = files.length;
      
      // Test with a sample file if available
      if (files.length > 0) {
        const testFile = files[0];
        debugInfo.testImageUrl = `/uploads/${testFile}`;
        const testPath = path.join(uploadsDir, testFile);
        debugInfo.resolvedPath = testPath;
        debugInfo.pathExists = fs.existsSync(testPath);
        debugInfo.testFileSize = fs.statSync(testPath).size;
      }
    }
    
    // Test file path resolution (simulate what Facebook service does)
    const testUrls = [
      '/uploads/test.png',
      'uploads/test.png',
      'http://localhost:3001/uploads/test.png'
    ];
    
    debugInfo.pathResolutionTests = testUrls.map((url: string) => {
      let filename: string | null = null;
      if (url.startsWith('/uploads/')) {
        filename = url.substring('/uploads/'.length);
      } else if (url.startsWith('uploads/')) {
        filename = url.substring('uploads/'.length);
      } else if (url.includes('localhost') || url.includes('127.0.0.1')) {
        const urlPath = url.includes('/uploads/') 
          ? url.substring(url.indexOf('/uploads/'))
          : null;
        if (urlPath) {
          filename = urlPath.substring('/uploads/'.length);
        }
      }
      
      const filePath = filename ? path.join(uploadsDir, filename) : null;
      return {
        inputUrl: url,
        extractedFilename: filename,
        resolvedPath: filePath,
        exists: filePath ? fs.existsSync(filePath) : false
      };
    });
    
    res.json({
      success: true,
      debug: debugInfo,
      message: 'Uploads directory debug information'
    });
  } catch (error: any) {
    console.error('Error in uploads debug:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * DEBUG: Test Facebook posting with file detection
 * POST /api/content/debug/test-posting
 */
router.post('/debug/test-posting', requireAuth, async (req: Request, res: Response) => {
  try {
    const { imageUrl, clientId } = req.body;
    
    if (!imageUrl) {
      return res.status(400).json({ error: 'imageUrl is required' });
    }
    
    if (!clientId) {
      return res.status(400).json({ error: 'clientId is required' });
    }
    
    const FacebookService = require('../services/facebookService').default;
    const pool = require('../config/database').default;
    const facebookService = new FacebookService(pool);
    
    // Test file detection
    const fs = require('fs');
    const path = require('path');
    const uploadsDir = path.join(__dirname, '../../uploads');
    
    let filename: string | null = null;
    if (imageUrl.startsWith('/uploads/')) {
      filename = imageUrl.substring('/uploads/'.length);
    } else if (imageUrl.startsWith('uploads/')) {
      filename = imageUrl.substring('uploads/'.length);
    } else if (imageUrl.includes('localhost') || imageUrl.includes('127.0.0.1')) {
      const urlPath = imageUrl.includes('/uploads/') 
        ? imageUrl.substring(imageUrl.indexOf('/uploads/'))
        : null;
      if (urlPath) {
        filename = urlPath.substring('/uploads/'.length);
      }
    }
    
    const filePath = filename ? path.join(uploadsDir, filename) : null;
    const fileExists = filePath ? fs.existsSync(filePath) : false;
    
    const debugInfo: any = {
      inputUrl: imageUrl,
      extractedFilename: filename,
      resolvedPath: filePath,
      fileExists: fileExists,
      uploadsDirectory: uploadsDir,
      directoryExists: fs.existsSync(uploadsDir),
      willUseLocalUpload: fileExists,
      willUseUrlMethod: !fileExists
    };
    
    // If file exists, show file stats
    if (fileExists && filePath) {
      const stats = fs.statSync(filePath);
      debugInfo.fileStats = {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        isFile: stats.isFile()
      };
    }
    
    res.json({
      success: true,
      debug: debugInfo,
      message: 'Posting test completed (no actual post made)'
    });
  } catch (error: any) {
    console.error('Error in posting test:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * GET: Content statistics
 * GET /api/content/stats
 */
router.get('/stats/overview', async (req: Request, res: Response) => {
  try {
    const result = await contentService.getContentStats(req);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json(result);
  } catch (error: any) {
    console.error('Error getting content stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

