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

      // Calculate page views from multiple sources (fallback mechanism)
      let pageViews = 0;
      
      // Priority 1: From insights
      if (insights.page_views_total && insights.page_views_total > 0) {
        pageViews = insights.page_views_total;
        console.log(`  📊 Page views from insights: ${pageViews}`);
      }
      // Priority 2: From page info
      else if (pageInfo.page_views) {
        pageViews = pageInfo.page_views;
        console.log(`  📊 Page views from page info: ${pageViews}`);
      }
      // Priority 3: Try alternative API method
      else {
        const altPageViews = await this.fetchPageViewsAlternative(credentials.page_id, credentials.access_token);
        if (altPageViews > 0) {
          pageViews = altPageViews;
          console.log(`  📊 Page views from alternative method: ${pageViews}`);
        }
        // Priority 4: Estimate from impressions
        else if (insights.page_impressions > 0) {
          pageViews = Math.round(insights.page_impressions * 0.3); // Rough estimate
          console.log(`  📊 Page views estimated from impressions: ${pageViews}`);
        }
      }

      // Update insights with calculated page views
      insights.page_views_total = pageViews;

      // Store in database
      await this.storeData(clientId, pageInfo, posts, insights);

      console.log(`✅ Facebook data stored successfully for client ${clientId}`)

      // Get followers from multiple sources
      const followers = pageInfo.followers_count || pageInfo.fan_count || insights.page_fans || 0;

      return {
        pageViews: pageViews,
        followers: followers,
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
   * Fetch page basic information including view count
   */
  private async fetchPageInfo(pageId: string, accessToken: string): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/${pageId}`, {
        params: {
          access_token: accessToken,
          fields: 'id,name,about,fan_count,followers_count,website,phone,emails,category,description,link,page_views,checkins,were_here_count,talking_about_count,engagement'
        }
      });

      console.log(`  ✅ Page info: ${response.data.name}`);
      console.log(`     Followers: ${response.data.followers_count || response.data.fan_count || 0}`);
      console.log(`     Talking about: ${response.data.talking_about_count || 0}`);
      console.log(`     Page views: ${response.data.page_views || 'N/A'}`);
      
      return response.data;
    } catch (error: any) {
      console.error('  ❌ Error fetching page info:', error.response?.data || error.message);
      return {};
    }
  }

  /**
   * Fetch posts with full details including engagement metrics
   */
  private async fetchPosts(pageId: string, accessToken: string, limit: number = 50): Promise<any[]> {
    try {
      console.log(`  🔍 Fetching posts for page ${pageId}...`);
      
      const response = await axios.get(`${this.baseUrl}/${pageId}/posts`, {
        params: {
          access_token: accessToken,
          fields: 'id,message,created_time,permalink_url,type,full_picture,likes.summary(true),comments.summary(true),shares,reactions.summary(true),attachments',
          limit: limit
        }
      });

      const posts = response.data.data || [];
      console.log(`  ✅ Fetched ${posts.length} posts from Facebook API`);
      
      // Fetch insights for each post (views, reach, clicks)
      const postsWithInsights = await Promise.all(
        posts.map(async (post) => {
          const insights = await this.fetchPostInsights(post.id, accessToken);
          return {
            ...post,
            insights
          };
        })
      );
      
      console.log(`  ✅ Fetched insights for ${postsWithInsights.length} posts`);
      
      // Log first post as sample
      if (postsWithInsights.length > 0) {
        const firstPost = postsWithInsights[0];
        console.log(`  📄 Sample post: ID=${firstPost.id}`);
        console.log(`     Likes: ${firstPost.likes?.summary?.total_count || 0}`);
        console.log(`     Comments: ${firstPost.comments?.summary?.total_count || 0}`);
        console.log(`     Shares: ${firstPost.shares?.count || 0}`);
        console.log(`     Impressions: ${firstPost.insights?.post_impressions || 0}`);
        console.log(`     Reach: ${firstPost.insights?.post_reach || 0}`);
        console.log(`     Clicks: ${firstPost.insights?.post_clicks || 0}`);
      }
      
      return postsWithInsights;
    } catch (error: any) {
      console.error('  ❌ Error fetching posts:');
      console.error('     Error message:', error.message);
      console.error('     Response status:', error.response?.status);
      console.error('     Response data:', JSON.stringify(error.response?.data, null, 2));
      return [];
    }
  }

  /**
   * Fetch individual post insights (impressions, reach, clicks, engagement)
   */
  private async fetchPostInsights(postId: string, accessToken: string): Promise<any> {
    try {
      const metrics = [
        'post_impressions',           // Total number of times the post was seen
        'post_impressions_unique',    // Number of unique people who saw the post
        'post_engaged_users',         // Number of people who engaged with the post
        'post_clicks',                // Total clicks on the post
        'post_clicks_unique',         // Unique clicks
        'post_reactions_by_type_total', // Breakdown of reactions
        'post_engaged_fan',           // Engaged fans
        'post_video_views'            // Video views if applicable
      ];

      const response = await axios.get(`${this.baseUrl}/${postId}/insights`, {
        params: {
          access_token: accessToken,
          metric: metrics.join(',')
        }
      });

      const insights: any = {
        post_impressions: 0,
        post_impressions_unique: 0,
        post_reach: 0,
        post_engaged_users: 0,
        post_clicks: 0,
        post_clicks_unique: 0,
        post_video_views: 0,
        post_reactions_breakdown: {}
      };

      const data = response.data.data || [];
      data.forEach((insight: any) => {
        if (insight.values && insight.values.length > 0) {
          const value = insight.values[0].value;
          
          if (insight.name === 'post_impressions') {
            insights.post_impressions = Number(value);
          } else if (insight.name === 'post_impressions_unique') {
            insights.post_impressions_unique = Number(value);
            insights.post_reach = Number(value); // Reach is unique impressions
          } else if (insight.name === 'post_engaged_users') {
            insights.post_engaged_users = Number(value);
          } else if (insight.name === 'post_clicks') {
            insights.post_clicks = Number(value);
          } else if (insight.name === 'post_clicks_unique') {
            insights.post_clicks_unique = Number(value);
          } else if (insight.name === 'post_video_views') {
            insights.post_video_views = Number(value);
          } else if (insight.name === 'post_reactions_by_type_total') {
            insights.post_reactions_breakdown = value;
          }
        }
      });

      return insights;
    } catch (error: any) {
      // Post insights might not be available for all posts (especially old ones)
      // Return default values instead of failing
      return {
        post_impressions: 0,
        post_impressions_unique: 0,
        post_reach: 0,
        post_engaged_users: 0,
        post_clicks: 0,
        post_clicks_unique: 0,
        post_video_views: 0,
        post_reactions_breakdown: {}
      };
    }
  }

  /**
   * Alternative method to fetch page views using impressions_by_story_type
   * This is more reliable than page_views_total
   */
  private async fetchPageViewsAlternative(pageId: string, accessToken: string): Promise<number> {
    try {
      const until = new Date();
      const since = new Date();
      since.setDate(since.getDate() - 28);
      
      const sinceStr = since.toISOString().split('T')[0];
      const untilStr = until.toISOString().split('T')[0];

      console.log(`  🔍 Attempting alternative page views fetch...`);

      const response = await axios.get(`${this.baseUrl}/${pageId}/insights/page_consumptions`, {
        params: {
          access_token: accessToken,
          period: 'day',
          since: sinceStr,
          until: untilStr
        }
      });

      if (response.data.data && response.data.data.length > 0) {
        const values = response.data.data[0].values || [];
        const totalViews = values.reduce((sum: number, item: any) => {
          return sum + (typeof item.value === 'number' ? item.value : 0);
        }, 0);
        console.log(`  ✅ Alternative page views: ${totalViews}`);
        return totalViews;
      }
      
      return 0;
    } catch (error: any) {
      console.log(`  ℹ️ Alternative page views method not available`);
      return 0;
    }
  }

  /**
   * Fetch page insights (metrics)
   * Reference: https://developers.facebook.com/docs/graph-api/reference/v18.0/insights
   */
  private async fetchInsights(pageId: string, accessToken: string): Promise<any> {
    const metrics = {
      page_impressions: 0,
      page_impressions_unique: 0,
      page_post_engagements: 0,
      page_views_total: 0,
      page_posts_impressions: 0,
      page_video_views: 0,
      page_fan_adds: 0,
      page_fan_removes: 0
    };

    // Calculate date range (last 28 days)
    const until = new Date();
    const since = new Date();
    since.setDate(since.getDate() - 28);
    
    const sinceStr = since.toISOString().split('T')[0];
    const untilStr = until.toISOString().split('T')[0];

    console.log(`  📅 Fetching insights from ${sinceStr} to ${untilStr}`);

    // Fetch metrics in separate calls for better success rate
    const metricGroups = [
      // Group 1: Page level metrics (lifetime)
      {
        metrics: ['page_fans'],
        period: 'lifetime'
      },
      // Group 2: Daily metrics (days_28)
      {
        metrics: [
          'page_impressions',
          'page_impressions_unique',
          'page_post_engagements',
          'page_posts_impressions',
          'page_posts_impressions_unique'
        ],
        period: 'days_28'
      },
      // Group 3: Day period metrics
      {
        metrics: [
          'page_views_total',
          'page_video_views',
          'page_fan_adds',
          'page_fan_removes'
        ],
        period: 'day'
      }
    ];

    try {
      for (const group of metricGroups) {
        try {
          console.log(`  🔍 Fetching ${group.metrics.join(', ')} with period: ${group.period}`);
          
          const response = await axios.get(`${this.baseUrl}/${pageId}/insights`, {
            params: {
              access_token: accessToken,
              metric: group.metrics.join(','),
              period: group.period,
              since: sinceStr,
              until: untilStr
            }
          });

          const insights = response.data.data || [];
          console.log(`  ✅ Received ${insights.length} insights for ${group.metrics.join(', ')}`);
          
          insights.forEach((insight: any) => {
            if (insight.values && insight.values.length > 0) {
              // For day period, sum all daily values
              if (group.period === 'day') {
                const sum = insight.values.reduce((total: number, item: any) => {
                  const val = typeof item.value === 'object' ? 0 : Number(item.value);
                  return total + val;
                }, 0);
                metrics[insight.name as keyof typeof metrics] = sum;
                console.log(`    ${insight.name}: ${sum} (summed from ${insight.values.length} days)`);
              } else {
                // For other periods, take the latest value
                const value = insight.values[insight.values.length - 1].value;
                metrics[insight.name as keyof typeof metrics] = typeof value === 'object' ? 0 : Number(value);
                console.log(`    ${insight.name}: ${metrics[insight.name as keyof typeof metrics]}`);
              }
            }
          });
        } catch (groupError: any) {
          console.warn(`  ⚠️ Could not fetch ${group.metrics.join(', ')}:`, groupError.response?.data?.error?.message || groupError.message);
          // Continue with other groups
        }
      }

      console.log(`  ✅ Final insights summary:`, metrics);
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

      // Store posts with full metrics
      for (const post of posts) {
        const totalReactions = post.reactions?.summary?.total_count || 0;
        const totalComments = post.comments?.summary?.total_count || 0;
        const totalShares = post.shares?.count || 0;
        const totalEngagement = totalReactions + totalComments + totalShares;

        // Use actual insights data (impressions, reach, clicks)
        const postImpressions = post.insights?.post_impressions || 0;
        const postReach = post.insights?.post_reach || 0;
        const postClicks = post.insights?.post_clicks || 0;
        const postEngagedUsers = post.insights?.post_engaged_users || totalEngagement;
        const postVideoViews = post.insights?.post_video_views || 0;

        // Use full_picture from post
        const fullPicture = post.full_picture || null;

        await this.pool.query(
          `INSERT INTO facebook_posts 
           (client_id, post_id, message, created_time, permalink_url, post_type, full_picture,
            likes, comments, shares, total_reactions,
            post_impressions, post_reach, post_clicks, post_engaged_users, post_video_views,
            post_data, synced_at) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW())
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
             post_reach = EXCLUDED.post_reach,
             post_clicks = EXCLUDED.post_clicks,
             post_engaged_users = EXCLUDED.post_engaged_users,
             post_video_views = EXCLUDED.post_video_views,
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
            totalComments,
            totalShares,
            totalReactions,
            postImpressions,
            postReach,
            postClicks,
            postEngagedUsers,
            postVideoViews,
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

      // Get posts with all metrics
      const postsResult = await this.pool.query(
        `SELECT post_id, message, created_time, permalink_url, post_type, full_picture,
                likes, comments, shares, total_reactions,
                post_impressions, post_reach, post_clicks, post_engaged_users, post_video_views
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

  /**
   * Get Top Performing Posts
   * Sorted by engagement score: (reactions + comments*2 + shares*3 + clicks*0.1)
   */
  async getTopPerformingPosts(clientId: number, limit: number = 10): Promise<any[]> {
    try {
      const result = await this.pool.query(
        `SELECT 
          post_id, 
          message, 
          created_time, 
          permalink_url, 
          post_type, 
          full_picture,
          likes,
          comments, 
          shares, 
          total_reactions,
          post_impressions AS views,
          post_reach AS reach,
          post_clicks AS clicks,
          post_engaged_users AS engaged_users,
          post_video_views AS video_views,
          -- Calculate engagement score
          (
            COALESCE(total_reactions, 0) + 
            COALESCE(comments, 0) * 2 + 
            COALESCE(shares, 0) * 3 + 
            COALESCE(post_clicks, 0) * 0.1
          ) AS engagement_score,
          -- Calculate engagement rate
          CASE 
            WHEN COALESCE(post_reach, 0) > 0 THEN 
              ROUND((COALESCE(total_reactions, 0) + COALESCE(comments, 0) + COALESCE(shares, 0))::numeric / post_reach * 100, 2)
            ELSE 0
          END AS engagement_rate
        FROM facebook_posts 
        WHERE client_id = $1
        ORDER BY engagement_score DESC, created_time DESC
        LIMIT $2`,
        [clientId, limit]
      );

      return result.rows.map(post => ({
        ...post,
        // Ensure all metrics are numbers
        views: Number(post.views) || 0,
        reach: Number(post.reach) || 0,
        clicks: Number(post.clicks) || 0,
        likes: Number(post.likes) || 0,
        comments: Number(post.comments) || 0,
        shares: Number(post.shares) || 0,
        total_reactions: Number(post.total_reactions) || 0,
        engaged_users: Number(post.engaged_users) || 0,
        video_views: Number(post.video_views) || 0,
        engagement_score: Number(post.engagement_score) || 0,
        engagement_rate: Number(post.engagement_rate) || 0
      }));
    } catch (error) {
      console.error('Error getting top performing posts:', error);
      return [];
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

  /**
   * Get Recent Posts
   * All posts sorted by date
   */
  async getRecentPosts(clientId: number, limit: number = 50): Promise<any[]> {
    try {
      const result = await this.pool.query(
        `SELECT 
          post_id, 
          message, 
          created_time, 
          permalink_url, 
          post_type, 
          full_picture,
          likes,
          comments, 
          shares, 
          total_reactions,
          post_impressions AS views,
          post_reach AS reach,
          post_clicks AS clicks,
          post_engaged_users AS engaged_users,
          post_video_views AS video_views,
          CASE 
            WHEN COALESCE(post_reach, 0) > 0 THEN 
              ROUND((COALESCE(total_reactions, 0) + COALESCE(comments, 0) + COALESCE(shares, 0))::numeric / post_reach * 100, 2)
            ELSE 0
          END AS engagement_rate
        FROM facebook_posts 
        WHERE client_id = $1
        ORDER BY created_time DESC
        LIMIT $2`,
        [clientId, limit]
      );

      return result.rows.map(post => ({
        ...post,
        views: Number(post.views) || 0,
        reach: Number(post.reach) || 0,
        clicks: Number(post.clicks) || 0,
        likes: Number(post.likes) || 0,
        comments: Number(post.comments) || 0,
        shares: Number(post.shares) || 0,
        total_reactions: Number(post.total_reactions) || 0,
        engaged_users: Number(post.engaged_users) || 0,
        video_views: Number(post.video_views) || 0,
        engagement_rate: Number(post.engagement_rate) || 0
      }));
    } catch (error) {
      console.error('Error getting recent posts:', error);
      return [];
    }
  }
}

export default FacebookService;
