# Analytics Implementation Documentation

## Overview

This document describes the production-level implementation of analytics features for the Asset Scheduler system, including Creative controller enhancements, Analytics utilities, and Analytics endpoints.

## Table of Contents

1. [Creative Controller Enhancements](#creative-controller-enhancements)
2. [Analytics Utilities](#analytics-utilities)
3. [Analytics Endpoints](#analytics-endpoints)
4. [Database Schema](#database-schema)
5. [Performance Considerations](#performance-considerations)
6. [Testing](#testing)
7. [Deployment](#deployment)

## Creative Controller Enhancements

### Features Implemented

#### 1. Asset Validation and Dimension Matching

- **Function**: `validateAssetAndDimensions(asset_id, dimensions)`
- **Purpose**: Ensures creative dimensions match asset specifications
- **Validation**: Checks width and height compatibility
- **Error Handling**: Returns specific error messages for mismatched dimensions

#### 2. CDN Upload Integration

- **Function**: `uploadToCDN(content, type, name)`
- **Purpose**: Handles creative file uploads to CDN
- **Production Ready**: Placeholder for AWS S3, CloudFront, or similar CDN integration
- **Features**: 
  - File naming with timestamps
  - Special character sanitization
  - Error handling for upload failures

#### 3. Enhanced Filtering and Retrieval

- **Endpoint**: `GET /api/creatives`
- **Features**:
  - Pagination support (limit/offset)
  - Multiple filter options (asset_id, status, type, campaign_id)
  - Dynamic SQL query building
  - Performance optimized with proper indexing

#### 4. Update Validation and Permissions

- **Function**: `validateUpdatePermissions(creative_id, user_id, updates)`
- **Features**:
  - Creative existence validation
  - Role-based permission checks (placeholder for RBAC integration)
  - Status transition validation
  - Type constraint validation

### API Endpoints

#### Create Creative

```http
POST /api/creatives
Authorization: Bearer <token>
Content-Type: application/json

{
  "asset_id": 1,
  "campaign_id": 2,
  "name": "Summer Sale Banner",
  "type": "image",
  "content": {
    "url": "https://example.com/image.jpg",
    "alt_text": "Summer Sale"
  },
  "dimensions": {
    "width": 300,
    "height": 250
  },
  "file_size": 102400
}
```

**Response**:

```json
{
  "id": 1,
  "asset_id": 1,
  "campaign_id": 2,
  "name": "Summer Sale Banner",
  "type": "image",
  "content": {
    "url": "https://example.com/image.jpg",
    "alt_text": "Summer Sale",
    "cdn_url": "https://cdn.example.com/creatives/1704067200000_Summer_Sale_Banner"
  },
  "dimensions": {
    "width": 300,
    "height": 250
  },
  "file_size": 102400,
  "status": "draft",
  "created_at": "2024-01-01T12:00:00.000Z",
  "updated_at": "2024-01-01T12:00:00.000Z"
}
```

#### Get Creatives with Filtering

```http
GET /api/creatives?asset_id=1&status=approved&type=image&limit=10&offset=0
Authorization: Bearer <token>
```

**Response**:

```json
{
  "creatives": [
    {
      "id": 1,
      "asset_id": 1,
      "name": "Summer Sale Banner",
      "type": "image",
      "status": "approved",
      "created_at": "2024-01-01T12:00:00.000Z"
    }
  ],
  "pagination": {
    "limit": 10,
    "offset": 0,
    "total": 1
  }
}
```

#### Update Creative

```http
PUT /api/creatives/1
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Banner Name",
  "status": "pending"
}
```

#### Get Creative Performance

```http
GET /api/creatives/1/performance?timeRange=24h
Authorization: Bearer <token>
```

**Response**:

```json
{
  "creative_id": 1,
  "time_range": "24h",
  "metrics": {
    "total_impressions": 10000,
    "total_clicks": 150,
    "total_revenue": 50.00,
    "ctr": 1.5
  },
  "calculated_at": "2024-01-01T12:00:00.000Z"
}
```

## Analytics Utilities

### Core Functions

#### 1. Real-time Metrics (`getRealTimeMetrics()`)

Calculates real-time performance metrics from the last 5 minutes.

**Metrics Calculated**:

- Impressions per minute
- Revenue per hour
- Fill rate (impressions / ad requests)
- Average response time
- Active campaigns count
- Total assets count

**Database Queries**:

- Recent impressions count
- Daily revenue aggregation
- Recent ad requests count
- Response time averaging
- Active campaigns count
- Active assets count

#### 2. Campaign Performance (`getCampaignPerformance(campaign_id, timeRange)`)

Calculates comprehensive campaign performance metrics.

**Supported Time Ranges**:

- `1h`: Last hour
- `24h`: Last 24 hours
- `7d`: Last 7 days
- `30d`: Last 30 days

**Metrics Calculated**:

- Total impressions, clicks, revenue
- Click-through rate (CTR)
- Budget utilization percentage
- Cost per mille (CPM)
- Cost per click (CPC)

#### 3. Top Performing Creatives (`getTopPerformingCreatives(limit, timeRange)`)

Returns top performing creatives based on revenue.

**Features**:

- Configurable limit
- Multiple time range support
- Asset and campaign association
- Performance metrics (CTR, CPM)

#### 4. Asset Performance (`getAssetPerformance(asset_id, timeRange)`)

Calculates asset-specific performance metrics.

**Metrics**:

- Total impressions, clicks, revenue
- CTR and CPM
- Creative and campaign counts
- Asset metadata (location, type, daily metrics)

#### 5. Revenue Trends (`getRevenueTrends(timeRange)`)

Analyzes revenue trends over time.

**Features**:

- Daily aggregation for 7d/30d
- Weekly aggregation for 90d
- Impressions, clicks, revenue, CTR tracking

#### 6. Geographic Performance (`getGeographicPerformance(timeRange)`)

Analyzes performance by geographic location.

**Features**:

- Location-based aggregation
- Revenue ranking
- Performance metrics by location

### Usage Examples

```javascript
const Analytics = require('./modules/ad-server/utils/analytics');

// Get real-time metrics
const realTimeMetrics = await Analytics.getRealTimeMetrics();
console.log('Impressions per minute:', realTimeMetrics.impressions_per_minute);

// Get campaign performance
const campaignPerformance = await Analytics.getCampaignPerformance(1, '24h');
console.log('Campaign CTR:', campaignPerformance.ctr);

// Get top creatives
const topCreatives = await Analytics.getTopPerformingCreatives(10, '7d');
console.log('Top creative revenue:', topCreatives.creatives[0].total_revenue);
```

## Analytics Endpoints

### Available Endpoints

#### 1. Real-time Analytics

```http
GET /api/ads/analytics/realtime
Authorization: Bearer <token>
```

**Response**:

```json
{
  "impressions_per_minute": 250,
  "revenue_per_hour": 45.5,
  "fill_rate": 0.92,
  "avg_response_time": 45.5,
  "active_campaigns": 15,
  "total_assets": 25,
  "timestamp": "2024-01-01T12:00:00.000Z",
  "last_updated": "2024-01-01T12:00:00.000Z"
}
```

#### 2. Campaign Analytics

```http
GET /api/ads/analytics/campaigns?timeRange=24h&limit=10&offset=0
Authorization: Bearer <token>
```

**Response**:

```json
{
  "campaigns": [
    {
      "id": 1,
      "name": "Summer Sale 2024",
      "budget": 1000.00,
      "status": "active",
      "performance": {
        "total_impressions": 100000,
        "total_clicks": 1500,
        "total_revenue": 500.00,
        "ctr": 1.5,
        "budget_utilization": 50.0,
        "cpm": 5.0,
        "cpc": 0.33
      }
    }
  ],
  "summary": {
    "total_impressions": 100000,
    "total_clicks": 1500,
    "total_revenue": 500.00,
    "total_budget": 1000.00,
    "overall_ctr": 1.5,
    "budget_utilization": 50.0
  },
  "time_range": "24h",
  "total_count": 1,
  "calculated_at": "2024-01-01T12:00:00.000Z"
}
```

#### 3. Creative Analytics

```http
GET /api/ads/analytics/creatives?timeRange=7d&limit=10
Authorization: Bearer <token>
```

**Response**:

```json
{
  "creatives": [
    {
      "creative_id": 1,
      "creative_name": "Top Creative",
      "creative_type": "image",
      "status": "approved",
      "asset_name": "Test Asset",
      "campaign_name": "Test Campaign",
      "total_impressions": 50000,
      "total_clicks": 750,
      "total_revenue": 250.00,
      "ctr": 1.5,
      "cpm": 5.0
    }
  ],
  "statistics": {
    "total_creatives": 100,
    "approved_creatives": 80,
    "pending_creatives": 15,
    "rejected_creatives": 5
  },
  "time_range": "7d",
  "limit": 10,
  "calculated_at": "2024-01-01T12:00:00.000Z"
}
```

#### 4. Asset Analytics

```http
GET /api/ads/analytics/assets/1?timeRange=30d
Authorization: Bearer <token>
```

**Response**:

```json
{
  "asset_id": 1,
  "asset_name": "Test Asset",
  "location": "New York",
  "asset_type": "billboard",
  "impressions_per_day": 1000,
  "value_per_day": 50.00,
  "total_impressions": 30000,
  "total_clicks": 450,
  "total_revenue": 150.00,
  "ctr": 1.5,
  "cpm": 5.0,
  "total_creatives": 3,
  "total_campaigns": 2,
  "creatives": [
    {
      "id": 1,
      "name": "Creative 1",
      "type": "image",
      "status": "approved",
      "campaign_name": "Campaign 1",
      "impressions": 15000,
      "clicks": 225,
      "revenue": 75.00
    }
  ],
  "time_range": "30d",
  "calculated_at": "2024-01-01T12:00:00.000Z"
}
```

#### 5. Trend Analytics

```http
GET /api/ads/analytics/trends?timeRange=30d
Authorization: Bearer <token>
```

**Response**:

```json
{
  "trends": [
    {
      "period": "2024-01-01",
      "impressions": 10000,
      "clicks": 150,
      "revenue": 50.00,
      "ctr": 1.5
    }
  ],
  "additional_metrics": [
    {
      "period": "2024-01-01",
      "active_campaigns": 5,
      "active_assets": 10,
      "active_creatives": 25
    }
  ],
  "time_range": "30d",
  "calculated_at": "2024-01-01T12:00:00.000Z"
}
```

#### 6. Geographic Analytics

```http
GET /api/ads/analytics/geographic?timeRange=30d
Authorization: Bearer <token>
```

**Response**:

```json
{
  "geographic_performance": [
    {
      "location": "New York",
      "impressions": 50000,
      "clicks": 750,
      "revenue": 250.00,
      "ctr": 1.5
    },
    {
      "location": "Los Angeles",
      "impressions": 30000,
      "clicks": 450,
      "revenue": 150.00,
      "ctr": 1.5
    }
  ],
  "time_range": "30d",
  "calculated_at": "2024-01-01T12:00:00.000Z"
}
```

#### 7. Analytics Summary

```http
GET /api/ads/analytics/summary?timeRange=24h
Authorization: Bearer <token>
```

**Response**:

```json
{
  "real_time": {
    "impressions_per_minute": 250,
    "revenue_per_hour": 45.5,
    "fill_rate": 0.92,
    "avg_response_time": 45.5,
    "active_campaigns": 15,
    "total_assets": 25
  },
  "top_campaigns": [
    {
      "id": 1,
      "name": "Top Campaign",
      "budget": 1000.00,
      "impressions": 50000,
      "clicks": 750,
      "revenue": 250.00
    }
  ],
  "top_assets": [
    {
      "id": 1,
      "name": "Top Asset",
      "location": "New York",
      "impressions": 30000,
      "clicks": 450,
      "revenue": 150.00
    }
  ],
  "time_range": "24h",
  "calculated_at": "2024-01-01T12:00:00.000Z"
}
```

## Database Schema

### Key Tables

#### Performance Metrics Table

```sql
CREATE TABLE performance_metrics (
  id SERIAL PRIMARY KEY,
  creative_id INTEGER REFERENCES creatives(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  revenue DECIMAL(10,2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(creative_id, date)
);
```

#### Creatives Table

```sql
CREATE TABLE creatives (
  id SERIAL PRIMARY KEY,
  asset_id INTEGER REFERENCES assets(id) ON DELETE CASCADE,
  campaign_id INTEGER REFERENCES campaigns(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('image', 'video', 'html5', 'native')),
  content JSONB NOT NULL,
  dimensions JSONB,
  file_size INTEGER,
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'rejected')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Indexes for Performance

```sql
-- Performance optimization indexes
CREATE INDEX idx_performance_metrics_creative_date ON performance_metrics(creative_id, date);
CREATE INDEX idx_creatives_asset_id ON creatives(asset_id);
CREATE INDEX idx_creatives_status ON creatives(status);
CREATE INDEX idx_impressions_timestamp ON impressions(timestamp);
CREATE INDEX idx_ad_requests_timestamp ON ad_requests(timestamp);
```

## Performance Considerations

### Database Optimization

1. **Indexing**: Proper indexes on frequently queried columns
2. **Query Optimization**: Efficient SQL queries with proper JOINs
3. **Connection Pooling**: Reuse database connections
4. **Caching**: Redis caching for frequently accessed data

### Caching Strategy

```javascript
// Example caching implementation
const cache = require('redis').createClient();

async function getCachedAnalytics(key, ttl = 300) {
  const cached = await cache.get(key);
  if (cached) return JSON.parse(cached);
  
  const data = await calculateAnalytics();
  await cache.setex(key, ttl, JSON.stringify(data));
  return data;
}
```

### Rate Limiting

```javascript
// Rate limiting for analytics endpoints
const rateLimit = require('express-rate-limit');

const analyticsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many analytics requests from this IP'
});
```

## Testing

### Test Coverage

- **Unit Tests**: Individual function testing
- **Integration Tests**: API endpoint testing
- **Performance Tests**: Load and stress testing
- **Error Handling Tests**: Graceful failure testing

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm test -- --testPathPattern=analytics
npm test -- --testPathPattern=creativeController

# Run with coverage
npm test -- --coverage
```

### Test Examples

```javascript
// Example test for real-time metrics
describe('getRealTimeMetrics', () => {
  it('should calculate real-time metrics correctly', async () => {
    const metrics = await Analytics.getRealTimeMetrics();
    expect(metrics).toHaveProperty('impressions_per_minute');
    expect(metrics).toHaveProperty('revenue_per_hour');
    expect(metrics).toHaveProperty('fill_rate');
  });
});
```

## Deployment

### Environment Variables

```bash
# Database configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=asset_scheduler
DB_USER=postgres
DB_PASSWORD=password

# Redis configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# CDN configuration
CDN_ENDPOINT=https://cdn.example.com
CDN_ACCESS_KEY=your_access_key
CDN_SECRET_KEY=your_secret_key

# Analytics configuration
ANALYTICS_CACHE_TTL=300
ANALYTICS_RATE_LIMIT=100
```

### Production Checklist

- [ ] Database indexes created
- [ ] Redis caching configured
- [ ] CDN integration implemented
- [ ] Rate limiting enabled
- [ ] Error monitoring configured
- [ ] Performance monitoring enabled
- [ ] Security headers configured
- [ ] SSL/TLS certificates installed

### Monitoring

```javascript
// Example monitoring implementation
const monitoring = {
  trackAnalyticsRequest: (endpoint, duration, success) => {
    // Send metrics to monitoring service
    console.log(`Analytics ${endpoint}: ${duration}ms, success: ${success}`);
  }
};
```

## Security Considerations

### Authentication & Authorization

- JWT token validation
- Role-based access control (RBAC)
- API key management for external integrations

### Data Protection

- Input validation and sanitization
- SQL injection prevention
- XSS protection
- Rate limiting to prevent abuse

### Audit Logging

```javascript
// Example audit logging
const auditLog = {
  logAnalyticsAccess: (userId, endpoint, params) => {
    // Log analytics access for compliance
    console.log(`User ${userId} accessed ${endpoint} with params:`, params);
  }
};
```

## Troubleshooting

### Common Issues

#### 1. Slow Analytics Queries

**Symptoms**: Long response times for analytics endpoints
**Solutions**:

- Check database indexes
- Optimize SQL queries
- Implement caching
- Consider database partitioning

#### 2. Memory Issues

**Symptoms**: High memory usage during analytics calculations
**Solutions**:

- Implement pagination
- Use streaming for large datasets
- Optimize data structures
- Monitor memory usage

#### 3. CDN Upload Failures

**Symptoms**: Creative creation fails with CDN errors
**Solutions**:

- Check CDN credentials
- Verify network connectivity
- Implement retry logic
- Monitor CDN service status

### Debugging Tools

```javascript
// Enable debug logging
const debug = require('debug')('analytics');

debug('Calculating real-time metrics');
const metrics = await Analytics.getRealTimeMetrics();
debug('Metrics calculated:', metrics);
```

## Future Enhancements

### Planned Features

1. **Real-time WebSocket Updates**: Live analytics dashboard
2. **Advanced Filtering**: Multi-dimensional analytics filtering
3. **Predictive Analytics**: ML-based performance predictions
4. **Custom Dashboards**: User-configurable analytics views
5. **Export Functionality**: CSV/Excel export of analytics data

### Scalability Improvements

1. **Database Sharding**: Horizontal scaling for large datasets
2. **Microservices Architecture**: Separate analytics service
3. **Event Streaming**: Real-time data processing with Kafka
4. **Data Warehousing**: Analytics data warehouse integration

## Support

For technical support or questions about the analytics implementation:

1. **Documentation**: Check this document and API documentation
2. **Code Repository**: Review source code and tests
3. **Issue Tracking**: Report bugs and feature requests
4. **Team Contact**: Reach out to the development team

---

**Last Updated**: January 2024
**Version**: 1.0.0
**Author**: Asset Scheduler Development Team 