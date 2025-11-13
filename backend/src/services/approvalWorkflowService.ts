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
  approvedBy: number | null; // Can be null for secure link approvals (no user logged in)
  notes?: string;
  requestedChanges?: any;
  approverName?: string; // For secure link approvals
  approverEmail?: string; // For secure link approvals
  accessMethod?: 'portal_login' | 'secure_link'; // Track how approval was done
}

/**
 * Submit content for approval (skips WeTechForU, goes directly to client approval)
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

    // Update content status directly to pending_client_approval (skip WeTechForU approval)
    // Note: destination_url should already be saved via updateContent before this is called
    // This only updates status and doesn't touch other fields
    await client.query(
      'UPDATE social_media_content SET status = $1, updated_at = NOW() WHERE id = $2',
      ['pending_client_approval', contentId]
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
        'submission',
        submittedBy,
        'submitted',
        content.status,
        'pending_client_approval',
        'Submitted for client approval'
      ]
    );

    await client.query('COMMIT');

    // TODO: Send notification to client admin
    // await sendNotificationToClient(content.client_id, contentId);

    return {
      success: true,
      message: 'Content submitted for client approval',
      content: { ...content, status: 'pending_client_approval' }
    };
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error submitting for approval:', error);
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
    // Also set approved_by to track who approved the content
    // Clear approval token if it exists (for secure link approvals)
    await client.query(
      `UPDATE social_media_content 
       SET status = $1, 
           approved_by = $2, 
           approval_token = NULL,
           approval_token_expires_at = NULL,
           updated_at = NOW() 
       WHERE id = $3`,
      ['approved', action.approvedBy, action.contentId]
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
        action.notes || `Approved by ${action.approverName || 'client'} (${action.accessMethod || 'portal_login'})`
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
    // Clear approval token if it exists (for secure link approvals)
    await client.query(
      `UPDATE social_media_content 
       SET status = $1, 
           approval_token = NULL,
           approval_token_expires_at = NULL,
           updated_at = NOW() 
       WHERE id = $2`,
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
        action.notes || `Rejected by ${action.approverName || 'client'} (${action.accessMethod || 'portal_login'})`,
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
    if (content.status === 'pending_client_approval') {
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
        action.notes || `Changes requested by ${action.approverName || 'client'} (${action.accessMethod || 'portal_login'})`,
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
      COALESCE(u.username, u.email) as approved_by_name,
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
  // Note: WeTechForU approval step has been removed - content goes directly to client approval
  if (role === 'super_admin' || role?.startsWith('wtfu_')) {
    // WeTechForU users see content pending client approval (for all clients)
    statusFilter = 'pending_client_approval';
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
      COALESCE(u.username, u.email) as created_by_name,
      u.email as created_by_email,
      cl.client_name as client_name,
      (
        SELECT json_agg(json_build_object(
          'approval_type', ah.approval_type,
          'approved_by_name', COALESCE(u2.username, u2.email),
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

/**
 * Send content for approval with secure link (email method)
 * Generates token and sends email to client
 */
