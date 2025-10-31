import { google } from 'googleapis';
import pool from '../config/database';
import * as crypto from 'crypto';

interface GoogleAnalyticsCredentials {
  client_id: string;
  client_secret: string;
  redirect_uri: string;
  access_token?: string;
  refresh_token?: string;
  property_id?: string;
  view_id?: string;
}

interface ServiceAccountCredentials {
  client_email: string;
  private_key: string;
  project_id?: string;
}

interface AnalyticsData {
  pageViews: number;
  sessions: number;
  bounceRate: number;
  users: number;
  newUsers: number;
  avgSessionDuration: number;
  topPages: Array<{
    page: string;
    pageViews: number;
    uniqueUsers?: number;
    bounceRate?: number;
    avgTime?: number;
    conversions?: number;
    conversionRate?: number;
  }>;
  trafficSources: Array<{
    source: string;
    sessions: number;
  }>;
  countryBreakdown?: { [key: string]: number };
  stateBreakdown?: { [key: string]: number };
  geographicData?: Array<{
    country: string;
    region: string;
    activeUsers: number;
    newUsers: number;
    engagedSessions: number;
    engagementRate: number;
    engagedSessionsPerUser: number;
    averageEngagementTimePerSession: number;
  }>;
}

export class GoogleAnalyticsService {
  private oauth2Client: any;
  private credentials: GoogleAnalyticsCredentials;
  private serviceAccountAuth: any;

  constructor() {
    this.credentials = {
      client_id: process.env.GOOGLE_ANALYTICS_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_ANALYTICS_CLIENT_SECRET || '',
      redirect_uri: process.env.GOOGLE_ANALYTICS_REDIRECT_URI || 'https://marketingby.wetechforu.com/api/auth/google/callback'
    };

    this.oauth2Client = new google.auth.OAuth2(
      this.credentials.client_id,
      this.credentials.client_secret,
      this.credentials.redirect_uri
    );
  }

  /**
   * Decrypt encrypted value from database
   */
  private decrypt(encryptedValue: string): string {
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-32-character-secret-key!!';
    const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').substring(0, 32));
    
    try {
      const parts = encryptedValue.split(':');
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      console.error('❌ Decryption error:', error);
      throw new Error('Failed to decrypt value');
    }
  }

  /**
   * Get Service Account credentials from encrypted_credentials table
   */
  private async getServiceAccountCredentials(): Promise<ServiceAccountCredentials | null> {
    try {
      const result = await pool.query(
        `SELECT service, key_name, encrypted_value 
         FROM encrypted_credentials 
         WHERE service = 'google_service_account' 
           AND key_name IN ('client_email', 'private_key', 'project_id')`
      );

      if (result.rows.length === 0) {
        return null;
      }

      const credentials: ServiceAccountCredentials = { client_email: '', private_key: '' };
      
      result.rows.forEach(row => {
        const decrypted = this.decrypt(row.encrypted_value);
        if (row.key_name === 'client_email') {
          credentials.client_email = decrypted;
        } else if (row.key_name === 'private_key') {
          credentials.private_key = decrypted;
        } else if (row.key_name === 'project_id') {
          credentials.project_id = decrypted;
        }
      });

      if (!credentials.client_email || !credentials.private_key) {
        console.warn('⚠️  Service Account credentials incomplete - missing client_email or private_key');
        return null;
      }

      console.log('✅ Service Account credentials loaded from encrypted_credentials');
      return credentials;
    } catch (error) {
      console.error('Error getting Service Account credentials:', error);
      return null;
    }
  }

  /**
   * Initialize Service Account authentication
   */
  private async initializeServiceAccountAuth(): Promise<any> {
    try {
      const serviceAccountCreds = await this.getServiceAccountCredentials();
      
      if (!serviceAccountCreds) {
        return null;
      }

      // Create service account credentials object
      const credentials = {
        type: 'service_account',
        project_id: serviceAccountCreds.project_id || '',
        private_key_id: '',
        private_key: serviceAccountCreds.private_key.replace(/\\n/g, '\n'),
        client_email: serviceAccountCreds.client_email,
        client_id: '',
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token',
        auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
        client_x509_cert_url: ''
      };

      // Create GoogleAuth with service account
      const auth = new google.auth.GoogleAuth({
        credentials: credentials,
        scopes: [
          'https://www.googleapis.com/auth/analytics.readonly',
          'https://www.googleapis.com/auth/analytics'
        ]
      });

      console.log('✅ Service Account authentication initialized');
      return auth;
    } catch (error) {
      console.error('Error initializing Service Account auth:', error);
      return null;
    }
  }

