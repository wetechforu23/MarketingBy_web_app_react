import { Pool } from 'pg';
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
// import { UTMTrackingService } from './utmTrackingService'; // Temporarily disabled for deployment

/**
 * Defines the structure for Facebook credentials retrieved from the database.
 */
interface FacebookCredentials {
  page_id: string;
  access_token: string;
}

/**
 * Defines the final data structure returned by the service.
 */
interface FacebookData {
  pageViews: number;
  followers: number;
  engagement: number;
  engagementRate: number;
  reach: number;
  impressions: number;
  posts: any[];
}

/**
 * A service class to handle all interactions with the Facebook Graph API.
 * Based on working reference implementation.
 */
class FacebookService {
  private pool: Pool;
  private baseUrl = 'https://graph.facebook.com/v23.0';
  private pageMetricsUrl = 'https://graph.facebook.com/v18.0'; // For Facebook Page metrics only
  
  // Metric periods from working reference - CRITICAL for correct data!
  private metricPeriods: Record<string, string> = {
    page_impressions: 'days_28',
    page_impressions_unique: 'days_28',
    page_impressions_organic: 'day',
    page_impressions_paid: 'day',
    page_engaged_users: 'day',
    page_post_engagements: 'day',
    page_consumptions: 'day',
    page_views_total: 'days_28',
    page_posts_impressions: 'days_28',
    page_posts_impressions_unique: 'days_28',
    page_video_views: 'days_28',
    page_video_views_organic: 'days_28',
    page_video_views_paid: 'days_28',
    page_fans: 'lifetime',
    page_fan_adds: 'days_28',
    page_fan_removes: 'days_28',
    post_reactions_like_total: 'lifetime',
    post_reactions_love_total: 'lifetime',
    post_reactions_wow_total: 'lifetime',
    post_reactions_haha_total: 'lifetime',
    post_reactions_sorry_total: 'lifetime',
    post_reactions_anger_total: 'lifetime',
    post_reactions_by_type_total: 'lifetime'
  };

  // Core 8 metrics for Facebook Page overview
  private corePageMetrics = [
    'page_impressions',
    'page_impressions_unique',
    'page_views_total',
    'page_posts_impressions',
    'page_posts_impressions_unique',
    'page_fans',
    'page_fan_adds',
    'page_fan_removes'
  ];

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Retrieves Facebook credentials for a given client from the database.
   */
  async getClientCredentials(clientId: number): Promise<FacebookCredentials | null> {
    try {
      console.log(`\n🔍 [DB QUERY] Fetching Facebook credentials for client ${clientId}...`);
      console.log(`   📝 Query: SELECT credentials FROM client_credentials WHERE client_id = ${clientId} AND service_type = 'facebook'`);
      
      const result = await this.pool.query(
        'SELECT credentials FROM client_credentials WHERE client_id = $1 AND service_type = $2',
        [clientId, 'facebook']
      );
      
      console.log(`   📊 Query returned ${result.rows.length} row(s)`);
      
      if (result.rows.length === 0) {
        console.log(`   ⚠️  No Facebook credentials found for client ${clientId}`);
        return null;
      }
      
      const credentials = result.rows[0].credentials;
      console.log(`   ✅ Credentials retrieved successfully:`);
      console.log(`      📄 Page ID: ${credentials.page_id}`);
      console.log(`      🔑 Token Length: ${credentials.access_token?.length || 0} characters`);
      console.log(`      🔑 Token Preview: ${credentials.access_token?.substring(0, 20)}...${credentials.access_token?.substring(credentials.access_token.length - 10)}`);
      
      return {
        page_id: credentials.page_id,
        access_token: credentials.access_token,
      };
    } catch (error: any) {
      console.error(`\n❌ [DB ERROR] Failed to get client credentials for client ${clientId}`);
      console.error(`   📋 Error: ${error.message}`);
      console.error(`   📚 Stack: ${error.stack}`);
      return null;
    }
  }

  /**
   * Validates and exchanges user access token for long-lived token and page tokens
   * Based on working reference implementation
   */
  async validateManualToken(accessToken: string) {
    try {
      console.log('🔍 Validating manual token...');
      
      // Step 0: Validate token format
      if (!accessToken || typeof accessToken !== 'string' || accessToken.length < 10) {
        throw new Error('Invalid token format. Please provide a valid Facebook access token.');
      }

      // Step 1: Validate token by fetching user info
      console.log('🔍 Testing token with user info...');
      const userResponse = await axios.get(`${this.baseUrl}/me`, {
        params: { 
          access_token: accessToken,
          fields: 'id,name'
        }
      });

      if (userResponse.data.error) {
        const errorMsg = userResponse.data.error.message;
        if (errorMsg.includes('expired') || errorMsg.includes('invalid')) {
          throw new Error(`Invalid or expired access token: ${errorMsg}. Please generate a new token from Facebook Graph API Explorer.`);
        }
        throw new Error(`Token validation failed: ${errorMsg}`);
      }

      console.log('✅ Token is valid for user:', userResponse.data.name);

      // Step 2: Get user's pages
      console.log('📄 Fetching user pages...');
      const pagesResponse = await axios.get(`${this.baseUrl}/me/accounts`, {
        params: { 
          access_token: accessToken,
          fields: 'id,name,access_token,category,followers_count'
        }
      });

      if (pagesResponse.data.error) {
        throw new Error(`Failed to fetch pages: ${pagesResponse.data.error.message}`);
      }

      const pages = pagesResponse.data.data || [];
      console.log(`📊 Found ${pages.length} pages:`, pages.map((p: any) => ({ id: p.id, name: p.name })));
      
      if (pages.length === 0) {
        throw new Error('No Facebook pages found. Make sure your token has the required permissions (pages_show_list, pages_read_engagement, read_insights).');
      }

      return {
        userToken: accessToken,
        pages: pages.map((page: any) => ({
          id: page.id,
          name: page.name,
          access_token: page.access_token,
          category: page.category || 'Facebook Page',
          followers: page.followers_count || 0
        }))
      };
    } catch (error: any) {
      console.error('❌ Manual token validation failed:', error.message);
      throw new Error(`Manual token validation failed: ${error.message}`);
    }
  }

  /**
   * Fetches page information using the correct API flow
   */
  private async fetchPageInfo(pageId: string, accessToken: string): Promise<any> {
    try {
      console.log(`📊 Fetching page info for ${pageId}...`);
      const response = await axios.get(`${this.baseUrl}/${pageId}`, {
        params: {
          access_token: accessToken,
          fields: 'id,name,category,followers_count,fan_count,checkins,were_here_count,talking_about_count,engagement'
        }
      });
      
      if (response.data.error) {
        throw new Error(response.data.error.message);
      }
      
      console.log('✅ Page info retrieved:', {
        id: response.data.id,
        name: response.data.name,
        followers: response.data.followers_count || response.data.fan_count || 0
      });
      
      return response.data;
    } catch (error: any) {
      console.error(`❌ Error fetching page info: ${error.message}`);
      throw error;
    }
  }

