import { Pool } from 'pg';
import axios from 'axios';

interface FacebookCredentials {
  page_id: string;
  access_token: string;
}

interface FacebookInsight {
  name: string;
  title: string;
  description: string;
  period: string;
  values: Array<{
    value: number | object;
    end_time: string;
  }>;
}

interface FacebookPost {
  id: string;
  message?: string;
  created_time: string;
  permalink_url: string;
  likes?: { summary: { total_count: number } };
  comments?: { summary: { total_count: number } };
  shares?: { count: number };
  reactions?: { summary: { total_count: number } };
}

class FacebookService {
  private pool: Pool;
  private baseUrl = 'https://graph.facebook.com/v18.0';

  // Comprehensive metrics to fetch (matching Facebook Insights page)
  private metricPeriods: Record<string, string> = {
    // Views & Reach
    page_impressions: 'days_28',
    page_impressions_unique: 'days_28',
    page_impressions_organic: 'days_28',
    page_impressions_paid: 'days_28',
    page_impressions_viral: 'days_28',
    
    // Engagement
    page_engaged_users: 'days_28',
    page_post_engagements: 'days_28',
    page_consumptions: 'days_28',
    page_consumptions_unique: 'days_28',
    page_negative_feedback: 'days_28',
    page_positive_feedback_by_type: 'days_28',
    
    // Followers/Fans
    page_fans: 'lifetime',
    page_fan_adds: 'days_28',
    page_fan_removes: 'days_28',
    page_fan_adds_unique: 'days_28',
    page_fans_online_per_day: 'days_28',
    
    // Page Views
    page_views_total: 'days_28',
    page_views_logged_in_unique: 'days_28',
    page_views_external_referrals: 'days_28',
    
    // Posts
    page_posts_impressions: 'days_28',
    page_posts_impressions_unique: 'days_28',
    page_posts_impressions_paid: 'days_28',
    page_posts_impressions_organic: 'days_28',
    page_posts_impressions_viral: 'days_28',
    
    // Video
    page_video_views: 'days_28',
    page_video_views_organic: 'days_28',
    page_video_views_paid: 'days_28',
    page_video_views_unique: 'days_28',
    page_video_complete_views_30s: 'days_28',
    
    // Actions
    page_actions_post_reactions_total: 'days_28',
    page_actions_post_reactions_like_total: 'days_28',
    page_actions_post_reactions_love_total: 'days_28',
    page_actions_post_reactions_wow_total: 'days_28',
    page_actions_post_reactions_haha_total: 'days_28',
    page_actions_post_reactions_sorry_total: 'days_28',
    page_actions_post_reactions_anger_total: 'days_28'
  };

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
   * Fetch page insights from Facebook Graph API
   */
  async fetchPageInsights(pageId: string, accessToken: string): Promise<FacebookInsight[]> {
    const insights: FacebookInsight[] = [];

    try {
      for (const [metric, period] of Object.entries(this.metricPeriods)) {
        try {
          const response = await axios.get(`${this.baseUrl}/${pageId}/insights/${metric}`, {
            params: {
              access_token: accessToken,
              period: period
            }
          });

          if (response.data.data && response.data.data.length > 0) {
            insights.push(response.data.data[0]);
          }
        } catch (error: any) {
          const fbError = error.response?.data?.error;
          if (fbError) {
            console.log(`⚠️ Skipped metric ${metric}: ${fbError.message} (${fbError.code})`);
          } else {
            console.log(`⚠️ Skipped metric ${metric}: ${error.message}`);
          }
        }
      }

      console.log(`📊 Successfully fetched ${insights.length} insights metrics`);
      return insights;
    } catch (error) {
      console.error('Error fetching Facebook insights:', error);
      throw new Error('Failed to fetch Facebook insights');
    }
  }

