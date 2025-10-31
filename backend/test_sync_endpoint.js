const axios = require('axios');

async function testSyncEndpoint() {
  try {
    console.log('🔄 Testing Facebook sync endpoint for client 199...\n');
    
    const response = await axios.post('http://localhost:3001/api/facebook/sync/199', {}, {
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Success!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error occurred:');
    console.error('Status:', error.response?.status);
    console.error('Status Text:', error.response?.statusText);
    console.error('Error Data:', JSON.stringify(error.response?.data, null, 2));
    console.error('Error Message:', error.message);
    
    if (error.response?.data?.details) {
      console.error('\n📋 Detailed Error:', error.response.data.details);
    }
  }
}

testSyncEndpoint();

