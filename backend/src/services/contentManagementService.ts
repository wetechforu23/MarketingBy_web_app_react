import pool from '../config/database';
import { getClientFilter } from '../utils/clientFilter';
import { Request } from 'express';

/**
 * Content Management Service
 * Handles CRUD operations for social media content
 */

export interface ContentData {
  clientId: number;
  title: string;
  contentType: 'text' | 'image' | 'video' | 'carousel' | 'story';
  contentText?: string;
  destinationUrl?: string;
  utmTrackedUrl?: string;
  mediaUrls?: string[];
  hashtags?: string[];
  mentions?: string[];
  targetPlatforms?: string[];
  createdBy: number;
  isAiGenerated?: boolean;
  templateId?: number;
  generationPrompt?: string;
}

export interface ContentFilters {
  clientId?: number;
  status?: string;
  platform?: string;
  createdBy?: number;
  search?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

/**
 * Create new content
 */
export async function createContent(data: ContentData) {
  const query = `
    INSERT INTO social_media_content (
      client_id,
      title,
      content_type,
      content_text,
      destination_url,
      utm_tracked_url,
      media_urls,
      hashtags,
      mentions,
      target_platforms,
      created_by,
      is_ai_generated,
      template_id,
      generation_prompt,
      status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'draft')
    RETURNING 
      id,
      client_id,
      title,
      content_type,
      content_text,
      destination_url,
      utm_tracked_url,
      media_urls,
      hashtags,
      mentions,
      target_platforms,
      status,
      created_by,
      created_at,
      updated_at,
      is_ai_generated,
      template_id
  `;

  const values = [
    data.clientId,
    data.title,
    data.contentType,
    data.contentText || null,
    data.destinationUrl || null,
    data.utmTrackedUrl || null,
    data.mediaUrls || [],
    data.hashtags || [],
    data.mentions || [],
    data.targetPlatforms || [],
    data.createdBy,
    data.isAiGenerated || false,
    data.templateId || null,
    data.generationPrompt || null
  ];

  try {
    const result = await pool.query(query, values);
    return { success: true, content: result.rows[0] };
  } catch (error: any) {
    console.error('Error creating content:', error);
    
    // Handle unique constraint violation
    if (error.code === '23505') {
      return { 
        success: false, 
        error: 'A content item with this title already exists for this client' 
      };
    }
    
    return { success: false, error: error.message };
  }
}

/**
 * Get content by ID
 */
export async function getContentById(contentId: number, req: Request) {
  const clientFilter = getClientFilter(req, 'c');
  
  // Build WHERE clause properly - adjust parameter indices for clientFilter
  const whereConditions: string[] = [];
  const params: any[] = [];
  
  // Always add contentId as first parameter
  whereConditions.push('c.id = $1');
  params.push(contentId);
  
  // Add client filter if needed (with adjusted parameter index)
  if (clientFilter.whereClause && clientFilter.whereClause.trim() && clientFilter.whereClause !== '1=1' && clientFilter.whereClause !== '1=0') {
    // Adjust parameter index: clientFilter uses $1, but we already used $1 for contentId
    // So we need to change $1 in clientFilter to $2
    let adjustedClause = clientFilter.whereClause.replace(/\$1\b/g, `$${params.length + 1}`);
    whereConditions.push(adjustedClause);
    params.push(...clientFilter.params);
  }
  
  const whereClause = whereConditions.join(' AND ');
  
  const query = `
    SELECT 
      c.*,
      COALESCE(u.username, u.email) as created_by_name,
      u.email as created_by_email,
      COALESCE(u_approved.username, u_approved.email) as approved_by_name,
      cl.client_name as client_name
    FROM social_media_content c
    LEFT JOIN users u ON c.created_by = u.id
    LEFT JOIN users u_approved ON c.approved_by = u_approved.id
    LEFT JOIN clients cl ON c.client_id = cl.id
    WHERE ${whereClause}
  `;

  try {
    const result = await pool.query(query, params);
    
    if (result.rows.length === 0) {
      return { success: false, error: 'Content not found or access denied' };
    }
    
    return { success: true, content: result.rows[0] };
  } catch (error: any) {
    console.error('Error fetching content:', error);
    return { success: false, error: error.message };
  }
}

/**
 * List content with filters
 */
export async function listContent(req: Request, filters: ContentFilters = {}) {
  const clientFilter = getClientFilter(req, 'c');
  
  let whereConditions = [];
  let params: any[] = [];
  let paramIndex = 1;

  // If explicit clientId is provided, use it (overrides clientFilter)
  // Otherwise, use clientFilter
  if (filters.clientId) {
    // Explicit client filter takes precedence
    whereConditions.push(`c.client_id = $${paramIndex}`);
    params.push(filters.clientId);
    paramIndex++;
  } else if (clientFilter.whereClause && clientFilter.whereClause.trim() && clientFilter.whereClause !== '1=1') {
    // Only use clientFilter if it's not '1=1' (which means see all)
    // If it's '1=1', we don't add it to avoid redundant condition
    whereConditions.push(clientFilter.whereClause);
    params.push(...clientFilter.params);
    paramIndex += clientFilter.params.length;
  }
  // If clientFilter is '1=1' and no explicit clientId, we don't add any client filter (see all)

  // Add status filter
  if (filters.status) {
    whereConditions.push(`c.status = $${paramIndex}`);
    params.push(filters.status);
    paramIndex++;
  }

  // Add platform filter
  if (filters.platform) {
    whereConditions.push(`$${paramIndex} = ANY(c.target_platforms)`);
    params.push(filters.platform);
    paramIndex++;
  }

  // Add created by filter
  if (filters.createdBy) {
    whereConditions.push(`c.created_by = $${paramIndex}`);
    params.push(filters.createdBy);
    paramIndex++;
  }

  // Add search filter (title or content text)
  if (filters.search) {
    whereConditions.push(`(
      c.title ILIKE $${paramIndex} OR 
      c.content_text ILIKE $${paramIndex}
    )`);
    params.push(`%${filters.search}%`);
    paramIndex++;
  }

  // Add date range filters
  if (filters.startDate) {
    whereConditions.push(`c.created_at >= $${paramIndex}`);
    params.push(filters.startDate);
    paramIndex++;
  }

  if (filters.endDate) {
    whereConditions.push(`c.created_at <= $${paramIndex}`);
    params.push(filters.endDate);
    paramIndex++;
  }

  const whereClause = whereConditions.length > 0 ? whereConditions.join(' AND ') : '1=1';
  const limit = filters.limit || 50;
  const offset = filters.offset || 0;

  // Get total count
  const countQuery = `
    SELECT COUNT(*) as total
    FROM social_media_content c
    WHERE ${whereClause}
  `;

  // Get content list - LIMIT and OFFSET use the next parameter indices
  const limitParamIndex = paramIndex;
  const offsetParamIndex = paramIndex + 1;
  
  const listQuery = `
    SELECT 
      c.*,
      COALESCE(u.username, u.email) as created_by_name,
      u.email as created_by_email,
      COALESCE(u_approved.username, u_approved.email) as approved_by_name,
      cl.client_name as client_name,
      (
        SELECT COUNT(*) 
        FROM social_media_posts p 
        WHERE p.content_id = c.id
      ) as post_count,
      (
        SELECT COUNT(*) 
        FROM social_media_posts p 
        WHERE p.content_id = c.id AND p.status = 'posted'
      ) as posted_count
    FROM social_media_content c
    LEFT JOIN users u ON c.created_by = u.id
    LEFT JOIN users u_approved ON c.approved_by = u_approved.id
    LEFT JOIN clients cl ON c.client_id = cl.id
    WHERE ${whereClause}
    ORDER BY c.created_at DESC
    LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}
  `;

  try {
    console.log('📋 Content Query Debug:', {
      whereClause,
      params: params.length,
      paramIndex,
      limitParamIndex,
      offsetParamIndex,
      limit,
      offset,
      filters,
      allParams: [...params, limit, offset]
    });
    
    const [countResult, listResult] = await Promise.all([
      pool.query(countQuery, params),
      pool.query(listQuery, [...params, limit, offset])
    ]);

    console.log('✅ Content Query Results:', {
      total: countResult.rows[0]?.total,
      contentCount: listResult.rows.length
    });

    return {
      success: true,
      content: listResult.rows,
      total: parseInt(countResult.rows[0].total),
      limit,
      offset,
      hasMore: (offset + limit) < parseInt(countResult.rows[0].total)
    };
  } catch (error: any) {
    console.error('❌ Error listing content:', error);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
      position: error.position
    });
    console.error('❌ Count Query:', countQuery);
    console.error('❌ List Query:', listQuery);
    console.error('❌ WHERE clause:', whereClause);
    console.error('❌ Params for count:', params);
    console.error('❌ Params for list:', [...params, limit, offset]);
    console.error('❌ Param indices:', {
      paramIndex,
      limitParamIndex,
      offsetParamIndex,
      paramsLength: params.length
    });
    return { success: false, error: error.message || 'Database error occurred' };
  }
}

