const { Pool } = require('pg');
require('dotenv').config();

const dbUrl = process.env.DATABASE_URL || '';
const isRemoteDb = dbUrl && (
  dbUrl.includes('rds.amazonaws.com') || 
  dbUrl.includes('heroku') || 
  dbUrl.includes('.com') ||
  !dbUrl.includes('localhost')
);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isRemoteDb ? { rejectUnauthorized: false } : false
});

async function diagnose() {
  console.log('\n🔍 === FACEBOOK OAUTH CONNECTION DIAGNOSTIC ===\n');
  
  try {
    // 1. Check Facebook App Credentials
    console.log('1️⃣ Checking Facebook App Credentials...');
    const appId = process.env.FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET;
    const redirectUri = process.env.FACEBOOK_REDIRECT_URI;
    
    console.log(`   FACEBOOK_APP_ID: ${appId ? '✅ Set (' + appId + ')' : '❌ NOT SET'}`);
    console.log(`   FACEBOOK_APP_SECRET: ${appSecret ? '✅ Set (hidden)' : '❌ NOT SET'}`);
    console.log(`   FACEBOOK_REDIRECT_URI: ${redirectUri || '❌ NOT SET (using default)'}`);
    
    if (!appId || !appSecret) {
      console.log('\n❌ PROBLEM FOUND: Facebook App credentials not configured!');
      console.log('\n📝 TO FIX:');
      console.log('   1. Go to: https://developers.facebook.com/apps/');
      console.log('   2. Select your app (or create one)');
      console.log('   3. Copy App ID and App Secret');
      console.log('   4. Add to backend/.env file:');
      console.log('      FACEBOOK_APP_ID=your-app-id-here');
      console.log('      FACEBOOK_APP_SECRET=your-app-secret-here');
      console.log('      FACEBOOK_REDIRECT_URI=http://localhost:3001/api/facebook-connect/callback');
      console.log('\n   5. Restart backend');
      return;
    }
    
    // 2. Check if Client 199 (Demo2) has credentials
    console.log('\n2️⃣ Checking Demo2 (Client 199) Facebook credentials...');
    const result = await pool.query(
      `SELECT id, client_id, service_type, 
              (credentials->>'pageId') as page_id,
              LENGTH(credentials->>'access_token') as token_length,
              created_at, updated_at
       FROM client_credentials 
       WHERE client_id = 199 AND service_type = 'facebook'`
    );
    
    if (result.rows.length === 0) {
      console.log('   ⚪ No Facebook credentials found for Demo2');
      console.log('   📝 This is normal if you just disconnected');
      console.log('   ✅ Ready to connect via OAuth!');
    } else {
      const cred = result.rows[0];
      console.log('   ✅ Credentials found:');
      console.log(`      Page ID: ${cred.page_id}`);
      console.log(`      Token Length: ${cred.token_length} chars`);
      console.log(`      Created: ${cred.created_at}`);
      console.log(`      Updated: ${cred.updated_at}`);
      console.log('\n   ⚠️ Credentials exist! If you want to reconnect:');
      console.log('      Option 1: Delete existing credentials first (from admin)');
      console.log('      Option 2: OAuth will UPDATE the existing credentials');
    }
    
    // 3. Check Backend OAuth Endpoint
    console.log('\n3️⃣ Checking Backend OAuth Endpoint...');
    console.log('   OAuth Start URL: http://localhost:3001/api/facebook-connect/auth/199');
    console.log('   OAuth Callback URL: http://localhost:3001/api/facebook-connect/callback');
    
    // 4. Check Frontend Connection Button
    console.log('\n4️⃣ Frontend Connection Flow:');
    console.log('   1. Client clicks "Connect with Facebook"');
    console.log('   2. Redirects to: http://localhost:3001/api/facebook-connect/auth/199');
    console.log('   3. Backend redirects to Facebook OAuth');
    console.log('   4. User authorizes on Facebook');
    console.log('   5. Facebook redirects to callback');
    console.log('   6. Backend processes token and stores credentials');
    console.log('   7. User redirected back to dashboard');
    
    // 5. Common Issues
    console.log('\n5️⃣ Common Connection Issues:');
    console.log('   ❌ Issue 1: Facebook App credentials not set → Fix: Add to .env');
    console.log('   ❌ Issue 2: Redirect URI not whitelisted → Fix: Add in Facebook App settings');
    console.log('   ❌ Issue 3: Backend not running → Fix: npm start in backend/');
    console.log('   ❌ Issue 4: Wrong client ID in URL → Fix: Use correct client ID');
    console.log('   ❌ Issue 5: Browser blocking redirect → Fix: Check console for errors');
    
    // 6. Test OAuth URL Generation
    if (appId) {
      console.log('\n6️⃣ Testing OAuth URL Generation...');
      const state = `client_199_${Date.now()}`;
      const scope = 'pages_show_list,pages_read_engagement,pages_manage_metadata,pages_read_user_content';
      const redirectUriParam = redirectUri || 'http://localhost:3001/api/facebook-connect/callback';
      
      const oauthUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
        `client_id=${appId}&` +
        `redirect_uri=${encodeURIComponent(redirectUriParam)}&` +
        `state=${state}&` +
        `scope=${scope}&` +
        `response_type=code`;
      
      console.log('   ✅ OAuth URL would be:');
      console.log(`   ${oauthUrl.substring(0, 100)}...`);
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ DIAGNOSTIC COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    if (!appId || !appSecret) {
      console.log('⚠️  ACTION REQUIRED: Set up Facebook App credentials in .env');
    } else {
      console.log('✅ Configuration looks good! Try connecting from client dashboard.');
      console.log('\n📋 STEPS TO CONNECT:');
      console.log('   1. Login as Demo2: demo2@abc.com / demo123');
      console.log('   2. Go to Settings tab');
      console.log('   3. Click "Connect with Facebook" button');
      console.log('   4. Authorize on Facebook');
      console.log('   5. Done!');
    }
    
  } catch (error) {
    console.error('\n❌ Diagnostic Error:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

diagnose();

