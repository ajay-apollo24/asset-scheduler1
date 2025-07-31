# Tests Directory

This directory contains test suites and testing utilities for the asset scheduler system.

## Test Structure

### Ad Server Tests
- `ad-server/advanced-load-test.js` - Advanced load testing for ad server endpoints
- `ad-server/performance-monitor.js` - Performance monitoring utilities
- `ad-server/traffic-generator.js` - Traffic generation for testing
- `ad-server/test-runner.js` - Test execution framework
- `ad-server/sample-data.js` - Sample data generation
- `ad-server/demo-website/` - Demo website for testing

### Backend Tests
- `backend/` - Backend unit and integration tests (moved from backend/__tests__/)

## Running Tests

### Load Testing
```bash
# Run ad server load test
node tests/ad-server/advanced-load-test.js

# Run performance monitoring
node tests/ad-server/performance-monitor.js

# Generate traffic
node tests/ad-server/traffic-generator.js
```

### Backend Tests
```bash
# From backend directory
npm test

# Run specific test file
npm test -- --testPathPattern=controllers
```

## Test Configuration

Tests use the following configuration:
- Test database: `asset_allocation_test`
- Test environment: `NODE_ENV=test`
- Coverage reports: `backend/coverage/`

## Writing Tests

### Load Tests
- Use the provided load testing utilities for consistent testing
- Configure concurrency and request counts appropriately
- Monitor response times and success rates

### Unit Tests
- Use Jest framework for backend tests
- Follow AAA pattern (Arrange, Act, Assert)
- Mock external dependencies appropriately 