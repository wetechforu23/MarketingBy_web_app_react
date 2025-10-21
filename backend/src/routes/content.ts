import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import * as contentService from '../services/contentManagementService';
import * as approvalService from '../services/approvalWorkflowService';
import * as validationService from '../services/platformValidationService';
import * as postingService from '../services/socialMediaPostingService';

const router = Router();

// All routes require authentication
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
    const { clientId, title, contentType, contentText, mediaUrls, hashtags, mentions, targetPlatforms } = req.body;
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
      status: req.query.status as string,
      platform: req.query.platform as string,
      createdBy: req.query.createdBy ? parseInt(req.query.createdBy as string) : undefined,
      search: req.query.search as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0
    };

    const result = await contentService.listContent(req, filters);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

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
 * APPROVE: Client approval
 * POST /api/content/:id/approve-client
 */
router.post('/:id/approve-client', async (req: Request, res: Response) => {
  try {
    const contentId = parseInt(req.params.id);
    const userId = req.session.userId!;
    const { notes } = req.body;

    // Check permission
    if (!approvalService.canUserApprove(req.session.role, 'client')) {
      return res.status(403).json({ error: 'You do not have permission to approve content' });
    }

    const result = await approvalService.approveClient({
      contentId,
      approvedBy: userId,
      notes
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json(result);
  } catch (error: any) {
    console.error('Error approving content (client):', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * REJECT: Client rejection
 * POST /api/content/:id/reject-client
 */
router.post('/:id/reject-client', async (req: Request, res: Response) => {
  try {
    const contentId = parseInt(req.params.id);
    const userId = req.session.userId!;
    const { notes, requestedChanges } = req.body;

    // Check permission
    if (!approvalService.canUserApprove(req.session.role, 'client')) {
      return res.status(403).json({ error: 'You do not have permission to reject content' });
    }

    const result = await approvalService.rejectClient({
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
    console.error('Error rejecting content (client):', error);
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

    // Get content
    const contentResult = await contentService.getContentById(contentId, req);
    if (!contentResult.success) {
      return res.status(404).json({ error: 'Content not found' });
    }

    const content = contentResult.content;

    // Check if approved
    if (content.status !== 'approved') {
      return res.status(400).json({ error: 'Content must be approved before scheduling' });
    }

    // Schedule for each platform
    const results = [];
    const platformList = platforms || content.target_platforms;

    for (const platform of platformList) {
      const result = await postingService.schedulePost({
        contentId,
        clientId: content.client_id,
        platform,
        message: content.content_text,
        mediaUrls: content.media_urls,
        scheduledTime: scheduledTime ? new Date(scheduledTime) : undefined
      });

      results.push({ platform, ...result });
    }

    res.json({ success: true, results });
  } catch (error: any) {
    console.error('Error scheduling posts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST NOW: Immediately post content
 * POST /api/content/:id/post-now
 */
router.post('/:id/post-now', async (req: Request, res: Response) => {
  try {
    const contentId = parseInt(req.params.id);
    const { platforms } = req.body;

    // Get content
    const contentResult = await contentService.getContentById(contentId, req);
    if (!contentResult.success) {
      return res.status(404).json({ error: 'Content not found' });
    }

    const content = contentResult.content;

    // Check if approved
    if (content.status !== 'approved') {
      return res.status(400).json({ error: 'Content must be approved before posting' });
    }

    // Post immediately (no scheduled time)
    const results = [];
    const platformList = platforms || content.target_platforms;

    for (const platform of platformList) {
      const result = await postingService.schedulePost({
        contentId,
        clientId: content.client_id,
        platform,
        message: content.content_text,
        mediaUrls: content.media_urls
      });

      results.push({ platform, ...result });
    }

    res.json({ success: true, results });
  } catch (error: any) {
    console.error('Error posting content:', error);
    res.status(500).json({ error: 'Internal server error' });
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

