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
}

export default FacebookService;