  /**
   * Fetches page insights using correct metric periods
   * Based on working reference implementation
   */
  private async fetchInsights(pageId: string, accessToken: string): Promise<Record<string, any>> {
    try {
      console.log(`📊 Fetching insights for page ${pageId}...`);
      
      const metrics = [
        'page_impressions',
        'page_impressions_unique',
        'page_impressions_organic',
        'page_impressions_paid',
        'page_engaged_users',
        'page_post_engagements',
        'page_consumptions',
        'page_fans',
        'page_fan_adds',
        'page_fan_removes',
        'page_views_total',
        'page_posts_impressions',
        'page_posts_impressions_unique',
        'page_video_views',
        'page_video_views_organic',
        'page_video_views_paid'
      ];

      const insightsData: Record<string, any> = {};

      // Fetch each metric with its correct period
      for (const metric of metrics) {
        try {
          const period = this.metricPeriods[metric];
          if (!period) {
            console.log(`⛔ Skipped metric ${metric}: period not defined`);
            continue;
          }

          const response = await axios.get(`${this.baseUrl}/${pageId}/insights/${metric}`, {
            params: {
              access_token: accessToken,
              period: period
            }
          });

          if (response.data.data && response.data.data.length > 0) {
            const insight = response.data.data[0];
            const values = insight.values || [];
            
            if (values.length > 0) {
              // For 'day' period, sum all values
              if (period === 'day') {
                const total = values.reduce((sum: number, val: any) => sum + (Number(val.value) || 0), 0);
                insightsData[metric] = total;
                console.log(`📊 ${metric}: ${total} (summed from ${values.length} day values)`);
              } else {
                // For 'days_28' and 'lifetime', use the latest value
                const latestValue = values[values.length - 1];
                insightsData[metric] = Number(latestValue.value) || 0;
                console.log(`📊 ${metric}: ${insightsData[metric]} (${period})`);
              }
            }
          }
        } catch (error: any) {
          console.log(`⚠️ Skipped metric ${metric}: ${error.message}`);
        }
      }

      return insightsData;
    } catch (error: any) {
      console.error(`❌ Error fetching insights: ${error.message}`);
      return {};
    }
  }

  /**
   * Fetches posts with insights included in the query (efficient method)
   * Based on working reference implementation
   */
  private async fetchPosts(pageId: string, accessToken: string, limit: number = 50): Promise<any[]> {
    try {
      console.log('\n🔍 ================================================');
      console.log('📊 FETCHING FACEBOOK POSTS WITH INSIGHTS');
      console.log('🔍 ================================================');
      console.log(`📍 Page ID: ${pageId}`);
      console.log(`🔑 Token (first 30): ${accessToken.substring(0, 30)}...`);
      console.log(`📏 Limit: ${limit} posts per page`);
      
      // Include insights directly in the query - THIS IS KEY!
      // Only request metrics that are reliably available
      const fields = [
        'id', 'message', 'created_time', 'permalink_url', 'type', 'full_picture', 'attachments',
        'likes.summary(true)', 'comments.summary(true)', 'shares', 'reactions.summary(true)',
        'insights.metric(post_impressions,post_impressions_unique,post_reactions_by_type_total)'
      ].join(',');

      console.log(`📋 Fields requested:\n   ${fields.replace(/,/g, '\n   ')}`);
      console.log('');

      const allPosts = [];
      let nextUrl = `${this.baseUrl}/${pageId}/posts?access_token=${accessToken}&fields=${fields}&limit=${limit}`;
      let pageCount = 0;
      const maxPages = 5;

      console.log(`🌐 API Base URL: ${this.baseUrl}`);
      console.log(`🌐 First Request: ${this.baseUrl}/${pageId}/posts?fields=${fields.substring(0, 50)}...`);
      console.log('');

      while (nextUrl && pageCount < maxPages) {
        pageCount++;
        console.log(`\n📄 Fetching page ${pageCount}...`);
        
        const response = await axios.get(nextUrl);
        
        console.log(`   ✅ Response Status: ${response.status}`);
        console.log(`   📊 Posts in response: ${response.data.data?.length || 0}`);
        
        if (response.data.error) {
          console.error('   ❌ Facebook API Error:', response.data.error.message);
          console.error('   📋 Error Details:', JSON.stringify(response.data.error, null, 2));
          break;
        }
        
        // Log first post's raw data to see structure
        if (pageCount === 1 && response.data.data && response.data.data.length > 0) {
          console.log('\n   🔍 RAW DATA FROM FIRST POST:');
          console.log('   ================================');
          const firstPost = response.data.data[0];
          console.log(`   Post ID: ${firstPost.id}`);
          console.log(`   Message: ${(firstPost.message || 'No message').substring(0, 80)}...`);
          console.log(`   Has insights property: ${!!firstPost.insights}`);
          if (firstPost.insights) {
            console.log(`   Insights type: ${typeof firstPost.insights}`);
            console.log(`   Insights.data exists: ${!!firstPost.insights.data}`);
            if (firstPost.insights.data) {
              console.log(`   Insights.data length: ${firstPost.insights.data.length}`);
              console.log('   Insights.data content:');
              firstPost.insights.data.forEach((insight: any, idx: number) => {
                console.log(`      [${idx}] ${insight.name}: ${JSON.stringify(insight.values?.[0]?.value)}`);
              });
            } else {
              console.log('   ⚠️ insights.data is missing or empty!');
            }
          } else {
            console.log('   ⚠️ No insights property in post!');
          }
          console.log('   ================================\n');
        }
        
        allPosts.push(...(response.data.data || []));
        nextUrl = response.data.paging?.next;
        
        if (nextUrl) {
          console.log(`   ➡️  Has next page`);
        } else {
          console.log(`   ✅ No more pages`);
        }
      }
      
      console.log(`\n✅ TOTAL FETCHED: ${allPosts.length} posts from ${pageCount} page(s)`);
      console.log('================================================\n');

      // Parse insights from each post
      console.log('📊 PARSING INSIGHTS FROM POSTS');
      console.log('================================');
      
      const postsWithInsights = allPosts.map((post, index) => {
        const parsedInsights: any = {
          post_impressions: 0,
          post_reach: 0,
          post_engaged_users: 0,
          post_clicks: 0,
          post_video_views: 0,
          post_reactions_breakdown: {}
        };

        console.log(`\nPost ${index + 1}/${allPosts.length}: ${post.id}`);
        console.log(`   Message: ${(post.message || 'No message').substring(0, 60)}...`);
        console.log(`   Has insights: ${!!post.insights?.data}`);

        if (post.insights?.data) {
          console.log(`   📊 Processing ${post.insights.data.length} insights...`);
          for (const insight of post.insights.data) {
            const value = insight.values[0]?.value;
            console.log(`      - ${insight.name}: ${value}`);
            
            if (value === undefined) {
              console.log(`        ⚠️ Value is undefined, skipping`);
              continue;
            }

            if (insight.name === 'post_impressions') {
              parsedInsights.post_impressions = Number(value);
              console.log(`        ✅ Set post_impressions = ${parsedInsights.post_impressions}`);
            }
            if (insight.name === 'post_impressions_unique') {
              parsedInsights.post_reach = Number(value);
              console.log(`        ✅ Set post_reach = ${parsedInsights.post_reach}`);
            }
            if (insight.name === 'post_engaged_users') {
              parsedInsights.post_engaged_users = Number(value);
              console.log(`        ✅ Set post_engaged_users = ${parsedInsights.post_engaged_users}`);
            }
            if (insight.name === 'post_clicks') {
              parsedInsights.post_clicks = Number(value);
              console.log(`        ✅ Set post_clicks = ${parsedInsights.post_clicks}`);
            }
            if (insight.name === 'post_video_views') {
              parsedInsights.post_video_views = Number(value);
              console.log(`        ✅ Set post_video_views = ${parsedInsights.post_video_views}`);
            }
            if (insight.name === 'post_reactions_by_type_total') {
              parsedInsights.post_reactions_breakdown = value;
              console.log(`        ✅ Set reactions_breakdown = ${JSON.stringify(value)}`);
            }
          }
          console.log(`   📋 Final parsed values:`);
          console.log(`      Impressions: ${parsedInsights.post_impressions}`);
          console.log(`      Reach: ${parsedInsights.post_reach}`);
          console.log(`      Engaged Users: ${parsedInsights.post_engaged_users}`);
        } else {
          console.log(`   ⚠️ No insights.data for this post`);
        }

        return { ...post, insights: parsedInsights };
      });
      
      console.log('\n================================');
      
      return postsWithInsights;
    } catch (error: any) {
      console.error(`❌ Error fetching posts: ${error.message}`);
      return [];
    }
  }

