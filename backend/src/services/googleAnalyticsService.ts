import { google } from 'googleapis';
import { pool } from '../config/database';

interface GoogleAnalyticsCredentials {
  client_id: string;
  client_secret: string;
  redirect_uri: string;
  access_token?: string;
  refresh_token?: string;
  property_id?: string;
  view_id?: string;
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
  }>;
  trafficSources: Array<{
    source: string;
    sessions: number;
  }>;
}

export class GoogleAnalyticsService {
  private oauth2Client: any;
  private credentials: GoogleAnalyticsCredentials;

  constructor() {
    this.credentials = {
      client_id: process.env.GOOGLE_ANALYTICS_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_ANALYTICS_CLIENT_SECRET || '',
      redirect_uri: process.env.GOOGLE_ANALYTICS_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback'
    };

    this.oauth2Client = new google.auth.OAuth2(
      this.credentials.client_id,
      this.credentials.client_secret,
      this.credentials.redirect_uri
    );
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
  private async getClientCredentials(clientId: number): Promise<any> {
    try {
      const result = await pool.query(
        'SELECT credentials FROM client_credentials WHERE client_id = $1 AND service_type = $2',
        [clientId, 'google_analytics']
      );

      if (result.rows.length === 0) {
        return null;
      }

      return JSON.parse(result.rows[0].credentials);
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

      // Check if token is expired
      if (credentials.expires_at && new Date(credentials.expires_at) <= new Date()) {
        const { credentials: newCredentials } = await this.oauth2Client.refreshAccessToken();
        
        // Update stored credentials
        await this.storeClientCredentials(clientId, {
          access_token: newCredentials.access_token,
          refresh_token: credentials.refresh_token, // Keep the original refresh token
          expires_at: new Date(Date.now() + (newCredentials.expiry_date || 3600 * 1000))
        });

        return newCredentials.access_token;
      }

      return credentials.access_token;
    } catch (error) {
      console.error('Error refreshing token:', error);
      return null;
    }
  }

  /**
   * Get analytics data for a client
   */
  async getAnalyticsData(clientId: number, propertyId?: string): Promise<AnalyticsData> {
    try {
      const accessToken = await this.refreshTokenIfNeeded(clientId);
      if (!accessToken) {
        throw new Error('No valid access token available');
      }

      this.oauth2Client.setCredentials({ access_token: accessToken });

      // Get client's property ID if not provided
      if (!propertyId) {
        propertyId = await this.getClientPropertyId(clientId);
      }

      if (!propertyId) {
        throw new Error('No property ID configured for client');
      }

      const analytics = google.analyticsdata({ version: 'v1beta', auth: this.oauth2Client });

      // Get basic metrics
      const metricsResponse = await analytics.properties.runReport({
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: [
            {
              startDate: '30daysAgo',
              endDate: 'today'
            }
          ],
          metrics: [
            { name: 'sessions' },
            { name: 'screenPageViews' },
            { name: 'bounceRate' },
            { name: 'totalUsers' },
            { name: 'newUsers' },
            { name: 'averageSessionDuration' }
          ],
          dimensions: [
            { name: 'date' }
          ]
        }
      });

      // Get top pages
      const topPagesResponse = await analytics.properties.runReport({
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: [
            {
              startDate: '30daysAgo',
              endDate: 'today'
            }
          ],
          metrics: [
            { name: 'screenPageViews' }
          ],
          dimensions: [
            { name: 'pagePath' }
          ],
          orderBys: [
            {
              metric: { metricName: 'screenPageViews' },
              desc: true
            }
          ],
          limit: 10
        }
      });

      // Get traffic sources
      const trafficSourcesResponse = await analytics.properties.runReport({
        property: `properties/${propertyId}`,
        requestBody: {
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
            { name: 'sessionDefaultChannelGrouping' }
          ],
          orderBys: [
            {
              metric: { metricName: 'sessions' },
              desc: true
            }
          ],
          limit: 10
        }
      });

      // Process the data
      const metrics = metricsResponse.data.rows?.[0]?.metricValues || [];
      const topPages = topPagesResponse.data.rows?.map(row => ({
        page: row.dimensionValues?.[0]?.value || '',
        pageViews: parseInt(row.metricValues?.[0]?.value || '0')
      })) || [];

      const trafficSources = trafficSourcesResponse.data.rows?.map(row => ({
        source: row.dimensionValues?.[0]?.value || '',
        sessions: parseInt(row.metricValues?.[0]?.value || '0')
      })) || [];

      return {
        pageViews: parseInt(metrics[1]?.value || '0'),
        sessions: parseInt(metrics[0]?.value || '0'),
        bounceRate: parseFloat(metrics[2]?.value || '0'),
        users: parseInt(metrics[3]?.value || '0'),
        newUsers: parseInt(metrics[4]?.value || '0'),
        avgSessionDuration: parseFloat(metrics[5]?.value || '0'),
        topPages,
        trafficSources
      };

    } catch (error) {
      console.error('Error getting analytics data:', error);
      throw error;
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
        throw new Error('No credentials found for client');
      }

      const credentials = JSON.parse(result.rows[0].credentials);
      credentials.property_id = propertyId;

      await pool.query(
        'UPDATE client_credentials SET credentials = $1, updated_at = NOW() WHERE client_id = $2 AND service_type = $3',
        [JSON.stringify(credentials), clientId, 'google_analytics']
      );
    } catch (error) {
      console.error('Error updating property ID:', error);
      throw error;
    }
  }

  /**
   * Check if client has valid credentials
   */
  async hasValidCredentials(clientId: number): Promise<boolean> {
    try {
      const credentials = await this.getClientCredentials(clientId);
      return credentials && credentials.access_token && credentials.refresh_token;
    } catch (error) {
      console.error('Error checking credentials:', error);
      return false;
    }
  }
}

export default new GoogleAnalyticsService();