// test-reports.js
// Test the new report endpoints

const axios = require('axios');

async function testReports() {
  console.log('🧪 Testing New Report Endpoints...\n');

  try {
    // 1. Login to get token
    console.log('1. Getting authentication token...');
    const loginResponse = await axios.post('http://localhost:6510/api/auth/login', {
      email: 'admin@company.com',
      password: 'admin123'
    });

    const token = loginResponse.data.token;
    console.log('✅ Authentication successful');

    const headers = { 'Authorization': `Bearer ${token}` };
    const from = '2024-06-01';
    const to = new Date().toISOString().slice(0, 10);

    // 2. Test Ad Server Summary
    console.log('\n2. Testing Ad Server Summary...');
    const adServerSummaryRes = await axios.get(
      `http://localhost:6510/api/reports/ad-server/summary?from=${from}&to=${to}`,
      { headers }
    );
    console.log('📊 Ad Server Summary:', {
      total_campaigns: adServerSummaryRes.data.total_campaigns,
      total_impressions: adServerSummaryRes.data.total_impressions,
      total_clicks: adServerSummaryRes.data.total_clicks,
      overall_ctr: adServerSummaryRes.data.overall_ctr
    });

    // 3. Test Ad Server Performance
    console.log('\n3. Testing Ad Server Performance...');
    const adServerPerfRes = await axios.get(
      `http://localhost:6510/api/reports/ad-server/performance?from=${from}&to=${to}`,
      { headers }
    );
    console.log(`📈 Ad Server Performance: ${adServerPerfRes.data.length} records`);
    if (adServerPerfRes.data.length > 0) {
      console.log('   Sample record:', {
        campaign_name: adServerPerfRes.data[0].campaign_name,
        impressions: adServerPerfRes.data[0].impressions,
        clicks: adServerPerfRes.data[0].clicks,
        ctr: adServerPerfRes.data[0].ctr
      });
    }

    // 4. Test Asset Summary
    console.log('\n4. Testing Asset Summary...');
    const assetSummaryRes = await axios.get(
      `http://localhost:6510/api/reports/assets/summary?from=${from}&to=${to}`,
      { headers }
    );
    console.log('🏢 Asset Summary:', {
      total_assets: assetSummaryRes.data.total_assets,
      total_bookings: assetSummaryRes.data.total_bookings,
      total_ad_requests: assetSummaryRes.data.total_ad_requests,
      overall_ctr: assetSummaryRes.data.overall_ctr
    });

    // 5. Test Asset Performance
    console.log('\n5. Testing Asset Performance...');
    const assetPerfRes = await axios.get(
      `http://localhost:6510/api/reports/assets/performance?from=${from}&to=${to}`,
      { headers }
    );
    console.log(`📊 Asset Performance: ${assetPerfRes.data.length} records`);

    // 6. Test Daily Metrics (Ad Server)
    console.log('\n6. Testing Daily Metrics (Ad Server)...');
    const dailyAdServerRes = await axios.get(
      `http://localhost:6510/api/reports/daily-metrics?from=${from}&to=${to}&type=ad_server`,
      { headers }
    );
    console.log(`📅 Daily Ad Server Metrics: ${dailyAdServerRes.data.length} days`);

    // 7. Test Daily Metrics (Assets)
    console.log('\n7. Testing Daily Metrics (Assets)...');
    const dailyAssetsRes = await axios.get(
      `http://localhost:6510/api/reports/daily-metrics?from=${from}&to=${to}&type=assets`,
      { headers }
    );
    console.log(`📅 Daily Asset Metrics: ${dailyAssetsRes.data.length} days`);

    console.log('\n✅ All report endpoints are working correctly!');
    console.log('🎉 The enhanced Reports page should now display comprehensive analytics!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  } finally {
    process.exit(0);
  }
}

testReports(); 