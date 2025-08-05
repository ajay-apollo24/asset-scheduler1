// scripts/test-unified-system.js
const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';
const TEST_TOKEN = 'your-test-token-here'; // Replace with actual token

const testUnifiedSystem = async () => {
  console.log('🧪 Testing Unified Campaign System...\n');

  const headers = {
    'Authorization': `Bearer ${TEST_TOKEN}`,
    'Content-Type': 'application/json'
  };

  try {
    // Test 1: Get all campaigns
    console.log('1️⃣ Testing GET /api/campaigns');
    const campaignsResponse = await axios.get(`${API_BASE}/campaigns`, { headers });
    console.log(`✅ Found ${campaignsResponse.data.campaigns?.length || 0} campaigns`);
    console.log(`   Internal: ${campaignsResponse.data.campaigns?.filter(c => c.advertiser_type === 'internal').length || 0}`);
    console.log(`   External: ${campaignsResponse.data.campaigns?.filter(c => c.advertiser_type === 'external').length || 0}\n`);

    // Test 2: Get internal bookings (backward compatibility)
    console.log('2️⃣ Testing GET /api/campaigns?advertiser_type=internal');
    const internalResponse = await axios.get(`${API_BASE}/campaigns?advertiser_type=internal`, { headers });
    console.log(`✅ Found ${internalResponse.data.campaigns?.length || 0} internal campaigns\n`);

    // Test 3: Get external campaigns
    console.log('3️⃣ Testing GET /api/campaigns?advertiser_type=external');
    const externalResponse = await axios.get(`${API_BASE}/campaigns?advertiser_type=external`, { headers });
    console.log(`✅ Found ${externalResponse.data.campaigns?.length || 0} external campaigns\n`);

    // Test 4: Test asset availability
    console.log('4️⃣ Testing GET /api/campaigns/availability/asset');
    const availabilityResponse = await axios.get(`${API_BASE}/campaigns/availability/asset?asset_id=1&start_date=2024-10-01&end_date=2024-10-31`, { headers });
    console.log(`✅ Asset availability retrieved for ${availabilityResponse.data.availability?.length || 0} days\n`);

    // Test 5: Test analytics
    console.log('5️⃣ Testing GET /api/campaigns/analytics/summary');
    const analyticsResponse = await axios.get(`${API_BASE}/campaigns/analytics/summary?start_date=2024-01-01&end_date=2024-12-31`, { headers });
    console.log(`✅ Analytics retrieved for ${analyticsResponse.data.analytics?.length || 0} advertiser types\n`);

    console.log('🎉 All tests passed! Unified system is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('\n💡 Authentication required. Please:');
      console.log('   1. Login to the application');
      console.log('   2. Get your JWT token from browser dev tools');
      console.log('   3. Update TEST_TOKEN in this script');
    }
  }
};

// Run the test
testUnifiedSystem(); 