  /**
   * Generate OAuth authorization URL
   */
  generateAuthUrl(clientId: number): string {
    const scopes = [
      'https://www.googleapis.com/auth/analytics.readonly',
      'https://www.googleapis.com/auth/webmasters.readonly'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: JSON.stringify({ clientId, type: 'google_analytics' }),
      prompt: 'consent'
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string, state: string): Promise<any> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      const stateData = JSON.parse(state);
      
      // Store tokens in database
      await this.storeClientCredentials(stateData.clientId, {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: new Date(Date.now() + (tokens.expiry_date || 3600 * 1000))
      });

      return tokens;
    } catch (error) {
      console.error('Error exchanging code for tokens:', error);
      throw error;
    }
  }

  /**
   * Store client credentials in database
   */
  private async storeClientCredentials(clientId: number, credentials: any): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO client_credentials (client_id, service_type, credentials, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())
         ON CONFLICT (client_id, service_type)
         DO UPDATE SET credentials = $3, updated_at = NOW()`,
        [clientId, 'google_analytics', JSON.stringify(credentials)]
      );
    } catch (error) {
      console.error('Error storing client credentials:', error);
      throw error;
    }
  }

  /**
   * Get client credentials from database
   */
  async getClientCredentials(clientId: number): Promise<any> {
    try {
      const result = await pool.query(
        'SELECT credentials FROM client_credentials WHERE client_id = $1 AND service_type = $2',
        [clientId, 'google_analytics']
      );

      if (result.rows.length === 0) {
        return null;
      }

      console.log(`🔍 Getting client credentials for client ${clientId}:`, result.rows[0].credentials);
      
      let credentials;
      if (typeof result.rows[0].credentials === 'string') {
        credentials = JSON.parse(result.rows[0].credentials);
      } else if (typeof result.rows[0].credentials === 'object') {
        credentials = result.rows[0].credentials;
      } else {
        console.error(`❌ Invalid credentials type for client ${clientId}:`, typeof result.rows[0].credentials);
        return null;
      }
      
      console.log(`✅ Parsed credentials for client ${clientId}:`, credentials);
      return credentials;
    } catch (error) {
      console.error('Error getting client credentials:', error);
      return null;
    }
  }

  /**
   * Refresh access token if needed
   */
  private async refreshTokenIfNeeded(clientId: number): Promise<string | null> {
    try {
      const credentials = await this.getClientCredentials(clientId);
      if (!credentials) {
        return null;
      }

      this.oauth2Client.setCredentials({
        access_token: credentials.access_token,
        refresh_token: credentials.refresh_token
      });

      // Check if token is expired or missing
      const isExpired = credentials.expires_at && new Date(credentials.expires_at) <= new Date();
      const needsRefresh = !credentials.access_token || isExpired;
      
      if (needsRefresh) {
        console.log('🔄 Access token expired or missing, refreshing using refresh_token...');
        const { credentials: newCredentials } = await this.oauth2Client.refreshAccessToken();
        
        console.log('✅ Successfully refreshed access_token');
        
        // Update stored credentials with new access_token
        await this.storeClientCredentials(clientId, {
          access_token: newCredentials.access_token,
          refresh_token: credentials.refresh_token, // Keep the original refresh token
          expires_at: new Date(Date.now() + (newCredentials.expiry_date || 3600 * 1000))
        });

        return newCredentials.access_token;
      }

      console.log('✅ Using existing valid access_token');
      return credentials.access_token;
    } catch (error) {
      console.error('Error refreshing token:', error);
      return null;
    }
  }

  /**
   * Get cached analytics data from database (if available and fresh)
   * Returns aggregated data from last 30 days if available (even if older than 6 hours)
   * Uses dedicated google_analytics_data table
   */
  private async getCachedAnalyticsData(clientId: number, dateRange: { startDate: string; endDate: string }): Promise<AnalyticsData | null> {
    try {
      // First, try to get fresh data (updated within last 6 hours) - today or yesterday
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      let result = await pool.query(`
        SELECT 
          page_views, sessions, users, new_users, bounce_rate, 
          avg_session_duration, top_pages, traffic_sources, 
          country_breakdown, state_breakdown, property_id,
          metadata, updated_at, date
        FROM google_analytics_data
        WHERE client_id = $1 
          AND date IN ($2, $3)
          AND updated_at > NOW() - INTERVAL '6 hours'
        ORDER BY updated_at DESC
        LIMIT 1
      `, [clientId, today, yesterday]);

      // If no fresh data, aggregate data from last 30 days (shows all stored historical data)
      if (result.rows.length === 0) {
        console.log(`📭 No fresh data found, aggregating last 30 days of stored data...`);
        
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const aggregateResult = await pool.query(`
          SELECT 
            SUM(page_views) as total_page_views,
            SUM(sessions) as total_sessions,
            SUM(users) as total_users,
            SUM(new_users) as total_new_users,
            AVG(bounce_rate) as avg_bounce_rate,
            AVG(avg_session_duration) as avg_session_duration,
            jsonb_agg(DISTINCT top_pages) as all_top_pages,
            jsonb_agg(DISTINCT traffic_sources) as all_traffic_sources,
            MAX(updated_at) as last_updated,
            COUNT(*) as days_with_data
          FROM google_analytics_data
          WHERE client_id = $1 
            AND date >= $2
          GROUP BY client_id
        `, [clientId, thirtyDaysAgo]);
        
        if (aggregateResult.rows.length === 0 || aggregateResult.rows[0].days_with_data === 0) {
          console.log(`📭 No stored data found for client ${clientId} in last 30 days`);
          return null;
        }
        
        const agg = aggregateResult.rows[0];
        
        // Combine top pages from all days (take unique, limit to 10)
        let combinedTopPages: any[] = [];
        if (agg.all_top_pages && Array.isArray(agg.all_top_pages)) {
          const pageMap = new Map<string, any>();
          agg.all_top_pages.forEach((pages: any) => {
            if (Array.isArray(pages)) {
              pages.forEach((page: any) => {
                const key = page.url || page.pagePath;
                if (key && !pageMap.has(key)) {
                  pageMap.set(key, page);
                }
              });
            }
          });
          combinedTopPages = Array.from(pageMap.values()).slice(0, 10);
        }
        
        // Combine traffic sources
        let combinedTrafficSources: any[] = [];
        if (agg.all_traffic_sources && Array.isArray(agg.all_traffic_sources)) {
          const sourceMap = new Map<string, any>();
          agg.all_traffic_sources.forEach((sources: any) => {
            if (Array.isArray(sources)) {
              sources.forEach((source: any) => {
                const key = source.source || source.originalSource;
                if (key) {
                  const existing = sourceMap.get(key);
                  if (existing) {
                    existing.sessions = (existing.sessions || 0) + (source.sessions || 0);
                  } else {
                    sourceMap.set(key, { ...source });
                  }
                }
              });
            }
          });
          combinedTrafficSources = Array.from(sourceMap.values())
            .sort((a: any, b: any) => (b.sessions || 0) - (a.sessions || 0))
            .slice(0, 10);
        }
        
        // Get combined country breakdown and generate geographicData from it
        let combinedCountryBreakdown: Record<string, number> = {};
        let combinedGeographicData: any[] = [];
        
        // Try to aggregate country breakdown from all days
        const countryBreakdownResult = await pool.query(`
          SELECT country_breakdown, metadata
          FROM google_analytics_data
          WHERE client_id = $1 
            AND date >= $2
          ORDER BY updated_at DESC
          LIMIT 30
        `, [clientId, thirtyDaysAgo]);
        
        // Aggregate country breakdown
        countryBreakdownResult.rows.forEach((row: any) => {
          if (row.country_breakdown && typeof row.country_breakdown === 'object') {
            Object.entries(row.country_breakdown).forEach(([country, users]: [string, any]) => {
              combinedCountryBreakdown[country] = (combinedCountryBreakdown[country] || 0) + (typeof users === 'number' ? users : 0);
            });
          }
          
          // Also try to get geographicData from metadata
          if (row.metadata && typeof row.metadata === 'object' && row.metadata.geographicData && Array.isArray(row.metadata.geographicData)) {
            row.metadata.geographicData.forEach((geo: any) => {
              const existing = combinedGeographicData.find((g: any) => g.country === geo.country && g.region === geo.region);
              if (existing) {
                existing.activeUsers += (geo.activeUsers || 0);
                existing.newUsers += (geo.newUsers || 0);
                existing.engagedSessions += (geo.engagedSessions || 0);
              } else {
                combinedGeographicData.push({ ...geo });
              }
            });
          }
        });
        
        // If no geographicData from metadata, generate from countryBreakdown
        if (combinedGeographicData.length === 0 && Object.keys(combinedCountryBreakdown).length > 0) {
          combinedGeographicData = Object.entries(combinedCountryBreakdown).map(([country, activeUsers]: [string, any]) => ({
            country: country,
            region: '',
            activeUsers: typeof activeUsers === 'number' ? activeUsers : 0,
            newUsers: 0,
            engagedSessions: 0,
            engagementRate: 0,
            engagedSessionsPerUser: 0,
            averageEngagementTimePerSession: 0
          }));
        }
        
        console.log(`✅ Found ${agg.days_with_data} days of stored data, aggregated totals:`);
        console.log(`   - Page Views: ${agg.total_page_views}`);
        console.log(`   - Sessions: ${agg.total_sessions}`);
        console.log(`   - Users: ${agg.total_users}`);
        console.log(`   - Geographic Data Countries: ${combinedGeographicData.length}`);
        
        const cachedData: AnalyticsData = {
          pageViews: parseInt(agg.total_page_views) || 0,
          sessions: parseInt(agg.total_sessions) || 0,
          bounceRate: parseFloat(agg.avg_bounce_rate) || 0,
          users: parseInt(agg.total_users) || 0,
          newUsers: parseInt(agg.total_new_users) || 0,
          avgSessionDuration: parseFloat(agg.avg_session_duration) || 0,
          topPages: combinedTopPages,
          trafficSources: combinedTrafficSources,
          countryBreakdown: combinedCountryBreakdown,
          stateBreakdown: {},
          geographicData: combinedGeographicData
        };
        
        return cachedData;
      }
      
      // Use fresh data from today/yesterday
      const row = result.rows[0];
      // Parse geographicData from metadata if available
      let geographicData: any[] = [];
      try {
        if (row.metadata && typeof row.metadata === 'object') {
          if (row.metadata.geographicData && Array.isArray(row.metadata.geographicData)) {
            geographicData = row.metadata.geographicData;
            console.log(`✅ Found geographicData in metadata: ${geographicData.length} countries`);
          } else if (row.country_breakdown && typeof row.country_breakdown === 'object') {
            // Fallback: Generate geographicData from countryBreakdown if available
            geographicData = Object.entries(row.country_breakdown).map(([country, activeUsers]: [string, any]) => ({
              country: country,
              region: '',
              activeUsers: typeof activeUsers === 'number' ? activeUsers : 0,
              newUsers: 0,
              engagedSessions: 0,
              engagementRate: 0,
              engagedSessionsPerUser: 0,
              averageEngagementTimePerSession: 0
            }));
            console.log(`✅ Generated geographicData from countryBreakdown: ${geographicData.length} countries`);
          }
        } else if (row.country_breakdown && typeof row.country_breakdown === 'object') {
          // If metadata is null but countryBreakdown exists, generate from it
          geographicData = Object.entries(row.country_breakdown).map(([country, activeUsers]: [string, any]) => ({
            country: country,
            region: '',
            activeUsers: typeof activeUsers === 'number' ? activeUsers : 0,
            newUsers: 0,
            engagedSessions: 0,
            engagementRate: 0,
            engagedSessionsPerUser: 0,
            averageEngagementTimePerSession: 0
          }));
          console.log(`✅ Generated geographicData from countryBreakdown (no metadata): ${geographicData.length} countries`);
        }
      } catch (e) {
        console.error('Error parsing geographicData from metadata:', e);
      }

      const cachedData: AnalyticsData = {
        pageViews: row.page_views || 0,
        sessions: row.sessions || 0,
        bounceRate: parseFloat(row.bounce_rate) || 0,
        users: row.users || 0,
        newUsers: row.new_users || 0,
        avgSessionDuration: parseFloat(row.avg_session_duration) || 0,
        topPages: row.top_pages || [],
        trafficSources: row.traffic_sources || [],
        countryBreakdown: row.country_breakdown || {},
        stateBreakdown: row.state_breakdown || {},
        geographicData: geographicData
      };

      if (cachedData.pageViews > 0 || cachedData.sessions > 0) {
        console.log(`✅ Using fresh cached analytics data for client ${clientId} (date: ${row.date}, last updated: ${row.updated_at})`);
        console.log(`   - Geographic Data: ${cachedData.geographicData?.length || 0} countries`);
        return cachedData;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting cached analytics data:', error);
      return null;
    }
  }

  /**
   * Store aggregated analytics data in google_analytics_data table (unique per date)
   * One record per client per date - updates existing if present
   */
  private async storeAggregatedAnalyticsData(clientId: number, data: AnalyticsData, propertyId?: string): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Store all data in one record using the dedicated google_analytics_data table
      await pool.query(`
        INSERT INTO google_analytics_data (
          client_id, property_id, date,
          page_views, sessions, users, new_users, 
          bounce_rate, avg_session_duration,
          top_pages, traffic_sources, 
          country_breakdown, state_breakdown,
          metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (client_id, date)
        DO UPDATE SET 
          property_id = EXCLUDED.property_id,
          page_views = EXCLUDED.page_views,
          sessions = EXCLUDED.sessions,
          users = EXCLUDED.users,
          new_users = EXCLUDED.new_users,
          bounce_rate = EXCLUDED.bounce_rate,
          avg_session_duration = EXCLUDED.avg_session_duration,
          top_pages = EXCLUDED.top_pages,
          traffic_sources = EXCLUDED.traffic_sources,
          country_breakdown = EXCLUDED.country_breakdown,
          state_breakdown = EXCLUDED.state_breakdown,
          metadata = EXCLUDED.metadata,
          updated_at = NOW()
      `, [
        clientId,
        propertyId || null,
        today,
        data.pageViews || 0,
        data.sessions || 0,
        data.users || 0,
        data.newUsers || 0,
        data.bounceRate || 0,
        data.avgSessionDuration || 0,
        JSON.stringify(data.topPages || []),
        JSON.stringify(data.trafficSources || []),
        JSON.stringify(data.countryBreakdown || {}),
        JSON.stringify(data.stateBreakdown || {}),
        JSON.stringify({
          source: 'ga4_api',
          geographicData: data.geographicData || [],
          cached_at: new Date().toISOString(),
          auth_method: 'service_account_or_oauth2'
        })
      ]);

      console.log(`💾 Stored Google Analytics data for client ${clientId} (date: ${today}, property: ${propertyId || 'N/A'})`);
    } catch (error) {
      console.error('Error storing Google Analytics data:', error);
      // Don't throw - storage errors shouldn't break the API response
    }
  }

  /**
   * Get analytics data for a client using Service Account (preferred) or OAuth2 (fallback)
   * Implements cache-first strategy: checks database first, only calls API if cache is stale or missing
   */
  async getAnalyticsData(clientId: number, propertyId?: string, forceRefresh: boolean = false): Promise<AnalyticsData> {
    try {
      console.log(`🔍 Getting analytics data for client ${clientId} with property ${propertyId} (forceRefresh: ${forceRefresh})`);
      
      // Check if propertyId is provided
      if (!propertyId) {
        console.log(`❌ No property ID provided for client ${clientId}`);
        return {
          pageViews: 0,
          sessions: 0,
          bounceRate: 0,
          users: 0,
          newUsers: 0,
          avgSessionDuration: 0,
          topPages: [],
          trafficSources: []
        };
      }

      // Cache-first strategy: Check database first (unless force refresh)
      if (!forceRefresh) {
        const cachedData = await this.getCachedAnalyticsData(clientId, {
          startDate: '30daysAgo',
          endDate: 'today'
        });
        
        if (cachedData) {
          console.log(`⚡ Fast load from cache for client ${clientId}`);
          return cachedData;
        }
        console.log(`📭 Cache miss or stale - fetching from GA4 API...`);
      } else {
        console.log(`🔄 Force refresh requested - fetching from GA4 API...`);
      }
      
      // For GA4 Measurement IDs (G-XXXXX-X), we need to use a different approach
      // The Google Analytics Data API requires numeric Property IDs, not GA4 Measurement IDs
      if (propertyId.startsWith('G-')) {
        console.log(`❌ GA4 Measurement ID detected: ${propertyId}. GA4 Measurement IDs are not compatible with the Data API.`);
        console.log(`To get real data, we need the numeric Property ID instead of the Measurement ID.`);
        
        // Return structured data indicating that we need the numeric Property ID
        return {
          pageViews: 0,
          sessions: 0,
          bounceRate: 0,
          users: 0,
          newUsers: 0,
          avgSessionDuration: 0,
          topPages: [],
          trafficSources: []
        };
      }
      
      console.log(`🔍 Step 1: Initializing GA4 API client...`);
      // Initialize GA4 API
      const analytics = google.analyticsdata('v1beta');
      
      // Try Service Account authentication first (preferred method)
      let auth: any = await this.initializeServiceAccountAuth();
      let authMethod = 'service_account';
      
      // Fallback to OAuth2 if Service Account not available OR if it fails with permission error
      let useOAuth2 = false;
      
      if (!auth) {
        console.log('⚠️  Service Account not available, trying OAuth2...');
        useOAuth2 = true;
      } else {
        // Try a test request with Service Account to see if it has permissions
        // If it fails with 403, fallback to OAuth2
        try {
          // Test with a simple request - we'll catch 403 errors
          console.log('🔍 Testing Service Account access...');
        } catch (testError: any) {
          if (testError.response?.status === 403 || testError.message?.includes('permission')) {
            console.log('⚠️  Service Account lacks permissions, falling back to OAuth2...');
            useOAuth2 = true;
            auth = null;
          }
        }
      }
      
      // Use OAuth2 with refresh_token to get access_token
      if (useOAuth2 || !auth) {
        console.log('🔐 Using OAuth2 authentication with refresh_token...');
        
        // Ensure OAuth2 client has client_id and client_secret (required for token refresh)
        if (!this.credentials.client_id || !this.credentials.client_secret) {
          // Try to get from encrypted_credentials
          try {
            const oauthCredsResult = await pool.query(`
              SELECT key_name, encrypted_value FROM encrypted_credentials 
              WHERE service IN ('google_analytics', 'google_oauth', 'google_ads')
              AND key_name IN ('client_id', 'client_secret', 'redirect_uri')
            `);
            
            let oauthClientId = this.credentials.client_id;
            let oauthClientSecret = this.credentials.client_secret;
            let oauthRedirectUri = this.credentials.redirect_uri;
            
            oauthCredsResult.rows.forEach(row => {
              const decrypted = this.decrypt(row.encrypted_value);
              if (row.key_name === 'client_id') oauthClientId = decrypted;
              if (row.key_name === 'client_secret') oauthClientSecret = decrypted;
              if (row.key_name === 'redirect_uri') oauthRedirectUri = decrypted;
            });
            
            if (oauthClientId && oauthClientSecret) {
              this.oauth2Client = new google.auth.OAuth2(oauthClientId, oauthClientSecret, oauthRedirectUri);
              console.log('✅ OAuth2 client initialized from encrypted_credentials');
            }
          } catch (e) {
            console.error('Error fetching OAuth credentials:', e);
          }
        }
        
        // Step 1: Get credentials from database
        const credentials = await this.getClientCredentials(clientId);
        if (!credentials || !credentials.refresh_token) {
          throw new Error('No OAuth2 credentials found. Please connect Google Analytics via OAuth2.');
        }
        
        console.log('✅ Found OAuth2 credentials (refresh_token available)');
        
        // Step 2: Use refresh_token to get/refresh access_token
        const accessToken = await this.refreshTokenIfNeeded(clientId);
        if (!accessToken) {
          throw new Error('Failed to get access_token. refresh_token may be invalid or expired.');
        }
        
        console.log('✅ Got valid access_token (refreshed if needed)');
        
        // Step 3: Set OAuth2 client credentials
        this.oauth2Client.setCredentials({
          access_token: accessToken,
          refresh_token: credentials.refresh_token
        });
        
        auth = this.oauth2Client;
        authMethod = 'oauth2';
      }
      
      console.log(`✅ Using authentication method: ${authMethod}`);
      
      // Wrap API calls in try-catch to handle permission errors and fallback to OAuth2
      try {
        // Make API calls - will catch 403 errors here
        return await this.makeGA4APICall(analytics, auth, propertyId, clientId);
      } catch (apiError: any) {
        // If Service Account failed with 403, try OAuth2
        if (authMethod === 'service_account' && 
            (apiError.response?.status === 403 || apiError.message?.includes('permission'))) {
          console.log('⚠️  Service Account permission denied, falling back to OAuth2...');
          
          // Get OAuth2 credentials
          const credentials = await this.getClientCredentials(clientId);
          if (!credentials || !credentials.refresh_token) {
            throw new Error('Service Account lacks permissions and no OAuth2 credentials found. Please connect via OAuth2.');
          }
          
          // CRITICAL: Ensure OAuth2 client is initialized with client_id and client_secret
          // before trying to refresh token - use credentials from constructor or fetch from DB
          let oauthClientId = this.credentials.client_id;
          let oauthClientSecret = this.credentials.client_secret;
          let oauthRedirectUri = this.credentials.redirect_uri;
          
          // If not in env vars, try to get from encrypted_credentials table
          if (!oauthClientId || !oauthClientSecret) {
            try {
              const oauthCredsResult = await pool.query(`
                SELECT key_name, encrypted_value FROM encrypted_credentials 
                WHERE service IN ('google_analytics', 'google_oauth', 'google_ads')
                AND key_name IN ('client_id', 'client_secret', 'redirect_uri')
              `);
              
              oauthCredsResult.rows.forEach(row => {
                const decrypted = this.decrypt(row.encrypted_value);
                if (row.key_name === 'client_id') oauthClientId = decrypted;
                if (row.key_name === 'client_secret') oauthClientSecret = decrypted;
                if (row.key_name === 'redirect_uri') oauthRedirectUri = decrypted;
              });
            } catch (e) {
              console.error('Error fetching OAuth credentials from DB:', e);
            }
          }
          
          if (!oauthClientId || !oauthClientSecret) {
            throw new Error('OAuth2 client credentials (client_id, client_secret) not configured in env vars or database. Cannot refresh token.');
          }
          
          // Re-initialize OAuth2 client with credentials (needed for token refresh)
          this.oauth2Client = new google.auth.OAuth2(
            oauthClientId,
            oauthClientSecret,
            oauthRedirectUri
          );
          
          console.log('✅ OAuth2 client re-initialized with client_id and client_secret');
          
          // Use refresh_token to get access_token
          const accessToken = await this.refreshTokenIfNeeded(clientId);
          if (!accessToken) {
            throw new Error('Failed to get access_token from refresh_token.');
          }
          
          // Set OAuth2 client credentials
          this.oauth2Client.setCredentials({
            access_token: accessToken,
            refresh_token: credentials.refresh_token
          });
          
          auth = this.oauth2Client;
          authMethod = 'oauth2';
          console.log('✅ Switched to OAuth2 authentication');
          
          // Retry API call with OAuth2
          return await this.makeGA4APICall(analytics, auth, propertyId, clientId);
        } else {
          // Re-throw if not a permission error or already using OAuth2
          throw apiError;
        }
      }
    } catch (error: any) {
      console.error('❌ Error getting analytics data:', error);
      
      // Provide helpful error messages
      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data?.error;
        
        if (status === 403) {
          throw new Error(`Permission denied: The OAuth account doesn't have access to GA4 property ${propertyId}. Check GA4 Admin → Property Access.`);
        } else if (status === 404) {
          throw new Error(`GA4 Property ${propertyId} not found. Verify the Property ID is correct.`);
        } else if (status === 401) {
          throw new Error('Authentication failed. Please reconnect Google Analytics.');
        }
      }
      
      throw error;
    }
  }

  /**
   * Make GA4 API call and process/store data
   */
  private async makeGA4APICall(analytics: any, auth: any, propertyId: string, clientId: number): Promise<AnalyticsData> {
    try {
      // Set up the request for per-page metrics (Page Performance data)
      const request = {
        dateRanges: [
          {
            startDate: '30daysAgo',
            endDate: 'today'
          }
        ],
        metrics: [
          { name: 'screenPageViews' },      // Page Views
          { name: 'sessions' },            // For overall totals
          { name: 'totalUsers' },          // Unique Users per page
          { name: 'bounceRate' },          // Bounce Rate per page
          { name: 'averageSessionDuration' }, // Avg Time per page (in seconds)
          { name: 'conversions' },         // Conversions per page
          { name: 'sessionConversionRate' }, // Conversion Rate per page
          { name: 'newUsers' }             // For overall totals
        ],
        dimensions: [
          { name: 'pagePath' }             // Group by page
        ],
        orderBys: [
          {
            metric: { metricName: 'screenPageViews' },
            desc: true
          }
        ],
        limit: '10'
      };

      console.log(`📡 Making GA4 API request to property: properties/${propertyId}`);
      const response = await analytics.properties.runReport({
        property: `properties/${propertyId}`,
        requestBody: request,
        auth: auth
      });

      // Get traffic source data
      const trafficRequest = {
        dateRanges: [
          {
            startDate: '30daysAgo',
            endDate: 'today'
          }
        ],
        metrics: [
          { name: 'sessions' }
        ],
        dimensions: [
          { name: 'sessionDefaultChannelGrouping' },
          { name: 'sessionSource' },
          { name: 'sessionMedium' }
        ],
        limit: '20'
      };

      const trafficResponse = await analytics.properties.runReport({
        property: `properties/${propertyId}`,
        requestBody: trafficRequest,
        auth: auth
      });
      
      console.log(`✅ GA4 API responses received successfully`);

      // Process the real data
      const rows = response.data.rows || [];
      const trafficRows = trafficResponse.data.rows || [];
      
      console.log(`📊 Processing ${rows.length} rows from overview response, ${trafficRows.length} traffic rows`);
      
      // Extract overall metrics - GA4 with pagePath dimension returns one row per page
      // Sum up totals across all pages for overall site metrics
      let pageViews = 0;
      let sessions = 0;
      let bounceRate = 0;
      let users = 0;
      let newUsers = 0;
      let avgSessionDuration = 0;
      
      // For overall bounce rate and duration, we need weighted averages
      let totalBounceSessions = 0;
      let totalSessionDuration = 0;
      
      rows.forEach(row => {
        const metrics = row.metricValues || [];
        pageViews += metrics[0]?.value ? parseInt(metrics[0].value) : 0;
        const rowSessions = metrics[1]?.value ? parseInt(metrics[1].value) : 0;
        sessions += rowSessions;
        // Bounce rate from GA4 is already a ratio (0-1), sum it weighted by sessions
        const rowBounceRate = metrics[3]?.value ? parseFloat(metrics[3].value) : 0;
        totalBounceSessions += rowBounceRate * rowSessions; // Weighted bounce
        // Users and newUsers - sum totals
        users += metrics[2]?.value ? parseInt(metrics[2].value) : 0;
        newUsers += metrics[7]?.value ? parseInt(metrics[7].value) : 0;
        // Avg session duration is in seconds, sum weighted by sessions
        const rowDuration = metrics[4]?.value ? parseFloat(metrics[4].value) : 0;
        totalSessionDuration += rowDuration * rowSessions; // Weighted duration
      });
      
      // Calculate overall bounce rate: weighted average by sessions, then convert to percentage
      bounceRate = sessions > 0 ? (totalBounceSessions / sessions) * 100 : 0;
      // Calculate overall avg session duration: weighted average by sessions
      avgSessionDuration = sessions > 0 ? totalSessionDuration / sessions : 0;
      
      console.log(`📊 Extracted metrics:`, { pageViews, sessions, users, bounceRate: bounceRate.toFixed(2) + '%' });

      // Process top pages with per-page metrics (Page Performance data)
      const topPages = rows
        .map(row => {
          const metrics = row.metricValues || [];
          return {
        page: row.dimensionValues?.[0]?.value || '',
            pageViews: metrics[0]?.value ? parseInt(metrics[0].value) : 0,
            // Per-page metrics from GA4 API
            uniqueUsers: metrics[2]?.value ? parseInt(metrics[2].value) : 0, // totalUsers per page
            bounceRate: metrics[3]?.value ? parseFloat(metrics[3].value) * 100 : 0, // bounceRate (0-1) converted to %
            avgTime: metrics[4]?.value ? parseFloat(metrics[4].value) : 0, // averageSessionDuration in seconds
            conversions: metrics[5]?.value ? parseInt(metrics[5].value) : 0, // conversions per page
            conversionRate: metrics[6]?.value ? parseFloat(metrics[6].value) * 100 : 0 // sessionConversionRate (0-1) converted to %
          };
        })
        .sort((a, b) => b.pageViews - a.pageViews)
        .slice(0, 10);
      
      console.log(`✅ Processed ${topPages.length} pages with per-page metrics`);

      // Process traffic sources with social media tracking
      const trafficSources = trafficRows.map(row => {
        const channelGrouping = row.dimensionValues?.[0]?.value || '';
        const source = row.dimensionValues?.[1]?.value || '';
        const medium = row.dimensionValues?.[2]?.value || '';
        const sessions = row.metricValues?.[0]?.value ? parseInt(row.metricValues[0].value) : 0;
        
        // Enhanced source tracking for social media
        let enhancedSource = channelGrouping;
        if (medium === 'social' || source.includes('facebook') || source.includes('instagram') || 
            source.includes('twitter') || source.includes('linkedin') || source.includes('tiktok')) {
          enhancedSource = `Social Media (${source})`;
        } else if (source.includes('google') && medium === 'cpc') {
          enhancedSource = 'Google Ads';
        } else if (source.includes('facebook') && medium === 'cpc') {
          enhancedSource = 'Facebook Ads';
        } else if (medium === 'referral') {
          enhancedSource = `Referral (${source})`;
        }
        
        return {
          source: enhancedSource,
          originalSource: source,
          medium: medium,
          sessions: sessions
        };
      });

      // Get geographic data with engagement metrics (using only valid GA4 metrics)
      const geoRequest = {
        dateRanges: [
          {
            startDate: '30daysAgo',
            endDate: 'today'
          }
        ],
        metrics: [
          { name: 'activeUsers' },           // Active users - VALID
          { name: 'newUsers' },             // New users - VALID
          { name: 'engagedSessions' },      // Engaged sessions - VALID
          { name: 'engagementRate' },        // Engagement rate (0-1) - VALID
          { name: 'averageSessionDuration' } // Average session duration in seconds - VALID
        ],
        dimensions: [
          { name: 'country' },
          { name: 'region' }
        ],
        orderBys: [
          {
            metric: { metricName: 'activeUsers' },
            desc: true
          }
        ],
        limit: '50'
      };

      const geoResponse = await analytics.properties.runReport({
        property: `properties/${propertyId}`,
        requestBody: geoRequest,
        auth: auth
      });
      
      console.log(`✅ Geographic data with engagement metrics fetched from GA4 API`);

      const geoRows = geoResponse.data.rows || [];
      
      // Process geographic data with engagement metrics
      const geographicData = geoRows.map(row => {
        const metrics = row.metricValues || [];
        const activeUsers = metrics[0]?.value ? parseInt(metrics[0].value) : 0;
        const engagedSessions = metrics[2]?.value ? parseInt(metrics[2].value) : 0;
        // Calculate engagedSessionsPerUser manually (engagedSessions / activeUsers)
        const engagedSessionsPerUser = activeUsers > 0 ? engagedSessions / activeUsers : 0;
        
        return {
          country: row.dimensionValues?.[0]?.value || 'Unknown',
          region: row.dimensionValues?.[1]?.value || 'Unknown',
          activeUsers: activeUsers,
          newUsers: metrics[1]?.value ? parseInt(metrics[1].value) : 0,
          engagedSessions: engagedSessions,
          engagementRate: metrics[3]?.value ? parseFloat(metrics[3].value) * 100 : 0, // Convert 0-1 to percentage
          engagedSessionsPerUser: engagedSessionsPerUser,
          averageEngagementTimePerSession: metrics[4]?.value ? parseFloat(metrics[4].value) : 0 // averageSessionDuration in seconds
        };
      });

      // Get country breakdown (sum activeUsers per country)
      const countryBreakdown = geographicData.reduce((acc, item) => {
        acc[item.country] = (acc[item.country] || 0) + item.activeUsers;
        return acc;
      }, {} as Record<string, number>);

      // Get state breakdown (for US)
      const stateBreakdown = geographicData
        .filter(item => item.country === 'United States')
        .reduce((acc, item) => {
          acc[item.region] = (acc[item.region] || 0) + item.activeUsers;
          return acc;
        }, {} as Record<string, number>);

      const resultData = {
        pageViews,
        sessions,
        bounceRate,
        users,
        newUsers,
        avgSessionDuration,
        topPages,
        trafficSources,
        countryBreakdown,
        stateBreakdown,
        geographicData  // Include full geographic data with engagement metrics
      };

      // Auto-store fetched data in google_analytics_data table (unique per date, prevents data loss)
      await this.storeAggregatedAnalyticsData(clientId, resultData, propertyId);
      console.log(`✅ Analytics data fetched and stored in database for client ${clientId}`);

      return resultData;
    } catch (error: any) {
      console.error('❌ Error in GA4 API call:', error);
      throw error; // Re-throw to let caller handle fallback
    }
  }

  /**
   * Get client's property ID from database
   */
  private async getClientPropertyId(clientId: number): Promise<string | null> {
    try {
      const result = await pool.query(
        'SELECT credentials FROM client_credentials WHERE client_id = $1 AND service_type = $2',
        [clientId, 'google_analytics']
      );

      if (result.rows.length === 0) {
        return null;
      }

      const credentials = JSON.parse(result.rows[0].credentials);
      return credentials.property_id || null;
    } catch (error) {
      console.error('Error getting property ID:', error);
      return null;
    }
  }

  /**
   * Update client's property ID
   */
  async updateClientPropertyId(clientId: number, propertyId: string): Promise<void> {
    try {
      const result = await pool.query(
        'SELECT credentials FROM client_credentials WHERE client_id = $1 AND service_type = $2',
        [clientId, 'google_analytics']
      );

      if (result.rows.length === 0) {
        // Create new credentials record with just the property ID
        const newCredentials = {
          property_id: propertyId,
          connected: false
        };
        
        await pool.query(
          'INSERT INTO client_credentials (client_id, service_type, credentials, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW())',
          [clientId, 'google_analytics', JSON.stringify(newCredentials)]
        );
      } else {
        // Update existing credentials with new property ID
        console.log(`🔍 Updating property ID for client ${clientId}, existing credentials:`, result.rows[0].credentials);
        
        let credentials;
        if (typeof result.rows[0].credentials === 'string') {
          credentials = JSON.parse(result.rows[0].credentials);
        } else if (typeof result.rows[0].credentials === 'object') {
          credentials = result.rows[0].credentials;
        } else {
          console.error(`❌ Invalid credentials type for client ${clientId}:`, typeof result.rows[0].credentials);
          throw new Error('Invalid credentials format');
        }
        
        credentials.property_id = propertyId;
        console.log(`✅ Updated credentials with property ID ${propertyId}:`, credentials);

        await pool.query(
          'UPDATE client_credentials SET credentials = $1, updated_at = NOW() WHERE client_id = $2 AND service_type = $3',
          [JSON.stringify(credentials), clientId, 'google_analytics']
        );
      }
    } catch (error) {
      console.error('Error updating property ID:', error);
      throw error;
    }
  }

  /**
   * Check if Service Account credentials are available
   */
  async hasServiceAccount(): Promise<boolean> {
    try {
      const serviceAccountCreds = await this.getServiceAccountCredentials();
      return serviceAccountCreds !== null && !!serviceAccountCreds.client_email && !!serviceAccountCreds.private_key;
    } catch (error) {
      console.error('Error checking Service Account:', error);
      return false;
    }
  }

  /**
   * Check if client has valid credentials (OAuth2 or Service Account)
   */
  async hasValidCredentials(clientId: number): Promise<boolean> {
    try {
      // First check if Service Account is available
      const hasServiceAccount = await this.hasServiceAccount();
      if (hasServiceAccount) {
        console.log(`✅ Service Account available for client ${clientId}`);
        return true;
      }

      // Fallback to OAuth2 credentials
      const credentials = await this.getClientCredentials(clientId);
      const hasOAuth2 = credentials && credentials.access_token && credentials.refresh_token;
      if (hasOAuth2) {
        console.log(`✅ OAuth2 credentials found for client ${clientId}`);
      } else {
        console.log(`⚠️  No valid credentials (Service Account or OAuth2) for client ${clientId}`);
      }
      return hasOAuth2;
    } catch (error) {
      console.error('Error checking credentials:', error);
      return false;
    }
  }
}

export default new GoogleAnalyticsService();