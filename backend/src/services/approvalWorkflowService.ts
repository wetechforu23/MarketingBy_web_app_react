import pool from '../config/database';
import { updateContentStatus } from './contentManagementService';
import { Request } from 'express';

/**
 * Approval Workflow Service
 * Manages the two-stage approval process:
 * 1. WeTechForU team approval
 * 2. Client approval
 */

export interface ApprovalAction {
  contentId: number;
  approvedBy: number;
  notes?: string;
  requestedChanges?: any;
}

/**
 * Submit content for WeTechForU approval
 */
export async function submitForWTFUApproval(contentId: number, submittedBy: number) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Get content details
    const contentResult = await client.query(
      'SELECT * FROM social_media_content WHERE id = $1',
      [contentId]
    );

    if (contentResult.rows.length === 0) {
      throw new Error('Content not found');
    }

    const content = contentResult.rows[0];

    // Check if content is in draft status
    if (content.status !== 'draft' && content.status !== 'rejected') {
      throw new Error(`Cannot submit content with status: ${content.status}`);
    }

    // Update content status
    await client.query(
      'UPDATE social_media_content SET status = $1, updated_at = NOW() WHERE id = $2',
      ['pending_wtfu_approval', contentId]
    );

    // Log the submission in approval history
    await client.query(
      `INSERT INTO content_approval_history (
        content_id, 
        approval_type, 
        approved_by, 
        approval_status,
        previous_status,
        new_status,
        notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        contentId,
        'wtfu_submission',
        submittedBy,
        'submitted',
        content.status,
        'pending_wtfu_approval',
        'Submitted for WeTechForU approval'
      ]
    );

    await client.query('COMMIT');

    // TODO: Send notification to WeTechForU team
    // await sendNotificationToWTFUTeam(contentId);

    return {
      success: true,
      message: 'Content submitted for WeTechForU approval',
      content: { ...content, status: 'pending_wtfu_approval' }
    };
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error submitting for WTFU approval:', error);
    return { success: false, error: error.message };
  } finally {
    client.release();
  }
}

/**
 * WeTechForU approves content
 */
export async function approveWTFU(action: ApprovalAction) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Get content details
    const contentResult = await client.query(
      'SELECT * FROM social_media_content WHERE id = $1',
      [action.contentId]
    );

    if (contentResult.rows.length === 0) {
      throw new Error('Content not found');
    }

    const content = contentResult.rows[0];

    // Check if content is pending WTFU approval
    if (content.status !== 'pending_wtfu_approval') {
      throw new Error(`Cannot approve content with status: ${content.status}`);
    }

    // Update content status to pending client approval
    await client.query(
      'UPDATE social_media_content SET status = $1, updated_at = NOW() WHERE id = $2',
      ['pending_client_approval', action.contentId]
    );

    // Log the approval in history
    await client.query(
      `INSERT INTO content_approval_history (
        content_id,
        approval_type,
        approved_by,
        approval_status,
        previous_status,
        new_status,
        notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        action.contentId,
        'wtfu_approval',
        action.approvedBy,
        'approved',
        'pending_wtfu_approval',
        'pending_client_approval',
        action.notes || 'Approved by WeTechForU team'
      ]
    );

    await client.query('COMMIT');

    // TODO: Send notification to client admin
    // await sendNotificationToClient(content.client_id, action.contentId);

    return {
      success: true,
      message: 'Content approved by WeTechForU. Sent to client for approval.',
      content: { ...content, status: 'pending_client_approval' }
    };
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error in WTFU approval:', error);
    return { success: false, error: error.message };
  } finally {
    client.release();
  }
}

/**
 * WeTechForU rejects content
 */
