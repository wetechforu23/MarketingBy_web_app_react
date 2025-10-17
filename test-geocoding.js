// Test script to geocode leads using the deployed API
const https = require('https');

// Test geocoding a single address
async function testGeocoding() {
  const address = "Aubrey, TX 76227";
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    console.log('❌ Google Maps API key not found in environment');
    return;
  }
  
  const encodedAddress = encodeURIComponent(address);
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`;
  
  console.log(`🌍 Testing geocoding for: ${address}`);
  console.log(`📡 API URL: ${url.replace(apiKey, 'API_KEY_HIDDEN')}`);
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === 'OK' && data.results.length > 0) {
      const result = data.results[0];
      const location = result.geometry.location;
      
      console.log('✅ Geocoding successful!');
      console.log(`📍 Coordinates: ${location.lat}, ${location.lng}`);
      console.log(`🏠 Formatted Address: ${result.formatted_address}`);
      console.log(`📊 API Status: ${data.status}`);
    } else {
      console.log(`❌ Geocoding failed: ${data.status}`);
      console.log('Response:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Test with the leads we have
const testLeads = [
  { company: "Aubrey Medical Group", city: "Aubrey", state: "TX", zip: "76227" },
  { company: "Denton Health Center", city: "Denton", state: "TX", zip: "76201" },
  { company: "Lewisville Medical", city: "Lewisville", state: "TX", zip: "75057" }
];

async function testAllLeads() {
  console.log('🚀 Testing geocoding for all leads...\n');
  
  for (const lead of testLeads) {
    const address = `${lead.city}, ${lead.state} ${lead.zip}`;
    console.log(`\n📍 Testing: ${lead.company} - ${address}`);
    
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.log('❌ Google Maps API key not found');
      continue;
    }
    
    const encodedAddress = encodeURIComponent(address);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`;
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === 'OK' && data.results.length > 0) {
        const result = data.results[0];
        const location = result.geometry.location;
        
        console.log(`✅ Success: ${location.lat}, ${location.lng}`);
        console.log(`🏠 Address: ${result.formatted_address}`);
      } else {
        console.log(`❌ Failed: ${data.status}`);
      }
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
    }
    
    // Small delay to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 200));
  }
}

// Run the test
if (require.main === module) {
  testAllLeads().catch(console.error);
}

module.exports = { testGeocoding, testAllLeads };
