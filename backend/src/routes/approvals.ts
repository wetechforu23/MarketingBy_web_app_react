import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import * as approvalService from '../services/approvalWorkflowService';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// ============================================================================
// APPROVAL QUEUE ROUTES
// ============================================================================

/**
 * GET: Pending approvals (role-filtered)
 * GET /api/approvals/pending
 */
router.get('/pending', async (req: Request, res: Response) => {
  try {
    const result = await approvalService.getPendingApprovals(req);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json(result);
  } catch (error: any) {
    console.error('Error getting pending approvals:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET: Approval statistics
 * GET /api/approvals/stats
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const result = await approvalService.getApprovalStats(req);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json(result);
  } catch (error: any) {
    console.error('Error getting approval stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