export async function sendForApprovalWithLink(
  contentId: number, 
  sendEmail: boolean = true
): Promise<{ success: boolean; token?: string; approvalUrl?: string; error?: string }> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Generate secure token
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

    // Get content and client details
    // Prefer client admin email from users table, fallback to clients.email
    // Also get Facebook page name if available
    const contentResult = await client.query(
      `SELECT 
         c.*, 
         cl.client_name, 
         cl.email as client_company_email,
         (SELECT u_admin.email 
          FROM users u_admin 
          WHERE u_admin.client_id = c.client_id 
            AND u_admin.role = 'client_admin'
            AND u_admin.is_active = true
            AND u_admin.email IS NOT NULL 
            AND u_admin.email != ''
          ORDER BY u_admin.id DESC
          LIMIT 1) as client_admin_email,
         (SELECT credentials->>'page_name' 
          FROM client_credentials 
          WHERE client_id = c.client_id 
            AND service_type = 'facebook'
          LIMIT 1) as facebook_page_name
       FROM social_media_content c
       JOIN clients cl ON cl.id = c.client_id
       WHERE c.id = $1`,
      [contentId]
    );

    if (contentResult.rows.length === 0) {
      throw new Error('Content not found');
    }

    // Determine the best email to use (prefer client admin email, fallback to company email)
    const content = contentResult.rows[0];
    content.client_email = content.client_admin_email || content.client_company_email || null;

    // Update content with approval token
    await client.query(
      `UPDATE social_media_content 
       SET status = 'pending_client_approval',
           approval_token = $1,
           approval_token_expires_at = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [token, expiresAt, contentId]
    );

    // Log submission in history
    await client.query(
      `INSERT INTO content_approval_history (
        content_id, approval_type, approved_by, approval_status,
        previous_status, new_status, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        contentId,
        'submission',
        content.created_by,
        'submitted',
        content.status,
        'pending_client_approval',
        'Sent for client approval via secure link'
      ]
    );

    await client.query('COMMIT');

    const approvalUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/content/approve/${token}`;

    // Send email if requested
    console.log('📧 Email sending check:', {
      sendEmail,
      hasClientEmail: !!content.client_email,
      clientEmail: content.client_email,
      clientAdminEmail: content.client_admin_email,
      clientCompanyEmail: content.client_company_email,
      clientName: content.client_name,
      contentId,
      clientId: content.client_id
    });

    if (sendEmail && content.client_email) {
      try {
        const { EmailService } = require('./emailService');
        const emailService = new EmailService();
        const expiryDate = new Date(expiresAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        // Get platforms as string
        const platforms = content.target_platforms || [];
        const platformsText = platforms.length > 0 ? platforms.join(', ') : 'N/A';
        
        // Get media URLs and hashtags
        const mediaUrls = Array.isArray(content.media_urls) ? content.media_urls : [];
        let hashtags = Array.isArray(content.hashtags) ? content.hashtags : [];
        
        console.log('📧 Email preparation - Content data:', {
          contentId,
          mediaUrlsCount: mediaUrls.length,
          mediaUrls: mediaUrls,
          hashtagsCount: hashtags.length,
          hashtags: hashtags,
          destination_url: content.destination_url,
          backendUrl: process.env.BACKEND_URL || process.env.API_URL || 'https://marketingby-wetechforu-b67c6bd0bf6b.herokuapp.com'
        });
        
        // Extract hashtags from content_text if hashtags array is empty
        if (hashtags.length === 0 && content.content_text) {
          const hashtagRegex = /#[\w]+/g;
          const extractedHashtags = content.content_text.match(hashtagRegex) || [];
          hashtags = [...new Set(extractedHashtags)]; // Remove duplicates
        }
        
        const hasHashtags = hashtags.length > 0;
        
        // Get Facebook page name (fallback to client name if not available)
        const pageName = content.facebook_page_name || content.client_name || 'Page Name';
        
        // Build media images HTML
        let mediaHtml = '';
        if (mediaUrls.length > 0) {
          mediaHtml = `
            <div style="margin: 20px 0;">
              <p style="font-size: 14px; font-weight: 600; color: #333; margin-bottom: 10px;">
                Media (${mediaUrls.length}):
              </p>
              ${mediaUrls.map((url: string, index: number) => {
                // Ensure URL is absolute for email clients
                let imageUrl = url.trim();
                
                // Get the proper backend URL (prefer production/staging, not localhost)
                const backendUrl = process.env.BACKEND_URL || process.env.API_URL || 'https://marketingby-wetechforu-b67c6bd0bf6b.herokuapp.com';
                
                // If URL is already absolute
                if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
                  // Replace localhost URLs with production URL for emails
                  if (imageUrl.includes('localhost') || imageUrl.includes('127.0.0.1')) {
                    // Extract the path from localhost URL
                    try {
                      const urlObj = new URL(imageUrl);
                      imageUrl = `${backendUrl}${urlObj.pathname}${urlObj.search}`;
                      console.log('🔄 Replaced localhost URL in email media section:', url, '→', imageUrl);
                    } catch (e) {
                      console.error('⚠️ Error parsing URL:', imageUrl, e);
                    }
                  }
                  // Otherwise use as-is (already a public URL)
                } else {
                  // Relative URL - convert to absolute
                  if (imageUrl.startsWith('/uploads/') || imageUrl.startsWith('/public/')) {
                    imageUrl = `${backendUrl}${imageUrl}`;
                  } else if (imageUrl.startsWith('uploads/') || imageUrl.startsWith('public/')) {
                    imageUrl = `${backendUrl}/${imageUrl}`;
                  } else if (imageUrl.startsWith('/')) {
                    imageUrl = `${backendUrl}${imageUrl}`;
                  } else {
                    imageUrl = `https://${imageUrl}`;
                  }
                }
                
                console.log('📧 Email media section image URL:', imageUrl);
                
                return `
                  <div style="margin: 15px 0; text-align: center; background-color: #f7fafc; padding: 10px; border-radius: 8px;">
                    <img 
                      src="${imageUrl}" 
                      alt="Content Media ${index + 1}" 
                      style="max-width: 100%; width: auto; height: auto; border-radius: 6px; border: 2px solid #e2e8f0; display: block; margin: 0 auto; max-height: 400px; object-fit: contain; background-color: #ffffff;"
                      width="600"
                      height="auto"
                      onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"
                    />
                    <div style="display: none; padding: 40px; text-align: center; background: #f7fafc; color: #718096; border-radius: 6px;">
                      <p style="margin: 0;">Image ${index + 1} could not be loaded</p>
                      <p style="margin: 5px 0 0 0; font-size: 12px;">View on approval page</p>
                    </div>
                    ${mediaUrls.length > 1 ? `<p style="font-size: 12px; color: #718096; margin-top: 8px; margin-bottom: 0;">Image ${index + 1} of ${mediaUrls.length}</p>` : ''}
                  </div>
                `;
              }).join('')}
              <div style="background: #f0f9ff; padding: 12px; border-radius: 6px; margin-top: 15px; border-left: 3px solid #3b82f6;">
                <p style="margin: 0; font-size: 12px; color: #1e40af; line-height: 1.5;">
                  <strong>💡 Note:</strong> If images don't display, your email client may be blocking external images. Click "Show Images" or "Display Images" in your email client settings.
                </p>
              </div>
            </div>
          `;
        }
        
        // Build hashtags display
        let hashtagsHtml = '';
        if (hasHashtags) {
          hashtagsHtml = `
            <div style="margin: 15px 0;">
              <p style="font-size: 14px; font-weight: 600; color: #333; margin-bottom: 8px;">Hashtags:</p>
              <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                ${hashtags.map((tag: string) => `
                  <span style="background: linear-gradient(135deg, #A23B72 0%, #8A2F5F 100%); color: white; padding: 6px 12px; border-radius: 20px; font-size: 13px; font-weight: 500;">
                    ${tag}
                  </span>
                `).join('')}
              </div>
            </div>
          `;
        } else {
          // Show prominent "HASHTAG missing" warning
          hashtagsHtml = `
            <div style="background: #fff3cd; border: 2px solid #ffc107; border-radius: 8px; padding: 15px; margin: 15px 0;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 24px;">⚠️</span>
                <div>
                  <p style="margin: 0; font-size: 16px; font-weight: 700; color: #856404;">
                    HASHTAG MISSING
                  </p>
                  <p style="margin: 5px 0 0 0; font-size: 13px; color: #856404;">
                    No hashtags have been added to this content. Consider adding relevant hashtags to improve reach and engagement.
                  </p>
                </div>
              </div>
            </div>
          `;
        }

        console.log('📧 Sending approval email to:', content.client_email);
        await emailService.sendEmail({
          to: content.client_email,
          subject: `📱 Social Media Content Ready for Approval: ${content.title}`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
              <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.2);">
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #2E86AB 0%, #1a5f7a 100%); padding: 25px; text-align: center; color: white;">
                  <div style="font-size: 32px; margin-bottom: 10px;">📱</div>
                  <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700;">Social Media Content Review</h1>
                  <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">Please review and approve or reject this content.</p>
                </div>
                
                <!-- Expiry Notice -->
                <div style="background: #f7fafc; padding: 12px 25px; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; gap: 8px; font-size: 13px; color: #718096;">
                  <span>🕐</span>
                  <span><strong>Link Expires:</strong> ${expiryDate}</span>
                </div>
                
                <!-- Content Body -->
                <div style="padding: 30px;">
                  <p style="font-size: 16px; margin-bottom: 25px;">Hello <strong>${content.client_name}</strong>,</p>
                  
                  <p style="font-size: 14px; margin-bottom: 20px; color: #666;">Please review the content below:</p>
                  
                  <!-- Facebook-Style Post Preview -->
                  <div style="background: #f0f2f5; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                    <div style="background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">
                      <!-- Post Header -->
                      <div style="padding: 12px 16px; display: flex; align-items: center; border-bottom: 1px solid #e4e6eb;">
                        <div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #2E86AB, #1a5f7a); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; margin-right: 8px;">
                          ${pageName.charAt(0).toUpperCase()}
                        </div>
                        <div style="flex: 1;">
                          <div style="font-weight: 600; font-size: 15px; color: #050505; margin-bottom: 2px;">${pageName}</div>
                          <div style="font-size: 13px; color: #65676b;">
                            <span>Sponsored</span>
                            <span style="margin: 0 4px;">·</span>
                            <span>🌐</span>
                          </div>
                        </div>
                        <div style="color: #65676b; font-size: 20px; cursor: pointer;">⋯</div>
                      </div>
                      
                      <!-- Post Content -->
                      <div style="padding: 12px 16px;">
                        ${content.content_text ? `
                          <div style="font-size: 15px; line-height: 1.33; color: #050505; white-space: pre-wrap; margin-bottom: ${hasHashtags ? '8px' : '0'};">
                            ${content.content_text.replace(/#[\w]+/g, '<span style="color: #1877f2;">$&</span>')}
                          </div>
                        ` : ''}
                        
                        ${hasHashtags ? `
                          <div style="margin-top: 8px; font-size: 15px; color: #1877f2;">
                            ${hashtags.join(' ')}
                          </div>
                        ` : ''}
                      </div>
                      
                      <!-- Post Media -->
                      ${mediaUrls.length > 0 ? `
                        <div style="background: #f0f2f5;">
                          ${mediaUrls.map((url: string, index: number) => {
                            let imageUrl = url.trim();
                            
                            // Get the proper backend URL (prefer production/staging, not localhost)
                            const backendUrl = process.env.BACKEND_URL || process.env.API_URL || 'https://marketingby-wetechforu-b67c6bd0bf6b.herokuapp.com';
                            
                            // If URL is already absolute
                            if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
                              // Replace localhost URLs with production URL for emails
                              if (imageUrl.includes('localhost') || imageUrl.includes('127.0.0.1')) {
                                // Extract the path from localhost URL
                                const urlObj = new URL(imageUrl);
                                imageUrl = `${backendUrl}${urlObj.pathname}${urlObj.search}`;
                                console.log('🔄 Replaced localhost URL in email:', url, '→', imageUrl);
                              }
                              // Otherwise use as-is (already a public URL)
                            } else {
                              // Relative URL - convert to absolute
                              if (imageUrl.startsWith('/uploads/') || imageUrl.startsWith('/public/')) {
                                imageUrl = `${backendUrl}${imageUrl}`;
                              } else if (imageUrl.startsWith('uploads/') || imageUrl.startsWith('public/')) {
                                imageUrl = `${backendUrl}/${imageUrl}`;
                              } else if (imageUrl.startsWith('/')) {
                                imageUrl = `${backendUrl}${imageUrl}`;
                              } else {
                                imageUrl = `https://${imageUrl}`;
                              }
                            }
                            
                            console.log('📧 Email image URL:', imageUrl);
                            
                            return `
                              <a href="${approvalUrl}" style="display: block; text-decoration: none;">
                                <img 
                                  src="${imageUrl}" 
                                  alt="Post Image ${index + 1}" 
                                  style="width: 100%; max-width: 100%; height: auto; display: block; border: 1px solid #e2e8f0;"
                                  onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"
                                />
                                <div style="display: none; padding: 40px; text-align: center; background: #f7fafc; color: #718096;">
                                  <p style="margin: 0;">Image ${index + 1} could not be loaded</p>
                                  <p style="margin: 5px 0 0 0; font-size: 12px;">Click to view on approval page</p>
                                </div>
                              </a>
                            `;
                          }).join('')}
                          <div style="background: #f0f9ff; padding: 12px; border-radius: 6px; margin-top: 15px; border-left: 3px solid #3b82f6;">
                            <p style="margin: 0; font-size: 12px; color: #1e40af; line-height: 1.5;">
                              <strong>💡 Note:</strong> If images don't display above, your email client may be blocking external images. Click "Show Images" or "Display Images" in your email client, or click the "Open Review Page" button below to view the full content with images.
                            </p>
                          </div>
                        </div>
                      ` : ''}
                      
                      <!-- Link Preview (if destination_url exists) -->
                      ${content.destination_url ? `
                        <div style="border-top: 1px solid #e4e6eb; padding: 12px 16px; background: #f0f2f5;">
                          <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="flex: 1;">
                              <div style="font-size: 12px; color: #65676b; text-transform: uppercase; margin-bottom: 4px;">
                                ${new URL(content.destination_url.startsWith('http') ? content.destination_url : 'https://' + content.destination_url).hostname.replace('www.', '')}
                              </div>
                              <div style="font-size: 15px; font-weight: 600; color: #050505; margin-bottom: 4px;">
                                ${content.title}
                              </div>
                            </div>
                            <a href="${content.destination_url.startsWith('http') ? content.destination_url : 'https://' + content.destination_url}" 
                               style="background: #e4e6eb; color: #050505; padding: 6px 16px; border-radius: 6px; text-decoration: none; font-size: 15px; font-weight: 600;">
                              Learn More
                            </a>
                          </div>
                        </div>
                      ` : ''}
                      
                      <!-- Post Actions (Like, Comment, Share) -->
                      <div style="border-top: 1px solid #e4e6eb; padding: 4px 0;">
                        <div style="display: flex; justify-content: space-around; padding: 8px 0;">
                          <div style="display: flex; align-items: center; gap: 8px; color: #65676b; font-size: 15px; font-weight: 600; cursor: pointer;">
                            <span>👍</span>
                            <span>Like</span>
                          </div>
                          <div style="display: flex; align-items: center; gap: 8px; color: #65676b; font-size: 15px; font-weight: 600; cursor: pointer;">
                            <span>💬</span>
                            <span>Comment</span>
                          </div>
                          <div style="display: flex; align-items: center; gap: 8px; color: #65676b; font-size: 15px; font-weight: 600; cursor: pointer;">
                            <span>↗️</span>
                            <span>Share</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <!-- Platform and Type Info -->
                  <div style="display: flex; gap: 20px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 14px; flex-wrap: wrap;">
                    <div>
                      <strong style="color: #666;">Platforms:</strong> 
                      <span style="color: #333;">${platforms.map((p: string) => {
                        const icons: { [key: string]: string } = {
                          'facebook': '📘',
                          'linkedin': '💼',
                          'instagram': '📷',
                          'twitter': '🐦',
                          'google_business': '📍'
                        };
                        return `${icons[p] || ''} ${p}`;
                      }).join(', ')}</span>
                    </div>
                    <div>
                      <strong style="color: #666;">Type:</strong> 
                      <span style="color: #333;">${content.content_type || 'Text'}</span>
                    </div>
                  </div>
                
                  <!-- Action Buttons -->
                  <div style="text-align: center; margin: 30px 0; display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">
                    <a href="${approvalUrl}?action=approve" 
                       style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; text-decoration: none; padding: 14px 30px; border-radius: 8px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
                      ✅ Approve
                    </a>
                    <a href="${approvalUrl}?action=reject" 
                       style="display: inline-block; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; text-decoration: none; padding: 14px 30px; border-radius: 8px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);">
                      ❌ Reject
                    </a>
                  </div>
                  
                  <!-- Alternative Link -->
                  <div style="background: #f7fafc; padding: 15px; border-radius: 8px; margin-top: 25px; text-align: center;">
                    <p style="margin: 0 0 10px 0; font-size: 12px; color: #718096;">
                      Or click the button below to review:
                    </p>
                    <a href="${approvalUrl}" 
                       style="display: inline-block; background: linear-gradient(135deg, #4682B4, #5a9fd4); color: white; text-decoration: none; padding: 12px 30px; border-radius: 8px; font-weight: 600; font-size: 14px;">
                      🔗 Open Review Page
                    </a>
                    <p style="margin: 15px 0 0 0; font-size: 11px; color: #a0aec0; word-break: break-all;">
                      ${approvalUrl}
                    </p>
                  </div>
                </div>
                
                <!-- Footer -->
                <div style="background: #f7fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
                  <p style="margin: 0; font-size: 12px; color: #718096;">
                    This email was sent by MarketingBy - WeTechForU<br>
                    <a href="${approvalUrl}" style="color: #4682B4; text-decoration: none;">Review Content</a>
                  </p>
                </div>
              </div>
            </body>
            </html>
          `,
          text: `
Hello ${content.client_name},

We have a new social media content ready for your review and approval.

═══════════════════════════════════════════════════════════
Content Title: ${content.title}
═══════════════════════════════════════════════════════════

Content:
${content.content_text || 'N/A'}

${mediaUrls.length > 0 ? `\nMedia Images (${mediaUrls.length}):\n${mediaUrls.map((url: string, i: number) => `${i + 1}. ${url}`).join('\n')}\n` : ''}

${content.destination_url ? `Destination URL: ${content.destination_url}\n` : ''}

${hasHashtags ? `Hashtags: ${hashtags.join(', ')}\n` : '⚠️ WARNING: HASHTAG MISSING\n   No hashtags have been added to this content. Consider adding relevant hashtags to improve reach and engagement.\n\n'}

Platforms: ${platformsText}
Type: ${content.content_type || 'Text'}

Link Expires: ${expiryDate} (48 hours from now)

═══════════════════════════════════════════════════════════
REVIEW & APPROVE CONTENT
═══════════════════════════════════════════════════════════

Click here to review and approve:
${approvalUrl}

If the link above doesn't work, copy and paste this URL into your browser:
${approvalUrl}
          `.trim()
        });

        console.log('✅ Approval email sent successfully to:', content.client_email);
      } catch (emailError: any) {
        console.error('❌ Failed to send approval email:', emailError);
        console.error('❌ Email error details:', {
          message: emailError.message,
          stack: emailError.stack,
          to: content.client_email,
          code: emailError.code,
          response: emailError.response
        });
        
        // Check if it's a configuration issue
        if (emailError.message?.includes('your-azure') || 
            emailError.message?.includes('SmtpClientAuthentication is disabled') ||
            emailError.message?.includes('Authentication unsuccessful')) {
          console.error('⚠️ EMAIL SERVICE CONFIGURATION ISSUE:');
          console.error('   - Azure credentials may not be configured properly');
          console.error('   - Or SMTP authentication is disabled');
          console.error('   - Please check your .env file for email service credentials');
        }
        // Don't throw error - token is still valid, but log the issue
      }
    } else if (sendEmail && !content.client_email) {
      console.warn('⚠️ Email requested but client email is missing:', {
        contentId,
        clientId: content.client_id,
        clientName: content.client_name,
        clientCompanyEmail: content.client_company_email,
        clientAdminEmail: content.client_admin_email,
        note: 'No client admin email found in users table, and clients.email is also empty'
      });
      
      // Try to find any client user email as last resort
      const fallbackResult = await client.query(
        `SELECT email FROM users 
         WHERE client_id = $1 AND is_active = true AND email IS NOT NULL AND email != ''
         ORDER BY CASE WHEN role = 'client_admin' THEN 1 ELSE 2 END
         LIMIT 1`,
        [content.client_id]
      );
      
      if (fallbackResult.rows.length > 0) {
        const fallbackEmail = fallbackResult.rows[0].email;
        console.log('📧 Found fallback email, attempting to send:', fallbackEmail);
        
        try {
          const { EmailService } = require('./emailService');
          const emailService = new EmailService();
          const expiryDate = new Date(expiresAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });

          const platforms = content.target_platforms || [];
          const platformsText = platforms.length > 0 ? platforms.join(', ') : 'N/A';

          console.log('📧 Sending approval email to fallback email:', fallbackEmail);
          await emailService.sendEmail({
            to: fallbackEmail,
            subject: `📱 Social Media Content Ready for Approval: ${content.title}`,
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
              </head>
              <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                  <h1 style="color: white; margin: 0; font-size: 28px;">📱 Content Ready for Approval</h1>
                </div>
                
                <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
                  <p style="font-size: 16px; margin-bottom: 20px;">Hello <strong>${content.client_name}</strong>,</p>
                  
                  <p style="font-size: 16px; margin-bottom: 20px;">
                    We have a new social media content ready for your review and approval.
                  </p>
                  
                  <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4682B4;">
                    <h2 style="margin-top: 0; color: #333; font-size: 20px;">${content.title}</h2>
                    <p style="color: #666; margin-bottom: 10px;">${(content.content_text || '').substring(0, 200)}${(content.content_text || '').length > 200 ? '...' : ''}</p>
                    <div style="display: flex; gap: 20px; margin-top: 15px; font-size: 14px; flex-wrap: wrap;">
                      <div><strong>Platforms:</strong> ${platformsText}</div>
                      <div><strong>Type:</strong> ${content.content_type || 'Text'}</div>
                    </div>
                  </div>
                  
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${approvalUrl}" style="display: inline-block; background: linear-gradient(135deg, #4682B4, #5a9fd4); color: white; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-weight: bold; font-size: 16px;">
                      ✅ Review & Approve Content
                    </a>
                  </div>
                  
                  <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
                    <p style="margin: 0; font-size: 14px; color: #856404;">
                      <strong>⏰ Important:</strong> This approval link will expire on <strong>${expiryDate}</strong> (48 hours from now).
                    </p>
                  </div>
                  
                  <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
                  
                  <p style="font-size: 12px; color: #999; text-align: center; margin: 0;">
                    If you're unable to click the button above, copy and paste this link into your browser:<br>
                    <a href="${approvalUrl}" style="color: #4682B4; word-break: break-all;">${approvalUrl}</a>
                  </p>
                </div>
              </body>
              </html>
            `,
            text: `
Hello ${content.client_name},

We have a new social media content ready for your review and approval.

Content Title: ${content.title}
Content Preview: ${(content.content_text || '').substring(0, 200)}${(content.content_text || '').length > 200 ? '...' : ''}
Platforms: ${platformsText}
Type: ${content.content_type || 'Text'}

To review and approve this content, please visit:
${approvalUrl}

⏰ Important: This approval link will expire on ${expiryDate} (48 hours from now).

If the link above doesn't work, copy and paste this URL into your browser:
${approvalUrl}
            `.trim()
          });

          console.log('✅ Approval email sent successfully to fallback email:', fallbackEmail);
        } catch (fallbackError: any) {
          console.error('❌ Failed to send approval email to fallback email:', fallbackError);
        }
      } else {
        console.error('❌ No email addresses found for client:', {
          clientId: content.client_id,
          clientName: content.client_name
        });
      }
    }

    return {
      success: true,
      token,
      approvalUrl
    };
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('❌ Error sending content for approval:', error);
    return { success: false, error: error.message };
  } finally {
    client.release();
  }
}

/**
 * Verify approval token (for secure link approval)
 */
export async function verifyApprovalToken(token: string): Promise<any | null> {
  try {
    const result = await pool.query(
      `SELECT 
         c.id,
         c.client_id,
         c.title,
         c.content_type,
         c.content_text,
         c.media_urls,
         c.hashtags,
         c.target_platforms,
         c.destination_url,
         c.status,
         c.created_at,
         c.updated_at,
         cl.client_name,
         cl.email as client_company_email,
         (SELECT u_admin.email 
          FROM users u_admin 
          WHERE u_admin.client_id = c.client_id 
            AND u_admin.role = 'client_admin'
            AND u_admin.is_active = true
            AND u_admin.email IS NOT NULL 
            AND u_admin.email != ''
          ORDER BY u_admin.id DESC
          LIMIT 1) as client_admin_email,
         (SELECT credentials->>'page_name' 
          FROM client_credentials 
          WHERE client_id = c.client_id 
            AND service_type = 'facebook'
          LIMIT 1) as facebook_page_name
       FROM social_media_content c
       LEFT JOIN clients cl ON cl.id = c.client_id
       WHERE c.approval_token = $1
       AND c.approval_token_expires_at > CURRENT_TIMESTAMP
       AND c.status = 'pending_client_approval'`,
      [token]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const content = result.rows[0];
    // Determine the best email to use (prefer client admin email, fallback to company email)
    content.client_email = content.client_admin_email || content.client_company_email || null;
    
    // Ensure hashtags is an array (PostgreSQL arrays are returned as arrays, but ensure it's not null)
    if (content.hashtags && !Array.isArray(content.hashtags)) {
      content.hashtags = [];
    }
    if (!content.hashtags) {
      content.hashtags = [];
    }
    
    // Ensure media_urls is an array
    if (content.media_urls && !Array.isArray(content.media_urls)) {
      content.media_urls = [];
    }
    if (!content.media_urls) {
      content.media_urls = [];
    }
    
    // Ensure target_platforms is an array
    if (content.target_platforms && !Array.isArray(content.target_platforms)) {
      content.target_platforms = [];
    }
    if (!content.target_platforms) {
      content.target_platforms = [];
    }
    
    // Log for debugging
    console.log('📋 Approval token content:', {
      id: content.id,
      title: content.title,
      destination_url: content.destination_url,
      hashtags: content.hashtags,
      hashtags_type: typeof content.hashtags,
      hashtags_is_array: Array.isArray(content.hashtags)
    });
    
    return content;
  } catch (error: any) {
    console.error('❌ Error verifying approval token:', error);
    return null;
  }
}

