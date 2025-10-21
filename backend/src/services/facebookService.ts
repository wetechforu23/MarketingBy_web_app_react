import { Pool } from 'pg';
import axios from 'axios';

interface FacebookCredentials {
  page_id: string;
  access_token: string;
}

interface FacebookData {
  pageViews: number;
  followers: number;
  engagement: number;
  reach: number;
  impressions: number;
  posts: any[];
}

class FacebookService {
  private pool: Pool;
  private baseUrl = 'https://graph.facebook.com/v18.0';

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Get Facebook credentials for a client
   */
  async getClientCredentials(clientId: number): Promise<FacebookCredentials | null> {
    try {
      const result = await this.pool.query(
        'SELECT credentials FROM client_credentials WHERE client_id = $1 AND service_type = $2',
        [clientId, 'facebook']
      );

      if (result.rows.length === 0) {
        return null;
      }

      const credentials = result.rows[0].credentials;
      return {
        page_id: credentials.page_id,
        access_token: credentials.access_token
      };
    } catch (error) {
      console.error('Error getting Facebook credentials:', error);
      return null;
    }
  }

  /**
   * Fetch real Facebook data from Graph API and store in database
   * Following the same pattern as Google Analytics
   */
  async fetchAndStoreData(clientId: number): Promise<FacebookData> {
    try {
      const credentials = await this.getClientCredentials(clientId);
      
      if (!credentials) {
        throw new Error('Facebook credentials not found');
      }

      console.log(`📘 Fetching Facebook data for page ${credentials.page_id}...`);

      // Fetch page information
      const pageInfo = await this.fetchPageInfo(credentials.page_id, credentials.access_token);
      
      // Fetch posts with engagement
      const posts = await this.fetchPosts(credentials.page_id, credentials.access_token, 50);
      
      // Fetch insights
      const insights = await this.fetchInsights(credentials.page_id, credentials.access_token);

      // Store in database
      await this.storeData(clientId, pageInfo, posts, insights);

      console.log(`✅ Facebook data stored successfully for client ${clientId}`);

      return {
        pageViews: insights.page_views_total || 0,
        followers: pageInfo.followers_count || pageInfo.fan_count || 0,
        engagement: insights.page_post_engagements || 0,
        reach: insights.page_impressions_unique || 0,
        impressions: insights.page_impressions || 0,
        posts: posts
      };
    } catch (error: any) {
      console.error('❌ Error fetching Facebook data:', error.message);
      throw error;
    }
  }

