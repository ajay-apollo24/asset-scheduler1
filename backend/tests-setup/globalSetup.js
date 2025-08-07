const { spawn } = require('child_process');
const path = require('path');

let serverProcess;

module.exports = async function globalSetup() {
  // Check if we're in integration mode
  const TEST_MODE = process.env.TEST_MODE || 'integration';
  
  if (TEST_MODE === 'unit') {
    console.log('🧪 Unit mode: Skipping server startup');
    return;
  }

  console.log('🚀 Starting real server for integration tests...');
  
  // Set environment variables for test database
  const env = {
    ...process.env,
    NODE_ENV: 'test',
    START_TEST_SERVER: 'true', // Force server to start in test mode
    PORT: '5001', // Use port 5001 for tests
    DB_NAME: process.env.TEST_DB_NAME || 'asset_allocation_test',
    DB_USER: process.env.TEST_DB_USER || 'asset_allocation',
    DB_PASSWORD: process.env.TEST_DB_PASSWORD || 'asset_allocation',
    DB_HOST: process.env.TEST_DB_HOST || 'localhost',
    DB_PORT: process.env.TEST_DB_PORT || '5435'
  };

  return new Promise((resolve, reject) => {
    // Run server from the backend directory
    serverProcess = spawn('node', ['server.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env,
      cwd: path.join(__dirname, '..') // Set working directory to backend folder
    });

    let serverReady = false;
    const maxWaitTime = 30000; // 30 seconds
    const startTime = Date.now();

    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`Server output: ${output.trim()}`);
      
      if (output.includes('Server started')) {
        serverReady = true;
        console.log('✅ Server is ready for testing');
        resolve();
      }
    });

    serverProcess.stderr.on('data', (data) => {
      const output = data.toString();
      console.log(`Server output: ${output.trim()}`);
      
      if (output.includes('EADDRINUSE')) {
        console.log('⚠️  Server already running on port 5001');
        serverReady = true;
        resolve();
      }
    });

    serverProcess.on('error', (error) => {
      console.error('❌ Server startup error:', error.message);
      reject(error);
    });

    serverProcess.on('exit', (code) => {
      if (!serverReady) {
        console.error(`❌ Server exited with code ${code}`);
        reject(new Error(`Server exited with code ${code}`));
      }
    });

    // Timeout
    setTimeout(() => {
      if (!serverReady) {
        serverProcess.kill();
        reject(new Error('Server startup timeout'));
      }
    }, maxWaitTime);
  });
}; 