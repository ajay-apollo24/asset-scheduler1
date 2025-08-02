// scripts/advanced-load-test.js
// Advanced load test script for ad server with impressions, clicks, and budget tracking

const axios = require('axios');

let API_BASE = process.env.API_BASE || 'http://localhost:6510/api';
let REQUESTS = Number(process.env.REQUESTS || 300);
let CLICK_RATE = Number(process.env.CLICK_RATE || 0.04); // 2% click rate
let IMPRESSION_RATE = Number(process.env.IMPRESSION_RATE || 0.95); // 95% impression rate

// Realistic user agents for different devices
const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1.2 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 14; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (iPad; CPU OS 17_1_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1.2 Mobile/15E148 Safari/604.1'
];

// Page types for different contexts
const PAGE_TYPES = ['home', 'product', 'category', 'search', 'article', 'checkout'];

// Campaign IDs (we'll fetch these dynamically)
let campaignIds = [];
let assetIds = [];

async function fetchAvailableData() {
  try {
    console.log('📊 Fetching available campaigns and assets...');
    
    // Fetch campaigns
    const campaignsResponse = await axios.get(`${API_BASE}/ad-server/campaigns`);
    campaignIds = campaignsResponse.data.map(c => c.id);
    console.log(`✅ Found ${campaignIds.length} campaigns`);
    
    // Fetch assets
    const assetsResponse = await axios.get(`${API_BASE}/assets`);
    assetIds = assetsResponse.data.map(a => a.id);
    console.log(`✅ Found ${assetIds.length} assets`);
    
    if (campaignIds.length === 0 || assetIds.length === 0) {
      console.log('⚠️ No campaigns or assets found. Creating sample data...');
      await createSampleData();
    }
  } catch (error) {
    console.log('⚠️ Could not fetch data, using defaults...');
    campaignIds = [1, 2, 3];
    assetIds = [1, 2, 3];
  }
}

async function createSampleData() {
  try {
    // Create a test campaign if none exist
    const campaignResponse = await axios.post(`${API_BASE}/ad-server/campaigns`, {
      name: 'Load Test Campaign',
      description: 'Campaign for load testing',
      budget: 10000,
      daily_budget: 1000,
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'active',
      targeting_criteria: { location: 'all', device: 'all' }
    });
    
    campaignIds = [campaignResponse.data.id];
    console.log(`✅ Created test campaign: ${campaignResponse.data.id}`);
  } catch (error) {
    console.log('⚠️ Could not create sample data:', error.message);
  }
}

async function generateAdRequest(i) {
  const campaignId = campaignIds[Math.floor(Math.random() * campaignIds.length)];
  const assetId = assetIds[Math.floor(Math.random() * assetIds.length)];
  const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  const pageType = PAGE_TYPES[Math.floor(Math.random() * PAGE_TYPES.length)];
  
  // Generate realistic IP addresses
  const ip = `203.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
  
  return {
    asset_id: assetId,
    campaign_id: campaignId,
    user_context: {
      ip: ip,
      user_agent: userAgent,
      device_type: userAgent.includes('Mobile') ? 'mobile' : 'desktop',
      location: 'US'
    },
    page_context: {
      page_type: pageType,
      url: `https://example.com/${pageType}/${i}`,
      referrer: 'https://google.com'
    }
  };
}

async function trackImpression(adResponse) {
  if (!adResponse || !adResponse.tracking || !adResponse.tracking.impression_url) return;
  
  try {
    await axios.get(adResponse.tracking.impression_url);
    return true;
  } catch (error) {
    console.log('Impression tracking failed:', error.message);
    return false;
  }
}

async function trackClick(adResponse) {
  if (!adResponse || !adResponse.tracking || !adResponse.tracking.click_url) return;
  
  try {
    // Follow redirects and accept 302 as success
    const response = await axios.get(adResponse.tracking.click_url, {
      maxRedirects: 0, // Don't follow redirects automatically
      validateStatus: function (status) {
        return status >= 200 && status < 400; // Accept 2xx and 3xx status codes
      }
    });
    return true;
  } catch (error) {
    // Check if it's a redirect (which is expected for click tracking)
    if (error.response && (error.response.status === 302 || error.response.status === 301)) {
      return true; // Redirect is success for click tracking
    }
    console.log('Click tracking failed:', error.message);
    return false;
  }
}

