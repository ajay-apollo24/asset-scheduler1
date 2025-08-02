const { spawn } = require('child_process');

let serverProcess;

module.exports = async function globalTeardown() {
  console.log('🛑 Stopping test server...');
  
  // Kill the server process
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
    
    // Wait for graceful shutdown
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.log('⚠️  Force killing server process');
        serverProcess.kill('SIGKILL');
        resolve();
      }, 5000);
      
      serverProcess.on('exit', () => {
        clearTimeout(timeout);
        console.log('✅ Server stopped');
        resolve();
      });
    });
  }
  
  console.log('✅ Global teardown complete');
}; 