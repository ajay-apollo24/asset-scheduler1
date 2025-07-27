# Testing Documentation

## Overview

This document provides comprehensive information about the testing strategy, setup, and execution for the Asset Scheduler backend.

## Test Structure

```
backend/
├── __tests__/
│   ├── controllers/
│   │   ├── bookingController.test.js
│   │   └── assetController.test.js
│   ├── middleware/
│   │   ├── auth.test.js
│   │   └── authorize.test.js
│   ├── utils/
│   │   └── ruleEngine.test.js
│   └── integration/
│       └── api.test.js
├── tests/
│   ├── setup.js
│   └── helpers/
│       └── dbHelper.js
└── jest.config.js
```

## Test Categories

### 1. Unit Tests
- **Controllers**: Test individual controller methods
- **Middleware**: Test authentication and authorization
- **Utils**: Test utility functions and rule engine
- **Models**: Test database operations

### 2. Integration Tests
- **API Endpoints**: Test complete request/response cycles
- **Database Integration**: Test with real database operations
- **External Services**: Test service integrations

### 3. Performance Tests
- **Load Testing**: Test system under load
- **Concurrent Requests**: Test multiple simultaneous requests
- **Response Times**: Measure API performance

## Test Setup

### Prerequisites

1. **Database Setup**
   ```bash
   # Create test database
   createdb asset_scheduler_test
   ```

2. **Environment Configuration**
   ```bash
   # Copy test environment
   cp test.env.example test.env
   # Edit test.env with your database credentials
   ```

3. **Install Dependencies**
   ```bash
   npm install
   ```

### Test Configuration

The test environment uses:
- Separate test database (`asset_scheduler_test`)
- Reduced logging (LOG_LEVEL=error)
- Mocked external services
- In-memory caches for testing

## Running Tests

### All Tests
```bash
npm test
```

### Specific Test Categories
```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# With coverage
npm run test:coverage

# Watch mode
npm run test:watch

# CI mode
npm run test:ci
```

### Individual Test Files
```bash
# Run specific test file
npm test -- bookingController.test.js

# Run tests matching pattern
npm test -- --testNamePattern="should create booking"
```

## Test Utilities

### Global Test Utils
```javascript
// Generate test data
const user = global.testUtils.generateTestUser({ role: 'admin' });
const asset = global.testUtils.generateTestAsset({ level: 'primary' });
const booking = global.testUtils.generateTestBooking({ lob: 'Pharmacy' });

// Mock request/response
const req = global.testUtils.mockRequest({ body: bookingData });
const res = global.testUtils.mockResponse();
const next = global.testUtils.mockNext();
```

### Database Helper
```javascript
const TestDBHelper = require('../../tests/helpers/dbHelper');

// Setup test database
await TestDBHelper.setupTestDB();

// Clean up after tests
await TestDBHelper.cleanupTestDB();

// Insert test data
const testData = await TestDBHelper.insertTestData();
```

## Test Patterns

### Controller Testing Pattern
```javascript
describe('BookingController', () => {
  beforeEach(async () => {
    // Setup test data
    await TestDBHelper.setupTestDB();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    // Cleanup
    await TestDBHelper.cleanupTestDB();
  });

  it('should create booking successfully', async () => {
    // Arrange
    const bookingData = { /* test data */ };
    req.body = bookingData;

    // Act
    await BookingController.create(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      id: expect.any(Number)
    }));
  });
});
```

### Integration Testing Pattern
```javascript
describe('API Integration Tests', () => {
  it('should create booking via API', async () => {
    // Arrange
    const bookingData = { /* test data */ };

    // Act
    const response = await request(app)
      .post('/api/bookings')
      .send(bookingData)
      .set('Authorization', 'Bearer valid.token');

    // Assert
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
  });
});
```

## Mocking Strategy

### Database Mocks
```javascript
jest.mock('../../models/Booking');
Booking.create.mockResolvedValue(mockBooking);
Booking.findConflicts.mockResolvedValue([]);
```

### External Service Mocks
```javascript
jest.mock('../../utils/ruleEngine');
const { validateBookingRules } = require('../../utils/ruleEngine');
validateBookingRules.mockResolvedValue([]);
```