  /**
   * Fetches and stores Facebook data for a client
   */
  async fetchAndStoreData(clientId: number): Promise<FacebookData> {
    try {
      console.log(`\n🔄 === REFRESH: Starting Facebook data fetch for client ${clientId} ===`);

      // Get credentials
      const creds = await this.getClientCredentials(clientId);
      if (!creds) {
        throw new Error('No Facebook credentials found for this client');
      }

      const { page_id, access_token } = creds;
      console.log(`   Using Page ID: ${page_id}`);

      // 1. Fetch page-level metrics using NEW getPageOverviewMetrics()
      console.log(`\n📊 Step 1: Fetching page-level metrics from Facebook Graph API...`);
      const overviewMetrics = await this.getPageOverviewMetrics(page_id, access_token);
      
      const pageViews = overviewMetrics.pageViews || 0;
      const followers = overviewMetrics.followers || 0;
      const engagement = overviewMetrics.engagement || 0;
      const reach = overviewMetrics.reach || 0;
      const impressions = overviewMetrics.impressions || 0;

      // Calculate engagement rate (cap at 100% to prevent database overflow)
      let engagementRate = 0;
      if (followers > 0 && engagement > 0) {
        const rawRate = (engagement / followers) * 100;
        engagementRate = Number(Math.min(rawRate, 100).toFixed(2)); // Cap at 100% max
      }

      console.log(`✅ Page-level metrics fetched:`);
      console.log(`   Page Views: ${pageViews}`);
      console.log(`   Followers: ${followers}`);
      console.log(`   Engagement: ${engagement}`);
      console.log(`   Reach: ${reach}`);
      console.log(`   Impressions: ${impressions}`);
      console.log(`   Engagement Rate: ${engagementRate}%`);
      
      // 2. Fetch posts with inline insights using NEW fetchPostsWithInlineInsights()
      console.log(`\n📝 Step 2: Fetching posts with inline insights from Facebook Graph API...`);
      const posts = await this.fetchPostsWithInlineInsights(page_id, access_token, 100);
      console.log(`✅ Fetched ${posts.length} posts with inline insights`);

      // 3. Store EVERYTHING in database using transaction
      console.log(`\n💾 Step 3: Storing all data in database...`);
      console.log(`   🔗 Acquiring database connection...`);
      const dbClient = await this.pool.connect();
      console.log(`   ✅ Database connection acquired`);
      
      try {
        console.log(`   🔄 Starting transaction (BEGIN)...`);
        await dbClient.query('BEGIN');
        console.log(`   ✅ Transaction started`);

        // Store page-level metrics in facebook_analytics table
        console.log(`\n   📊 Storing page-level metrics to facebook_analytics table...`);
        console.log(`      Client ID: ${clientId}`);
        console.log(`      Page Views: ${pageViews}`);
        console.log(`      Followers: ${followers}`);
        console.log(`      Engagement: ${engagement}`);
        console.log(`      Reach: ${reach}`);
        console.log(`      Impressions: ${impressions}`);
        console.log(`      Engagement Rate: ${engagementRate}%`);
        
        const analyticsResult = await dbClient.query(
          `INSERT INTO facebook_analytics (
            client_id, page_views, followers, engagement, reach, impressions, engagement_rate, synced_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
          ON CONFLICT (client_id) 
          DO UPDATE SET 
            page_views = $2, followers = $3, engagement = $4, reach = $5, impressions = $6, 
            engagement_rate = $7, synced_at = NOW(), updated_at = NOW()`,
          [clientId, pageViews, followers, engagement, reach, impressions, engagementRate]
        );
        console.log(`   ✅ Page-level metrics stored (${analyticsResult.rowCount} row affected)`);

        // Store all posts in facebook_posts table
        console.log(`\n   📝 Storing ${posts.length} posts to facebook_posts table...`);
        let insertedCount = 0;
        let updatedCount = 0;
        
        for (let i = 0; i < posts.length; i++) {
          const post = posts[i];
          console.log(`      [${i + 1}/${posts.length}] Storing post ${post.post_id}...`);
          console.log(`         Message: ${(post.message || 'No text').substring(0, 50)}...`);
          console.log(`         Impressions: ${post.post_impressions || 0}, Reach: ${post.post_reach || 0}, Engaged: ${post.post_engaged_users || 0}`);
          
          const postResult = await dbClient.query(
            `INSERT INTO facebook_posts (
              client_id, post_id, message, created_time, post_type, permalink_url,
              post_impressions, post_reach, post_clicks, post_engaged_users, post_video_views,
              reactions_like, reactions_love, reactions_haha, reactions_wow, reactions_sad, reactions_angry,
              comments_count, shares_count, synced_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW())
            ON CONFLICT (post_id) 
            DO UPDATE SET 
              message = $3, post_impressions = $7, post_reach = $8, post_clicks = $9, post_engaged_users = $10,
              post_video_views = $11, reactions_like = $12, reactions_love = $13, 
              reactions_haha = $14, reactions_wow = $15, reactions_sad = $16, reactions_angry = $17, 
              comments_count = $18, shares_count = $19, synced_at = NOW()
            RETURNING (xmax = 0) AS inserted`,
            [
              clientId,
              post.post_id,
              post.message || 'No text',
              post.created_time,
              post.post_type || 'post',
              post.permalink_url || '',
              post.post_impressions || 0,
              post.post_reach || 0,
              post.post_clicks || 0,
              post.post_engaged_users || 0,
              0, // post_video_views - not available in this call
              post.reactions_like || 0,
              post.reactions_love || 0,
              post.reactions_haha || 0,
              post.reactions_wow || 0,
              post.reactions_sad || 0,
              post.reactions_angry || 0,
              post.comments_count || 0,
              post.shares_count || 0
            ]
          );
          
          if (postResult.rows[0]?.inserted) {
            insertedCount++;
            console.log(`         ✅ Inserted new post`);
          } else {
            updatedCount++;
            console.log(`         ✅ Updated existing post`);
          }
        }
        console.log(`\n   ✅ All ${posts.length} posts stored (${insertedCount} inserted, ${updatedCount} updated)`);

        console.log(`\n   🔄 Committing transaction (COMMIT)...`);
        await dbClient.query('COMMIT');
        console.log(`   ✅ Transaction committed - all data stored successfully!`);
      } catch (error: any) {
        console.error(`\n   ❌ DATABASE TRANSACTION ERROR!`);
        console.error(`      Error Type: ${error.constructor.name}`);
        console.error(`      Error Message: ${error.message}`);
        console.error(`      Error Code: ${error.code}`);
        console.error(`      Error Detail: ${error.detail || 'N/A'}`);
        
        console.log(`\n   🔄 Rolling back transaction (ROLLBACK)...`);
        await dbClient.query('ROLLBACK');
        console.log(`   ✅ Transaction rolled back`);
        throw error;
      } finally {
        console.log(`   🔗 Releasing database connection...`);
        dbClient.release();
        console.log(`   ✅ Database connection released`);
      }

      console.log(`\n✅ === REFRESH COMPLETE for client ${clientId} ===`);
      console.log(`   Stored: ${posts.length} posts + page-level metrics`);
      console.log(`   Sync time: ${new Date().toISOString()}`);

      return {
        pageViews,
        followers,
        engagement,
        engagementRate,
        reach,
        impressions,
        posts: posts.map(p => ({
          post_id: p.post_id,
          message: p.message,
          created_time: p.created_time,
          post_impressions: p.post_impressions || 0,
          post_reach: p.post_reach || 0,
          post_engaged_users: p.post_engaged_users || 0,
          total_reactions: p.total_reactions || 0
        }))
      };
    } catch (error: any) {
      console.error(`❌ Error in fetchAndStoreData: ${error.message}`);
      console.error(`   Stack:`, error.stack);
      throw error;
    }
  }

