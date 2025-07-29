# 🚀 Ad Server Quick Start Guide

## Current Status ✅

Your ad server skeleton has been transformed into a functional implementation with:
- ✅ Real database operations
- ✅ Advanced targeting logic
- ✅ Performance optimization
- ✅ Comprehensive analytics
- ✅ Fraud detection basics

---

## 🎯 Immediate Next Steps (This Week)

### **Step 1: Run Database Migration**
```bash
# Connect to your PostgreSQL database
psql -d asset_scheduler -f ad_server_migration.sql

# Verify tables were created
psql -d asset_scheduler -c "\dt"
```

### **Step 2: Test the Implementation**
```bash
# Start the server
cd backend
npm start

# Test ad serving (in another terminal)
curl -X POST http://localhost:5000/api/ads/request \
  -H "Content-Type: application/json" \
  -d '{
    "asset_id": 1,
    "user_context": {
      "ip": "192.168.1.1",
      "user_agent": "Mozilla/5.0...",
      "location": {"country": "US"}
    },
    "page_context": {
      "url": "https://example.com",
      "viewport": {"width": 1920, "height": 1080}
    }
  }'
```

### **Step 3: Add Sample Data**
```sql
-- Insert sample assets
INSERT INTO assets (name, location, type, max_slots, importance, value_per_day, level) 
VALUES 
  ('Homepage Banner', 'Homepage', 'banner', 1, 5, 100.00, 'primary'),
  ('Sidebar Ad', 'Sidebar', 'banner', 2, 3, 50.00, 'secondary');

-- Insert sample creatives
INSERT INTO creatives (asset_id, name, type, content, dimensions, status) 
VALUES 
  (1, 'Summer Sale', 'image', 
   '{"image_url": "https://example.com/ad1.jpg", "click_url": "https://example.com/sale"}', 
   '{"width": 728, "height": 90}', 'approved'),
  (1, 'Winter Collection', 'image', 
   '{"image_url": "https://example.com/ad2.jpg", "click_url": "https://example.com/winter"}', 
   '{"width": 728, "height": 90}', 'approved');
```

---

## 🔧 Phase 2 Implementation (Next 2 Weeks)

### **2.1 Add Redis Caching**
```bash
# Install Redis
npm install redis

# Create cache utility
```

**Create `backend/utils/cache.js`:**
```javascript
const redis = require('redis');
const logger = require('./logger');

const client = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

client.on('error', (err) => logger.error('Redis Client Error', err));

const cache = {
  async get(key) {
    try {
      const value = await client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Cache get error', { key, error: error.message });
      return null;
    }
  },

  async set(key, value, ttl = 300) {
    try {
      await client.setEx(key, ttl, JSON.stringify(value));
    } catch (error) {
      logger.error('Cache set error', { key, error: error.message });
    }
  },

  async del(key) {
    try {
      await client.del(key);
    } catch (error) {
      logger.error('Cache del error', { key, error: error.message });
    }
  }
};

module.exports = cache;
```

### **2.2 Implement Rate Limiting**
```bash
npm install express-rate-limit
```

**Create `backend/middleware/rateLimit.js`:**
```javascript
const rateLimit = require('express-rate-limit');

const adRequestLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many ad requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
});

const impressionLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 5000,
  message: 'Too many impression requests from this IP',
});

module.exports = { adRequestLimit, impressionLimit };
```

### **2.3 Add API Documentation**
```bash
npm install swagger-jsdoc swagger-ui-express
```

**Create `backend/config/swagger.js`:**
```javascript
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Ad Server API',
      version: '1.0.0',
      description: 'Comprehensive ad serving API',
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server',
      },
    ],
  },
  apis: ['./routes/*.js', './controllers/*.js'],
};

module.exports = swaggerJsdoc(options);
```

---

## 📊 Phase 3 Implementation (Weeks 3-4)