### Logger Mocks
```javascript
jest.mock('../../utils/logger');
// Logger calls are automatically mocked during tests
```

## Coverage Goals

- **Statements**: 90%
- **Branches**: 85%
- **Functions**: 90%
- **Lines**: 90%

## Test Data Management

### Test Data Creation
```javascript
// Create test user
const testUser = await db.query(`
  INSERT INTO users (email, password_hash, role) 
  VALUES ($1, $2, $3) 
  RETURNING *
`, ['test@example.com', 'hashed_password', 'admin']);

// Create test asset
const testAsset = await db.query(`
  INSERT INTO assets (name, location, type, max_slots, importance, level) 
  VALUES ($1, $2, $3, $4, $5, $6) 
  RETURNING *
`, ['Test Asset', 'test_location', 'banner', 1, 1, 'secondary']);
```

### Test Data Cleanup
```javascript
// Clean all test tables
const tables = ['audit_logs', 'approvals', 'bookings', 'assets', 'users'];
for (const table of tables) {
  await db.query(`DELETE FROM ${table}`);
  await db.query(`ALTER SEQUENCE ${table}_id_seq RESTART WITH 1`);
}
```

## Error Testing

### Database Error Testing
```javascript
it('should handle database errors gracefully', async () => {
  // Arrange
  Booking.create.mockRejectedValue(new Error('Database error'));

  // Act
  await BookingController.create(req, res);

  // Assert
  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.json).toHaveBeenCalledWith({
    message: 'Failed to create booking'
  });
});
```

### Validation Error Testing
```javascript
it('should return 400 for invalid data', async () => {
  // Arrange
  req.body = { /* missing required fields */ };

  // Act
  await BookingController.create(req, res);

  // Assert
  expect(res.status).toHaveBeenCalledWith(400);
  expect(res.json).toHaveBeenCalledWith({
    message: 'All fields are required'
  });
});
```

## Performance Testing

### Load Testing
```javascript
it('should handle multiple concurrent requests', async () => {
  // Arrange
  const requests = Array(10).fill().map(() => 
    request(app)
      .get('/api/assets')
      .set('Authorization', 'Bearer valid.token')
  );

  // Act
  const startTime = Date.now();
  const responses = await Promise.all(requests);
  const endTime = Date.now();

  // Assert
  expect(responses.every(r => r.status === 200)).toBe(true);
  expect(endTime - startTime).toBeLessThan(5000); // 5 seconds max
});
```

## Continuous Integration

### GitHub Actions Example
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:ci
      - uses: codecov/codecov-action@v1
```

## Best Practices

1. **Test Isolation**: Each test should be independent
2. **Clean Setup/Teardown**: Always clean up test data
3. **Meaningful Assertions**: Test behavior, not implementation
4. **Mock External Dependencies**: Don't test external services
5. **Use Descriptive Names**: Test names should describe the scenario
6. **Follow AAA Pattern**: Arrange, Act, Assert
7. **Test Error Cases**: Don't just test happy paths
8. **Maintain Test Data**: Keep test data realistic and up-to-date

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Ensure test database exists
   - Check database credentials in test.env
   - Verify database is running

2. **Test Timeouts**
   - Increase timeout in jest.config.js
   - Check for hanging promises
   - Ensure proper cleanup

3. **Mock Issues**
   - Clear mocks in beforeEach
   - Ensure mocks are properly configured
   - Check mock return values

4. **Coverage Issues**
   - Add tests for uncovered branches
   - Check for dead code
   - Ensure all error paths are tested

### Debug Mode
```bash
# Run tests with verbose output
npm test -- --verbose

# Run specific test with debugging
npm test -- --testNamePattern="should create booking" --verbose
```

## Maintenance

### Regular Tasks
- Update test data when schema changes
- Review and update mocks
- Monitor test performance
- Update coverage goals
- Review and refactor tests

### Test Review Checklist
- [ ] All new features have tests
- [ ] Error cases are covered
- [ ] Integration tests pass
- [ ] Performance tests meet requirements
- [ ] Coverage goals are met
- [ ] Tests are maintainable 