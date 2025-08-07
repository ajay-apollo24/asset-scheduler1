# 🧪 Asset Scheduler Testing Guide

This guide explains how to run tests in both **Unit Mode** (with mocks) and **Integration Mode** (against real server).

## 🎯 Test Modes

### Unit Tests (Mock-based)
- **Purpose**: Fast, isolated testing of individual functions
- **Database**: Mocked
- **Server**: Not required
- **Speed**: Very fast
- **Use case**: Development, CI/CD, quick feedback

### Integration Tests (Real server)
- **Purpose**: End-to-end testing of complete functionality
- **Database**: Real PostgreSQL database
- **Server**: Real Express server
- **Speed**: Slower but comprehensive
- **Use case**: Production readiness, full system validation

## 🚀 Quick Start

### 1. Unit Tests (Recommended for development)
```bash
# Run all unit tests
npm run test:unit

# Run with verbose output
npm run test:unit:verbose

# Run specific test file
npm run test:unit -- --testPathPattern="assetController"
```

### 2. Integration Tests (Recommended for validation)
```bash
# Start server first (in another terminal)
npm start

# Run integration tests
npm run test:integration

# Run with verbose output
npm run test:integration:verbose

# Run specific integration test
npm run test:integration -- --testPathPattern="assetController.integration"
```

### 3. Advanced Test Runner
```bash
# Use the comprehensive test runner
node scripts/run-tests.js --mode=integration --verbose
node scripts/run-tests.js --mode=unit --coverage
node scripts/run-tests.js --server=external --pattern="assetController"
```

## 📋 Available Commands

| Command | Description |
|---------|-------------|
| `npm test` | Run tests in default mode (integration) |
| `npm run test:unit` | Run unit tests only |
| `npm run test:integration` | Run integration tests only |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run test:verbose` | Run tests with verbose output |

## 🔧 Configuration

### Environment Variables

Set these in your `.env` file or command line:

```bash
# Test Mode
TEST_MODE=integration|unit

# Server Configuration
TEST_SERVER_URL=http://localhost:5001

# Database Configuration
TEST_DB_NAME=asset_allocation_test
TEST_DB_USER=asset_allocation
TEST_DB_PASSWORD=asset_allocation
TEST_DB_HOST=localhost
TEST_DB_PORT=5435
```

### Jest Configuration

The test mode is configured in `jest.config.js`:

```javascript
globals: {
  TEST_MODE: process.env.TEST_MODE || 'integration',
  TEST_SERVER_URL: process.env.TEST_SERVER_URL || 'http://localhost:5001',
  // ... other config
}
```

## 📝 Writing Tests

### Unit Tests (Mock-based)

```javascript
describe('Asset Controller - Unit Tests', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
  });

  it('should create an asset', async () => {
    // Use mock request/response
    const req = global.testUtils.mockRequest();
    const res = global.testUtils.mockResponse();
    
    req.body = { name: 'Test Asset', type: 'billboard' };
    
    await AssetController.create(req, res);
    
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        asset: expect.objectContaining({ name: 'Test Asset' })
      })
    );
  });
});
```

### Integration Tests (Real server)

```javascript
describe('Asset Controller - Integration Tests', () => {
  let authToken;

  beforeAll(async () => {
    // Only run in integration mode
    if (!global.testUtils.isIntegrationMode) {
      console.log('⏭️  Skipping integration tests in unit mode');
      return;
    }

    // Wait for server
    await global.testUtils.waitForServer();
    
    // Setup test data
    await global.testUtils.setupTestDatabase();
    
    // Get auth token
    const loginResponse = await global.testUtils.loginUser('test@example.com', 'password');
    authToken = loginResponse.token;
  });

  it('should create asset via API', async () => {
    if (!global.testUtils.isIntegrationMode) return;

    const response = await global.testUtils.makeRequest(
      'POST', 
      '/api/assets', 
      { name: 'Test Asset', type: 'billboard' },
      authToken
    );
    
    expect(response.status).toBe(201);
    expect(response.data.asset.name).toBe('Test Asset');
  });
});
```

## 🛠️ Test Utilities

### Unit Mode Utilities

```javascript
// Mock objects
const req = global.testUtils.mockRequest();
const res = global.testUtils.mockResponse();
const next = global.testUtils.mockNext();

// Generate test data
const user = global.testUtils.generateToken({ id: 1, email: 'test@example.com' });
```

### Integration Mode Utilities

```javascript
// Make HTTP requests
const response = await global.testUtils.makeRequest('GET', '/api/assets', null, authToken);

// Authentication
const loginResponse = await global.testUtils.loginUser('email', 'password');
const token = global.testUtils.generateToken(user);

// Database operations
await global.testUtils.setupTestDatabase();
await global.testUtils.cleanup();
```

## 🗄️ Database Setup

### Integration Tests Database

Integration tests use a separate test database:

1. **Database**: `asset_allocation_test`
2. **User**: `asset_allocation`
3. **Port**: `5435`

The test runner automatically:
- Creates test data
- Cleans up after tests
- Handles database connections

### Test Data

Integration tests create:
- Test organizations
- Test users with authentication
- Test assets
- Test campaigns
- Test creatives

## 🔍 Debugging Tests

### Verbose Output
```bash
npm run test:integration:verbose
```

### Watch Mode
```bash
npm run test:watch
```

### Specific Test Files
```bash
npm run test:integration -- --testPathPattern="assetController"
```

### Coverage Report
```bash
npm run test:coverage
```

## 🚨 Troubleshooting

### Server Already Running
```bash
# Kill existing server
lsof -ti:5001 | xargs kill -9

# Or use external server mode
node scripts/run-tests.js --server=external
```

### Database Connection Issues
```bash
# Check PostgreSQL is running
pg_isready -h localhost -p 5435

# Check database exists
psql -h localhost -p 5435 -U asset_allocation -d asset_allocation_test
```

### Test Mode Issues
```bash
# Force unit mode
TEST_MODE=unit npm test

# Force integration mode
TEST_MODE=integration npm test
```

## 📊 Test Results

### Unit Tests
- ✅ Fast execution
- ✅ Isolated testing
- ✅ Good for development
- ❌ Doesn't test real integrations

### Integration Tests
- ✅ Real end-to-end testing
- ✅ Tests actual database operations
- ✅ Validates API contracts
- ❌ Slower execution
- ❌ Requires server and database

## 🎯 Best Practices

1. **Write both unit and integration tests**
2. **Use unit tests for development speed**
3. **Use integration tests for validation**
4. **Run integration tests before deployment**
5. **Use specific test patterns for focused testing**
6. **Clean up test data properly**

## 📈 Performance Tips

1. **Unit tests**: Run frequently during development
2. **Integration tests**: Run before commits/deployments
3. **Use watch mode** for development
4. **Use specific patterns** to run only relevant tests
5. **Parallel execution** for unit tests
6. **Sequential execution** for integration tests

---

**Happy Testing! 🧪✨** 