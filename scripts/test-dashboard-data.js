// Test script to verify dashboard data
const axios = require('axios');

const API_BASE = 'http://localhost:6510/api';

async function testDashboardData() {
  try {
    console.log('🔍 Testing Dashboard Data...\n');

    // Step 1: Login to get token
    console.log('1. Logging in...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@company.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful\n');

    // Step 2: Test campaigns API
    console.log('2. Testing campaigns API...');
    const campaignsResponse = await axios.get(`${API_BASE}/campaigns`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const campaignsData = campaignsResponse.data;
    console.log('📊 Campaigns API Response:');
    console.log(`   - Total campaigns: ${campaignsData.total}`);
    console.log(`   - Campaigns array length: ${campaignsData.campaigns.length}`);
    
    // Count by type
    const internal = campaignsData.campaigns.filter(c => c.advertiser_type === 'internal').length;
    const external = campaignsData.campaigns.filter(c => c.advertiser_type === 'external').length;
    console.log(`   - Internal campaigns: ${internal}`);
    console.log(`   - External campaigns: ${external}\n`);

    // Step 3: Test assets API
    console.log('3. Testing assets API...');
    const assetsResponse = await axios.get(`${API_BASE}/assets`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('📊 Assets API Response:');
    console.log(`   - Total assets: ${assetsResponse.data.length}`);
    console.log(`   - Assets:`, assetsResponse.data.map(a => a.name).join(', '));
    console.log();

    // Step 4: Simulate dashboard logic
    console.log('4. Simulating dashboard logic...');
    const dashboardStats = {
      totalAssets: assetsResponse.data.length,
      totalCampaigns: campaignsData.campaigns.length,
      internalCampaigns: internal,
      externalCampaigns: external
    };
    
    console.log('📊 Dashboard Stats:');
    console.log(`   - Total Assets: ${dashboardStats.totalAssets}`);
    console.log(`   - Total Campaigns: ${dashboardStats.totalCampaigns}`);
    console.log(`   - Internal Campaigns: ${dashboardStats.internalCampaigns}`);
    console.log(`   - External Campaigns: ${dashboardStats.externalCampaigns}`);
    console.log();

    // Step 5: Verify expected values
    console.log('5. Verifying expected values...');
    const expected = {
      totalAssets: 3,
      totalCampaigns: 17,
      internalCampaigns: 4,
      externalCampaigns: 13
    };

    let allCorrect = true;
    Object.keys(expected).forEach(key => {
      const actual = dashboardStats[key];
      const expectedValue = expected[key];
      const status = actual === expectedValue ? '✅' : '❌';
      console.log(`   ${status} ${key}: ${actual} (expected: ${expectedValue})`);
      if (actual !== expectedValue) allCorrect = false;
    });

    console.log();
    if (allCorrect) {
      console.log('🎉 All dashboard data is correct!');
    } else {
      console.log('⚠️  Some dashboard data is incorrect. Check the API responses.');
    }

  } catch (error) {
    console.error('❌ Error testing dashboard data:', error.response?.data || error.message);
  }
}

// Run the test
testDashboardData(); 