import pool from '../config/database';
import FacebookService from './facebookService';
import { validateContentForPlatform } from './platformValidationService';

/**
 * Social Media Posting Service
 * Unified service for posting content to all social media platforms
 * Currently supports: Facebook
 * Future: LinkedIn, Instagram, Twitter, Google Business
 */

// Initialize platform services
const facebookService = new FacebookService(pool);

export interface PostContent {
  contentId: number;
  clientId: number;
  platform: string;
  message: string;
  mediaUrls?: string[];
  scheduledTime?: Date;
  skipApprovalCheck?: boolean; // Allow posting without approval check (for content creators)
}

export interface PostResult {
  success: boolean;
  postId?: string;
  platformPostId?: string;
  platformUrl?: string;
  error?: string;
}

/**
 * Schedule a post for future publishing
 */
export async function schedulePost(content: PostContent) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Validate content for platform
    const validation = await validateContentForPlatform(content.platform, {
      contentText: content.message,
      mediaUrls: content.mediaUrls,
      hashtags: [],
      mentions: [],
      contentType: content.mediaUrls && content.mediaUrls.length > 0 ? 'image' : 'text'
    });

    if (!validation.isValid) {
      const errorMessages = validation.errors.map(e => e.message).join(', ');
      throw new Error(`Validation failed for ${content.platform}: ${errorMessages}`);
    }

    // Get content details
    const contentResult = await client.query(
      'SELECT * FROM social_media_content WHERE id = $1',
      [content.contentId]
    );

    if (contentResult.rows.length === 0) {
      throw new Error('Content not found');
    }

    const contentData = contentResult.rows[0];

    // Check if content is approved (unless skipApprovalCheck is true)
    // Rejected content cannot be scheduled
    if (!content.skipApprovalCheck && contentData.status === 'rejected') {
      throw new Error(`Rejected content cannot be scheduled. Please update the content and resubmit for approval.`);
    }
    
    if (!content.skipApprovalCheck && contentData.status !== 'approved') {
      throw new Error(`Content must be approved before scheduling. Current status: ${contentData.status}`);
    }

    // Get created_by from content or use a default (should not be null)
    const createdBy = contentData.created_by || null;
    
    if (!createdBy) {
      console.warn(`⚠️ Content ${content.contentId} has no created_by, using null`);
    }

    // Create post record
    const postResult = await client.query(
      `INSERT INTO social_media_posts (
        client_id,
        content_id,
        platform,
        post_type,
        scheduled_time,
        status,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        content.clientId,
        content.contentId,
        content.platform,
        'organic',
        content.scheduledTime || new Date(),
        content.scheduledTime ? 'scheduled' : 'posting',
        createdBy
      ]
    );

    const post = postResult.rows[0];
    console.log(`✅ Post created in database:`, {
      id: post.id,
      contentId: post.content_id,
      platform: post.platform,
      status: post.status,
      scheduledTime: post.scheduled_time
    });

    // Update content status to 'scheduled' if we scheduled a post
    if (content.scheduledTime) {
      await client.query(
        'UPDATE social_media_content SET status = $1 WHERE id = $2',
        ['scheduled', content.contentId]
      );
      console.log(`✅ Content ${content.contentId} status updated to 'scheduled'`);
    }

    // If no scheduled time, post immediately
    if (!content.scheduledTime) {
      const postingResult = await postToPlatform(post.id, content.platform, contentData, content.clientId);
      
      if (!postingResult.success) {
        // Mark as failed
        await client.query(
          `UPDATE social_media_posts 
           SET status = 'failed', error_message = $1, attempt_count = 1
           WHERE id = $2`,
          [postingResult.error, post.id]
        );
        
        await client.query('COMMIT');
        return { success: false, error: postingResult.error };
      }

      // Mark as posted
      await client.query(
        `UPDATE social_media_posts 
         SET status = 'posted', 
             posted_at = NOW(),
             platform_post_id = $1,
             platform_url = $2
         WHERE id = $3`,
        [postingResult.platformPostId, postingResult.platformUrl, post.id]
      );

      // Update content status
      await client.query(
        'UPDATE social_media_content SET status = $1 WHERE id = $2',
        ['posted', content.contentId]
      );
    }

    await client.query('COMMIT');

    return {
      success: true,
      post: post,
      message: content.scheduledTime ? 'Post scheduled successfully' : 'Post published successfully'
    };
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error scheduling post:', error);
    return { success: false, error: error.message };
  } finally {
    client.release();
  }
}

/**
 * Post content to a specific platform
 * Internal function called by cron job or immediate posting
 */
export async function postToPlatform(
  postId: number,
  platform: string,
  contentData: any,
  clientId: number
): Promise<PostResult> {
  try {
    console.log(`📤 Posting to ${platform} for client ${clientId}...`);

    // Prepare message (text only - hashtags will be added in Facebook service after UTM URL)
    let message = contentData.content_text || '';
    
    // Get hashtags separately (don't add to message yet - will be added after UTM URL)
    const hashtags = contentData.hashtags && contentData.hashtags.length > 0 
      ? contentData.hashtags.map((tag: string) => 
          tag.startsWith('#') ? tag : `#${tag}`
        ).join(' ')
      : null;

    // Get contentId and destinationUrl for UTM tracking
    const contentId = contentData.content_id || contentData.id || null;
    const destinationUrl = contentData.destination_url || null;

    let result: PostResult;

    switch (platform.toLowerCase()) {
      case 'facebook':
        result = await postToFacebook(clientId, message, contentData.media_urls, contentId, destinationUrl, hashtags);
        break;

      case 'linkedin':
        // TODO: Implement LinkedIn posting
        result = { success: false, error: 'LinkedIn posting not yet implemented' };
        break;

      case 'instagram':
        // TODO: Implement Instagram posting
        result = { success: false, error: 'Instagram posting not yet implemented' };
        break;

      case 'twitter':
        // TODO: Implement Twitter posting
        result = { success: false, error: 'Twitter posting not yet implemented' };
        break;

      case 'google_business':
        // TODO: Implement Google Business posting
        result = { success: false, error: 'Google Business posting not yet implemented' };
        break;

      default:
        result = { success: false, error: `Unsupported platform: ${platform}` };
    }

    return result;
  } catch (error: any) {
    console.error(`Error posting to ${platform}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Post to Facebook
 */
async function postToFacebook(
  clientId: number,
  message: string,
  mediaUrls?: string[],
  contentId?: number | null,
  destinationUrl?: string | null,
  hashtags?: string | null
): Promise<PostResult> {
  try {
    // Pass hashtags to createPost - it will handle adding them to the message
    const result = await facebookService.createPost(clientId, message, mediaUrls, contentId, destinationUrl, hashtags);
    
    if (!result.success) {
      return { success: false, error: result.error };
    }

    return {
      success: true,
      platformPostId: result.postId,
      platformUrl: result.postUrl
    };
  } catch (error: any) {
    console.error('❌ Error in postToFacebook:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Process scheduled posts (called by cron job)
 * Finds all posts that are scheduled to be posted now and posts them
 */
export async function processScheduledPosts() {
  const client = await pool.connect();
  
  try {
    // Find posts that need to be posted
    // Handle NULL values: COALESCE(attempt_count, 0) and COALESCE(max_attempts, 3)
    const postsResult = await client.query(
      `SELECT 
        p.*,
        c.id as content_id,
        c.content_text,
        c.destination_url,
        c.media_urls,
        c.hashtags,
        c.mentions,
        c.content_type
      FROM social_media_posts p
      JOIN social_media_content c ON p.content_id = c.id
      WHERE p.status = 'scheduled'
        AND p.scheduled_time <= NOW()
        AND COALESCE(p.attempt_count, 0) < COALESCE(p.max_attempts, 3)
      ORDER BY p.scheduled_time ASC
      LIMIT 100`
    );

    const posts = postsResult.rows;
    console.log(`📅 [Scheduled Posts] Found ${posts.length} posts to process...`);
    
    if (posts.length === 0) {
      // Log why no posts were found (for debugging)
      const debugResult = await client.query(
        `SELECT COUNT(*) as total_scheduled,
                COUNT(*) FILTER (WHERE scheduled_time <= NOW()) as ready_to_post,
                COUNT(*) FILTER (WHERE COALESCE(attempt_count, 0) >= COALESCE(max_attempts, 3)) as max_attempts_reached
         FROM social_media_posts
         WHERE status = 'scheduled'`
      );
      console.log(`📊 [Scheduled Posts] Debug info:`, debugResult.rows[0]);
    }

    const results = {
      total: posts.length,
      successful: 0,
      failed: 0,
      errors: [] as any[]
    };

    for (const post of posts) {
      try {
        console.log(`📤 Processing post ${post.id} for ${post.platform}...`);

        // Update status to posting
        // Handle NULL attempt_count: COALESCE(attempt_count, 0) + 1
        await client.query(
          'UPDATE social_media_posts SET status = $1, last_attempt_at = NOW(), attempt_count = COALESCE(attempt_count, 0) + 1 WHERE id = $2',
          ['posting', post.id]
        );

        // Post to platform
        const postingResult = await postToPlatform(post.id, post.platform, post, post.client_id);

        if (postingResult.success) {
          // Success - mark as posted
          await client.query(
            `UPDATE social_media_posts 
             SET status = 'posted',
                 posted_at = NOW(),
                 platform_post_id = $1,
                 platform_url = $2,
                 error_message = NULL
             WHERE id = $3`,
            [postingResult.platformPostId, postingResult.platformUrl, post.id]
          );

          // Update content status
          await client.query(
            'UPDATE social_media_content SET status = $1 WHERE id = $2',
            ['posted', post.content_id]
          );

          results.successful++;
          console.log(`  ✅ Post ${post.id} published successfully`);
        } else {
          // Failed - mark as failed if max attempts reached
          // Handle NULL values: COALESCE(attempt_count, 0) and COALESCE(max_attempts, 3)
          const attemptCount = post.attempt_count || 0;
          const maxAttempts = post.max_attempts || 3;
          const newStatus = attemptCount >= maxAttempts ? 'failed' : 'scheduled';
          
          await client.query(
            'UPDATE social_media_posts SET status = $1, error_message = $2 WHERE id = $3',
            [newStatus, postingResult.error, post.id]
          );

          results.failed++;
          results.errors.push({
            postId: post.id,
            platform: post.platform,
            error: postingResult.error
          });
          
          console.log(`  ❌ Post ${post.id} failed: ${postingResult.error}`);
        }
      } catch (error: any) {
        console.error(`Error processing post ${post.id}:`, error);
        results.failed++;
        results.errors.push({
          postId: post.id,
          error: error.message
        });
      }
    }

    console.log(`📊 Processing complete: ${results.successful} successful, ${results.failed} failed`);
    return results;
  } catch (error: any) {
    console.error('Error in processScheduledPosts:', error);
    return {
      total: 0,
      successful: 0,
      failed: 0,
      errors: [{ error: error.message }]
    };
  } finally {
    client.release();
  }
}

/**
 * Cancel a scheduled post
 */
export async function cancelScheduledPost(postId: number) {
  try {
    const result = await pool.query(
      `UPDATE social_media_posts 
       SET status = 'cancelled', updated_at = NOW()
       WHERE id = $1 AND status IN ('scheduled', 'draft')
       RETURNING *`,
      [postId]
    );

    if (result.rows.length === 0) {
      return { success: false, error: 'Post not found or cannot be cancelled' };
    }

    return { success: true, post: result.rows[0] };
  } catch (error: any) {
    console.error('Error cancelling post:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Reschedule a post
 */
export async function reschedulePost(postId: number, newScheduledTime: Date) {
  try {
    const result = await pool.query(
      `UPDATE social_media_posts 
       SET scheduled_time = $1, status = 'scheduled', updated_at = NOW()
       WHERE id = $2 AND status IN ('scheduled', 'failed', 'cancelled')
       RETURNING *`,
      [newScheduledTime, postId]
    );

    if (result.rows.length === 0) {
      return { success: false, error: 'Post not found or cannot be rescheduled' };
    }

    return { success: true, post: result.rows[0] };
  } catch (error: any) {
    console.error('Error rescheduling post:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Retry a failed post
 */
export async function retryFailedPost(postId: number) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Get post details
    const postResult = await client.query(
      `SELECT p.*, c.content_text, c.media_urls, c.hashtags, c.content_type
       FROM social_media_posts p
       JOIN social_media_content c ON p.content_id = c.id
       WHERE p.id = $1 AND p.status = 'failed'`,
      [postId]
    );

    if (postResult.rows.length === 0) {
      return { success: false, error: 'Post not found or not in failed status' };
    }

    const post = postResult.rows[0];

    // Reset attempt count and try again
    await client.query(
      'UPDATE social_media_posts SET status = $1, attempt_count = 0, error_message = NULL WHERE id = $2',
      ['posting', postId]
    );

    // Attempt to post
    const postingResult = await postToPlatform(post.id, post.platform, post, post.client_id);

    if (postingResult.success) {
      await client.query(
        `UPDATE social_media_posts 
         SET status = 'posted',
             posted_at = NOW(),
             platform_post_id = $1,
             platform_url = $2
         WHERE id = $3`,
        [postingResult.platformPostId, postingResult.platformUrl, postId]
      );

      await client.query('COMMIT');
      return { success: true, message: 'Post published successfully' };
    } else {
      await client.query(
        'UPDATE social_media_posts SET status = $1, error_message = $2, attempt_count = 1 WHERE id = $3',
        ['failed', postingResult.error, postId]
      );

      await client.query('COMMIT');
      return { success: false, error: postingResult.error };
    }
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error retrying failed post:', error);
    return { success: false, error: error.message };
  } finally {
    client.release();
  }
}

/**
 * Get post details with content
 */
export async function getPostDetails(postId: number) {
  try {
    const result = await pool.query(
      `SELECT 
        p.*,
        c.title as content_title,
        c.content_text,
        c.media_urls,
        c.hashtags,
        cl.client_name as client_name,
        u.name as created_by_name
      FROM social_media_posts p
      JOIN social_media_content c ON p.content_id = c.id
      LEFT JOIN clients cl ON p.client_id = cl.id
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.id = $1`,
      [postId]
    );

    if (result.rows.length === 0) {
      return { success: false, error: 'Post not found' };
    }

    return { success: true, post: result.rows[0] };
  } catch (error: any) {
    console.error('Error getting post details:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get posting statistics
 */
export async function getPostingStats(clientId?: number) {
  let whereClause = '1=1';
  const params: any[] = [];

  if (clientId) {
    whereClause = 'client_id = $1';
    params.push(clientId);
  }

  try {
    const result = await pool.query(
      `SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'draft') as draft,
        COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled,
        COUNT(*) FILTER (WHERE status = 'posting') as posting,
        COUNT(*) FILTER (WHERE status = 'posted') as posted,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
        COUNT(*) FILTER (WHERE platform = 'facebook') as facebook_count,
        COUNT(*) FILTER (WHERE platform = 'linkedin') as linkedin_count,
        COUNT(*) FILTER (WHERE platform = 'instagram') as instagram_count,
        COUNT(*) FILTER (WHERE platform = 'twitter') as twitter_count
      FROM social_media_posts
      WHERE ${whereClause}`,
      params
    );

    return { success: true, stats: result.rows[0] };
  } catch (error: any) {
    console.error('Error getting posting stats:', error);
    return { success: false, error: error.message };
  }
}

