const { spawn } = require('child_process');

let serverProcess;

module.exports = async () => {
  console.log('🛑 Stopping test server...');
  
  try {
    // Close database connections
    const db = require('../config/db');
    await db.close();
    console.log('✅ Database connections closed');
    
    // Close test database connection if it exists
    const jestSetup = require('./jest.setup');
    if (jestSetup.testDb) {
      await jestSetup.testDb.end();
      console.log('✅ Test database connection closed');
    }
  } catch (error) {
    console.warn('Warning: Error closing database connections:', error.message);
  }
  
  // Force exit after a short delay to ensure cleanup
  setTimeout(() => {
    console.log('✅ Global teardown complete');
    process.exit(0);
  }, 1000);
}; 