### **3.1 Real-Time Bidding (RTB)**
**Create `backend/models/Auction.js`:**
```javascript
const db = require('../config/db');

const Auction = {
  async createAuction(asset_id, user_context, page_context) {
    const result = await db.query(
      `INSERT INTO auctions (asset_id, user_context, page_context, status)
       VALUES ($1, $2, $3, 'active')
       RETURNING id`,
      [asset_id, JSON.stringify(user_context), JSON.stringify(page_context)]
    );
    return result.rows[0];
  },

  async submitBid(auction_id, bidder_id, bid_amount, creative_id) {
    const result = await db.query(
      `INSERT INTO bids (auction_id, bidder_id, bid_amount, creative_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [auction_id, bidder_id, bid_amount, creative_id]
    );
    return result.rows[0];
  },

  async selectWinner(auction_id) {
    const result = await db.query(
      `SELECT b.*, c.content, c.type
       FROM bids b
       JOIN creatives c ON b.creative_id = c.id
       WHERE b.auction_id = $1
       ORDER BY b.bid_amount DESC
       LIMIT 1`,
      [auction_id]
    );
    return result.rows[0];
  }
};

module.exports = Auction;
```

### **3.2 Machine Learning Integration**
**Create `backend/utils/mlEngine.js`:**
```javascript
const logger = require('./logger');

const MLEngine = {
  async predictCTR(creative, user_context, page_context) {
    // Simple CTR prediction based on historical data
    // In production, this would use a trained ML model
    
    let baseCTR = 0.015; // 1.5% base CTR
    
    // Adjust based on creative performance
    if (creative.performance && creative.performance.ctr) {
      baseCTR = creative.performance.ctr;
    }
    
    // Adjust based on user context
    if (user_context.location && ['US', 'CA'].includes(user_context.location.country)) {
      baseCTR *= 1.2; // Premium location boost
    }
    
    // Adjust based on page context
    if (page_context.category === 'healthcare') {
      baseCTR *= 1.1; // Healthcare category boost
    }
    
    return Math.min(baseCTR, 0.05); // Cap at 5%
  },

  async optimizeCreativeSelection(creatives, user_context) {
    // Score creatives based on ML predictions
    const scoredCreatives = await Promise.all(
      creatives.map(async (creative) => {
        const predictedCTR = await this.predictCTR(creative, user_context);
        return {
          ...creative,
          score: predictedCTR * 1000 // Convert to score
        };
      })
    );
    
    // Return highest scoring creative
    return scoredCreatives.sort((a, b) => b.score - a.score)[0];
  }
};

module.exports = MLEngine;
```

---

## 🎯 Phase 4 Implementation (Weeks 5-6)

### **4.1 A/B Testing Framework**
**Create `backend/models/Experiment.js`:**
```javascript
const db = require('../config/db');

const Experiment = {
  async createExperiment({ name, description, variants, traffic_split }) {
    const result = await db.query(
      `INSERT INTO experiments (name, description, variants, traffic_split, status)
       VALUES ($1, $2, $3, $4, 'active')
       RETURNING id`,
      [name, description, JSON.stringify(variants), JSON.stringify(traffic_split)]
    );
    return result.rows[0];
  },

  async getVariant(experiment_id, user_id) {
    // Simple hash-based variant selection
    const hash = this.hashString(user_id + experiment_id);
    const variantIndex = hash % 100;
    
    const experiment = await this.findById(experiment_id);
    const variants = experiment.variants;
    const trafficSplit = experiment.traffic_split;
    
    let cumulative = 0;
    for (let i = 0; i < variants.length; i++) {
      cumulative += trafficSplit[i];
      if (variantIndex < cumulative) {
        return variants[i];
      }
    }
    
    return variants[0]; // Fallback
  },

  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }
};

module.exports = Experiment;
```

### **4.2 Advanced Analytics**
**Create `backend/utils/advancedAnalytics.js`:**
```javascript
const db = require('../config/db');

