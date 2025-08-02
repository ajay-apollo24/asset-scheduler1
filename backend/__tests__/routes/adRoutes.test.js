const request = require('supertest');
const app = require('../../server');

// Mock the Analytics module
jest.mock('../../modules/ad-server/utils/analytics', () => ({
  getRealTimeMetrics: jest.fn(),
  getCampaignPerformance: jest.fn(),
  getTopPerformingCreatives: jest.fn(),
  getAssetPerformance: jest.fn(),
  getRevenueTrends: jest.fn(),
  getGeographicPerformance: jest.fn(),
  getAnalyticsSummary: jest.fn()
}));

const Analytics = require('../../modules/ad-server/utils/analytics');

describe('Ad Routes Analytics Endpoints - Production Tests', () => {
  const authToken = 'Bearer valid-token';
  const unauthorizedToken = 'Bearer unauthorized-token';
  const invalidToken = 'Bearer invalid-token';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/ads/analytics/realtime', () => {
    it('should return real-time analytics data', async () => {
      const response = await request(app)
        .get('/api/ads/analytics/realtime')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        impressions_per_minute: expect.any(Number),
        revenue_per_hour: expect.any(Number),
        fill_rate: expect.any(Number),
        avg_response_time: expect.any(Number),
        active_campaigns: expect.any(Number),
        total_assets: expect.any(Number),
        timestamp: expect.any(String),
        last_updated: expect.any(String)
      });
    });

    it('should handle analytics errors gracefully', async () => {
      const response = await request(app)
        .get('/api/ads/analytics/realtime?error=true')
        .set('Authorization', authToken);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Failed to fetch real-time analytics');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/ads/analytics/realtime');

      expect(response.status).toBe(401);
    });

    it('should require proper authorization', async () => {
      const response = await request(app)
        .get('/api/ads/analytics/realtime')
        .set('Authorization', unauthorizedToken);

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/ads/analytics/campaigns', () => {
    it('should return campaign analytics with performance data', async () => {
      const response = await request(app)
        .get('/api/ads/analytics/campaigns')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('campaigns');
      expect(response.body).toHaveProperty('summary');
      expect(response.body).toHaveProperty('time_range', '24h');
      expect(response.body).toHaveProperty('total_count', 2);
      expect(response.body).toHaveProperty('calculated_at');
      expect(response.body.summary).toHaveProperty('total_impressions', 300000);
      expect(response.body.summary).toHaveProperty('total_clicks', 4500);
      expect(response.body.summary).toHaveProperty('total_revenue', 500.00);
      expect(response.body.summary).toHaveProperty('total_budget', 3000.00);
    });

    it('should handle pagination parameters', async () => {
      const response = await request(app)
        .get('/api/ads/analytics/campaigns?limit=5&offset=10')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('campaigns');
    });

    it('should calculate summary metrics correctly', async () => {
      const response = await request(app)
        .get('/api/ads/analytics/campaigns')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.summary.total_impressions).toBe(300000);
      expect(response.body.summary.total_clicks).toBe(4500);
      expect(response.body.summary.total_revenue).toBe(500.00);
      expect(response.body.summary.total_budget).toBe(3000.00);
    });
  });

  describe('GET /api/ads/analytics/creatives', () => {
    it('should return creative analytics with top performers', async () => {
      const response = await request(app)
        .get('/api/ads/analytics/creatives')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('creatives');
      expect(response.body).toHaveProperty('statistics');
      expect(response.body).toHaveProperty('time_range', '7d');
      expect(response.body).toHaveProperty('limit', 10);
      expect(response.body).toHaveProperty('calculated_at');
    });
  });

  describe('GET /api/ads/analytics/assets/:id', () => {
    it('should return asset-specific analytics', async () => {
      const assetId = 1;
      const response = await request(app)
        .get(`/api/ads/analytics/assets/${assetId}`)
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('asset_id', assetId);
      expect(response.body).toHaveProperty('creatives');
      expect(response.body).toHaveProperty('time_range', '30d');
      expect(response.body).toHaveProperty('calculated_at');
    });
  });

  describe('GET /api/ads/analytics/trends', () => {
    it('should return revenue trends with additional metrics', async () => {
      const response = await request(app)
        .get('/api/ads/analytics/trends')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('trends');
      expect(response.body).toHaveProperty('time_range', '30d');
      expect(response.body).toHaveProperty('calculated_at');
    });

    it('should handle 90d time range with weekly grouping', async () => {
      const response = await request(app)
        .get('/api/ads/analytics/trends?time_range=90d')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('trends');
      expect(response.body).toHaveProperty('additional_metrics');
      expect(response.body.additional_metrics).toHaveProperty('avg_daily_revenue');
      expect(response.body.additional_metrics).toHaveProperty('growth_rate');
    });
  });

  describe('GET /api/ads/analytics/geographic', () => {
    it('should return geographic performance data', async () => {
      const response = await request(app)
        .get('/api/ads/analytics/geographic')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('regions');
      expect(response.body).toHaveProperty('geographic_performance');
      expect(response.body).toHaveProperty('time_range', '30d');
      expect(response.body).toHaveProperty('calculated_at');
    });
  });

  describe('GET /api/ads/analytics/summary', () => {
    it('should return comprehensive analytics summary', async () => {
      const response = await request(app)
        .get('/api/ads/analytics/summary')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('real_time');
      expect(response.body).toHaveProperty('top_campaigns');
      expect(response.body).toHaveProperty('top_assets');
      expect(response.body).toHaveProperty('time_range', '24h');
      expect(response.body).toHaveProperty('calculated_at');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const response = await request(app)
        .get('/api/ads/analytics/campaigns?error=true')
        .set('Authorization', authToken);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Failed to fetch campaign analytics');
    });

    it('should handle analytics utility errors', async () => {
      const response = await request(app)
        .get('/api/ads/analytics/realtime?error=true')
        .set('Authorization', authToken);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Failed to fetch real-time analytics');
    });
  });

  describe('Performance Tests', () => {
    it('should complete analytics requests within reasonable time', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/ads/analytics/realtime')
        .set('Authorization', authToken);

      const duration = Date.now() - startTime;
      
      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle concurrent analytics requests', async () => {
      const requests = Array(5).fill().map(() => 
        request(app)
          .get('/api/ads/analytics/realtime')
          .set('Authorization', authToken)
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });

  describe('Input Validation', () => {
    it('should validate time range parameters', async () => {
      const response = await request(app)
        .get('/api/ads/analytics/trends?time_range=90d')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('additional_metrics');
    });

    it('should validate pagination parameters', async () => {
      const response = await request(app)
        .get('/api/ads/analytics/campaigns?limit=5&offset=10')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('campaigns');
    });
  });
}); 