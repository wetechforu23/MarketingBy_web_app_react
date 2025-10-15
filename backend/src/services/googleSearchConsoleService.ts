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
      redirect_uri: process.env.GOOGLE_ANALYTICS_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback'
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

      // For now, return mock data with real site URL
      // TODO: Implement actual Google Search Console API calls
      console.log(`Getting search console data for client ${clientId} with site ${siteUrl}`);
      
      return {
        totalClicks: Math.floor(Math.random() * 5000) + 500,
        totalImpressions: Math.floor(Math.random() * 50000) + 5000,
        averageCtr: Math.floor(Math.random() * 5) + 2,
        averagePosition: Math.floor(Math.random() * 20) + 5,
        topQueries: [
          { query: 'healthcare services', clicks: Math.floor(Math.random() * 100) + 10, impressions: Math.floor(Math.random() * 1000) + 100, ctr: Math.floor(Math.random() * 10) + 1, position: Math.floor(Math.random() * 10) + 1 },
          { query: 'medical consultation', clicks: Math.floor(Math.random() * 80) + 8, impressions: Math.floor(Math.random() * 800) + 80, ctr: Math.floor(Math.random() * 8) + 1, position: Math.floor(Math.random() * 8) + 1 },
          { query: 'doctor appointment', clicks: Math.floor(Math.random() * 60) + 6, impressions: Math.floor(Math.random() * 600) + 60, ctr: Math.floor(Math.random() * 6) + 1, position: Math.floor(Math.random() * 6) + 1 }
        ],
        topPages: [
          { page: '/', clicks: Math.floor(Math.random() * 200) + 20, impressions: Math.floor(Math.random() * 2000) + 200, ctr: Math.floor(Math.random() * 10) + 1, position: Math.floor(Math.random() * 5) + 1 },
          { page: '/services', clicks: Math.floor(Math.random() * 150) + 15, impressions: Math.floor(Math.random() * 1500) + 150, ctr: Math.floor(Math.random() * 8) + 1, position: Math.floor(Math.random() * 7) + 1 },
          { page: '/contact', clicks: Math.floor(Math.random() * 100) + 10, impressions: Math.floor(Math.random() * 1000) + 100, ctr: Math.floor(Math.random() * 6) + 1, position: Math.floor(Math.random() * 9) + 1 }
        ],
        devices: [
          { device: 'desktop', clicks: Math.floor(Math.random() * 3000) + 300, impressions: Math.floor(Math.random() * 30000) + 3000 },
          { device: 'mobile', clicks: Math.floor(Math.random() * 2000) + 200, impressions: Math.floor(Math.random() * 20000) + 2000 },
          { device: 'tablet', clicks: Math.floor(Math.random() * 500) + 50, impressions: Math.floor(Math.random() * 5000) + 500 }
        ],
        countries: [
          { country: 'United States', clicks: Math.floor(Math.random() * 4000) + 400, impressions: Math.floor(Math.random() * 40000) + 4000 },
          { country: 'Canada', clicks: Math.floor(Math.random() * 800) + 80, impressions: Math.floor(Math.random() * 8000) + 800 },
          { country: 'United Kingdom', clicks: Math.floor(Math.random() * 600) + 60, impressions: Math.floor(Math.random() * 6000) + 600 }
        ]
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
        throw new Error('No credentials found for client');
      }

      const credentials = JSON.parse(result.rows[0].credentials);
      credentials.site_url = siteUrl;

      await pool.query(
        'UPDATE client_credentials SET credentials = $1, updated_at = NOW() WHERE client_id = $2 AND service_type = $3',
        [JSON.stringify(credentials), clientId, 'google_search_console']
      );
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