  /**
   * Gets stored data from database
   */
 /**
   * Gets stored data from database in the requested format
   */
    async getStoredData(clientId: number): Promise<FacebookData | null> {
        try {
        // Get page-level metrics (latest sync)
        const analyticsResult = await this.pool.query(
          `SELECT page_views, followers, engagement, reach, impressions, engagement_rate, synced_at, created_at FROM facebook_analytics WHERE client_id = $1 ORDER BY synced_at DESC, created_at DESC LIMIT 1`,
          [clientId]
        );
    
          // Get posts
          const postsResult = await this.pool.query(
            `SELECT post_id, message, created_time, post_impressions, post_reach, comments_count, shares_count, reactions_like, reactions_love, reactions_haha, reactions_wow, reactions_sad, reactions_angry FROM facebook_posts WHERE client_id = $1 ORDER BY created_time DESC LIMIT 50`,
            [clientId]
          );
    
          if (analyticsResult.rows.length === 0) {
            return null;
          }
    
          const analytics = analyticsResult.rows[0];
          
          return {
            pageViews: analytics.page_views || 0,
            followers: analytics.followers || 0,
            engagement: analytics.engagement || 0,
            engagementRate: analytics.engagement_rate || 0,
            reach: analytics.reach || 0,
            impressions: analytics.impressions || 0,
          
            // This 'posts' array now maps to your exact requirements
            posts: postsResult.rows.map(post => {
              const totalReactions = (post.reactions_like || 0) + (post.reactions_love || 0) + 
                                    (post.reactions_haha || 0) + (post.reactions_wow || 0) + 
                                    (post.reactions_sad || 0) + (post.reactions_angry || 0);
              return {
                "Post ID": post.post_id,
                "Message": post.message,
                "Created Time": post.created_time,
                "Likes": post.reactions_like || 0, // This is the count of 'Like' reactions only
                "Comments": post.comments_count || 0,
                "Shares": post.shares_count || 0,
                "Total Reactions": totalReactions, // This is the sum of all reaction types
                "Impressions": post.post_impressions || 0,
                "Unique Impressions": post.post_reach || 0 // 'post_reach' is the same as Unique Impressions
              };
            })
          };
      } catch (error: any) {
        console.error(`❌ Error getting stored data: ${error.message}`);
        console.error(`❌ Error details:`, error);
        console.error(`❌ Error stack:`, error.stack);
        if (error.position) {
          console.error(`❌ Error position in query:`, error.position);
        }
        return null;
      }
      }

