#!/usr/bin/env node

/**
 * Comprehensive Test Runner
 * 
 * Usage:
 *   node scripts/run-tests.js [options]
 * 
 * Options:
 *   --mode=integration|unit    Test mode (default: integration)
 *   --server=start|external    Server management (default: start)
 *   --coverage                 Run with coverage
 *   --verbose                  Verbose output
 *   --watch                    Watch mode
 *   --pattern=<pattern>        Test pattern filter
 *   --help                     Show this help
 */

const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const config = {
  mode: 'integration',
  server: 'start',
  coverage: false,
  verbose: false,
  watch: false,
  pattern: null,
  help: false
};

// Parse command line arguments
process.argv.slice(2).forEach(arg => {
  if (arg.startsWith('--mode=')) {
    config.mode = arg.split('=')[1];
  } else if (arg.startsWith('--server=')) {
    config.server = arg.split('=')[1];
  } else if (arg === '--coverage') {
    config.coverage = true;
  } else if (arg === '--verbose') {
    config.verbose = true;
  } else if (arg === '--watch') {
    config.watch = true;
  } else if (arg.startsWith('--pattern=')) {
    config.pattern = arg.split('=')[1];
  } else if (arg === '--help') {
    config.help = true;
  }
});

// Show help
if (config.help) {
  console.log(`
🧪 Asset Scheduler Test Runner

Usage:
  node scripts/run-tests.js [options]

Options:
  --mode=integration|unit    Test mode (default: integration)
  --server=start|external    Server management (default: start)
  --coverage                 Run with coverage
  --verbose                  Verbose output
  --watch                    Watch mode
  --pattern=<pattern>        Test pattern filter
  --help                     Show this help

Examples:
  node scripts/run-tests.js --mode=integration --verbose
  node scripts/run-tests.js --mode=unit --coverage
  node scripts/run-tests.js --server=external --pattern="assetController"
  node scripts/run-tests.js --watch --mode=integration
`);
  process.exit(0);
}

// Validate configuration
if (!['integration', 'unit'].includes(config.mode)) {
  console.error('❌ Invalid mode. Use "integration" or "unit"');
  process.exit(1);
}

if (!['start', 'external'].includes(config.server)) {
  console.error('❌ Invalid server option. Use "start" or "external"');
  process.exit(1);
}

// Colors for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Check if server is running
async function checkServer() {
  return new Promise((resolve) => {
    const net = require('net');
    const socket = new net.Socket();
    
    socket.setTimeout(1000);
    
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    
    socket.on('error', () => {
      resolve(false);
    });
    
    socket.connect(5001, 'localhost');
  });
}

// Start server
async function startServer() {
  return new Promise((resolve, reject) => {
    log('🚀 Starting server...', 'blue');
    
    const server = spawn('node', ['server.js'], {
      stdio: 'pipe',
      env: { ...process.env, NODE_ENV: 'test' }
    });
    
    let serverReady = false;
    
    server.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Server started')) {
        serverReady = true;
        log('✅ Server started successfully', 'green');
        resolve(server);
      }
    });
    
    server.stderr.on('data', (data) => {
      const output = data.toString();
      if (output.includes('EADDRINUSE')) {
        log('⚠️  Server already running on port 5001', 'yellow');
        serverReady = true;
        resolve(null); // Server already running
      } else if (!serverReady) {
        log(`🔧 Server: ${output.trim()}`, 'cyan');
      }
    });
    
    server.on('error', (error) => {
      log(`❌ Server error: ${error.message}`, 'red');
      reject(error);
    });
    
    // Timeout after 30 seconds
    setTimeout(() => {
      if (!serverReady) {
        server.kill();
        reject(new Error('Server startup timeout'));
      }
    }, 30000);
  });
}

// Run tests
async function runTests() {
  const args = ['--config', 'jest.config.js'];
  
  if (config.verbose) {
    args.push('--verbose');
  }
  
  if (config.coverage) {
    args.push('--coverage');
  }
  
  if (config.watch) {
    args.push('--watch');
  }
  
  if (config.pattern) {
    args.push('--testPathPattern', config.pattern);
  }
  
  return new Promise((resolve, reject) => {
    const env = { ...process.env, TEST_MODE: config.mode };
    
    log(`🧪 Running tests in ${config.mode.toUpperCase()} mode...`, 'magenta');
    if (config.pattern) {
      log(`🔍 Pattern: ${config.pattern}`, 'cyan');
    }
    
    const testProcess = spawn('npx', ['jest', ...args], {
      stdio: 'inherit',
      env
    });
    
    testProcess.on('close', (code) => {
      if (code === 0) {
        log('✅ All tests passed!', 'green');
        resolve();
      } else {
        log(`❌ Tests failed with code ${code}`, 'red');
        reject(new Error(`Tests failed with code ${code}`));
      }
    });
    
    testProcess.on('error', (error) => {
      log(`❌ Test execution error: ${error.message}`, 'red');
      reject(error);
    });
  });
}

// Main execution
async function main() {
  try {
    log('🧪 Asset Scheduler Test Runner', 'bright');
    log(`Mode: ${config.mode}`, 'cyan');
    log(`Server: ${config.server}`, 'cyan');
    
    let serverProcess = null;
    
    // Handle server management
    if (config.server === 'start') {
      if (config.mode === 'integration') {
        const isServerRunning = await checkServer();
        
        if (!isServerRunning) {
          serverProcess = await startServer();
        } else {
          log('✅ Server already running', 'green');
        }
      }
    } else {
      // External server mode
      if (config.mode === 'integration') {
        const isServerRunning = await checkServer();
        if (!isServerRunning) {
          log('❌ Server not running. Please start the server manually.', 'red');
          log('   Run: npm start', 'yellow');
          process.exit(1);
        }
        log('✅ External server detected', 'green');
      }
    }
    
    // Run tests
    await runTests();
    
    // Cleanup
    if (serverProcess) {
      log('🛑 Stopping server...', 'blue');
      serverProcess.kill();
    }
    
    log('🎉 Test run completed successfully!', 'green');
    
  } catch (error) {
    log(`❌ Test run failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  log('\n🛑 Test run interrupted', 'yellow');
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('\n🛑 Test run terminated', 'yellow');
  process.exit(0);
});

// Run the main function
main(); 