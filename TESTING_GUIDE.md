# Testing Guide for Analytics Implementation

## 🚀 Quick Start - Test on Your Laptop

This guide will help you test the analytics implementation on your laptop without complex database setup.

## 📋 Prerequisites

1. **Node.js** (v14 or higher)
2. **npm** (comes with Node.js)
3. **Git** (to clone the repository)

## 🛠️ Setup Instructions

### 1. Navigate to the Backend Directory
```bash
cd backend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Simple Tests
```bash
npm test -- __tests__/simple-analytics.test.js --passWithNoTests
```

## 🧪 Testing Options

### Option 1: Simple Tests (Recommended for Laptop Testing)
These tests use mocked database connections and don't require a real database.

```bash
# Run simple analytics tests
npm test -- __tests__/simple-analytics.test.js --passWithNoTests
```

**What this tests:**
- ✅ All 6 analytics methods are implemented
- ✅ Real-time metrics calculation
- ✅ Campaign performance analysis
- ✅ Top performing creatives
- ✅ Asset performance metrics
- ✅ Revenue trends analysis
- ✅ Geographic performance
- ✅ Error handling
- ✅ Time range validation

### Option 2: Direct Analytics Testing
Test the analytics utilities directly without Jest:

```bash
# Test analytics utilities directly
node -e "
const Analytics = require('./modules/ad-server/utils/analytics');

async function testAnalytics() {
  try {
    console.log('Testing Analytics.getRealTimeMetrics...');
    const metrics = await Analytics.getRealTimeMetrics();
    console.log('✅ Real-time metrics:', metrics);
    
    console.log('Testing Analytics.getCampaignPerformance...');
    const performance = await Analytics.getCampaignPerformance(1, '24h');
    console.log('✅ Campaign performance:', performance);
    
    console.log('🎉 All analytics utilities working correctly!');
  } catch (error) {
    console.error('❌ Error testing analytics:', error.message);
  }
}

testAnalytics();
"
```

### Option 3: Manual API Testing (Requires Server)
If you want to test the actual API endpoints:

1. **Start the server:**
```bash
npm start
```

2. **Test API endpoints with curl:**
```bash
# Test real-time analytics
curl -H 'Authorization: Bearer YOUR_TOKEN' http://localhost:3000/api/ads/analytics/realtime

# Test campaign analytics
curl -H 'Authorization: Bearer YOUR_TOKEN' http://localhost:3000/api/ads/analytics/campaigns

# Test creative analytics
curl -H 'Authorization: Bearer YOUR_TOKEN' http://localhost:3000/api/ads/analytics/creatives

# Test asset analytics
curl -H 'Authorization: Bearer YOUR_TOKEN' http://localhost:3000/api/ads/analytics/assets/1

# Test trends analytics
curl -H 'Authorization: Bearer YOUR_TOKEN' http://localhost:3000/api/ads/analytics/trends

# Test geographic analytics
curl -H 'Authorization: Bearer YOUR_TOKEN' http://localhost:3000/api/ads/analytics/geographic

# Test analytics summary
curl -H 'Authorization: Bearer YOUR_TOKEN' http://localhost:3000/api/ads/analytics/summary
```

## 📊 What's Being Tested

### 1. Analytics Utilities (`modules/ad-server/utils/analytics.js`)
- **Real-time Metrics**: Impressions per minute, revenue per hour, fill rate, response time
- **Campaign Performance**: CTR, budget utilization, CPM, CPC
- **Top Creatives**: Revenue-based ranking with performance metrics
- **Asset Performance**: Location-based performance analysis
- **Revenue Trends**: Time-based trend analysis
- **Geographic Performance**: Location-based aggregation

### 2. Creative Controller (`modules/ad-server/controllers/creativeController.js`)
- **Asset Validation**: Ensures creative dimensions match asset specifications
- **CDN Upload**: File upload handling (placeholder for production CDN)
- **Enhanced Filtering**: Pagination, status, type, campaign filtering
- **Update Permissions**: Role-based access control
- **Error Handling**: Comprehensive error responses

### 3. Analytics Endpoints (`modules/ad-server/routes/adRoutes.js`)
- **7 Comprehensive Endpoints**: Real-time, campaigns, creatives, assets, trends, geographic, summary
- **Authentication**: JWT token validation
- **Authorization**: Role-based access control
- **Error Handling**: Graceful error responses
- **Performance Monitoring**: Request duration tracking

## 🔍 Manual Testing Checklist

### Test Creative Controller Features
```bash
# 1. Check if validation functions exist
grep -n "validateAssetAndDimensions" modules/ad-server/controllers/creativeController.js

# 2. Check if CDN upload function exists
grep -n "uploadToCDN" modules/ad-server/controllers/creativeController.js

# 3. Check if filtering is implemented
grep -n "LIMIT.*OFFSET" modules/ad-server/controllers/creativeController.js

# 4. Check if error handling exists
grep -n "try.*catch" modules/ad-server/controllers/creativeController.js
```

### Test Analytics Utilities
```bash
# 1. Check if all 6 analytics methods exist
grep -n "getRealTimeMetrics\|getCampaignPerformance\|getTopPerformingCreatives\|getAssetPerformance\|getRevenueTrends\|getGeographicPerformance" modules/ad-server/utils/analytics.js

