// scripts/test-api-response.js
const axios = require('axios');

const testAPIResponse = async () => {
  console.log('🧪 Testing API Response Structure...\n');

  try {
    // Test health endpoint (no auth required)
    console.log('1️⃣ Testing health endpoint...');
    const healthResponse = await axios.get('http://localhost:5000/api/health');
    console.log('✅ Health endpoint response:', healthResponse.data);
    console.log('');

    // Test campaigns endpoint (will likely fail due to auth)
    console.log('2️⃣ Testing campaigns endpoint...');
    try {
      const campaignsResponse = await axios.get('http://localhost:5000/api/campaigns');
      console.log('✅ Campaigns endpoint response:', campaignsResponse.data);
    } catch (error) {
      console.log('❌ Campaigns endpoint error (expected due to auth):', {
        status: error.response?.status,
        message: error.response?.data?.message || error.message
      });
    }
    console.log('');

    // Test with a mock token
    console.log('3️⃣ Testing with mock token...');
    try {
      const mockResponse = await axios.get('http://localhost:5000/api/campaigns', {
        headers: {
          'Authorization': 'Bearer mock-token'
        }
      });
      console.log('✅ Mock token response:', mockResponse.data);
    } catch (error) {
      console.log('❌ Mock token error:', {
        status: error.response?.status,
        message: error.response?.data?.message || error.message
      });
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

testAPIResponse(); 