async function runAdvancedLoadTest() {
  console.log('🚀 Starting Advanced Ad Server Load Test');
  console.log('=' .repeat(50));
  console.log(`📊 Configuration: ${REQUESTS} requests, ${CLICK_RATE * 100}% click rate, ${IMPRESSION_RATE * 100}% impression rate`);
  
  await fetchAvailableData();
  
  let stats = {
    requests: 0,
    successful_requests: 0,
    failed_requests: 0,
    impressions: 0,
    clicks: 0,
    total_latency: 0,
    latencies: [],
    errors: []
  };
  
  const startTime = Date.now();
  
  console.log(`📈 Generating ${REQUESTS} ad requests...`);
  
  for (let i = 0; i < REQUESTS; i++) {
    const requestStart = Date.now();
    stats.requests++;
    
    try {
      // Generate ad request
      const adRequest = await generateAdRequest(i);
      
      // Make ad request
      const response = await axios.post(`${API_BASE}/ads/request`, adRequest);
      stats.successful_requests++;
      
      const requestLatency = Date.now() - requestStart;
      stats.total_latency += requestLatency;
      stats.latencies.push(requestLatency);
      
      // Track impression (95% of successful requests)
      if (Math.random() < IMPRESSION_RATE) {
        const impressionTracked = await trackImpression(response.data);
        if (impressionTracked) {
          stats.impressions++;
        }
      }
      
      // Track click (2% of impressions)
      if (Math.random() < CLICK_RATE && stats.impressions > 0) {
        const clickTracked = await trackClick(response.data);
        if (clickTracked) {
          stats.clicks++;
        }
      }
      
      // Progress indicator
      if ((i + 1) % 100 === 0) {
        console.log(`📊 Processed ${i + 1}/${REQUESTS} requests...`);
      }
      
    } catch (error) {
      stats.failed_requests++;
      stats.errors.push({
        request: i,
        error: error.message,
        status: error.response?.status
      });
    }
    
    // Small delay to prevent overwhelming the server
    if (i % 10 === 0) {
      await new Promise(resolve => setTimeout(resolve, 100)); // Increased delay
    } else {
      await new Promise(resolve => setTimeout(resolve, 50)); // Small delay between each request
    }
  }
  
  const endTime = Date.now();
  const totalDuration = endTime - startTime;
  
  // Calculate metrics
  stats.latencies.sort((a, b) => a - b);
  const avgLatency = stats.total_latency / stats.successful_requests;
  const p50Latency = stats.latencies[Math.floor(stats.latencies.length * 0.5)];
  const p95Latency = stats.latencies[Math.floor(stats.latencies.length * 0.95)];
  const p99Latency = stats.latencies[Math.floor(stats.latencies.length * 0.99)];
  
  const successRate = (stats.successful_requests / stats.requests) * 100;
  const requestsPerSecond = stats.requests / (totalDuration / 1000);
  const ctr = stats.impressions > 0 ? (stats.clicks / stats.impressions) * 100 : 0;
  
  // Display results
  console.log('\n📊 LOAD TEST RESULTS');
  console.log('=' .repeat(50));
  console.log(`⏱️  Total Duration: ${totalDuration}ms (${(totalDuration/1000).toFixed(2)}s)`);
  console.log(`📈 Requests: ${stats.requests}`);
  console.log(`✅ Successful: ${stats.successful_requests} (${successRate.toFixed(2)}%)`);
  console.log(`❌ Failed: ${stats.failed_requests}`);
  console.log(`👁️  Impressions: ${stats.impressions}`);
  console.log(`🖱️  Clicks: ${stats.clicks}`);
  console.log(`🎯 CTR: ${ctr.toFixed(4)}%`);
  console.log(`⚡ Requests/sec: ${requestsPerSecond.toFixed(2)}`);
  console.log('\n📊 LATENCY STATISTICS');
  console.log(`📊 Average: ${avgLatency.toFixed(2)}ms`);
  console.log(`📊 P50: ${p50Latency}ms`);
  console.log(`📊 P95: ${p95Latency}ms`);
  console.log(`📊 P99: ${p99Latency}ms`);
  
  if (stats.errors.length > 0) {
    console.log('\n❌ TOP ERRORS');
    const errorCounts = {};
    stats.errors.forEach(error => {
      const key = `${error.status || 'unknown'}: ${error.error}`;
      errorCounts[key] = (errorCounts[key] || 0) + 1;
    });
    
    Object.entries(errorCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .forEach(([error, count]) => {
        console.log(`   ${count}x: ${error}`);
      });
  }
  
  console.log('\n🎉 Load test completed!');
}

// Handle command line arguments
const args = process.argv.slice(2);

// Parse command line arguments
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--requests' && args[i + 1]) {
    REQUESTS = Number(args[i + 1]);
    i++; // Skip next argument
  } else if (args[i] === '--click-rate' && args[i + 1]) {
    CLICK_RATE = Number(args[i + 1]);
    i++; // Skip next argument
  } else if (args[i] === '--impression-rate' && args[i + 1]) {
    IMPRESSION_RATE = Number(args[i + 1]);
    i++; // Skip next argument
  } else if (args[i] === '--api-base' && args[i + 1]) {
    API_BASE = args[i + 1];
    i++; // Skip next argument
  }
}

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Advanced Ad Server Load Test

Usage: node advanced-load-test.js [options]

Options:
  --requests <number>     Number of requests to generate (default: 1000)
  --click-rate <number>   Click rate as decimal (default: 0.02 = 2%)
  --impression-rate <number> Impression rate as decimal (default: 0.95 = 95%)
  --api-base <url>       API base URL (default: http://localhost:6510/api)

Environment Variables:
  REQUESTS               Number of requests
  CLICK_RATE            Click rate
  IMPRESSION_RATE       Impression rate
  API_BASE              API base URL

Examples:
  node advanced-load-test.js --requests 500
  node advanced-load-test.js --click-rate 0.03 --impression-rate 0.98
  REQUESTS=2000 node advanced-load-test.js
  `);
  process.exit(0);
}

runAdvancedLoadTest().catch(console.error); 