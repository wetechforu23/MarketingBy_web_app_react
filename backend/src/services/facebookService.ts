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

  // Metrics to fetch with their periods
  private metricPeriods: Record<string, string> = {
    page_impressions: 'days_28',
    page_impressions_unique: 'days_28',
    page_impressions_organic: 'day',
    page_impressions_paid: 'day',
    page_engaged_users: 'day',
    page_post_engagements: 'day',
    page_consumptions: 'day',
    page_fans: 'lifetime',
    page_fan_adds: 'days_28',
    page_fan_removes: 'days_28',
    page_views_total: 'days_28',
    page_posts_impressions: 'days_28',
    page_posts_impressions_unique: 'days_28',
    page_video_views: 'days_28',
    page_video_views_organic: 'days_28',
    page_video_views_paid: 'days_28'
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
   * Fetch all posts from Facebook page
   */
  async fetchPosts(pageId: string, accessToken: string, limit: number = 50): Promise<FacebookPost[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/${pageId}/posts`, {
        params: {
          access_token: accessToken,
          fields: 'id,message,created_time,permalink_url,likes.summary(true),comments.summary(true),shares,reactions.summary(true)',
          limit: limit
        }
      });

      return response.data.data || [];
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
   * Store Facebook posts in database
   */
  async storePosts(clientId: number, posts: FacebookPost[]): Promise<void> {
    try {
      for (const post of posts) {
        await this.pool.query(
          `INSERT INTO facebook_posts 
           (client_id, post_id, message, created_time, permalink_url, likes, comments, shares, total_reactions, synced_at) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
           ON CONFLICT (post_id) 
           DO UPDATE SET 
             likes = EXCLUDED.likes,
             comments = EXCLUDED.comments,
             shares = EXCLUDED.shares,
             total_reactions = EXCLUDED.total_reactions,
             synced_at = NOW()`,
          [
            clientId,
            post.id,
            post.message || '',
            post.created_time,
            post.permalink_url,
            post.likes?.summary?.total_count || 0,
            post.comments?.summary?.total_count || 0,
            post.shares?.count || 0,
            post.reactions?.summary?.total_count || 0
          ]
        );
      }

      console.log(`✅ Stored ${posts.length} Facebook posts for client ${clientId}`);
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

    for (const insight of insights) {
      switch (insight.name) {
        case 'page_views_total':
          metrics.pageViews = Number(insight.value) || 0;
          break;
        case 'page_fans':
          metrics.followers = Number(insight.value) || 0;
          break;
        case 'page_engaged_users':
          metrics.engagement = Number(insight.value) || 0;
          break;
        case 'page_impressions_unique':
          metrics.reach = Number(insight.value) || 0;
          break;
        case 'page_impressions':
          metrics.impressions = Number(insight.value) || 0;
          break;
        case 'page_post_engagements':
          metrics.postEngagements = Number(insight.value) || 0;
          break;
      }
    }

    // Calculate engagement rate
    if (metrics.reach > 0) {
      metrics.engagement = (metrics.postEngagements / metrics.reach) * 100;
    }

    return metrics;
  }
}

export default FacebookService;

