import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import FacebookTokenService from '../services/facebookTokenService';
import pool from '../config/database';

const router = Router();

// OAuth Flow - Step 1: Get OAuth URL
router.post('/facebook-connect/oauth/start/:clientId', requireAuth, async (req, res) => {
  try {
    const { clientId } = req.params;
    console.log(`🔗 Generating OAuth URL for client ${clientId}`);

    const tokenService = new FacebookTokenService(pool);
    const oauthUrl = tokenService.generateOAuthUrl(parseInt(clientId));

    res.json({
      success: true,
      oauthUrl
    });
  } catch (error: any) {
    console.error('❌ Error generating OAuth URL:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// OAuth Flow - Step 2: Handle OAuth callback
router.get('/facebook-connect/callback', async (req, res) => {
  try {
    const { code, state, error, error_description } = req.query;

    // Check for OAuth errors
    if (error) {
      console.error('❌ OAuth error:', error, error_description);
      return res.redirect(`/app/facebook-connect?error=${error}&error_description=${error_description}`);
    }

    if (!code || !state) {
      return res.redirect('/app/facebook-connect?error=missing_parameters');
    }

    console.log('✅ OAuth callback received, exchanging code...');

    const tokenService = new FacebookTokenService(pool);
    
    // Exchange code for token
    const userToken = await tokenService.exchangeCodeForToken(code as string);
    
    // Get user's pages
    const pages = await tokenService.getUserPages(userToken);

    // Extract client ID from state
    const clientId = (state as string).match(/client_(\d+)_/)?.[1];

    // Store in session or redirect with data
    // For now, redirect to page selector with pages data
    const pagesData = encodeURIComponent(JSON.stringify(pages));
    const tokenData = encodeURIComponent(userToken);
    
    res.redirect(`/app/facebook-connect?clientId=${clientId}&pages=${pagesData}&token=${tokenData}&success=true`);
  } catch (error: any) {
    console.error('❌ OAuth callback error:', error.message);
    res.redirect(`/app/facebook-connect?error=token_exchange_failed&error_description=${encodeURIComponent(error.message)}`);
  }
});

// OAuth Flow - Step 3: Complete connection (store selected page)
// Automatically checks if token is short-lived or long-lived
// Converts to long-lived if needed before storing
router.post('/facebook-connect/oauth/complete/:clientId', requireAuth, async (req, res) => {
  try {
    const { clientId } = req.params;
    const { pageId, pageToken, pageName } = req.body;

    if (!pageId || !pageToken) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: pageId, pageToken'
      });
    }

    console.log(`💾 Processing and storing OAuth page credentials for client ${clientId}`);
    console.log(`📝 This will automatically check and convert short-lived tokens to long-lived`);

    const tokenService = new FacebookTokenService(pool);
    await tokenService.storePageCredentials(parseInt(clientId), pageId, pageToken, pageName);

    res.json({
      success: true,
      message: 'Facebook page connected successfully with long-lived token'
    });
  } catch (error: any) {
    console.error('❌ Error completing OAuth:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Manual Token Flow - Step 1: Process manual token
router.post('/facebook-connect/manual/:clientId', requireAuth, async (req, res) => {
  try {
    const { clientId } = req.params;
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: token'
      });
    }

    console.log(`🔍 Processing manual token for client ${clientId}`);

    const tokenService = new FacebookTokenService(pool);
    const result = await tokenService.processManualToken(token);

    res.json({
      success: true,
      pages: result.pages,
      tokenInfo: {
        type: result.tokenInfo.type,
        is_valid: result.tokenInfo.is_valid,
        expires_at: result.tokenInfo.expires_at,
        scopes: result.tokenInfo.scopes
      },
      processedToken: result.token
    });
  } catch (error: any) {
    console.error('❌ Error processing manual token:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Manual Token Flow - Step 2: Complete connection (store selected page)
// Automatically checks if token is short-lived or long-lived
// Converts to long-lived if needed before storing
router.post('/facebook-connect/manual/complete/:clientId', requireAuth, async (req, res) => {
  try {
    const { clientId } = req.params;
    const { pageId, pageToken, pageName } = req.body;

    if (!pageId || !pageToken) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: pageId, pageToken'
      });
    }

    console.log(`💾 Processing and storing manual page credentials for client ${clientId}`);
    console.log(`📝 This will automatically check and convert short-lived tokens to long-lived`);

    const tokenService = new FacebookTokenService(pool);
    await tokenService.storePageCredentials(parseInt(clientId), pageId, pageToken, pageName);

    res.json({
      success: true,
      message: 'Facebook page connected successfully with long-lived token'
    });
  } catch (error: any) {
    console.error('❌ Error completing manual connection:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get connection status
router.get('/facebook-connect/status/:clientId', requireAuth, async (req, res) => {
  try {
    const { clientId } = req.params;

    const tokenService = new FacebookTokenService(pool);
    const status = await tokenService.getStoredCredentials(parseInt(clientId));

    res.json({
      success: true,
      ...status
    });
  } catch (error: any) {
    console.error('❌ Error getting connection status:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Disconnect Facebook
router.delete('/facebook-connect/:clientId', requireAuth, async (req, res) => {
  try {
    const { clientId } = req.params;

    console.log(`🗑️ Disconnecting Facebook for client ${clientId}`);

    const tokenService = new FacebookTokenService(pool);
    await tokenService.deleteCredentials(parseInt(clientId));

    res.json({
      success: true,
      message: 'Facebook disconnected successfully'
    });
  } catch (error: any) {
    console.error('❌ Error disconnecting Facebook:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;

