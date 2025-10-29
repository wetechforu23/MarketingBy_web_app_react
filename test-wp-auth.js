// Test WordPress authentication with actual publish
const axios = require('axios');

const siteUrl = 'https://wetechforu.com';
const username = 'MarketingBy Blog Publisher'; // Try with spaces
const appPassword = '48befgY4J5ZWO3JLznjicqmf'; // No spaces

// Test 1: GET posts (what the test does)
async function testGetPosts() {
  try {
    const authString = Buffer.from(`${username}:${appPassword}`).toString('base64');
    const response = await axios.get(`${siteUrl}/wp-json/wp/v2/posts?per_page=1`, {
      headers: {
        'Authorization': `Basic ${authString}`
      },
      timeout: 10000
    });
    console.log('✅ GET posts successful:', response.status);
    return true;
  } catch (error) {
    console.error('❌ GET posts failed:', error.response?.status, error.response?.data);
    return false;
  }
}

// Test 2: POST new post (what publish does)
async function testCreatePost() {
  try {
    const authString = Buffer.from(`${username}:${appPassword}`).toString('base64');
    const response = await axios.post(`${siteUrl}/wp-json/wp/v2/posts`, {
      title: 'Test Post from MarketingBy',
      content: 'This is a test post.',
      status: 'draft' // Don't actually publish, just test auth
    }, {
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    console.log('✅ POST new post successful:', response.status, 'Post ID:', response.data.id);
    
    // Clean up - delete the test post
    await axios.delete(`${siteUrl}/wp-json/wp/v2/posts/${response.data.id}?force=true`, {
      headers: {
        'Authorization': `Basic ${authString}`
      }
    });
    console.log('✅ Test post deleted');
    return true;
  } catch (error) {
    console.error('❌ POST new post failed:', error.response?.status, error.response?.data);
    return false;
  }
}

// Run tests
(async () => {
  console.log('🔍 Testing WordPress credentials...\n');
  console.log('Site URL:', siteUrl);
  console.log('Username:', username);
  console.log('Password length:', appPassword.length);
  console.log('');
  
  console.log('Test 1: GET posts (what Settings test does)');
  await testGetPosts();
  console.log('');
  
  console.log('Test 2: POST new post (what Publish does)');
  await testCreatePost();
})();