  /**
   * Gets top performing posts
   */
  async getTopPerformingPosts(clientId: number, limit: number = 5): Promise<any[]> {
    try {
      const result = await this.pool.query(
        `SELECT post_id, message, created_time, post_impressions, post_reach, post_engaged_users,
                post_clicks, post_video_views, comments_count, shares_count,
                reactions_like, reactions_love, reactions_haha, reactions_wow, reactions_sad, reactions_angry,
                (post_engaged_users + comments_count + shares_count) as engagement_score,
                CASE 
                  WHEN post_reach > 0 THEN ((post_engaged_users::float / post_reach::float) * 100)
                  ELSE 0 
                END as engagement_rate
         FROM facebook_posts 
         WHERE client_id = $1 
         ORDER BY engagement_score DESC, post_impressions DESC
         LIMIT $2`,
        [clientId, limit]
      );

      return result.rows;
    } catch (error: any) {
      console.error(`❌ Error getting top posts: ${error.message}`);
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

      // NEW: Get client name for UTM campaign generation
      let clientName = 'client';
      let trackedMessage = message;
      let utmCampaign = '';
      let originalUrls: string[] = [];
      let trackedUrls: string[] = [];

      try {
        const clientResult = await this.pool.query(
          'SELECT client_name FROM clients WHERE id = $1',
          [clientId]
        );
        
        if (clientResult.rows.length > 0) {
          clientName = clientResult.rows[0].client_name;
        }

        // NEW: Process message content with UTM tracking
        // console.log('🔗 Processing content with UTM tracking...');
        // const utmResult = UTMTrackingService.processPostContent(
        //   message,
        //   clientId,
        //   clientName,
        //   'text'
        // );

        // Temporarily use original message (UTM tracking disabled for deployment)
        trackedMessage = message;
        utmCampaign = null;
        originalUrls = [];
        trackedUrls = [];

        if (originalUrls.length > 0) {
          console.log(`✅ UTM tracking applied to ${originalUrls.length} URL(s)`);
          console.log(`   Campaign: ${utmCampaign}`);
        }
      } catch (utmError: any) {
        // Graceful fallback: if UTM tracking fails, post without tracking
        console.warn('⚠️  UTM tracking failed, posting without tracking:', utmError.message);
        trackedMessage = message; // Use original message
      }

      // Post to Facebook with tracked content
      const response = await axios.post(
        `${this.baseUrl}/${credentials.page_id}/feed`,
        {
          message: trackedMessage,
          access_token: credentials.access_token
        }
      );

      const postId = response.data.id;
      const postUrl = `https://www.facebook.com/${postId.replace('_', '/posts/')}`;
      console.log(`✅ Facebook text post created: ${postId}`);

      // NEW: Store UTM data in database (optional - graceful if migration not run)
      if (utmCampaign && originalUrls.length > 0) {
        try {
          await this.pool.query(
            `INSERT INTO facebook_posts (
              client_id, post_id, message, created_time, permalink_url,
              utm_campaign, utm_source, utm_medium, original_urls, tracked_urls,
              synced_at
            ) VALUES ($1, $2, $3, NOW(), $4, $5, $6, $7, $8, $9, NOW())
            ON CONFLICT (post_id) DO UPDATE SET
              message = EXCLUDED.message,
              utm_campaign = EXCLUDED.utm_campaign,
              utm_source = EXCLUDED.utm_source,
              utm_medium = EXCLUDED.utm_medium,
              original_urls = EXCLUDED.original_urls,
              tracked_urls = EXCLUDED.tracked_urls,
              synced_at = NOW()`,
            [
              clientId,
              postId,
              trackedMessage,
              postUrl,
              utmCampaign,
              'facebook',
              'social',
              originalUrls,
              trackedUrls
            ]
          );
          console.log(`📊 UTM tracking data stored in database`);
        } catch (dbError: any) {
          // Graceful: if DB storage fails (e.g., migration not run), just log it
          console.warn('⚠️  Could not store UTM data in database:', dbError.message);
          console.warn('   (This is OK if you haven\'t run the UTM migration yet)');
        }
      }

      return {
        success: true,
        postId: postId,
        postUrl: postUrl
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
   * Helper: Check if URL is local and convert to file path
   */
  private getLocalFilePath(imageUrl: string): string | null {
    // Check if URL is local
    if (imageUrl.includes('localhost') || imageUrl.includes('127.0.0.1') || imageUrl.startsWith('/uploads/')) {
      // Extract the file path from URL
      const urlPath = imageUrl.includes('/uploads/') 
        ? imageUrl.substring(imageUrl.indexOf('/uploads/'))
        : imageUrl;
      
      // Convert to absolute file system path
      const filePath = path.join(__dirname, '../../uploads', path.basename(urlPath));
      
      // Check if file exists
      if (fs.existsSync(filePath)) {
        return filePath;
      }
    }
    return null;
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
      console.log(`📸 Image URL: ${imageUrl}`);

      // Check if it's a local file
      const localFilePath = this.getLocalFilePath(imageUrl);
      
      if (localFilePath) {
        console.log(`📤 Uploading local file: ${localFilePath}`);
        
        // Upload file directly to Facebook
        const form = new FormData();
        form.append('message', message);
        form.append('source', fs.createReadStream(localFilePath));
        form.append('access_token', credentials.access_token);

        const response = await axios.post(
          `${this.baseUrl}/${credentials.page_id}/photos`,
          form,
          {
            headers: {
              ...form.getHeaders(),
            },
          }
        );

        const postId = response.data.post_id || response.data.id;
        console.log(`✅ Facebook image post created: ${postId}`);

        return {
          success: true,
          postId: postId,
          postUrl: `https://www.facebook.com/${postId.replace('_', '/posts/')}`
        };
      } else {
        // Use URL method for external images
        console.log(`🔗 Using URL method for external image`);
        
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
      }
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
      console.log(`📸 Number of images: ${imageUrls.length}`);

      // Upload each image and get media IDs
      const attached_media = [];
      for (let i = 0; i < imageUrls.length; i++) {
        const imageUrl = imageUrls[i];
        console.log(`📤 Uploading image ${i + 1}/${imageUrls.length}: ${imageUrl}`);
        
        try {
          const localFilePath = this.getLocalFilePath(imageUrl);
          
          if (localFilePath) {
            // Upload local file
            console.log(`📂 Uploading local file: ${localFilePath}`);
            
            const form = new FormData();
            form.append('source', fs.createReadStream(localFilePath));
            form.append('published', 'false'); // Don't publish individual photos
            form.append('access_token', credentials.access_token);

            const photoResponse = await axios.post(
              `${this.baseUrl}/${credentials.page_id}/photos`,
              form,
              {
                headers: {
                  ...form.getHeaders(),
                },
              }
            );
            
            attached_media.push({ media_fbid: photoResponse.data.id });
            console.log(`✅ Local image ${i + 1} uploaded successfully`);
          } else {
            // Use URL method for external images
            console.log(`🔗 Using URL method for image ${i + 1}`);
            
            const photoResponse = await axios.post(
              `${this.baseUrl}/${credentials.page_id}/photos`,
              {
                url: imageUrl,
                published: false, // Don't publish individual photos
                access_token: credentials.access_token
              }
            );
            attached_media.push({ media_fbid: photoResponse.data.id });
            console.log(`✅ External image ${i + 1} uploaded successfully`);
          }
        } catch (imgError: any) {
          console.error(`❌ Failed to upload image ${i + 1}:`, imgError.response?.data || imgError.message);
          throw new Error(`Failed to upload image ${i + 1}: ${imgError.response?.data?.error?.message || imgError.message}`);
        }
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
   * Gets recent posts
   */
  async getRecentPosts(clientId: number, limit: number = 50): Promise<any[]> {
    try {
      console.log(`\n📋 GETTING RECENT POSTS FROM DATABASE`);
      console.log(`   Client ID: ${clientId}, Limit: ${limit}`);
      
      const result = await this.pool.query(
        `SELECT post_id, message, created_time, permalink_url, post_impressions, post_reach, post_engaged_users,
                post_clicks, post_video_views, comments_count, shares_count,
                reactions_like, reactions_love, reactions_haha, reactions_wow, reactions_sad, reactions_angry,
                likes, comments, shares,
                (post_engaged_users + comments_count + shares_count) as engagement_score
         FROM facebook_posts 
         WHERE client_id = $1 
         ORDER BY created_time DESC
         LIMIT $2`,
        [clientId, limit]
      );

      console.log(`   ✅ Found ${result.rows.length} posts in database`);
      
      if (result.rows.length > 0) {
        console.log(`   📊 First post sample:`);
        const firstPost = result.rows[0];
        console.log(`      Post ID: ${firstPost.post_id}`);
        console.log(`      Impressions: ${firstPost.post_impressions}`);
        console.log(`      Reach: ${firstPost.post_reach}`);
        console.log(`      Engaged Users: ${firstPost.post_engaged_users}`);
        console.log(`      Message: ${(firstPost.message || 'No message').substring(0, 60)}...`);
      }

      return result.rows;
    } catch (error: any) {
      console.error(`❌ Error getting recent posts: ${error.message}`);
      return [];
    }
  }

  /**
   * Fetch ALL posts with inline insights - FROM WORKING REFERENCE
   * This is the exact implementation that works in the reference repository
   */
  async fetchPostsWithInlineInsights(pageId: string, accessToken: string, limit: number = 100): Promise<any[]> {
    try {
      // 1. Add the insight metrics to the 'fields' parameter.
      const fields = [
        'id', 
        'message', 
        'created_time', 
        'permalink_url', 
        'likes.summary(true)', 
        'comments.summary(true)', 
        'shares', 
        'reactions.summary(true)',
        'insights.metric(post_impressions,post_impressions_unique,post_reactions_by_type_total)'
      ].join(',');
  
      const allPostsData: any[] = [];
      let pageCount = 0;
      const maxPages = 10;
      
      // 2. Construct the initial URL for the request.
      // Use /posts endpoint (not /published_posts) to get all posts
      let nextUrl = `${this.baseUrl}/${pageId}/posts?access_token=${accessToken}&fields=${fields}&limit=100`;
  
      // 3. Use a single loop to handle all pages, including the first one.
      console.log('🔍 [POSTS API] Starting to fetch posts for page:', pageId);
      console.log('🔗 [POSTS API] Initial URL:', nextUrl.substring(0, 150) + '...');
      
      while (nextUrl && pageCount < maxPages) {
        pageCount++;
        console.log(`📄 [POSTS API] Fetching page ${pageCount}...`);
        
        const response = await axios.get(nextUrl);
        
        console.log('✅ [POSTS API] Response received. Status:', response.status);
        console.log('📊 [POSTS API] Raw response data keys:', Object.keys(response.data));
        
        if (response.data.error) {
          // If the API returns an error, stop processing.
          console.error("❌ [POSTS API] Facebook API Error:", response.data.error.message);
          break;
        }
  
        const posts = response.data.data || [];
        console.log(`📝 [POSTS API] Found ${posts.length} posts in this batch`);
        
        // This loop now processes posts from every page.
        for (const post of posts) {
          console.log('\n🔍 [POST DETAIL] Processing post:', post.id);
          console.log('📝 [POST DETAIL] Message:', (post.message || 'No message').substring(0, 50) + '...');
          console.log('🔑 [POST DETAIL] Post has insights?:', !!post.insights);
          
          if (post.insights) {
            console.log('📊 [POST DETAIL] Insights data:', JSON.stringify(post.insights, null, 2));
          } else {
            console.log('⚠️ [POST DETAIL] NO INSIGHTS DATA for this post!');
          }
          
          // 4. Parse the insights data that is now included in the response.
          let impressions = 0;
          let uniqueImpressions = 0;
          let detailedReactions: any = {};
  
          if (post.insights && post.insights.data) {
            console.log(`✅ [POST DETAIL] Found ${post.insights.data.length} insight metrics`);
            
            for (const insight of post.insights.data) {
              console.log(`  - Metric: ${insight.name}, Value:`, insight.values[0]?.value);
              
              if (insight.name === 'post_impressions') {
                impressions = insight.values[0]?.value || 0;
                console.log(`  ✅ Impressions set to: ${impressions}`);
              }
              if (insight.name === 'post_impressions_unique') {
                uniqueImpressions = insight.values[0]?.value || 0;
                console.log(`  ✅ Unique Impressions set to: ${uniqueImpressions}`);
              }
              if (insight.name === 'post_reactions_by_type_total') {
                detailedReactions = insight.values[0]?.value || {};
                console.log(`  ✅ Detailed Reactions:`, detailedReactions);
              }
            }
          } else {
            console.log('⚠️ [POST DETAIL] No insights.data array found!');
          }
          
          // 5. Build the final data object with all information.
          const postData = {
            timestamp: new Date().toISOString(),
            post_id: post.id,
            message: (post.message || 'No text').substring(0, 200),
            image: 'N/A', // You may need a separate call for image URLs if needed
            link: '',
            created_time: post.created_time,
            permalink_url: post.permalink_url,
            likes: post.likes?.summary?.total_count || 0,
            comments_count: post.comments?.summary?.total_count || 0,
            shares_count: post.shares?.count || 0,
            total_reactions: post.reactions?.summary?.total_count || 0,
            // Actual insight data from Facebook API
            post_impressions: impressions,
            post_impressions_unique: uniqueImpressions,
            post_reach: 0, // Not available in this call
            post_engaged_users: 0, // Not available in this call
            post_clicks: 0, // Not available in this call
            engaged_users: 'N/A', // Not available for all posts
            // Detailed reaction types (like, love, wow, etc.)
            reactions_like: detailedReactions.like || 0,
            reactions_love: detailedReactions.love || 0,
            reactions_haha: detailedReactions.haha || 0,
            reactions_wow: detailedReactions.wow || 0,
            reactions_sad: detailedReactions.sad || 0,
            reactions_angry: detailedReactions.angry || 0,
            post_type: 'post'
          };
          
          console.log('💾 [POST DETAIL] Final post data:', {
            post_id: postData.post_id,
            impressions: postData.post_impressions,
            unique_impressions: postData.post_impressions_unique,
            likes: postData.likes,
            comments: postData.comments_count,
            total_reactions: postData.total_reactions
          });
          
          allPostsData.push(postData);
        }
  
        // Get the URL for the next page from the paging object.
        nextUrl = response.data.paging?.next || '';
      }
  
      console.log(`\n✅ [POSTS API] Total posts fetched: ${allPostsData.length}`);
      console.log('📊 [POSTS API] Summary of impressions:');
      allPostsData.forEach((post, idx) => {
        console.log(`  Post ${idx + 1}: impressions=${post.post_impressions}, unique=${post.post_impressions_unique}, reactions=${post.total_reactions}`);
      });
      
      return allPostsData;
  
    } catch (error: any) {
      console.error('❌ [POSTS API] Error:', error.message);
      if (error.response?.data) {
        console.error('❌ [POSTS API] API Error:', error.response.data);
      }
      console.error('❌ [POSTS API] Stack:', error.stack);
      throw new Error(`Failed to fetch posts: ${error.message}`);
    }
  }

  /**
   * Fetch follower insights with historical data
   */
  async fetchFollowerInsights(pageId: string, accessToken: string, days: number = 28): Promise<any> {
    try {
      console.log(`\n👥 [FOLLOWER INSIGHTS] Fetching follower data for ${days} days...`);

      const metrics = ['page_fans', 'page_fan_adds', 'page_fan_removes'];
      const followerData: any = {
        currentFollowers: 0,
        totalAdds: 0,
        totalRemoves: 0,
        netGrowth: 0,
        history: []
      };

      for (const metric of metrics) {
        try {
          const period = metric === 'page_fans' ? 'lifetime' : 'day';
          const response = await axios.get(
            `https://graph.facebook.com/v18.0/${pageId}/insights/${metric}`,
            {
              params: {
                access_token: accessToken,
                period: period,
                since: Math.floor(Date.now() / 1000) - (days * 24 * 60 * 60)
              }
            }
          );

          if (response.data.data && response.data.data.length > 0) {
            const insight = response.data.data[0];
            const values = insight.values || [];

            if (metric === 'page_fans' && values.length > 0) {
              followerData.currentFollowers = values[values.length - 1].value;
            } else if (metric === 'page_fan_adds') {
              followerData.totalAdds = values.reduce((sum: number, v: any) => sum + (v.value || 0), 0);
            } else if (metric === 'page_fan_removes') {
              followerData.totalRemoves = values.reduce((sum: number, v: any) => sum + (v.value || 0), 0);
            }

            // Store historical data
            values.forEach((v: any) => {
              followerData.history.push({
                date: v.end_time,
                metric: metric,
                value: v.value
              });
            });
          }
        } catch (error: any) {
          console.log(`⚠️ [FOLLOWER INSIGHTS] Skipped metric ${metric}:`, error.message);
        }
      }

      followerData.netGrowth = followerData.totalAdds - followerData.totalRemoves;

      console.log(`✅ [FOLLOWER INSIGHTS] Current: ${followerData.currentFollowers}`);
      console.log(`   Adds: ${followerData.totalAdds}, Removes: ${followerData.totalRemoves}`);
      console.log(`   Net Growth: ${followerData.netGrowth}`);

      return followerData;
    } catch (error: any) {
      console.error(`❌ [FOLLOWER INSIGHTS] Error:`, error.message);
      throw new Error(`Failed to fetch follower insights: ${error.message}`);
    }
  }

  /**
   * Fetch all available page insights
   */
  async fetchAllPageInsights(pageId: string, accessToken: string): Promise<any> {
    try {
      console.log(`\n📊 [ALL PAGE INSIGHTS] Fetching comprehensive page insights...`);

      const metricGroups = {
        engagement: [
          'page_engaged_users',
          'page_post_engagements',
          'page_consumptions',
          'page_negative_feedback'
        ],
        impressions: [
          'page_impressions',
          'page_impressions_unique',
          'page_impressions_organic',
          'page_impressions_paid'
        ],
        reach: [
          'page_posts_impressions',
          'page_posts_impressions_unique',
          'page_posts_impressions_organic',
          'page_posts_impressions_paid'
        ],
        views: [
          'page_views_total',
          'page_video_views',
          'page_video_views_organic',
          'page_video_views_paid'
        ],
        fans: [
          'page_fans',
          'page_fan_adds',
          'page_fan_removes'
        ]
      };

      const allInsights: any = {};

      for (const [category, metrics] of Object.entries(metricGroups)) {
        allInsights[category] = {};

        for (const metric of metrics) {
          try {
            const period = metric === 'page_fans' ? 'lifetime' : 
                          metric.includes('_28') ? 'days_28' : 'day';

            const response = await axios.get(
              `https://graph.facebook.com/v18.0/${pageId}/insights/${metric}`,
              {
                params: {
                  access_token: accessToken,
                  period: period
                }
              }
            );

            if (response.data.data && response.data.data.length > 0) {
              const insight = response.data.data[0];
              const values = insight.values || [];
              const latestValue = values.length > 0 ? values[values.length - 1].value : 0;

              allInsights[category][metric] = {
                title: insight.title,
                description: insight.description,
                value: latestValue,
                period: insight.period
              };
            }
          } catch (error: any) {
            console.log(`⚠️ [ALL PAGE INSIGHTS] Skipped ${metric}:`, error.message);
            allInsights[category][metric] = { value: 0, error: error.message };
          }
        }
      }

      console.log(`✅ [ALL PAGE INSIGHTS] Fetched insights for ${Object.keys(metricGroups).length} categories`);

      return allInsights;
    } catch (error: any) {
      console.error(`❌ [ALL PAGE INSIGHTS] Error:`, error.message);
      throw new Error(`Failed to fetch all page insights: ${error.message}`);
    }
  }

  /**
   * Get follower statistics - FROM WORKING REFERENCE
   */
  async getFollowerStats(pageId: string, pageAccessToken: string): Promise<any> {
    try {
      console.log(`📊 [FOLLOWER STATS] Fetching follower statistics for page ${pageId}...`);

      // Fetch current total followers
      const fansResponse = await axios.get(`${this.baseUrl}/${pageId}/insights/page_fans`, {
        params: {
          access_token: pageAccessToken,
          period: 'lifetime'
        }
      });

      // Fetch follower adds over 28 days
      const fanAddsResponse = await axios.get(`${this.baseUrl}/${pageId}/insights/page_fan_adds`, {
        params: {
          access_token: pageAccessToken,
          period: 'days_28'
        }
      });

      // Fetch follower removes over 28 days
      const fanRemovesResponse = await axios.get(`${this.baseUrl}/${pageId}/insights/page_fan_removes`, {
        params: {
          access_token: pageAccessToken,
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

      console.log(`✅ [FOLLOWER STATS] Total: ${totalFollowers}, Adds: ${totalFanAdds}, Removes: ${totalFanRemoves}, Net: ${netFollowers}`);

      return {
        totalFollowers,
        totalFanAdds,
        totalFanRemoves,
        netFollowers,
        fanAddsData: fanAdds,
        fanRemovesData: fanRemoves
      };
    } catch (error: any) {
      console.error(`❌ [FOLLOWER STATS] Error:`, error.message);
      throw new Error(`Failed to get follower stats: ${error.message}`);
    }
  }

  /**
   * Get post reactions for a specific post - FROM WORKING REFERENCE
   */
  async getPostReactions(postId: string, accessToken: string): Promise<any> {
    try {
      console.log(`📊 [POST REACTIONS] Getting reactions for post: ${postId}`);
      
      const reactionsResponse = await axios.get(`${this.baseUrl}/${postId}/insights`, {
        params: {
          access_token: accessToken,
          metric: [
            'post_reactions_like_total',
            'post_reactions_love_total', 
            'post_reactions_wow_total',
            'post_reactions_haha_total',
            'post_reactions_sorry_total',
            'post_reactions_anger_total',
            'post_reactions_by_type_total'
          ].join(',')
        }
      });

      if (reactionsResponse.data.data) {
        const reactions: any = {};
        reactionsResponse.data.data.forEach((metric: any) => {
          if (metric.values && metric.values[0]) {
            if (metric.name === 'post_reactions_by_type_total') {
              // Handle the combined reactions object
              reactions.total_by_type = metric.values[0].value || {};
            } else {
              // Handle individual reaction types
              const reactionType = metric.name.replace('post_reactions_', '').replace('_total', '');
              reactions[reactionType] = metric.values[0].value || 0;
            }
          }
        });
        
        console.log(`✅ [POST REACTIONS] Reactions for ${postId}:`, reactions);
        return reactions;
      }
      
      return {};
    } catch (error: any) {
      console.error(`❌ [POST REACTIONS] Error for ${postId}:`, error.message);
      return {};
    }
  }

  /**
   * Get basic page information using access token - FROM WORKING REFERENCE
   */
  async getPageInfo(accessToken: string): Promise<any> {
    try {
      console.log('📄 [PAGE INFO] Getting page info for token:', accessToken.substring(0, 10) + '...');
      
      // First, get user's pages
      const pagesResponse = await axios.get(`${this.baseUrl}/me/accounts`, {
        params: {
          access_token: accessToken
        }
      });

      if (!pagesResponse.data.data || pagesResponse.data.data.length === 0) {
        throw new Error('No Facebook pages found for this access token');
      }

      // Get the first page (or you can modify this to handle multiple pages)
      const page = pagesResponse.data.data[0];
      
      // Get additional page details
      const pageDetailsResponse = await axios.get(`${this.baseUrl}/${page.id}`, {
        params: {
          access_token: accessToken,
          fields: 'id,name,category,followers_count,access_token'
        }
      });

      const pageDetails = pageDetailsResponse.data;
      
      console.log(`✅ [PAGE INFO] Page found: ${pageDetails.name} (${pageDetails.id})`);

      return {
        id: pageDetails.id,
        name: pageDetails.name,
        category: pageDetails.category || 'Facebook Page',
        followers: pageDetails.followers_count || 0,
        access_token: page.access_token,
        status: 'active'
      };
    } catch (error: any) {
      console.error('❌ [PAGE INFO] Error:', error.message);
      throw new Error(`Failed to get page info: ${error.message}`);
    }
  }

  /**
   * Get Page Overview Metrics - CUSTOM USER REQUEST
   * Uses specific API endpoint with days_28 period
   * API: {page-id}/insights?metric=page_fans,page_fan_adds,page_fan_removes,page_views_total,page_impressions,page_impressions_unique,page_post_engagements
   */
  async getPageOverviewMetrics(pageId: string, accessToken: string): Promise<any> {
    try {
      console.log(`📄 [PAGE OVERVIEW] Fetching overview metrics for page ${pageId}...`);

      const metrics = {
        pageViews: 0,
        totalFollowers: 0,
        fanAdds: 0,
        totalReach: 0,
        uniqueReach: 0,
        totalImpressions: 0,
        engagement: 0
      };

      // 1. Fetch Total Followers using page_fans with 'day' period
      try {
        console.log(`  📊 Fetching page_fans (day)...`);
        const fansResponse = await axios.get(`${this.baseUrl}/${pageId}/insights/page_fans`, {
          params: {
            access_token: accessToken,
            period: 'day'
          }
        });
        
        if (fansResponse.data.data && fansResponse.data.data[0]?.values) {
          const values = fansResponse.data.data[0].values;
          const latestValue = values[values.length - 1]?.value || 0;
          metrics.totalFollowers = latestValue;
          console.log(`  ✅ Total Followers (page_fans): ${latestValue}`);
        }
      } catch (error: any) {
        console.log(`  ⚠️ page_fans error: ${error.message}`);
      }

      // 2. Fetch other metrics using days_28 period
      const metricsToFetch = [
        { name: 'page_fan_adds', key: 'fanAdds', label: 'Fan Adds' },
        { name: 'page_views_total', key: 'pageViews', label: 'Page Views' },
        { name: 'page_impressions', key: 'totalImpressions', label: 'Total Impressions' },
        { name: 'page_impressions_unique', key: 'uniqueReach', label: 'Unique Reach' },
        { name: 'page_post_engagements', key: 'engagement', label: 'Engagement' }
      ];

      for (const metric of metricsToFetch) {
        try {
          console.log(`  📊 Fetching ${metric.name} (days_28)...`);
          const response = await axios.get(`${this.baseUrl}/${pageId}/insights/${metric.name}`, {
            params: {
              access_token: accessToken,
              period: 'days_28'
            }
          });

          if (response.data.data && response.data.data[0]?.values) {
            const values = response.data.data[0].values;
            // For days_28, sum all values or take the latest
            let totalValue = 0;
            
            if (metric.name === 'page_views_total' || metric.name === 'page_impressions' || 
                metric.name === 'page_impressions_unique' || metric.name === 'page_post_engagements') {
              // For cumulative metrics, take the latest value
              totalValue = values[values.length - 1]?.value || 0;
            } else if (metric.name === 'page_fan_adds') {
              // For fan adds, sum all daily values
              totalValue = values.reduce((sum: number, val: any) => sum + (val.value || 0), 0);
            }

            metrics[metric.key as keyof typeof metrics] = totalValue;
            console.log(`  ✅ ${metric.label} (${metric.name}): ${totalValue}`);
          }
        } catch (error: any) {
          console.log(`  ⚠️ ${metric.name} error: ${error.message}`);
        }
      }

      // Set totalReach same as uniqueReach (unique impressions = reach)
      metrics.totalReach = metrics.uniqueReach;

      console.log(`✅ [PAGE OVERVIEW] Final metrics:`, metrics);

      return {
        pageViews: metrics.pageViews,
        followers: metrics.totalFollowers,
        reach: metrics.totalReach,
        impressions: metrics.totalImpressions,
        engagement: metrics.engagement,
        fanAdds: metrics.fanAdds
      };
    } catch (error: any) {
      console.error(`❌ [PAGE OVERVIEW] Error:`, error.message);
      throw new Error(`Failed to get page overview metrics: ${error.message}`);
    }
  }

  /**
   * Fetch 8 core Facebook Page metrics
   * Returns the latest value for each metric
   */
  async getCorePageMetrics(clientId: number): Promise<Record<string, any>> {
    try {
      console.log(`\n📊 [CORE METRICS] Fetching 8 core page metrics for client ${clientId} using Graph API v18.0...`);
      
      // Get credentials
      const creds = await this.getClientCredentials(clientId);
      if (!creds) {
        throw new Error('No Facebook credentials found for this client');
      }

      const { page_id, access_token } = creds;
      const metricsData: Record<string, any> = {};

      // Fetch each core metric
      for (const metricName of this.corePageMetrics) {
        const period = this.metricPeriods[metricName];
        
        try {
          console.log(`  📊 Fetching ${metricName} (${period}) using v18.0...`);
          
          const response = await axios.get(
            `${this.pageMetricsUrl}/${page_id}/insights/${metricName}`,
            {
              params: {
                access_token,
                period
              }
            }
          );

          if (response.data.data && response.data.data.length > 0) {
            const insight = response.data.data[0];
            const values = insight.values || [];
            
            if (values.length > 0) {
              const latestValue = values[values.length - 1];
              metricsData[metricName] = {
                name: insight.name,
                title: insight.title,
                description: insight.description,
                period: insight.period,
                value: latestValue.value,
                end_time: latestValue.end_time
              };
              console.log(`    ✅ ${metricName}: ${latestValue.value}`);
            } else {
              metricsData[metricName] = {
                name: metricName,
                title: metricName.replace(/_/g, ' '),
                value: 0,
                period
              };
              console.log(`    ⚠️ ${metricName}: No values found`);
            }
          } else {
            metricsData[metricName] = {
              name: metricName,
              title: metricName.replace(/_/g, ' '),
              value: 0,
              period
            };
            console.log(`    ⚠️ ${metricName}: No data returned`);
          }
        } catch (error: any) {
          console.error(`    ❌ ${metricName} error: ${error.message}`);
          if (error.response?.data) {
            console.error(`    📋 Facebook API Error Details:`, JSON.stringify(error.response.data, null, 2));
          }
          if (error.response?.status) {
            console.error(`    📋 Status Code: ${error.response.status}`);
          }
          metricsData[metricName] = {
            name: metricName,
            title: metricName.replace(/_/g, ' '),
            value: 0,
            period,
            error: error.response?.data?.error?.message || error.message
          };
        }
      }

      console.log(`✅ [CORE METRICS] Fetched all 8 core metrics`);
      return metricsData;
    } catch (error: any) {
      console.error(`❌ [CORE METRICS] Error:`, error.message);
      if (error.response?.data) {
        console.error(`❌ [CORE METRICS] Facebook API Response:`, JSON.stringify(error.response.data, null, 2));
      }
      throw new Error(`Failed to get core page metrics: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Get historical analytics data for trend analysis
   * @param clientId - Client ID
   * @param days - Number of days to fetch (default 30)
   * @returns Array of daily metrics
   */
  async getHistoricalData(clientId: number, days: number = 30): Promise<any[]> {
    try {
      console.log(`\n📊 [HISTORICAL DATA] Fetching last ${days} days for client ${clientId}...`);
      
      const result = await this.pool.query(
        `SELECT 
          metric_date,
          page_views,
          followers,
          engagement,
          reach,
          impressions,
          engagement_rate,
          synced_at
         FROM facebook_analytics
         WHERE client_id = $1
           AND metric_date >= CURRENT_DATE - INTERVAL '${days} days'
         ORDER BY metric_date DESC`,
        [clientId]
      );

      console.log(`✅ [HISTORICAL DATA] Found ${result.rows.length} days of data`);
      return result.rows;
    } catch (error: any) {
      console.error(`❌ [HISTORICAL DATA] Error:`, error.message);
      return [];
    }
  }
}

export default FacebookService;
