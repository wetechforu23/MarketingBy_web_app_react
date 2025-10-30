const axios = require('axios');

async function syncFacebookData() {
  console.log('\n🔄 ========================================');
  console.log('🔄 SYNCING FACEBOOK DATA FOR DEMO2');
  console.log('🔄 ========================================\n');

  const clientId = 199; // Demo2 client ID
  const apiUrl = `http://localhost:3001/api/facebook/sync/${clientId}`;

  try {
    console.log(`📡 Sending POST request to: ${apiUrl}`);
    console.log('⏳ Please wait... This may take 10-30 seconds...\n');

    const startTime = Date.now();
    const response = await axios.post(apiUrl, {}, {
      timeout: 60000 // 60 second timeout
    });

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log(`✅ Sync completed in ${duration} seconds!\n`);
    console.log('📊 Response:');
    console.log(JSON.stringify(response.data, null, 2));
    console.log('\n🎉 SUCCESS! Facebook data has been refreshed from Facebook API!');
    console.log('   → Refresh your client dashboard to see updated data\n');

  } catch (error) {
    console.error('\n❌ Sync failed!');
    
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Error:', error.response.data);
    } else if (error.code === 'ECONNABORTED') {
      console.error('   Error: Request timed out');
      console.error('   → The sync might still be running in the background');
      console.error('   → Check the backend console logs');
    } else {
      console.error('   Error:', error.message);
    }
    
    console.error('\n💡 Troubleshooting:');
    console.error('   1. Make sure backend server is running (localhost:3001)');
    console.error('   2. Check if Demo2 has valid Facebook credentials');
    console.error('   3. Verify Facebook access token is not expired');
    console.error('   4. Check backend console for detailed error logs\n');
  }
}

syncFacebookData();

