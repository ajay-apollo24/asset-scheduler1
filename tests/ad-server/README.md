# Ad Server Test Suite

A comprehensive testing suite for the Asset Scheduler Ad Server, designed to test ad serving performance, budget tracking, impressions, clicks, and overall system reliability.

## 🚀 Quick Start

1. **Ensure the backend server is running** on port 6510
2. **Install dependencies**: `npm install`
3. **Run the complete test suite**: `node scripts/test-runner.js`

## 📊 Test Scripts

### 1. **Complete Test Suite** (`test-runner.js`)
Runs all tests in sequence with comprehensive reporting.

```bash
# Run complete test suite
node scripts/test-runner.js

# Quick test (fewer requests)
node scripts/test-runner.js --quick

# Stress test only
node scripts/test-runner.js --stress
```

### 2. **Advanced Load Test** (`advanced-load-test.js`)
Comprehensive load testing with realistic traffic patterns, impressions, and clicks.

```bash
# Basic load test (1000 requests)
node scripts/advanced-load-test.js

# Custom parameters
node scripts/advanced-load-test.js --requests 2000 --click-rate 0.03

# Environment variables
REQUESTS=500 CLICK_RATE=0.025 node scripts/advanced-load-test.js
```

**Features:**
- Realistic user agents (desktop, mobile, tablet)
- Multiple page types (home, product, category, etc.)
- Dynamic campaign and asset selection
- Impression and click tracking
- Comprehensive performance metrics
- Error analysis and reporting

### 3. **Performance Monitor** (`performance-monitor.js`)
Real-time monitoring of ad server performance and budget spending.

```bash
# Start monitoring (5-second intervals)
node scripts/performance-monitor.js

# Custom interval (10 seconds)
node scripts/performance-monitor.js --interval 10

# Fast monitoring (2-second intervals)
MONITOR_INTERVAL=2000 node scripts/performance-monitor.js
```

**Monitors:**
- Active campaigns count
- Budget utilization
- Total impressions and clicks
- CTR, CPM, CPC metrics
- Real-time spending rates
- Performance deltas

### 4. **Basic Traffic Generator** (`traffic-generator.js`)
Simple load testing for basic functionality.

```bash
# Generate 100 requests
node scripts/traffic-generator.js

# Custom number of requests
REQUESTS=500 node scripts/traffic-generator.js
```

### 5. **Sample Data Creator** (`sample-data.js`)
Creates test campaigns and creatives for testing.

```bash
# Create sample data
node scripts/sample-data.js

# With authentication
API_TOKEN=your_token node scripts/sample-data.js
```

## 🎯 Testing Scenarios

### **Load Testing**
- **Light Load**: 100-500 requests
- **Medium Load**: 500-2000 requests  
- **Heavy Load**: 2000+ requests
- **Stress Test**: 5000+ requests

### **Performance Metrics**
- **Response Time**: P50, P95, P99 latencies
- **Throughput**: Requests per second
- **Success Rate**: Percentage of successful requests
- **Error Analysis**: Top error types and frequencies

### **Ad Performance**
- **CTR (Click-Through Rate)**: Default 2%
- **Impression Rate**: Default 95%
- **Budget Tracking**: Real-time spending monitoring
- **Campaign Performance**: Individual campaign metrics

## 📈 Expected Results

### **Performance Benchmarks**
- **Response Time**: < 100ms (P95)
- **Throughput**: > 100 requests/second
- **Success Rate**: > 99%
- **CTR**: 1-3% (realistic range)

### **Budget Tracking**
- Accurate impression counting
- Real-time budget deduction
- Daily budget enforcement
- Campaign status updates

## 🔧 Configuration

### **Environment Variables**
```bash
API_BASE=http://localhost:6510/api    # API endpoint
REQUESTS=1000                         # Number of requests
CLICK_RATE=0.02                       # Click rate (2%)
IMPRESSION_RATE=0.95                  # Impression rate (95%)
MONITOR_INTERVAL=5000                 # Monitor interval (ms)
```

### **Command Line Options**
```bash
--requests <number>                   # Number of requests
--click-rate <decimal>               # Click rate (0.0-1.0)
--impression-rate <decimal>          # Impression rate (0.0-1.0)
--interval <seconds>                 # Monitor interval
--api-base <url>                     # API base URL
--quick                              # Quick test mode
--stress                             # Stress test only
```

## 🐛 Troubleshooting

### **Common Issues**

1. **"No ad available"**
   - Ensure campaigns are active
   - Check that creatives are approved
   - Verify campaign targeting criteria

2. **"Invalid user agent"**
   - User agent must be at least 10 characters
   - Use realistic browser user agents

3. **"Fraud detection failed"**
   - Use public IP addresses (not 192.168.x.x)
   - Avoid localhost IPs for testing

4. **"Campaign not found"**
   - Run sample data script first
   - Check campaign status and dates

5. **"Budget exceeded"**
   - Increase campaign budgets
   - Check daily budget limits

### **Debug Mode**
Add `DEBUG=true` to see detailed request/response logs:
```bash
DEBUG=true node scripts/advanced-load-test.js
```

## 📊 Sample Output

### **Load Test Results**
```
📊 LOAD TEST RESULTS
==================================================
⏱️  Total Duration: 15420ms (15.42s)
📈 Requests: 1000
✅ Successful: 998 (99.80%)
❌ Failed: 2
👁️  Impressions: 948
🖱️  Clicks: 19
🎯 CTR: 2.0042%
⚡ Requests/sec: 64.85

📊 LATENCY STATISTICS
📊 Average: 45.23ms
📊 P50: 38ms
📊 P95: 89ms
📊 P99: 156ms
```

### **Performance Monitor**
```
📊 AD SERVER PERFORMANCE MONITOR
============================================================
⏰ Time: 2025-01-31T15:30:45.123Z
⏱️  Elapsed: 2.50 minutes
📈 Active Campaigns: 3

💰 BUDGET & SPENDING
──────────────────────────────
💵 Total Budget: $5000.00
💸 Total Spent: $1250.50
📊 Utilization: 25.01%
📈 Spend/Min: $500.20

👁️  IMPRESSIONS & CLICKS
──────────────────────────────
👁️  Total Impressions: 12,450
🖱️  Total Clicks: 249
🎯 CTR: 2.0000%
📈 Impressions/Min: 4,980.00
🖱️  Clicks/Min: 99.60
```

## 🎯 Next Steps

1. **Run the complete test suite** to validate all functionality
2. **Monitor performance** during load testing
3. **Analyze results** and optimize based on findings
4. **Scale testing** to production-like volumes
5. **Set up continuous monitoring** for ongoing performance tracking

## 📝 Notes

- **Backend Server**: Must be running on port 6510
- **Database**: Ensure campaigns and creatives exist
- **Authentication**: Some tests may require valid API tokens
- **Network**: Tests use realistic IP addresses and user agents
- **Resources**: Heavy load tests may require significant system resources
