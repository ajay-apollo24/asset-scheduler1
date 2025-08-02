// scripts/test-runner.js
// Comprehensive test runner for ad server load testing

const { spawn } = require('child_process');
const path = require('path');

const API_BASE = process.env.API_BASE || 'http://localhost:6510/api';

async function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`🚀 Running: ${command} ${args.join(' ')}`);
    
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      ...options
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${command} completed successfully`);
        resolve();
      } else {
        console.log(`❌ ${command} failed with code ${code}`);
        reject(new Error(`Command failed with code ${code}`));
      }
    });
    
    child.on('error', (error) => {
      console.log(`❌ ${command} error:`, error.message);
      reject(error);
    });
  });
}

async function runTestSuite() {
  console.log('🎯 AD SERVER COMPREHENSIVE TEST SUITE');
  console.log('=' .repeat(60));
  console.log(`🌐 API Base: ${API_BASE}`);
  console.log(`⏰ Start Time: ${new Date().toISOString()}`);
  console.log('');
  
  try {
    // Step 1: Create sample data
    console.log('📊 STEP 1: Creating sample data...');
    await runCommand('node', ['scripts/sample-data.js'], {
      env: { ...process.env, API_BASE }
    });
    console.log('');
    
    // Step 2: Basic functionality test
    console.log('🧪 STEP 2: Testing basic ad serving...');
    await runCommand('node', ['scripts/traffic-generator.js'], {
      env: { ...process.env, API_BASE, REQUESTS: '50' }
    });
    console.log('');
    
    // Step 3: Advanced load test
    console.log('📈 STEP 3: Running advanced load test...');
    await runCommand('node', ['scripts/advanced-load-test.js'], {
      env: { ...process.env, API_BASE, REQUESTS: '500' }
    });
    console.log('');
    
    // Step 4: Performance monitoring (run for 30 seconds)
    console.log('📊 STEP 4: Monitoring performance for 30 seconds...');
    const monitorProcess = spawn('node', ['scripts/performance-monitor.js'], {
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, API_BASE, MONITOR_INTERVAL: '3000' }
    });
    
    // Run load test while monitoring
    setTimeout(async () => {
      console.log('\n🔥 Running load test during monitoring...');
      try {
        await runCommand('node', ['scripts/advanced-load-test.js'], {
          env: { ...process.env, API_BASE, REQUESTS: '200' }
        });
      } catch (error) {
        console.log('⚠️ Load test during monitoring had some issues:', error.message);
      }
    }, 5000);
    
    // Stop monitoring after 30 seconds
    setTimeout(() => {
      monitorProcess.kill('SIGINT');
    }, 30000);
    
    await new Promise((resolve) => {
      monitorProcess.on('close', resolve);
    });
    console.log('');
    
    // Step 5: Stress test
    console.log('💪 STEP 5: Running stress test...');
    await runCommand('node', ['scripts/advanced-load-test.js'], {
      env: { ...process.env, API_BASE, REQUESTS: '1000' }
    });
    console.log('');
    
    console.log('🎉 TEST SUITE COMPLETED SUCCESSFULLY!');
    console.log(`⏰ End Time: ${new Date().toISOString()}`);
    
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Ad Server Comprehensive Test Suite

Usage: node test-runner.js [options]

This script runs a complete test suite including:
1. Sample data creation
2. Basic functionality test
3. Advanced load test
4. Performance monitoring
5. Stress test

Options:
  --api-base <url>       API base URL (default: http://localhost:6510/api)
  --quick                Run quick test (fewer requests)
  --stress               Run stress test only

Environment Variables:
  API_BASE              API base URL

Examples:
  node test-runner.js
  node test-runner.js --quick
  API_BASE=http://localhost:8080/api node test-runner.js
  `);
  process.exit(0);
}

if (args.includes('--quick')) {
  // Modify environment for quick test
  process.env.REQUESTS = '100';
  process.env.MONITOR_INTERVAL = '2000';
}

if (args.includes('--stress')) {
  // Run only stress test
  console.log('💪 Running stress test only...');
  runCommand('node', ['scripts/advanced-load-test.js'], {
    env: { ...process.env, API_BASE, REQUESTS: '2000' }
  }).catch(console.error);
} else {
  runTestSuite();
} 