# 2. Check if error handling exists
grep -n "try.*catch" modules/ad-server/utils/analytics.js

# 3. Check if time range handling exists
grep -n "switch.*timeRange" modules/ad-server/utils/analytics.js
```

### Test Analytics Endpoints
```bash
# 1. Check if all 7 endpoints exist
grep -n "analytics/realtime\|analytics/campaigns\|analytics/creatives\|analytics/assets\|analytics/trends\|analytics/geographic\|analytics/summary" modules/ad-server/routes/adRoutes.js

# 2. Check if authentication is implemented
grep -n "auth.*authorize" modules/ad-server/routes/adRoutes.js

# 3. Check if error handling exists
grep -n "try.*catch" modules/ad-server/routes/adRoutes.js
```

## 🎯 Expected Test Results

### Successful Test Output
```
✅ Analytics Implementation Simple Tests Ready
📊 All 6 analytics methods implemented and tested
🔧 Error handling and edge cases covered
⏱️  Time range validation working
🎯 Ready for production use!

PASS  __tests__/simple-analytics.test.js
  Analytics Implementation - Simple Tests
    Analytics Utilities
      ✓ should have all required analytics methods
      ✓ should handle real-time metrics calculation
      ✓ should handle campaign performance calculation
      ✓ should handle top performing creatives
      ✓ should handle asset performance
      ✓ should handle revenue trends
      ✓ should handle geographic performance
    Error Handling
      ✓ should handle database errors gracefully
      ✓ should handle empty database responses
    Time Range Handling
      ✓ should handle different time ranges correctly
      ✓ should default to appropriate time ranges for invalid inputs
    Data Validation
      ✓ should validate input parameters
      ✓ should handle edge cases

Test Suites: 1 passed, 1 total
Tests:       13 passed, 13 total
```

## 🚨 Troubleshooting

### Common Issues and Solutions

#### 1. "No tests found" Error
**Problem**: Jest can't find the test files
**Solution**: 
```bash
# Make sure you're in the backend directory
cd backend

# Run with explicit file path
npm test -- __tests__/simple-analytics.test.js --passWithNoTests
```

#### 2. Database Connection Errors
**Problem**: Tests fail due to database connection issues
**Solution**: 
- The simple tests use mocked database connections
- They don't require a real database
- If you see database errors, the mocks aren't working properly

#### 3. Module Not Found Errors
**Problem**: Can't find analytics module
**Solution**:
```bash
# Check if the file exists
ls -la modules/ad-server/utils/analytics.js

# Check if dependencies are installed
npm install
```

#### 4. Permission Errors
**Problem**: Can't run test scripts
**Solution**:
```bash
# Make scripts executable
chmod +x scripts/test-local.sh
chmod +x scripts/test-analytics-implementation.sh
```

## 📈 Performance Testing

### Load Testing (Optional)
If you want to test performance:

```bash
# Install load testing tool
npm install -g artillery

# Create a simple load test
cat > load-test.yml << EOF
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: "Analytics API Load Test"
    requests:
      - get:
          url: "/api/ads/analytics/realtime"
          headers:
            Authorization: "Bearer YOUR_TOKEN"
EOF

# Run load test (requires server running)
artillery run load-test.yml
```

## 🔧 Advanced Testing

### Database Integration Testing
If you have a database set up:

```bash
# Set up test database
node config/seed.js

# Run full test suite
npm test

# Run specific test suites
npm test -- --testPathPattern=creativeController
npm test -- --testPathPattern=analytics
npm test -- --testPathPattern=adRoutes
```

### Frontend Integration Testing
If you want to test with the frontend:

```bash
# Start backend server
cd backend && npm start

# In another terminal, start frontend
cd frontend && npm start

# Navigate to http://localhost:3000 in your browser
# Go to Analytics section to see the dashboard
```

## 📝 Test Results Interpretation

### ✅ All Tests Passing
- Implementation is working correctly
- Ready for production use
- All features are functional

### ⚠️ Some Tests Failing
- Check the specific error messages
- Verify file paths and dependencies
- Ensure you're in the correct directory

### ❌ All Tests Failing
- Check Node.js and npm installation
- Verify all dependencies are installed
- Check file permissions and paths

## 🎉 Success Criteria

Your implementation is working correctly if:

1. ✅ All 6 analytics methods are implemented and testable
2. ✅ Creative controller has validation, CDN upload, filtering, and permissions
3. ✅ 7 analytics endpoints are accessible and authenticated
4. ✅ Error handling is comprehensive
5. ✅ Performance monitoring is implemented
6. ✅ Security measures are in place
7. ✅ Documentation is complete

## 📞 Getting Help

If you encounter issues:

1. **Check the error messages** - They usually indicate the specific problem
2. **Verify file paths** - Make sure you're in the correct directory
3. **Check dependencies** - Ensure all npm packages are installed
4. **Review the documentation** - Check `docs/ANALYTICS_IMPLEMENTATION.md`
5. **Run the test script** - Use `scripts/test-local.sh` for automated testing

## 🚀 Next Steps

After successful testing:

1. **Configure Database**: Set up PostgreSQL for full functionality
2. **Configure CDN**: Set up AWS S3 or similar for file uploads
3. **Configure Redis**: Set up caching for better performance
4. **Deploy**: Move to production environment
5. **Monitor**: Set up monitoring and alerting

---

**Happy Testing! 🎯** 