export async function rejectWTFU(action: ApprovalAction) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Get content details
    const contentResult = await client.query(
      'SELECT * FROM social_media_content WHERE id = $1',
      [action.contentId]
    );

    if (contentResult.rows.length === 0) {
      throw new Error('Content not found');
    }

    const content = contentResult.rows[0];

    // Check if content is pending WTFU approval
    if (content.status !== 'pending_wtfu_approval') {
      throw new Error(`Cannot reject content with status: ${content.status}`);
    }

    // Update content status to rejected
    await client.query(
      'UPDATE social_media_content SET status = $1, updated_at = NOW() WHERE id = $2',
      ['rejected', action.contentId]
    );

    // Log the rejection in history
    await client.query(
      `INSERT INTO content_approval_history (
        content_id,
        approval_type,
        approved_by,
        approval_status,
        previous_status,
        new_status,
        notes,
        requested_changes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        action.contentId,
        'wtfu_rejection',
        action.approvedBy,
        'rejected',
        'pending_wtfu_approval',
        'rejected',
        action.notes || 'Rejected by WeTechForU team',
        action.requestedChanges ? JSON.stringify(action.requestedChanges) : null
      ]
    );

    await client.query('COMMIT');

    // TODO: Send notification to content creator
    // await sendNotificationToCreator(content.created_by, action.contentId, action.notes);

    return {
      success: true,
      message: 'Content rejected by WeTechForU',
      content: { ...content, status: 'rejected' }
    };
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error in WTFU rejection:', error);
    return { success: false, error: error.message };
  } finally {
    client.release();
  }
}

/**
 * Client approves content (final approval)
 */
export async function approveClient(action: ApprovalAction) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Get content details
    const contentResult = await client.query(
      'SELECT * FROM social_media_content WHERE id = $1',
      [action.contentId]
    );

    if (contentResult.rows.length === 0) {
      throw new Error('Content not found');
    }

    const content = contentResult.rows[0];

    // Check if content is pending client approval
    if (content.status !== 'pending_client_approval') {
      throw new Error(`Cannot approve content with status: ${content.status}`);
    }

    // Update content status to approved (ready to schedule/post)
    await client.query(
      'UPDATE social_media_content SET status = $1, updated_at = NOW() WHERE id = $2',
      ['approved', action.contentId]
    );

    // Log the approval in history
    await client.query(
      `INSERT INTO content_approval_history (
        content_id,
        approval_type,
        approved_by,
        approval_status,
        previous_status,
        new_status,
        notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        action.contentId,
        'client_approval',
        action.approvedBy,
        'approved',
        'pending_client_approval',
        'approved',
        action.notes || 'Approved by client'
      ]
    );

    await client.query('COMMIT');

    // TODO: Send notification to WeTechForU team & content creator
    // await sendNotificationContentApproved(action.contentId);

    return {
      success: true,
      message: 'Content approved by client. Ready to schedule and post!',
      content: { ...content, status: 'approved' }
    };
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error in client approval:', error);
    return { success: false, error: error.message };
  } finally {
    client.release();
  }
}

/**
 * Client rejects content
 */
export async function rejectClient(action: ApprovalAction) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Get content details
    const contentResult = await client.query(
      'SELECT * FROM social_media_content WHERE id = $1',
      [action.contentId]
    );

    if (contentResult.rows.length === 0) {
      throw new Error('Content not found');
    }

    const content = contentResult.rows[0];

    // Check if content is pending client approval
    if (content.status !== 'pending_client_approval') {
      throw new Error(`Cannot reject content with status: ${content.status}`);
    }

    // Update content status to rejected
    await client.query(
      'UPDATE social_media_content SET status = $1, updated_at = NOW() WHERE id = $2',
      ['rejected', action.contentId]
    );

    // Log the rejection in history
    await client.query(
      `INSERT INTO content_approval_history (
        content_id,
        approval_type,
        approved_by,
        approval_status,
        previous_status,
        new_status,
        notes,
        requested_changes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        action.contentId,
        'client_rejection',
        action.approvedBy,
        'rejected',
        'pending_client_approval',
        'rejected',
        action.notes || 'Rejected by client',
        action.requestedChanges ? JSON.stringify(action.requestedChanges) : null
      ]
    );

    await client.query('COMMIT');

    // TODO: Send notification to WeTechForU team & content creator
    // await sendNotificationToWTFUTeam(action.contentId, 'rejected_by_client');

    return {
      success: true,
      message: 'Content rejected by client',
      content: { ...content, status: 'rejected' }
    };
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error in client rejection:', error);
    return { success: false, error: error.message };
  } finally {
    client.release();
  }
}

/**
 * Request changes to content
 * Can be done by either WTFU team or client
 */
export async function requestChanges(action: ApprovalAction) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Get content details
    const contentResult = await client.query(
      'SELECT * FROM social_media_content WHERE id = $1',
      [action.contentId]
    );

    if (contentResult.rows.length === 0) {
      throw new Error('Content not found');
    }

    const content = contentResult.rows[0];

    // Determine approval type based on current status
    let approvalType = 'changes_requested';
    if (content.status === 'pending_wtfu_approval') {
      approvalType = 'wtfu_changes_requested';
    } else if (content.status === 'pending_client_approval') {
      approvalType = 'client_changes_requested';
    }

    // Update content status back to draft
    await client.query(
      'UPDATE social_media_content SET status = $1, updated_at = NOW() WHERE id = $2',
      ['draft', action.contentId]
    );

    // Log the change request in history
    await client.query(
      `INSERT INTO content_approval_history (
        content_id,
        approval_type,
        approved_by,
        approval_status,
        previous_status,
        new_status,
        notes,
        requested_changes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        action.contentId,
        approvalType,
        action.approvedBy,
        'changes_requested',
        content.status,
        'draft',
        action.notes || 'Changes requested',
        action.requestedChanges ? JSON.stringify(action.requestedChanges) : null
      ]
    );

    await client.query('COMMIT');

    // TODO: Send notification to content creator with requested changes
    // await sendChangeRequestNotification(content.created_by, action.contentId, action.requestedChanges);

    return {
      success: true,
      message: 'Changes requested. Content moved back to draft.',
      content: { ...content, status: 'draft' },
      requestedChanges: action.requestedChanges
    };
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error requesting changes:', error);
    return { success: false, error: error.message };
  } finally {
    client.release();
  }
}