  /**
   * Fetch page basic information
   */
  private async fetchPageInfo(pageId: string, accessToken: string): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/${pageId}`, {
        params: {
          access_token: accessToken,
          fields: 'id,name,about,fan_count,followers_count,website,phone,emails,category,description,link'
        }
      });

      console.log(`  ✅ Page info: ${response.data.name}, Followers: ${response.data.followers_count || response.data.fan_count || 0}`);
      return response.data;
    } catch (error: any) {
      console.error('  ❌ Error fetching page info:', error.response?.data || error.message);
      return {};
    }
  }

  /**
   * Fetch posts with full details
   */
  private async fetchPosts(pageId: string, accessToken: string, limit: number = 50): Promise<any[]> {
    try {
      console.log(`  🔍 Fetching posts for page ${pageId}...`);
      
      const response = await axios.get(`${this.baseUrl}/${pageId}/posts`, {
        params: {
          access_token: accessToken,
          fields: 'id,message,created_time,permalink_url,type,full_picture,likes.summary(true),comments.summary(true),shares,reactions.summary(true)',
          limit: limit
        }
      });

      const posts = response.data.data || [];
      console.log(`  ✅ Fetched ${posts.length} posts from Facebook API`);
      
      // Log first post as sample
      if (posts.length > 0) {
        console.log(`  📄 Sample post: ID=${posts[0].id}, Likes=${posts[0].likes?.summary?.total_count || 0}`);
      }
      
      return posts;
    } catch (error: any) {
      console.error('  ❌ Error fetching posts:');
      console.error('     Error message:', error.message);
      console.error('     Response status:', error.response?.status);
      console.error('     Response data:', JSON.stringify(error.response?.data, null, 2));
      return [];
    }
  }

  /**
   * Fetch page insights (metrics)
   */
  private async fetchInsights(pageId: string, accessToken: string): Promise<any> {
    const metrics = {
      page_impressions: 0,
      page_impressions_unique: 0,
      page_post_engagements: 0,
      page_views_total: 0,
      page_posts_impressions: 0,
      page_video_views: 0
    };

    // Fetch all available metrics
    const metricNames = [
      'page_impressions',
      'page_impressions_unique', 
      'page_post_engagements',
      'page_views_total',
      'page_posts_impressions',
      'page_posts_impressions_unique',
      'page_video_views',
      'page_fan_adds',
      'page_fan_removes',
      'page_actions_post_reactions_total'
    ];

    try {
      const response = await axios.get(`${this.baseUrl}/${pageId}/insights`, {
        params: {
          access_token: accessToken,
          metric: metricNames.join(','),
          period: 'days_28'
        }
      });

      const insights = response.data.data || [];
      insights.forEach((insight: any) => {
        if (insight.values && insight.values.length > 0) {
          const value = insight.values[insight.values.length - 1].value;
          metrics[insight.name as keyof typeof metrics] = typeof value === 'object' ? 0 : Number(value);
        }
      });

      console.log(`  ✅ Fetched insights:`, metrics);
      return metrics;
    } catch (error: any) {
      console.error('  ❌ Error fetching insights:', error.response?.data || error.message);
      return metrics;
    }
  }

  /**
   * Store all Facebook data in database
   */
  private async storeData(clientId: number, pageInfo: any, posts: any[], insights: any): Promise<void> {
    try {
      // Store page-level insights
      for (const [metricName, metricValue] of Object.entries(insights)) {
        await this.pool.query(
          `INSERT INTO facebook_insights 
           (client_id, metric_name, metric_value, recorded_at) 
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (client_id, metric_name, recorded_at) 
           DO UPDATE SET metric_value = EXCLUDED.metric_value`,
          [clientId, metricName, metricValue]
        );
      }

      // Calculate average impressions per post for estimation
      const avgImpressionsPerPost = posts.length > 0 ? 
        Math.round((insights.page_posts_impressions || 0) / posts.length) : 0;

      // Store posts
      for (const post of posts) {
        const totalReactions = post.reactions?.summary?.total_count || 0;
        const totalComments = post.comments?.summary?.total_count || 0;
        const totalShares = post.shares?.count || 0;
        const totalEngagement = totalReactions + totalComments + totalShares;

        // Estimate impressions based on engagement
        const estimatedImpressions = totalEngagement > 0 ? totalEngagement * 100 : avgImpressionsPerPost;
        const estimatedEngaged = totalEngagement * 2;

        // Use full_picture from post
        const fullPicture = post.full_picture || null;

        await this.pool.query(
          `INSERT INTO facebook_posts 
           (client_id, post_id, message, created_time, permalink_url, post_type, full_picture,
            likes, comments, shares, total_reactions,
            post_impressions, post_engaged_users, post_data, synced_at) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
           ON CONFLICT (post_id) 
           DO UPDATE SET 
             message = EXCLUDED.message,
             post_type = EXCLUDED.post_type,
             full_picture = EXCLUDED.full_picture,
             likes = EXCLUDED.likes,
             comments = EXCLUDED.comments,
             shares = EXCLUDED.shares,
             total_reactions = EXCLUDED.total_reactions,
             post_impressions = EXCLUDED.post_impressions,
             post_engaged_users = EXCLUDED.post_engaged_users,
             post_data = EXCLUDED.post_data,
             synced_at = NOW()`,
          [
            clientId,
            post.id,
            post.message || '',
            post.created_time,
            post.permalink_url,
            post.type || 'status',
            fullPicture,
            post.likes?.summary?.total_count || 0,
            post.comments?.summary?.total_count || 0,
            post.shares?.count || 0,
            totalReactions,
            estimatedImpressions,
            estimatedEngaged,
            JSON.stringify(post)
          ]
        );
      }

      console.log(`  💾 Stored ${Object.keys(insights).length} insights and ${posts.length} posts`);
    } catch (error) {
      console.error('  ❌ Error storing Facebook data:', error);
      throw error;
    }
  }

  /**
   * Get stored Facebook data from database
   * Following the same pattern as Google Analytics
   */
  async getStoredData(clientId: number): Promise<FacebookData> {
    try {
      // Get latest insights
      const insightsResult = await this.pool.query(
        `SELECT metric_name, metric_value 
         FROM facebook_insights 
         WHERE client_id = $1 
         AND DATE(recorded_at) = (
           SELECT MAX(DATE(recorded_at)) 
           FROM facebook_insights 
           WHERE client_id = $1
         )`,
        [clientId]
      );

      const insights: any = {};
      insightsResult.rows.forEach(row => {
        insights[row.metric_name] = Number(row.metric_value);
      });

      // Get followers count from page info or calculate from fan_adds/removes
      const followersCount = insights.page_fan_adds ? 
        (insights.page_fan_adds - (insights.page_fan_removes || 0)) : 0;

      // Get posts
      const postsResult = await this.pool.query(
        `SELECT post_id, message, created_time, permalink_url, post_type, full_picture,
                likes, comments, shares, total_reactions, post_impressions, post_engaged_users
         FROM facebook_posts 
         WHERE client_id = $1 
         ORDER BY created_time DESC 
         LIMIT 50`,
        [clientId]
      );

      return {
        pageViews: insights.page_views_total || 0,
        followers: followersCount,
        engagement: insights.page_post_engagements || 0,
        reach: insights.page_impressions_unique || 0,
        impressions: insights.page_impressions || 0,
        posts: postsResult.rows
      };
    } catch (error) {
      console.error('Error getting stored Facebook data:', error);
      return {
        pageViews: 0,
        followers: 0,
        engagement: 0,
        reach: 0,
        impressions: 0,
        posts: []
      };
    }
  }

  // ============================================================================
  // POSTING METHODS (NEW - for Social Media Content Management)
  // ============================================================================

  /**
   * Create a text post on Facebook
   */
  async createTextPost(
    clientId: number,
    message: string
  ): Promise<{success: boolean; postId?: string; postUrl?: string; error?: string}> {
    try {
      const credentials = await this.getClientCredentials(clientId);
      
      if (!credentials) {
        return { success: false, error: 'Facebook credentials not found' };
      }

      console.log(`📘 Creating Facebook text post for page ${credentials.page_id}...`);

      const response = await axios.post(
        `${this.baseUrl}/${credentials.page_id}/feed`,
        {
          message: message,
          access_token: credentials.access_token
        }
      );

      const postId = response.data.id;
      console.log(`✅ Facebook text post created: ${postId}`);

      return {
        success: true,
        postId: postId,
        postUrl: `https://www.facebook.com/${postId.replace('_', '/posts/')}`
      };
    } catch (error: any) {
      console.error('❌ Error creating Facebook text post:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * Create an image post on Facebook
   */
  async createImagePost(
    clientId: number,
    message: string,
    imageUrl: string
  ): Promise<{success: boolean; postId?: string; postUrl?: string; error?: string}> {
    try {
      const credentials = await this.getClientCredentials(clientId);
      
      if (!credentials) {
        return { success: false, error: 'Facebook credentials not found' };
      }

      console.log(`📘 Creating Facebook image post for page ${credentials.page_id}...`);

      const response = await axios.post(
        `${this.baseUrl}/${credentials.page_id}/photos`,
        {
          message: message,
          url: imageUrl,
          access_token: credentials.access_token
        }
      );

      const postId = response.data.post_id || response.data.id;
      console.log(`✅ Facebook image post created: ${postId}`);

      return {
        success: true,
        postId: postId,
        postUrl: `https://www.facebook.com/${postId.replace('_', '/posts/')}`
      };
    } catch (error: any) {
      console.error('❌ Error creating Facebook image post:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * Create a multi-image post (carousel) on Facebook
   */
  async createMultiImagePost(
    clientId: number,
    message: string,
    imageUrls: string[]
  ): Promise<{success: boolean; postId?: string; postUrl?: string; error?: string}> {
    try {
      const credentials = await this.getClientCredentials(clientId);
      
      if (!credentials) {
        return { success: false, error: 'Facebook credentials not found' };
      }

      console.log(`📘 Creating Facebook multi-image post for page ${credentials.page_id}...`);

      // Upload each image and get media IDs
      const attached_media = [];
      for (const imageUrl of imageUrls) {
        const photoResponse = await axios.post(
          `${this.baseUrl}/${credentials.page_id}/photos`,
          {
            url: imageUrl,
            published: false, // Don't publish individual photos
            access_token: credentials.access_token
          }
        );
        attached_media.push({ media_fbid: photoResponse.data.id });
      }

      // Create the multi-photo post
      const response = await axios.post(
        `${this.baseUrl}/${credentials.page_id}/feed`,
        {
          message: message,
          attached_media: attached_media,
          access_token: credentials.access_token
        }
      );

      const postId = response.data.id;
      console.log(`✅ Facebook multi-image post created: ${postId}`);

      return {
        success: true,
        postId: postId,
        postUrl: `https://www.facebook.com/${postId.replace('_', '/posts/')}`
      };
    } catch (error: any) {
      console.error('❌ Error creating Facebook multi-image post:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * Create a video post on Facebook
   */
  async createVideoPost(
    clientId: number,
    message: string,
    videoUrl: string,
    title?: string,
    description?: string
  ): Promise<{success: boolean; postId?: string; postUrl?: string; error?: string}> {
    try {
      const credentials = await this.getClientCredentials(clientId);
      
      if (!credentials) {
        return { success: false, error: 'Facebook credentials not found' };
      }

      console.log(`📘 Creating Facebook video post for page ${credentials.page_id}...`);

      const videoData: any = {
        file_url: videoUrl,
        description: message,
        access_token: credentials.access_token
      };

      if (title) {
        videoData.title = title;
      }

      if (description) {
        videoData.description = description;
      }

      const response = await axios.post(
        `${this.baseUrl}/${credentials.page_id}/videos`,
        videoData
      );

      const postId = response.data.id;
      console.log(`✅ Facebook video post created: ${postId}`);

      return {
        success: true,
        postId: postId,
        postUrl: `https://www.facebook.com/watch/?v=${postId}`
      };
    } catch (error: any) {
      console.error('❌ Error creating Facebook video post:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * Universal create post method - determines type based on content
   */
  async createPost(
    clientId: number,
    message: string,
    mediaUrls?: string[]
  ): Promise<{success: boolean; postId?: string; postUrl?: string; error?: string}> {
    // No media - text only
    if (!mediaUrls || mediaUrls.length === 0) {
      return this.createTextPost(clientId, message);
    }

    // Determine media types
    const images = mediaUrls.filter(url => this.isImageUrl(url));
    const videos = mediaUrls.filter(url => this.isVideoUrl(url));

    // Video post (only one video allowed)
    if (videos.length > 0) {
      if (videos.length > 1) {
        return { success: false, error: 'Facebook only supports one video per post' };
      }
      return this.createVideoPost(clientId, message, videos[0]);
    }

    // Single image post
    if (images.length === 1) {
      return this.createImagePost(clientId, message, images[0]);
    }

    // Multiple images (carousel)
    if (images.length > 1) {
      return this.createMultiImagePost(clientId, message, images);
    }

    return { success: false, error: 'No valid media found' };
  }

  /**
   * Get post details from Facebook
   */
  async getPostDetails(
    clientId: number,
    postId: string
  ): Promise<{success: boolean; post?: any; error?: string}> {
    try {
      const credentials = await this.getClientCredentials(clientId);
      
      if (!credentials) {
        return { success: false, error: 'Facebook credentials not found' };
      }

      const response = await axios.get(
        `${this.baseUrl}/${postId}`,
        {
          params: {
            access_token: credentials.access_token,
            fields: 'id,message,created_time,permalink_url,type,full_picture,likes.summary(true),comments.summary(true),shares,reactions.summary(true),insights'
          }
        }
      );

      return {
        success: true,
        post: response.data
      };
    } catch (error: any) {
      console.error('❌ Error fetching Facebook post details:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * Delete a post from Facebook
   */
  async deletePost(
    clientId: number,
    postId: string
  ): Promise<{success: boolean; error?: string}> {
    try {
      const credentials = await this.getClientCredentials(clientId);
      
      if (!credentials) {
        return { success: false, error: 'Facebook credentials not found' };
      }

      console.log(`📘 Deleting Facebook post ${postId}...`);

      await axios.delete(
        `${this.baseUrl}/${postId}`,
        {
          params: {
            access_token: credentials.access_token
          }
        }
      );

      console.log(`✅ Facebook post deleted: ${postId}`);
      return { success: true };
    } catch (error: any) {
      console.error('❌ Error deleting Facebook post:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * Helper: Check if URL is an image
   */
  private isImageUrl(url: string): boolean {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    const ext = url.split('.').pop()?.toLowerCase().split('?')[0];
    return ext ? imageExtensions.includes(ext) : false;
  }

  /**
   * Helper: Check if URL is a video
   */
  private isVideoUrl(url: string): boolean {
    const videoExtensions = ['mp4', 'mov', 'avi', 'webm'];
    const ext = url.split('.').pop()?.toLowerCase().split('?')[0];
    return ext ? videoExtensions.includes(ext) : false;
  }
}

export default FacebookService;