  /**
   * Store Facebook insights in database
   */
  async storeInsights(clientId: number, insights: FacebookInsight[]): Promise<void> {
    try {
      for (const insight of insights) {
        const values = insight.values || [];
        
        for (const value of values) {
          const metricValue = typeof value.value === 'object' 
            ? JSON.stringify(value.value) 
            : value.value;

          await this.pool.query(
            `INSERT INTO facebook_insights 
             (client_id, metric_name, metric_title, metric_description, metric_value, period, recorded_at) 
             VALUES ($1, $2, $3, $4, $5, $6, NOW())
             ON CONFLICT (client_id, metric_name, recorded_at) 
             DO UPDATE SET metric_value = EXCLUDED.metric_value`,
            [
              clientId,
              insight.name,
              insight.title,
              insight.description,
              metricValue,
              insight.period
            ]
          );
        }
      }

      console.log(`✅ Stored ${insights.length} Facebook insights for client ${clientId}`);
    } catch (error) {
      console.error('Error storing Facebook insights:', error);
      throw error;
    }
  }

  /**
   * Fetch all posts from Facebook page with detailed insights
   * Note: Post-level insights require additional Facebook permissions and app review
   * We fetch basic post data and estimate engagement from reactions/comments/shares
   */
  async fetchPosts(pageId: string, accessToken: string, limit: number = 50): Promise<FacebookPost[]> {
    try {
      console.log(`📝 Fetching posts with images and engagement for page ${pageId}...`);
      
      const response = await axios.get(`${this.baseUrl}/${pageId}/posts`, {
        params: {
          access_token: accessToken,
          fields: 'id,message,created_time,permalink_url,type,story,full_picture,attachments{media,type,url,media_type},likes.summary(true),comments.summary(true),shares,reactions.summary(true)',
          limit: limit
        }
      });

      const posts = response.data.data || [];
      console.log(`  ✅ Fetched ${posts.length} posts with images and engagement data`);
      
      return posts;
    } catch (error: any) {
      console.error('❌ Error fetching Facebook posts:', {
        pageId,
        error: error.response?.data || error.message,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      
      // Provide more helpful error message
      const fbError = error.response?.data?.error;
      if (fbError) {
        throw new Error(`Facebook API Error: ${fbError.message} (Code: ${fbError.code}, Type: ${fbError.type})`);
      }
      
      throw new Error('Failed to fetch Facebook posts');
    }
  }

  /**
   * Store Facebook posts in database with detailed insights
   * Estimates views based on engagement since post-level insights require special permissions
   */
  async storePosts(clientId: number, posts: any[]): Promise<void> {
    try {
      // Get page-level metrics to estimate per-post performance
      const pageMetrics = await this.pool.query(
        `SELECT metric_name, metric_value 
         FROM facebook_insights 
         WHERE client_id = $1 
         AND metric_name IN ('page_posts_impressions', 'page_engaged_users')
         ORDER BY recorded_at DESC 
         LIMIT 2`,
        [clientId]
      );

      const pageImpressions = pageMetrics.rows.find(r => r.metric_name === 'page_posts_impressions')?.metric_value || 0;
      const pageEngaged = pageMetrics.rows.find(r => r.metric_name === 'page_engaged_users')?.metric_value || 0;
      const avgImpressionsPerPost = posts.length > 0 ? Math.round(Number(pageImpressions) / posts.length) : 0;

      console.log(`  📊 Estimating metrics: ${avgImpressionsPerPost} avg impressions per post (from ${pageImpressions} total page impressions)`);

      for (const post of posts) {
        // Extract image from attachments if available
        let fullPicture = post.full_picture || null;
        if (!fullPicture && post.attachments?.data?.[0]) {
          const attachment = post.attachments.data[0];
          fullPicture = attachment.media?.image?.src || attachment.url || null;
        }

        // Calculate engagement-based metrics (since we can't get actual post insights without special permissions)
        const totalReactions = post.reactions?.summary?.total_count || 0;
        const totalComments = post.comments?.summary?.total_count || 0;
        const totalShares = post.shares?.count || 0;
        const totalEngagement = totalReactions + totalComments + totalShares;

        // Estimate impressions based on engagement (rough estimate: 100 views per engagement)
        const estimatedImpressions = totalEngagement > 0 ? totalEngagement * 100 : avgImpressionsPerPost;
        const estimatedUniqueImpressions = Math.round(estimatedImpressions * 0.7); // ~70% unique
        const estimatedEngagedUsers = totalEngagement * 2; // Rough estimate
        const estimatedClicks = Math.round(totalEngagement * 0.3); // ~30% of engagement results in clicks

        await this.pool.query(
          `INSERT INTO facebook_posts 
           (client_id, post_id, message, created_time, permalink_url, post_type, post_story, full_picture,
            likes, comments, shares, total_reactions, 
            post_impressions, post_impressions_unique, post_engaged_users, post_clicks, post_video_views,
            post_data, synced_at) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW())
           ON CONFLICT (post_id) 
           DO UPDATE SET 
             post_type = EXCLUDED.post_type,
             full_picture = EXCLUDED.full_picture,
             likes = EXCLUDED.likes,
             comments = EXCLUDED.comments,
             shares = EXCLUDED.shares,
             total_reactions = EXCLUDED.total_reactions,
             post_impressions = EXCLUDED.post_impressions,
             post_impressions_unique = EXCLUDED.post_impressions_unique,
             post_engaged_users = EXCLUDED.post_engaged_users,
             post_clicks = EXCLUDED.post_clicks,
             post_video_views = EXCLUDED.post_video_views,
             post_data = EXCLUDED.post_data,
             synced_at = NOW()`,
          [
            clientId,
            post.id,
            post.message || post.story || '',
            post.created_time,
            post.permalink_url,
            post.type || 'status',
            post.story || null,
            fullPicture,
            post.likes?.summary?.total_count || 0,
            post.comments?.summary?.total_count || 0,
            post.shares?.count || 0,
            totalReactions,
            estimatedImpressions,
            estimatedUniqueImpressions,
            estimatedEngagedUsers,
            estimatedClicks,
            0, // video views (can be estimated if type is 'video')
            JSON.stringify(post)
          ]
        );
      }

      console.log(`✅ Stored ${posts.length} Facebook posts with detailed insights for client ${clientId}`);
    } catch (error) {
      console.error('Error storing Facebook posts:', error);
      throw error;
    }
  }

  /**
   * Get follower statistics from Facebook
   */
  async getFollowerStats(pageId: string, accessToken: string): Promise<any> {
    try {
      // Fetch current total followers
      const fansResponse = await axios.get(`${this.baseUrl}/${pageId}/insights/page_fans`, {
        params: {
          access_token: accessToken,
          period: 'lifetime'
        }
      });

      // Fetch follower adds over 28 days
      const fanAddsResponse = await axios.get(`${this.baseUrl}/${pageId}/insights/page_fan_adds`, {
        params: {
          access_token: accessToken,
          period: 'days_28'
        }
      });

      // Fetch follower removes over 28 days
      const fanRemovesResponse = await axios.get(`${this.baseUrl}/${pageId}/insights/page_fan_removes`, {
        params: {
          access_token: accessToken,
          period: 'days_28'
        }
      });

      const totalFollowers = fansResponse.data.data?.[0]?.values?.[0]?.value || 0;
      const fanAdds = fanAddsResponse.data.data?.[0]?.values || [];
      const fanRemoves = fanRemovesResponse.data.data?.[0]?.values || [];

      // Calculate net followers over 28 days
      const totalFanAdds = fanAdds.reduce((sum: number, val: any) => sum + (Number(val.value) || 0), 0);
      const totalFanRemoves = fanRemoves.reduce((sum: number, val: any) => sum + (Number(val.value) || 0), 0);
      const netFollowers = totalFanAdds - totalFanRemoves;

      console.log(`👥 Follower stats: ${totalFollowers} total, +${totalFanAdds} adds, -${totalFanRemoves} removes`);

      return {
        totalFollowers,
        totalFanAdds,
        totalFanRemoves,
        netFollowers,
        fanAddsData: fanAdds,
        fanRemovesData: fanRemoves
      };
    } catch (error: any) {
      console.error('❌ Error getting follower stats:', {
        pageId,
        error: error.response?.data || error.message,
        status: error.response?.status
      });
      
      const fbError = error.response?.data?.error;
      if (fbError) {
        throw new Error(`Facebook API Error: ${fbError.message} (Code: ${fbError.code})`);
      }
      
      throw new Error('Failed to get follower stats');
    }
  }

  /**
   * Store follower statistics in database
   */
  async storeFollowerStats(clientId: number, stats: any): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO facebook_follower_stats 
         (client_id, total_followers, fan_adds, fan_removes, net_change, recorded_at) 
         VALUES ($1, $2, $3, $4, $5, CURRENT_DATE)
         ON CONFLICT (client_id, recorded_at) 
         DO UPDATE SET 
           total_followers = EXCLUDED.total_followers,
           fan_adds = EXCLUDED.fan_adds,
           fan_removes = EXCLUDED.fan_removes,
           net_change = EXCLUDED.net_change`,
        [
          clientId,
          stats.totalFollowers,
          stats.totalFanAdds,
          stats.totalFanRemoves,
          stats.netFollowers
        ]
      );

      console.log(`✅ Stored follower stats for client ${clientId}`);
    } catch (error) {
      console.error('Error storing follower stats:', error);
      throw error;
    }
  }

  /**
   * Get stored insights from database
   */
  async getStoredInsights(clientId: number): Promise<any> {
    try {
      const result = await this.pool.query(
        `SELECT metric_name, metric_title, metric_value, period, recorded_at
         FROM facebook_insights 
         WHERE client_id = $1 
         ORDER BY recorded_at DESC
         LIMIT 50`,
        [clientId]
      );

      // Group by metric name and get latest value
      const insights: Record<string, any> = {};
      for (const row of result.rows) {
        if (!insights[row.metric_name]) {
          insights[row.metric_name] = {
            name: row.metric_name,
            title: row.metric_title,
            value: row.metric_value,
            period: row.period,
            recorded_at: row.recorded_at
          };
        }
      }

      return Object.values(insights);
    } catch (error) {
      console.error('Error getting stored insights:', error);
      return [];
    }
  }

  /**
   * Get stored posts from database
   */
  async getStoredPosts(clientId: number, limit: number = 20): Promise<any[]> {
    try {
      const result = await this.pool.query(
        `SELECT * FROM facebook_posts 
         WHERE client_id = $1 
         ORDER BY created_time DESC 
         LIMIT $2`,
        [clientId, limit]
      );

      return result.rows;
    } catch (error) {
      console.error('Error getting stored posts:', error);
      return [];
    }
  }

  /**
   * Get stored follower stats from database
   */
  async getStoredFollowerStats(clientId: number, days: number = 30): Promise<any[]> {
    try {
      const result = await this.pool.query(
        `SELECT * FROM facebook_follower_stats 
         WHERE client_id = $1 
         AND recorded_at >= CURRENT_DATE - INTERVAL '${days} days'
         ORDER BY recorded_at DESC`,
        [clientId]
      );

      return result.rows;
    } catch (error) {
      console.error('Error getting stored follower stats:', error);
      return [];
    }
  }

  /**
   * Calculate aggregated metrics for overview
   */
  calculateOverviewMetrics(insights: any[]): any {
    const metrics = {
      pageViews: 0,
      followers: 0,
      engagement: 0,
      reach: 0,
      impressions: 0,
      postEngagements: 0
    };

    console.log(`📊 Calculating overview metrics from ${insights.length} insights`);

    for (const insight of insights) {
      // Handle both metric_name (from DB) and name (from API) formats
      const metricName = insight.metric_name || insight.name;
      const metricValue = insight.metric_value || insight.value;
      
      console.log(`  - ${metricName}: ${metricValue}`);
      
      switch (metricName) {
        case 'page_views_total':
          metrics.pageViews = Number(metricValue) || 0;
          break;
        case 'page_fans':
          metrics.followers = Number(metricValue) || 0;
          break;
        case 'page_engaged_users':
          metrics.engagement = Number(metricValue) || 0;
          break;
        case 'page_impressions_unique':
          metrics.reach = Number(metricValue) || 0;
          break;
        case 'page_impressions':
          metrics.impressions = Number(metricValue) || 0;
          break;
        case 'page_post_engagements':
          metrics.postEngagements = Number(metricValue) || 0;
          break;
      }
    }

    // Calculate engagement rate
    if (metrics.reach > 0) {
      metrics.engagement = (metrics.postEngagements / metrics.reach) * 100;
    }

    console.log(`📈 Final metrics:`, metrics);

    return metrics;
  }

  /**
   * Get last sync time for a client
   */
  async getLastSyncTime(clientId: number): Promise<Date | null> {
    try {
      const result = await this.pool.query(
        `SELECT MAX(recorded_at) as last_sync 
         FROM facebook_insights 
         WHERE client_id = $1`,
        [clientId]
      );
      
      return result.rows[0]?.last_sync || null;
    } catch (error) {
      console.error('Error getting last sync time:', error);
      return null;
    }
  }
}

export default FacebookService;

