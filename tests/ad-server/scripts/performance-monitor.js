// scripts/performance-monitor.js
// Real-time performance monitoring for ad server

const axios = require('axios');

const API_BASE = process.env.API_BASE || 'http://localhost:6510/api';
const MONITOR_INTERVAL = Number(process.env.MONITOR_INTERVAL || 5000); // 5 seconds

let startTime = Date.now();
let previousStats = null;

async function fetchCampaignStats() {
  try {
    const response = await axios.get(`${API_BASE}/ad-server/campaigns`);
    return response.data;
  } catch (error) {
    console.error('❌ Failed to fetch campaign stats:', error.message);
    return [];
  }
}

async function fetchSystemStats() {
  try {
    // You can add more system endpoints here
    const response = await axios.get(`${API_BASE}/reports/performance`);
    return response.data;
  } catch (error) {
    // If reports endpoint doesn't exist, return basic stats
    return {
      total_requests: 0,
      total_impressions: 0,
      total_clicks: 0,
      avg_response_time: 0
    };
  }
}

function calculateMetrics(campaigns, previousCampaigns) {
  const currentTime = Date.now();
  const elapsedMinutes = (currentTime - startTime) / (1000 * 60);
  
  let totalBudget = 0;
  let totalSpent = 0;
  let totalImpressions = 0;
  let totalClicks = 0;
  let activeCampaigns = 0;
  
  campaigns.forEach(campaign => {
    if (campaign.status === 'active') {
      activeCampaigns++;
      totalBudget += parseFloat(campaign.budget || 0);
      totalSpent += parseFloat(campaign.spent || 0);
      totalImpressions += parseInt(campaign.impressions || 0);
      totalClicks += parseInt(campaign.clicks || 0);
    }
  });
  
  const budgetUtilization = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const cpm = totalImpressions > 0 ? (totalSpent / totalImpressions) * 1000 : 0;
  const cpc = totalClicks > 0 ? totalSpent / totalClicks : 0;
  
  // Calculate deltas if we have previous stats
  let deltaImpressions = 0;
  let deltaClicks = 0;
  let deltaSpent = 0;
  
  if (previousCampaigns) {
    const prevImpressions = previousCampaigns.reduce((sum, c) => sum + parseInt(c.impressions || 0), 0);
    const prevClicks = previousCampaigns.reduce((sum, c) => sum + parseInt(c.clicks || 0), 0);
    const prevSpent = previousCampaigns.reduce((sum, c) => sum + parseFloat(c.spent || 0), 0);
    
    deltaImpressions = totalImpressions - prevImpressions;
    deltaClicks = totalClicks - prevClicks;
    deltaSpent = totalSpent - prevSpent;
  }
  
  return {
    timestamp: new Date().toISOString(),
    elapsedMinutes: elapsedMinutes.toFixed(2),
    activeCampaigns,
    totalBudget: totalBudget.toFixed(2),
    totalSpent: totalSpent.toFixed(2),
    budgetUtilization: budgetUtilization.toFixed(2),
    totalImpressions,
    totalClicks,
    ctr: ctr.toFixed(4),
    cpm: cpm.toFixed(2),
    cpc: cpc.toFixed(2),
    deltaImpressions,
    deltaClicks,
    deltaSpent: deltaSpent.toFixed(2),
    impressionsPerMinute: elapsedMinutes > 0 ? (totalImpressions / elapsedMinutes).toFixed(2) : 0,
    clicksPerMinute: elapsedMinutes > 0 ? (totalClicks / elapsedMinutes).toFixed(2) : 0,
    spendPerMinute: elapsedMinutes > 0 ? (totalSpent / elapsedMinutes).toFixed(2) : 0
  };
}

function displayMetrics(metrics) {
  console.clear();
  console.log('📊 AD SERVER PERFORMANCE MONITOR');
  console.log('=' .repeat(60));
  console.log(`⏰ Time: ${metrics.timestamp}`);
  console.log(`⏱️  Elapsed: ${metrics.elapsedMinutes} minutes`);
  console.log(`📈 Active Campaigns: ${metrics.activeCampaigns}`);
  console.log('');
  
  console.log('💰 BUDGET & SPENDING');
  console.log('─' .repeat(30));
  console.log(`💵 Total Budget: $${metrics.totalBudget}`);
  console.log(`💸 Total Spent: $${metrics.totalSpent}`);
  console.log(`📊 Utilization: ${metrics.budgetUtilization}%`);
  console.log(`📈 Spend/Min: $${metrics.spendPerMinute}`);
  console.log('');
  
  console.log('👁️  IMPRESSIONS & CLICKS');
  console.log('─' .repeat(30));
  console.log(`👁️  Total Impressions: ${metrics.totalImpressions.toLocaleString()}`);
  console.log(`🖱️  Total Clicks: ${metrics.totalClicks.toLocaleString()}`);
  console.log(`🎯 CTR: ${metrics.ctr}%`);
  console.log(`📈 Impressions/Min: ${metrics.impressionsPerMinute}`);
  console.log(`🖱️  Clicks/Min: ${metrics.clicksPerMinute}`);
  console.log('');
  
  console.log('📊 PERFORMANCE METRICS');
  console.log('─' .repeat(30));
  console.log(`💰 CPM: $${metrics.cpm}`);
  console.log(`💵 CPC: $${metrics.cpc}`);
  console.log('');
  
  if (metrics.deltaImpressions > 0 || metrics.deltaClicks > 0 || metrics.deltaSpent > 0) {
    console.log('🔄 SINCE LAST UPDATE');
    console.log('─' .repeat(30));
    console.log(`👁️  +${metrics.deltaImpressions} impressions`);
    console.log(`🖱️  +${metrics.deltaClicks} clicks`);
    console.log(`💸 +$${metrics.deltaSpent} spent`);
    console.log('');
  }
  
  console.log('Press Ctrl+C to stop monitoring');
}

async function startMonitoring() {
  console.log('🚀 Starting Ad Server Performance Monitor...');
  console.log(`📡 Monitoring interval: ${MONITOR_INTERVAL/1000}s`);
  console.log(`🌐 API Base: ${API_BASE}`);
  console.log('');
  
  // Initial delay to let the system settle
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const monitorInterval = setInterval(async () => {
    try {
      const campaigns = await fetchCampaignStats();
      const metrics = calculateMetrics(campaigns, previousStats);
      displayMetrics(metrics);
      previousStats = campaigns;
    } catch (error) {
      console.error('❌ Monitoring error:', error.message);
    }
  }, MONITOR_INTERVAL);
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Stopping performance monitor...');
    clearInterval(monitorInterval);
    process.exit(0);
  });
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Ad Server Performance Monitor

Usage: node performance-monitor.js [options]

Options:
  --interval <seconds>   Monitoring interval in seconds (default: 5)
  --api-base <url>       API base URL (default: http://localhost:6510/api)

Environment Variables:
  MONITOR_INTERVAL       Monitoring interval in milliseconds
  API_BASE              API base URL

Examples:
  node performance-monitor.js --interval 10
  MONITOR_INTERVAL=3000 node performance-monitor.js
  `);
  process.exit(0);
}

startMonitoring().catch(console.error); 