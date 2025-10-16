import { google } from 'googleapis';
import pool from '../config/database';

interface SearchConsoleData {
  totalClicks: number;
  totalImpressions: number;
  averageCtr: number;
  averagePosition: number;
  topQueries: Array<{
    query: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>;
  topPages: Array<{
    page: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>;
  devices: Array<{
    device: string;
    clicks: number;
    impressions: number;
  }>;
  countries: Array<{
    country: string;
    clicks: number;
    impressions: number;
  }>;
}

export class GoogleSearchConsoleService {
  private oauth2Client: any;
  private credentials: any;

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
   * Generate OAuth authorization URL for Search Console
   */
  generateAuthUrl(clientId: number): string {
    const scopes = [
      'https://www.googleapis.com/auth/webmasters.readonly'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: JSON.stringify({ clientId, type: 'google_search_console' }),
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
        [clientId, 'google_search_console', JSON.stringify(credentials)]
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
        [clientId, 'google_search_console']
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

      // Check if token is expired
      if (credentials.expires_at && new Date(credentials.expires_at) <= new Date()) {
        const { credentials: newCredentials } = await this.oauth2Client.refreshAccessToken();
        
        // Update stored credentials
        await this.storeClientCredentials(clientId, {
          access_token: newCredentials.access_token,
          refresh_token: credentials.refresh_token,
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
   * Get search console data for a client (simplified version for now)
   */
  async getSearchConsoleData(clientId: number, siteUrl?: string): Promise<SearchConsoleData> {
    try {
      const accessToken = await this.refreshTokenIfNeeded(clientId);
      if (!accessToken) {
        throw new Error('No valid access token available');
      }

      console.log(`Getting REAL search console data for client ${clientId} with site ${siteUrl}`);
      
      // Get real data from Google Search Console API
      const searchconsole = google.searchconsole('v1');
      
      // Get search analytics data
      const searchRequest = {
        siteUrl: siteUrl,
        requestBody: {
          startDate: '2025-09-15',
          endDate: '2025-10-15',
          dimensions: ['query'],
          rowLimit: 20,
          startRow: 0
        },
        auth: this.oauth2Client
      };

      const searchResponse = await searchconsole.searchanalytics.query(searchRequest);
      
      // Get page analytics data
      const pageRequest = {
        siteUrl: siteUrl,
        requestBody: {
          startDate: '2025-09-15',
          endDate: '2025-10-15',
          dimensions: ['page'],
          rowLimit: 10,
          startRow: 0
        },
        auth: this.oauth2Client
      };

      const pageResponse = await searchconsole.searchanalytics.query(pageRequest);

      // Process the real data
      const searchRows = searchResponse.data.rows || [];
      const pageRows = pageResponse.data.rows || [];
      
      // Calculate totals
      const totalClicks = searchRows.reduce((sum, row) => sum + (row.clicks || 0), 0);
      const totalImpressions = searchRows.reduce((sum, row) => sum + (row.impressions || 0), 0);
      const averageCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
      const averagePosition = searchRows.length > 0 ? 
        searchRows.reduce((sum, row) => sum + (row.position || 0), 0) / searchRows.length : 0;

      // Process top queries
      const topQueries = searchRows.map(row => ({
        query: row.keys?.[0] || '',
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        ctr: row.ctr || 0,
        position: row.position || 0
      }));

      // Process top pages
      const topPages = pageRows.map(row => ({
        page: row.keys?.[0] || '',
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        ctr: row.ctr || 0,
        position: row.position || 0
      }));

      return {
        totalClicks,
        totalImpressions,
        averageCtr,
        averagePosition,
        topQueries,
        topPages,
        devices: [], // Would need separate API call for device data
        countries: [] // Would need separate API call for country data
      };

    } catch (error) {
      console.error('Error getting search console data:', error);
      throw error;
    }
  }

  /**
   * Get client's site URL from database
   */
  private async getClientSiteUrl(clientId: number): Promise<string | null> {
    try {
      const result = await pool.query(
        'SELECT credentials FROM client_credentials WHERE client_id = $1 AND service_type = $2',
        [clientId, 'google_search_console']
      );

      if (result.rows.length === 0) {
        return null;
      }

      const credentials = JSON.parse(result.rows[0].credentials);
      return credentials.site_url || null;
    } catch (error) {
      console.error('Error getting site URL:', error);
      return null;
    }
  }

  /**
   * Update client's site URL
   */
  async updateClientSiteUrl(clientId: number, siteUrl: string): Promise<void> {
    try {
      const result = await pool.query(
        'SELECT credentials FROM client_credentials WHERE client_id = $1 AND service_type = $2',
        [clientId, 'google_search_console']
      );

      if (result.rows.length === 0) {
        // Create new credentials record with just the site URL
        const newCredentials = {
          site_url: siteUrl,
          connected: false
        };
        
        await pool.query(
          'INSERT INTO client_credentials (client_id, service_type, credentials, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW())',
          [clientId, 'google_search_console', JSON.stringify(newCredentials)]
        );
      } else {
        // Update existing credentials with new site URL
        console.log(`🔍 Updating site URL for client ${clientId}, existing credentials:`, result.rows[0].credentials);
        
        let credentials;
        if (typeof result.rows[0].credentials === 'string') {
          credentials = JSON.parse(result.rows[0].credentials);
        } else if (typeof result.rows[0].credentials === 'object') {
          credentials = result.rows[0].credentials;
        } else {
          console.error(`❌ Invalid credentials type for client ${clientId}:`, typeof result.rows[0].credentials);
          throw new Error('Invalid credentials format');
        }
        
        credentials.site_url = siteUrl;
        console.log(`✅ Updated credentials with site URL ${siteUrl}:`, credentials);

        await pool.query(
          'UPDATE client_credentials SET credentials = $1, updated_at = NOW() WHERE client_id = $2 AND service_type = $3',
          [JSON.stringify(credentials), clientId, 'google_search_console']
        );
      }
    } catch (error) {
      console.error('Error updating site URL:', error);
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

export default new GoogleSearchConsoleService();