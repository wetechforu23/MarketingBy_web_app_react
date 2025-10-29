import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import FacebookTokenService from '../services/facebookTokenService';
import pool from '../config/database';

const router = Router();

// OAuth Flow - Step 1: Get OAuth URL (GET method for easy frontend integration)
router.get('/facebook-connect/auth/:clientId', requireAuth, async (req, res) => {
  try {
    const { clientId } = req.params;
    console.log(`🔗 Generating OAuth URL for client ${clientId}`);

    const tokenService = new FacebookTokenService(pool);
    const oauthUrl = tokenService.generateOAuthUrl(parseInt(clientId));

    // Redirect directly to Facebook OAuth
    res.redirect(oauthUrl);
  } catch (error: any) {
    console.error('❌ Error generating OAuth URL:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// OAuth Flow - Step 1: Get OAuth URL (POST method - alternative)
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
    console.log('✅ User token obtained');
    
    // Get user's pages
    const pages = await tokenService.getUserPages(userToken);
    console.log(`📄 Found ${pages.length} pages`);

    // Extract client ID from state
    const clientId = (state as string).match(/client_(\d+)_/)?.[1];

    if (!clientId) {
      return res.redirect('/app/client-management?error=invalid_state');
    }

    // Check if we have pages
    if (!pages || pages.length === 0) {
      console.log('⚠️ No pages found, redirecting with error');
      return res.redirect(`/app/facebook-connect/${clientId}?error=no_pages_found&error_description=No+pages+found.+Please+ensure+you+manage+at+least+one+Facebook+page+and+approved+all+permissions.`);
    }

    // AUTOMATIC: If only 1 page, auto-connect it
    if (pages.length === 1) {
      const page = pages[0];
      console.log(`🎯 Auto-connecting single page: ${page.name}`);
      
      try {
        // Automatically store the page with token conversion
        await tokenService.storePageCredentials(
          parseInt(clientId),
          page.id,
          page.access_token,
          page.name
        );
        
        console.log('✅ Page automatically connected!');
        return res.redirect(`/app/client-management?success=facebook_connected&page=${encodeURIComponent(page.name)}`);
      } catch (storeError: any) {
        console.error('❌ Error auto-storing page:', storeError.message);
        return res.redirect(`/app/facebook-connect/${clientId}?error=storage_failed&error_description=${encodeURIComponent(storeError.message)}`);
      }
    }

    // Multiple pages - redirect to page selector
    console.log('📋 Multiple pages found, showing selector');
    const pagesData = encodeURIComponent(JSON.stringify(pages));
    const tokenData = encodeURIComponent(userToken);
    
    res.redirect(`/app/facebook-connect/${clientId}?pages=${pagesData}&token=${tokenData}&success=true`);
  } catch (error: any) {
    console.error('❌ OAuth callback error:', error.message);
    const clientId = (req.query.state as string)?.match(/client_(\d+)_/)?.[1];
    const redirectUrl = clientId 
      ? `/app/facebook-connect/${clientId}`
      : '/app/client-management';
    res.redirect(`${redirectUrl}?error=token_exchange_failed&error_description=${encodeURIComponent(error.message)}`);
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

// Disconnect Facebook (DELETE method)
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

// Disconnect Facebook (POST method - for frontend compatibility)
router.post('/facebook-connect/disconnect/:clientId', requireAuth, async (req, res) => {
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