/**
 * Update content
 */
export async function updateContent(contentId: number, data: Partial<ContentData>, req: Request) {
  // First check access
  const accessCheck = await getContentById(contentId, req);
  if (!accessCheck.success) {
    return accessCheck;
  }

  const content = accessCheck.content;

  // Don't allow updates if already posted
  if (content.status === 'posted') {
    return { 
      success: false, 
      error: 'Cannot update content that has already been posted' 
    };
  }

  // Don't allow updates if in approval process (unless rejecting)
  // BUT allow destination_url and utm_tracked_url updates even when pending (they're just tracking metadata)
  const allowedPendingFields = ['destinationUrl', 'utmTrackedUrl'];
  
  // Filter out undefined/null values to get only fields being updated
  const fieldsBeingUpdated = Object.keys(data).filter(key => 
    data[key as keyof typeof data] !== undefined && data[key as keyof typeof data] !== null
  );
  
  // Check if only allowed fields are being updated (or if no fields are being updated)
  const hasOnlyAllowedFields = fieldsBeingUpdated.length === 0 || 
    fieldsBeingUpdated.every(key => allowedPendingFields.includes(key));
  
  if (['pending_client_approval'].includes(content.status) && !hasOnlyAllowedFields) {
    return {
      success: false,
      error: 'Cannot update content that is pending approval. Please reject it first. (Note: Destination URL can be updated even when pending)'
    };
  }

  const updateFields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (data.title !== undefined) {
    updateFields.push(`title = $${paramIndex}`);
    values.push(data.title);
    paramIndex++;
  }

  if (data.contentType !== undefined) {
    updateFields.push(`content_type = $${paramIndex}`);
    values.push(data.contentType);
    paramIndex++;
  }

  if (data.contentText !== undefined) {
    updateFields.push(`content_text = $${paramIndex}`);
    values.push(data.contentText);
    paramIndex++;
  }

  if (data.destinationUrl !== undefined) {
    updateFields.push(`destination_url = $${paramIndex}`);
    values.push(data.destinationUrl);
    paramIndex++;
  }

  if (data.utmTrackedUrl !== undefined) {
    updateFields.push(`utm_tracked_url = $${paramIndex}`);
    values.push(data.utmTrackedUrl);
    paramIndex++;
  }

  if (data.mediaUrls !== undefined) {
    updateFields.push(`media_urls = $${paramIndex}`);
    values.push(data.mediaUrls);
    paramIndex++;
  }

  if (data.hashtags !== undefined) {
    updateFields.push(`hashtags = $${paramIndex}`);
    values.push(data.hashtags);
    paramIndex++;
  }

  if (data.mentions !== undefined) {
    updateFields.push(`mentions = $${paramIndex}`);
    values.push(data.mentions);
    paramIndex++;
  }

  if (data.targetPlatforms !== undefined) {
    updateFields.push(`target_platforms = $${paramIndex}`);
    values.push(data.targetPlatforms);
    paramIndex++;
  }

  if (updateFields.length === 0) {
    return { success: false, error: 'No fields to update' };
  }

  // Always update the updated_at timestamp
  updateFields.push(`updated_at = NOW()`);

  const query = `
    UPDATE social_media_content
    SET ${updateFields.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `;

  values.push(contentId);

  try {
    const result = await pool.query(query, values);
    return { success: true, content: result.rows[0] };
  } catch (error: any) {
    console.error('Error updating content:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete content
 */
export async function deleteContent(contentId: number, req: Request) {
  // First check access
  const accessCheck = await getContentById(contentId, req);
  if (!accessCheck.success) {
    return accessCheck;
  }

  const content = accessCheck.content;

  // Don't allow deletion if already posted
  if (content.status === 'posted') {
    return { 
      success: false, 
      error: 'Cannot delete content that has already been posted' 
    };
  }

  // Check if there are scheduled posts
  const postsCheck = await pool.query(
    `SELECT COUNT(*) as count 
     FROM social_media_posts 
     WHERE content_id = $1 AND status IN ('scheduled', 'posting')`,
    [contentId]
  );

  if (parseInt(postsCheck.rows[0].count) > 0) {
    return {
      success: false,
      error: 'Cannot delete content with scheduled posts. Cancel the posts first.'
    };
  }

  try {
    await pool.query(
      'DELETE FROM social_media_content WHERE id = $1',
      [contentId]
    );
    
    return { success: true, message: 'Content deleted successfully' };
  } catch (error: any) {
    console.error('Error deleting content:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Duplicate content
 */
export async function duplicateContent(contentId: number, req: Request) {
  const accessCheck = await getContentById(contentId, req);
  if (!accessCheck.success) {
    return accessCheck;
  }

  const original = accessCheck.content;
  const userId = req.session.userId;

  const newTitle = `${original.title} (Copy)`;

  const data: ContentData = {
    clientId: original.client_id,
    title: newTitle,
    contentType: original.content_type,
    contentText: original.content_text,
    mediaUrls: original.media_urls,
    hashtags: original.hashtags,
    mentions: original.mentions,
    targetPlatforms: original.target_platforms,
    createdBy: userId!,
    isAiGenerated: original.is_ai_generated,
    templateId: original.template_id,
    generationPrompt: original.generation_prompt
  };

  return await createContent(data);
}

/**
 * Update content status
 * Internal function used by approval workflow
 */
export async function updateContentStatus(
  contentId: number, 
  newStatus: string, 
  transaction?: any
) {
  const client = transaction || pool;
  
  const query = `
    UPDATE social_media_content
    SET status = $1, updated_at = NOW()
    WHERE id = $2
    RETURNING *
  `;

  try {
    const result = await client.query(query, [newStatus, contentId]);
    return { success: true, content: result.rows[0] };
  } catch (error: any) {
    console.error('Error updating content status:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get content statistics for a client
 */
export async function getContentStats(req: Request) {
  const clientFilter = getClientFilter(req, 'c');

  // Build WHERE clause properly
  const whereClause = (clientFilter.whereClause && clientFilter.whereClause.trim()) 
    ? `WHERE ${clientFilter.whereClause}` 
    : '';

  // Get stats with approver info using the approved_by column (simpler approach)
  const statsQuery = `
    SELECT 
      COUNT(*) FILTER (WHERE c.status = 'draft') as draft_count,
      COUNT(*) FILTER (WHERE c.status = 'pending_client_approval' OR c.status = 'pending_wtfu_approval') as pending_client_count,
      COUNT(*) FILTER (WHERE c.status = 'approved') as approved_count,
      COUNT(*) FILTER (WHERE c.status = 'scheduled') as scheduled_count,
      COUNT(*) FILTER (WHERE c.status = 'posted') as posted_count,
      COUNT(*) FILTER (WHERE c.status = 'failed') as failed_count,
      COUNT(*) FILTER (WHERE c.status = 'rejected') as rejected_count,
      COUNT(*) as total_count
    FROM social_media_content c
    ${whereClause}
  `;

  try {
    const result = await pool.query(statsQuery, clientFilter.params);
    const stats = result.rows[0];
    
    // Get latest approver name for approved content (using approved_by column)
    let latestApprover: string | null = null;
    const approvedCount = parseInt(stats.approved_count || 0);
    
    if (approvedCount > 0) {
      // Use the same client filter parameters
      // Build approver query with same WHERE conditions
      let approverWhereClause = "c.status = 'approved'";
      
      if (clientFilter.whereClause) {
        // Append client filter conditions
        approverWhereClause += ` AND ${clientFilter.whereClause}`;
      }
      
      const approverQuery = `
        SELECT COALESCE(u.username, u.name, u.email, 'Unknown') as approved_by_name
        FROM social_media_content c
        LEFT JOIN users u ON c.approved_by = u.id
        WHERE ${approverWhereClause}
        ORDER BY c.updated_at DESC
        LIMIT 1
      `;
      
      try {
        // Use the same params from clientFilter
        const approverResult = await pool.query(approverQuery, clientFilter.params);
        if (approverResult.rows.length > 0) {
          latestApprover = approverResult.rows[0].approved_by_name;
        }
      } catch (approverError) {
        console.error('Error fetching latest approver:', approverError);
        // Continue without approver info
      }
    }
    
    return { 
      success: true, 
      stats: {
        ...stats,
        latest_approved_by: latestApprover
      }
    };
  } catch (error: any) {
    console.error('Error fetching content stats:', error);
    return { success: false, error: error.message };
  }
}