/**
 * Get approval history for content
 */
export async function getApprovalHistory(contentId: number) {
  const query = `
    SELECT 
      ah.*,
      u.name as approved_by_name,
      u.email as approved_by_email
    FROM content_approval_history ah
    LEFT JOIN users u ON ah.approved_by = u.id
    WHERE ah.content_id = $1
    ORDER BY ah.created_at DESC
  `;

  try {
    const result = await pool.query(query, [contentId]);
    return { success: true, history: result.rows };
  } catch (error: any) {
    console.error('Error fetching approval history:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get pending approvals for user (role-based)
 */
export async function getPendingApprovals(req: Request) {
  const role = req.session.role;
  const clientId = req.session.clientId;
  
  let statusFilter = '';
  let whereConditions = [];
  let params: any[] = [];
  let paramIndex = 1;

  // Determine which approvals to show based on role
  if (role === 'super_admin' || role?.startsWith('wtfu_')) {
    // WeTechForU users see content pending WTFU approval
    statusFilter = 'pending_wtfu_approval';
    whereConditions.push(`c.status = $${paramIndex}`);
    params.push(statusFilter);
    paramIndex++;
  } else if (role === 'client_admin' || role === 'client_user') {
    // Client users see content pending client approval for their client only
    statusFilter = 'pending_client_approval';
    whereConditions.push(`c.status = $${paramIndex}`);
    params.push(statusFilter);
    paramIndex++;
    
    whereConditions.push(`c.client_id = $${paramIndex}`);
    params.push(clientId);
    paramIndex++;
  } else {
    return { success: false, error: 'Unauthorized' };
  }

  const whereClause = whereConditions.join(' AND ');

  const query = `
    SELECT 
      c.*,
      u.name as created_by_name,
      u.email as created_by_email,
      cl.business_name as client_name,
      (
        SELECT json_agg(json_build_object(
          'approval_type', ah.approval_type,
          'approved_by_name', u2.name,
          'notes', ah.notes,
          'created_at', ah.created_at
        ))
        FROM content_approval_history ah
        LEFT JOIN users u2 ON ah.approved_by = u2.id
        WHERE ah.content_id = c.id
        ORDER BY ah.created_at DESC
        LIMIT 3
      ) as recent_history
    FROM social_media_content c
    LEFT JOIN users u ON c.created_by = u.id
    LEFT JOIN clients cl ON c.client_id = cl.id
    WHERE ${whereClause}
    ORDER BY c.created_at DESC
  `;

  try {
    const result = await pool.query(query, params);
    return { success: true, approvals: result.rows };
  } catch (error: any) {
    console.error('Error fetching pending approvals:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get approval statistics
 */
export async function getApprovalStats(req: Request) {
  const role = req.session.role;
  const clientId = req.session.clientId;

  let whereConditions = ['1=1'];
  let params: any[] = [];
  let paramIndex = 1;

  // Filter by client for non-super-admin users
  if (role !== 'super_admin' && !role?.startsWith('wtfu_')) {
    whereConditions.push(`client_id = $${paramIndex}`);
    params.push(clientId);
    paramIndex++;
  }

  const whereClause = whereConditions.join(' AND ');

  const query = `
    SELECT 
      COUNT(*) FILTER (WHERE status = 'pending_wtfu_approval') as pending_wtfu,
      COUNT(*) FILTER (WHERE status = 'pending_client_approval') as pending_client,
      COUNT(*) FILTER (WHERE status = 'approved') as approved,
      COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
      COUNT(*) as total
    FROM social_media_content
    WHERE ${whereClause}
  `;

  try {
    const result = await pool.query(query, params);
    return { success: true, stats: result.rows[0] };
  } catch (error: any) {
    console.error('Error fetching approval stats:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Check if user has permission to approve
 */
export function canUserApprove(role: string | undefined, approvalType: 'wtfu' | 'client'): boolean {
  if (!role) return false;

  if (approvalType === 'wtfu') {
    // Only WeTechForU users can do WTFU approval
    return role === 'super_admin' || role.startsWith('wtfu_');
  } else if (approvalType === 'client') {
    // Only client admins can do client approval (not client_user)
    return role === 'super_admin' || role === 'client_admin';
  }

  return false;
}

