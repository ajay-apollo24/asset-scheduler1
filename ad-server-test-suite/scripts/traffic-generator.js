// scripts/traffic-generator.js
// Simple load test script for the ad server

const axios = require('axios');

const API_BASE = process.env.API_BASE || 'http://localhost:5000/api';
const REQUESTS = Number(process.env.REQUESTS || 100);

async function runTest() {
  let successes = 0;
  let failures = 0;
  const latencies = [];

  for (let i = 0; i < REQUESTS; i++) {
    const start = Date.now();
    try {
      await axios.post(`${API_BASE}/ads/request`, {
        asset_id: 1,
        user_context: { ip: '1.1.1.' + i },
        page_context: { page_type: 'test' }
      });
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