const AdvancedAnalytics = {
  async getAttributionPath(user_id, timeRange = '30d') {
    const result = await db.query(
      `SELECT 
        i.timestamp,
        c.name as creative_name,
        c.type as creative_type,
        a.name as asset_name,
        i.metadata
       FROM impressions i
       JOIN creatives c ON i.creative_id = c.id
       JOIN assets a ON c.asset_id = a.id
       WHERE i.user_id = $1
         AND i.timestamp >= NOW() - INTERVAL $2
       ORDER BY i.timestamp DESC`,
      [user_id, timeRange]
    );
    return result.rows;
  },

  async getAudienceInsights(asset_id, timeRange = '30d') {
    const result = await db.query(
      `SELECT 
        COUNT(DISTINCT i.user_id) as unique_users,
        AVG(EXTRACT(EPOCH FROM (MAX(i.timestamp) - MIN(i.timestamp)))) as avg_session_duration,
        COUNT(*) as total_impressions,
        COUNT(DISTINCT CASE WHEN c.id IS NOT NULL THEN i.user_id END) as users_with_clicks
       FROM impressions i
       LEFT JOIN clicks c ON i.id = c.impression_id
       WHERE i.creative_id IN (
         SELECT id FROM creatives WHERE asset_id = $1
       )
         AND i.timestamp >= NOW() - INTERVAL $2`,
      [asset_id, timeRange]
    );
    return result.rows[0];
  }
};

module.exports = AdvancedAnalytics;
```

---

## 🚀 Production Deployment

### **Docker Configuration**
**Create `Dockerfile`:**
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 5000

CMD ["npm", "start"]
```

**Create `docker-compose.yml`:**
```yaml
version: '3.8'
services:
  ad-server:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:pass@postgres:5432/asset_scheduler
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=asset_scheduler
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### **Monitoring Setup**
**Create `backend/monitoring/metrics.js`:**
```javascript
const prometheus = require('prom-client');

// Create metrics
const adServeDuration = new prometheus.Histogram({
  name: 'ad_serve_duration_seconds',
  help: 'Duration of ad serving requests',
  labelNames: ['asset_id', 'status']
});

const impressionsTotal = new prometheus.Counter({
  name: 'impressions_total',
  help: 'Total number of impressions',
  labelNames: ['creative_id', 'asset_id']
});

const fillRate = new prometheus.Gauge({
  name: 'fill_rate',
  help: 'Ad fill rate percentage'
});

module.exports = {
  adServeDuration,
  impressionsTotal,
  fillRate
};
```

---

## 📈 Success Metrics & Monitoring

### **Key Performance Indicators**
```javascript
// Track these metrics
const kpis = {
  technical: {
    adServeLatency: '< 100ms (95th percentile)',
    fillRate: '> 95%',
    errorRate: '< 1%',
    uptime: '> 99.9%'
  },
  business: {
    revenuePerImpression: '> $0.002',
    clickThroughRate: '> 1.5%',
    conversionRate: '> 0.1%',
    returnOnAdSpend: '> 2.0'
  }
};
```

### **Alerting Rules**
```yaml
# Prometheus alerting rules
groups:
  - name: ad-server
    rules:
      - alert: HighErrorRate
        expr: rate(ad_serve_errors_total[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          
      - alert: LowFillRate
        expr: fill_rate < 0.8
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Low fill rate detected"
```

---

## 🔗 Next Steps Summary

1. **Week 1:** Run migration, test implementation, add sample data
2. **Week 2:** Add Redis caching, rate limiting, API documentation
3. **Week 3:** Implement RTB system, ML integration
4. **Week 4:** Add A/B testing, advanced analytics
5. **Week 5:** Set up monitoring, deployment pipeline
6. **Week 6:** Production deployment, performance optimization

This roadmap will transform your skeleton ad server into a production-ready, enterprise-grade platform with extensive APIs and advanced features. 