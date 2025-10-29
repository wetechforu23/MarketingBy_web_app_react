import axios from 'axios';
import { Pool } from 'pg';

interface TokenInfo {
  is_valid: boolean;
  type: 'USER' | 'PAGE';
  app_id: string;
  user_id?: string;
  expires_at?: number;
  data_access_expires_at?: number;
  scopes?: string[];
}

interface PageInfo {
  id: string;
  name: string;
  access_token: string;
  category?: string;
  tasks?: string[];
}

export default class FacebookTokenService {
  private pool: Pool;
  private appId: string;
  private appSecret: string;
  private redirectUri: string;
  private baseUrl = 'https://graph.facebook.com/v18.0';

  constructor(pool: Pool) {
    this.pool = pool;
    this.appId = process.env.FACEBOOK_APP_ID || '';
    this.appSecret = process.env.FACEBOOK_APP_SECRET || '';
    this.redirectUri = process.env.FACEBOOK_REDIRECT_URI || '';
  }

  /**
   * Generate OAuth URL for Facebook login
   */
  generateOAuthUrl(clientId: number, state?: string): string {
    const stateParam = state || `client_${clientId}_${Date.now()}`;
    const scopes = [
      'pages_manage_posts',
      'pages_read_engagement',
      'read_insights',
      'pages_show_list',
      'business_management'
    ].join(',');

    const params = new URLSearchParams({
      client_id: this.appId,
      redirect_uri: this.redirectUri,
      scope: scopes,
      response_type: 'code',
      state: stateParam
    });

    return `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;
  }

  /**
   * Exchange OAuth code for access token
   */
  async exchangeCodeForToken(code: string): Promise<string> {
    try {
      console.log('🔄 Exchanging OAuth code for access token...');
      
      const response = await axios.get(`${this.baseUrl}/oauth/access_token`, {
        params: {
          client_id: this.appId,
          client_secret: this.appSecret,
          redirect_uri: this.redirectUri,
          code: code
        }
      });

      const shortLivedToken = response.data.access_token;
      console.log('✅ Short-lived token obtained');

      // Exchange for long-lived token
      return await this.exchangeForLongLivedToken(shortLivedToken);
    } catch (error: any) {
      console.error('❌ Error exchanging code:', error.response?.data || error.message);
      throw new Error(`Failed to exchange code: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Debug token to get info
   */
  async debugToken(token: string): Promise<TokenInfo> {
    try {
      // Get app access token
      const appTokenResponse = await axios.get(`${this.baseUrl}/oauth/access_token`, {
        params: {
          client_id: this.appId,
          client_secret: this.appSecret,
          grant_type: 'client_credentials'
        }
      });

      const appAccessToken = appTokenResponse.data.access_token;

      // Debug the user token
      const debugResponse = await axios.get(`${this.baseUrl}/debug_token`, {
        params: {
          input_token: token,
          access_token: appAccessToken
        }
      });

      return debugResponse.data.data;
    } catch (error: any) {
      console.error('❌ Error debugging token:', error.response?.data || error.message);
      throw new Error(`Failed to debug token: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Exchange short-lived token for long-lived token
   */
  async exchangeForLongLivedToken(shortToken: string): Promise<string> {
    try {
      console.log('🔄 Exchanging for long-lived token...');
      
      const response = await axios.get(`${this.baseUrl}/oauth/access_token`, {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: this.appId,
          client_secret: this.appSecret,
          fb_exchange_token: shortToken
        }
      });

      console.log('✅ Long-lived user token obtained');
      return response.data.access_token;
    } catch (error: any) {
      // If exchange fails, it might already be long-lived or a page token
      console.log('ℹ️ Token exchange failed (might already be long-lived):', error.response?.data?.error?.message);
      return shortToken;
    }
  }

  /**
   * Get user's pages with their access tokens
   */
  async getUserPages(userToken: string): Promise<PageInfo[]> {
    try {
      console.log('📄 Fetching user pages...');
      
      const response = await axios.get(`${this.baseUrl}/me/accounts`, {
        params: {
          access_token: userToken,
          fields: 'id,name,access_token,category,tasks'
        }
      });

      const pages = response.data.data || [];
      console.log(`✅ Found ${pages.length} pages`);
      
      return pages;
    } catch (error: any) {
      console.error('❌ Error fetching pages:', error.response?.data || error.message);
      throw new Error(`Failed to fetch pages: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Get page info directly using a page token
   */
  async getPageInfo(pageToken: string): Promise<PageInfo> {
    try {
      console.log('📄 Fetching page info directly...');
      
      const response = await axios.get(`${this.baseUrl}/me`, {
        params: {
          access_token: pageToken,
          fields: 'id,name,category,fan_count'
        }
      });

      const page = response.data;
      console.log(`✅ Page found: ${page.name} (${page.id})`);
      
      return {
        id: page.id,
        name: page.name,
        access_token: pageToken, // Use the token that was provided
        category: page.category
      };
    } catch (error: any) {
      console.error('❌ Error fetching page info:', error.response?.data || error.message);
      throw new Error(`Failed to fetch page info: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Verify token has required permissions
   */
  async verifyTokenPermissions(token: string): Promise<{ valid: boolean; missingPermissions: string[] }> {
    try {
      const tokenInfo = await this.debugToken(token);
      
      const requiredPermissions = [
        'pages_manage_posts',
        'pages_read_engagement',
        'read_insights'
      ];

      const userScopes = tokenInfo.scopes || [];
      const missingPermissions = requiredPermissions.filter(
        perm => !userScopes.includes(perm)
      );

      return {
        valid: missingPermissions.length === 0,
        missingPermissions
      };
    } catch (error) {
      return {
        valid: false,
        missingPermissions: ['Unable to verify permissions']
      };
    }
  }

  /**
   * Process manual token input
   * Detects type and converts if needed
   */
  async processManualToken(token: string): Promise<{ token: string; pages: PageInfo[]; tokenInfo: TokenInfo }> {
    try {
      console.log('🔍 Processing manual token...');
      
      // Debug the token
      const tokenInfo = await this.debugToken(token);
      console.log(`📋 Token type: ${tokenInfo.type}`);

      let processedToken = token;
      let pages: PageInfo[] = [];

      // Handle based on token type
      if (tokenInfo.type === 'PAGE') {
        // It's already a page token - get the page info directly
        console.log('✅ Page token detected (already optimal)');
        const pageInfo = await this.getPageInfo(token);
        pages = [pageInfo];
      } else if (tokenInfo.type === 'USER') {
        // It's a user token - exchange if short-lived, then get pages
        if (tokenInfo.expires_at) {
          const hoursUntilExpiry = (tokenInfo.expires_at * 1000 - Date.now()) / (1000 * 60 * 60);
          
          if (hoursUntilExpiry < 24) {
            console.log('🔄 Short-lived user token detected, exchanging...');
            processedToken = await this.exchangeForLongLivedToken(token);
          } else {
            console.log('✅ Already long-lived user token');
          }
        }
        
        // Get user's pages
        pages = await this.getUserPages(processedToken);
      }

      return {
        token: processedToken,
        pages,
        tokenInfo
      };
    } catch (error: any) {
      console.error('❌ Error processing manual token:', error.message);
      throw error;
    }
  }

  /**
   * Process page token - check if short-lived or long-lived, convert if needed
   */
  async processPageToken(pageToken: string): Promise<string> {
    try {
      console.log('🔍 Checking page token expiry...');
      
      // Debug the token to check type and expiry
      const tokenInfo = await this.debugToken(pageToken);
      console.log(`📋 Token type: ${tokenInfo.type}`);
      
      // Page tokens from OAuth are typically long-lived, but let's verify
      if (tokenInfo.expires_at) {
        const expiryDate = new Date(tokenInfo.expires_at * 1000);
        const hoursUntilExpiry = (tokenInfo.expires_at * 1000 - Date.now()) / (1000 * 60 * 60);
        
        console.log(`⏰ Token expires at: ${expiryDate.toISOString()}`);
        console.log(`⏳ Hours until expiry: ${hoursUntilExpiry.toFixed(2)}`);
        
        // If token expires in less than 30 days (720 hours), try to exchange for long-lived
        if (hoursUntilExpiry < 720) {
          console.log('🔄 Short-lived token detected, attempting to exchange for long-lived token...');
          try {
            const longLivedToken = await this.exchangeForLongLivedToken(pageToken);
            console.log('✅ Successfully exchanged for long-lived token');
            return longLivedToken;
          } catch (exchangeError: any) {
            console.log('⚠️  Exchange failed, but will proceed with current token:', exchangeError.message);
            // If exchange fails, continue with the current token (it might already be long-lived)
            return pageToken;
          }
        } else {
          console.log('✅ Token is already long-lived (expires in > 30 days)');
        }
      } else {
        console.log('✅ Token has no expiry (never expires)');
      }
      
      return pageToken;
    } catch (error: any) {
      console.error('❌ Error processing page token:', error.message);
      // If we can't check the token, return it anyway (better to try than to fail)
      console.log('⚠️  Proceeding with original token despite error');
      return pageToken;
    }
  }

  /**
   * Store page credentials in database
   * Now includes token processing to ensure long-lived tokens
   */
  async storePageCredentials(clientId: number, pageId: string, pageToken: string, pageName: string): Promise<void> {
    try {
      console.log(`💾 Storing credentials for client ${clientId}, page ${pageId}`);

      // STEP 1: Process token to ensure it's long-lived
      console.log('🔄 Step 1: Processing page token...');
      const processedToken = await this.processPageToken(pageToken);

      // STEP 2: Verify token has required permissions
      console.log('🔒 Step 2: Verifying token permissions...');
      const verification = await this.verifyTokenPermissions(processedToken);
      if (!verification.valid) {
        throw new Error(`Token missing required permissions: ${verification.missingPermissions.join(', ')}`);
      }

      // STEP 3: Store in database (UPSERT)
      console.log('💾 Step 3: Upserting credentials to database...');
      const credentials = {
        page_id: pageId,
        access_token: processedToken,
        page_name: pageName
      };

      const result = await this.pool.query(
        `INSERT INTO client_credentials (client_id, service_type, credentials, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())
         ON CONFLICT (client_id, service_type)
         DO UPDATE SET 
           credentials = $3,
           updated_at = NOW()
         RETURNING id`,
        [clientId, 'facebook', JSON.stringify(credentials)]
      );

      console.log(`✅ Credentials stored successfully (ID: ${result.rows[0].id})`);
      console.log(`✅ All steps completed - Facebook page connected!`);
    } catch (error: any) {
      console.error('❌ Error storing credentials:', error.message);
      throw error;
    }
  }

  /**
   * Get stored credentials for a client
   */
  async getStoredCredentials(clientId: number): Promise<{ connected: boolean; pageId?: string; pageName?: string }> {
    try {
      const result = await this.pool.query(
        `SELECT credentials FROM client_credentials 
         WHERE client_id = $1 AND service_type = $2`,
        [clientId, 'facebook']
      );

      if (result.rows.length === 0) {
        return { connected: false };
      }

      const creds = result.rows[0].credentials;
      return {
        connected: true,
        pageId: creds.page_id || creds.pageId,
        pageName: creds.page_name || creds.pageName || 'Unknown'
      };
    } catch (error: any) {
      console.error('❌ Error getting stored credentials:', error.message);
      return { connected: false };
    }
  }

  /**
   * Delete stored credentials
   */
  async deleteCredentials(clientId: number): Promise<void> {
    try {
      await this.pool.query(
        `DELETE FROM client_credentials 
         WHERE client_id = $1 AND service_type = $2`,
        [clientId, 'facebook']
      );
      console.log(`✅ Credentials deleted for client ${clientId}`);
    } catch (error: any) {
      console.error('❌ Error deleting credentials:', error.message);
      throw error;
    }
  }
}

