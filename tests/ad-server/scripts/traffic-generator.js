// scripts/traffic-generator.js
// Simple load test script for the ad server

const axios = require('axios');

const API_BASE = process.env.API_BASE || 'http://localhost:6510/api';
const REQUESTS = Number(process.env.REQUESTS || 100);

async function runTest() {
  let successes = 0;
  let failures = 0;
  const latencies = [];

  for (let i = 0; i < REQUESTS; i++) {
    const start = Date.now();
    try {
      const response = await axios.post(`${API_BASE}/ads/request`, {
        asset_id: 1,
        user_context: { 
          ip: `203.0.${Math.floor(i/255)}.${i%255 + 1}`,
          user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        page_context: { page_type: 'test' }
      });
      
      // Track impression if available
      if (response.data.tracking && response.data.tracking.impression_url) {
        try {
          await axios.get(response.data.tracking.impression_url);
        } catch (error) {
          // Ignore tracking errors
        }
      }
      successes++;
    } catch (err) {
      failures++;
    } finally {
      latencies.push(Date.now() - start);
    }
  }

  latencies.sort((a, b) => a - b);
  const p95 = latencies[Math.floor(latencies.length * 0.95)];

  console.log('Requests:', REQUESTS);
  console.log('Success:', successes, 'Failures:', failures);
  console.log('P95 latency:', p95, 'ms');
}

runTest();
