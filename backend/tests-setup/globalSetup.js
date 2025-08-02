const { spawn } = require('child_process');
const path = require('path');
const setupTestDatabase = require('./setupDatabase');

let serverProcess;

module.exports = async function globalSetup() {
  console.log('🚀 Starting real server for integration tests...');
  
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.PORT = '5001';
  process.env.DB_NAME = 'asset_scheduler_test';
  process.env.START_TEST_SERVER = 'true';
  
  // Setup test database first
  await setupTestDatabase();
  
  // Start the real server (from backend root directory)
  serverProcess = spawn('node', ['server.js'], {
    cwd: path.join(__dirname, '..'), // Go up one level to backend root
    env: { ...process.env },
    stdio: 'pipe'
  });
  
  // Wait for server to start
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Server startup timeout'));
    }, 10000);
    
    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('Server output:', output);
      
      // Check if server is ready (you might need to adjust this based on your server logs)
      if (output.includes('Server started') || output.includes('listening')) {
        clearTimeout(timeout);
        console.log('✅ Server is ready for testing');
        resolve();
      }
    });
    
    serverProcess.stderr.on('data', (data) => {
      console.error('Server error:', data.toString());
    });
    
    serverProcess.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    
    serverProcess.on('exit', (code) => {
      if (code !== 0) {
        clearTimeout(timeout);
        reject(new Error(`Server exited with code ${code}`));
      }
    });
  });
}; 