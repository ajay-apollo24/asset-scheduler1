const request = require('supertest');
const app = require('../../server');
const { createTestUser } = require('../helpers/testHelpers');

// Mock the Analytics module
jest.mock('../../modules/ad-server/utils/analytics');
jest.mock('../../config/db');
jest.mock('../../modules/shared/utils/logger');

const Analytics = require('../../modules/ad-server/utils/analytics');
const db = require('../../config/db');

describe('Ad Routes Analytics Endpoints - Production Tests', () => {
  let testUser, authToken;

  beforeAll(async () => {
    testUser = await createTestUser();
    authToken = `Bearer ${testUser.token}`;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    // Cleanup
    await db.query('DELETE FROM users WHERE id = $1', [testUser.id]);
  });

  describe('GET /api/ads/analytics/realtime', () => {
    it('should return real-time analytics data', async () => {
      const mockRealTimeData = {
        impressions_per_minute: 250,
        revenue_per_hour: 45.5,
        fill_rate: 0.92,
        avg_response_time: 45.5,
        active_campaigns: 15,
        total_assets: 25,
        timestamp: '2024-01-01T12:00:00.000Z'
      };

      Analytics.getRealTimeMetrics.mockResolvedValue(mockRealTimeData);

      const response = await request(app)
        .get('/api/ads/analytics/realtime')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        ...mockRealTimeData,
        last_updated: expect.any(String)
      });
      expect(Analytics.getRealTimeMetrics).toHaveBeenCalledTimes(1);
    });

    it('should handle analytics errors gracefully', async () => {
      Analytics.getRealTimeMetrics.mockRejectedValue(new Error('Analytics error'));

      const response = await request(app)
        .get('/api/ads/analytics/realtime')
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
      const unauthorizedUser = await createTestUser({ role: 'user' });
      const unauthorizedToken = `Bearer ${unauthorizedUser.token}`;

      const response = await request(app)
        .get('/api/ads/analytics/realtime')
        .set('Authorization', unauthorizedToken);

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/ads/analytics/campaigns', () => {
    it('should return campaign analytics with performance data', async () => {
      const mockCampaignsData = {
        rows: [
          {
            id: 1,
            name: 'Test Campaign 1',
            budget: 1000.00,
            status: 'active',
            start_date: '2024-01-01',
            end_date: '2024-12-31',
            advertiser_id: 1
          },
          {
            id: 2,
            name: 'Test Campaign 2',
            budget: 2000.00,
            status: 'active',
            start_date: '2024-01-01',
            end_date: '2024-12-31',
            advertiser_id: 2
          }
        ]
      };

      const mockPerformanceData = {
        campaign_id: 1,
        campaign_name: 'Test Campaign 1',
        budget: 1000.00,
        total_impressions: 100000,
        total_clicks: 1500,
        total_revenue: 500.00,
        ctr: 1.5,
        budget_utilization: 50.0,
        cpm: 5.0,
        cpc: 0.33,
        time_range: '24h',
        calculated_at: '2024-01-01T12:00:00.000Z'
      };

      db.query.mockResolvedValue(mockCampaignsData);
      Analytics.getCampaignPerformance.mockResolvedValue(mockPerformanceData);

      const response = await request(app)
        .get('/api/ads/analytics/campaigns?timeRange=24h&limit=10&offset=0')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('campaigns');
      expect(response.body).toHaveProperty('summary');
      expect(response.body).toHaveProperty('time_range', '24h');
      expect(response.body).toHaveProperty('total_count', 2);
      expect(response.body).toHaveProperty('calculated_at');
      
      expect(response.body.campaigns).toHaveLength(2);
      expect(response.body.campaigns[0]).toHaveProperty('performance');
    });

    it('should handle pagination parameters', async () => {
      db.query.mockResolvedValue({ rows: [] });
      Analytics.getCampaignPerformance.mockResolvedValue({});

      const response = await request(app)
        .get('/api/ads/analytics/campaigns?limit=5&offset=10')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $1 OFFSET $2'),
        [5, 10]
      );
    });

    it('should calculate summary metrics correctly', async () => {
      const mockCampaignsData = {
        rows: [
          {
            id: 1,
            name: 'Campaign 1',
            budget: 1000.00,
            status: 'active'
          },
          {
            id: 2,
            name: 'Campaign 2',
            budget: 2000.00,
            status: 'active'
          }
        ]
      };

      const mockPerformance1 = {
        total_impressions: 100000,
        total_clicks: 1500,
        total_revenue: 500.00
      };

      const mockPerformance2 = {
        total_impressions: 200000,
        total_clicks: 3000,
        total_revenue: 1000.00
      };

      db.query.mockResolvedValue(mockCampaignsData);
      Analytics.getCampaignPerformance
        .mockResolvedValueOnce(mockPerformance1)
        .mockResolvedValueOnce(mockPerformance2);

      const response = await request(app)
        .get('/api/ads/analytics/campaigns')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.summary.total_impressions).toBe(300000);
      expect(response.body.summary.total_clicks).toBe(4500);
      expect(response.body.summary.total_revenue).toBe(1500.00);
      expect(response.body.summary.total_budget).toBe(3000.00);
      expect(response.body.summary.overall_ctr).toBe(1.5);
      expect(response.body.summary.budget_utilization).toBe(50.0);
    });
  });

  describe('GET /api/ads/analytics/creatives', () => {
    it('should return creative analytics with top performers', async () => {
      const mockTopCreatives = {
        creatives: [
          {
            creative_id: 1,
            creative_name: 'Top Creative',
            creative_type: 'image',
            status: 'approved',
            asset_name: 'Test Asset',
            campaign_name: 'Test Campaign',
            total_impressions: 50000,
            total_clicks: 750,
            total_revenue: 250.00,
            ctr: 1.5,
            cpm: 5.0
          }
        ],
        time_range: '7d',
        limit: 10,
        calculated_at: '2024-01-01T12:00:00.000Z'
      };

      const mockStats = {
        rows: [{
          total_creatives: 100,
          approved_creatives: 80,
          pending_creatives: 15,
          rejected_creatives: 5
        }]
      };

      Analytics.getTopPerformingCreatives.mockResolvedValue(mockTopCreatives);
      db.query.mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/api/ads/analytics/creatives?timeRange=7d&limit=10')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('creatives');
      expect(response.body).toHaveProperty('statistics');
      expect(response.body).toHaveProperty('time_range', '7d');
      expect(response.body).toHaveProperty('limit', 10);
      expect(response.body).toHaveProperty('calculated_at');
      
      expect(Analytics.getTopPerformingCreatives).toHaveBeenCalledWith(10, '7d');
    });
  });

  describe('GET /api/ads/analytics/assets/:id', () => {
    it('should return asset-specific analytics', async () => {
      const assetId = 1;
      const mockAssetPerformance = {
        asset_id: assetId,
        asset_name: 'Test Asset',
        location: 'New York',
        asset_type: 'billboard',
        impressions_per_day: 1000,
        value_per_day: 50.00,
        total_impressions: 30000,
        total_clicks: 450,
        total_revenue: 150.00,
        ctr: 1.5,
        cpm: 5.0,
        total_creatives: 3,
        total_campaigns: 2,
        time_range: '30d',
        calculated_at: '2024-01-01T12:00:00.000Z'
      };

      const mockCreativesData = {
        rows: [
          {
            id: 1,
            name: 'Creative 1',
            type: 'image',
            status: 'approved',
            campaign_name: 'Campaign 1',
            impressions: 15000,
            clicks: 225,
            revenue: 75.00
          }
        ]
      };

      Analytics.getAssetPerformance.mockResolvedValue(mockAssetPerformance);
      db.query.mockResolvedValue(mockCreativesData);

      const response = await request(app)
        .get(`/api/ads/analytics/assets/${assetId}?timeRange=30d`)
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('asset_id', assetId);
      expect(response.body).toHaveProperty('creatives');
      expect(response.body).toHaveProperty('time_range', '30d');
      expect(response.body).toHaveProperty('calculated_at');
      
      expect(Analytics.getAssetPerformance).toHaveBeenCalledWith(assetId, '30d');
    });
  });

  describe('GET /api/ads/analytics/trends', () => {
    it('should return revenue trends with additional metrics', async () => {
      const mockRevenueTrends = {
        trends: [
          {
            period: '2024-01-01',
            impressions: 10000,
            clicks: 150,
            revenue: 50.00,
            ctr: 1.5
          }
        ],
        time_range: '30d',
        calculated_at: '2024-01-01T12:00:00.000Z'
      };

      const mockAdditionalTrends = {
        rows: [
          {
            period: '2024-01-01',
            active_campaigns: 5,
            active_assets: 10,
            active_creatives: 25
          }
        ]
      };

      Analytics.getRevenueTrends.mockResolvedValue(mockRevenueTrends);
      db.query.mockResolvedValue(mockAdditionalTrends);

      const response = await request(app)
        .get('/api/ads/analytics/trends?timeRange=30d')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('trends');
      expect(response.body).toHaveProperty('additional_metrics');
      expect(response.body).toHaveProperty('time_range', '30d');
      expect(response.body).toHaveProperty('calculated_at');
      
      expect(Analytics.getRevenueTrends).toHaveBeenCalledWith('30d');
    });

    it('should handle 90d time range with weekly grouping', async () => {
      Analytics.getRevenueTrends.mockResolvedValue({ trends: [], time_range: '90d' });
      db.query.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .get('/api/ads/analytics/trends?timeRange=90d')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('DATE_TRUNC'),
        expect.any(Array)
      );
    });
  });

  describe('GET /api/ads/analytics/geographic', () => {
    it('should return geographic performance data', async () => {
      const mockGeographicData = {
        geographic_performance: [
          {
            location: 'New York',
            impressions: 50000,
            clicks: 750,
            revenue: 250.00,
            ctr: 1.5
          },
          {
            location: 'Los Angeles',
            impressions: 30000,
            clicks: 450,
            revenue: 150.00,
            ctr: 1.5
          }
        ],
        time_range: '30d',
        calculated_at: '2024-01-01T12:00:00.000Z'
      };

      Analytics.getGeographicPerformance.mockResolvedValue(mockGeographicData);

      const response = await request(app)
        .get('/api/ads/analytics/geographic?timeRange=30d')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('geographic_performance');
      expect(response.body).toHaveProperty('time_range', '30d');
      expect(response.body).toHaveProperty('calculated_at');
      
      expect(Analytics.getGeographicPerformance).toHaveBeenCalledWith('30d');
    });
  });

  describe('GET /api/ads/analytics/summary', () => {
    it('should return comprehensive analytics summary', async () => {
      const mockRealTimeData = {
        impressions_per_minute: 250,
        revenue_per_hour: 45.5,
        fill_rate: 0.92,
        avg_response_time: 45.5,
        active_campaigns: 15,
        total_assets: 25,
        timestamp: '2024-01-01T12:00:00.000Z'
      };

      const mockTopCampaigns = {
        rows: [
          {
            id: 1,
            name: 'Top Campaign',
            budget: 1000.00,
            impressions: 50000,
            clicks: 750,
            revenue: 250.00
          }
        ]
      };

      const mockTopAssets = {
        rows: [
          {
            id: 1,
            name: 'Top Asset',
            location: 'New York',
            impressions: 30000,
            clicks: 450,
            revenue: 150.00
          }
        ]
      };

      Analytics.getRealTimeMetrics.mockResolvedValue(mockRealTimeData);
      db.query
        .mockResolvedValueOnce(mockTopCampaigns)
        .mockResolvedValueOnce(mockTopAssets);

      const response = await request(app)
        .get('/api/ads/analytics/summary?timeRange=24h')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('real_time');
      expect(response.body).toHaveProperty('top_campaigns');
      expect(response.body).toHaveProperty('top_assets');
      expect(response.body).toHaveProperty('time_range', '24h');
      expect(response.body).toHaveProperty('calculated_at');
      
      expect(Analytics.getRealTimeMetrics).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      db.query.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/ads/analytics/campaigns')
        .set('Authorization', authToken);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Failed to fetch campaign analytics');
    });

    it('should handle analytics utility errors', async () => {
      Analytics.getRealTimeMetrics.mockRejectedValue(new Error('Analytics error'));

      const response = await request(app)
        .get('/api/ads/analytics/realtime')
        .set('Authorization', authToken);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Failed to fetch real-time analytics');
    });
  });

  describe('Performance Tests', () => {
    it('should complete analytics requests within reasonable time', async () => {
      Analytics.getRealTimeMetrics.mockResolvedValue({
        impressions_per_minute: 250,
        revenue_per_hour: 45.5,
        fill_rate: 0.92,
        avg_response_time: 45.5,
        active_campaigns: 15,
        total_assets: 25,
        timestamp: '2024-01-01T12:00:00.000Z'
      });

      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/ads/analytics/realtime')
        .set('Authorization', authToken);

      const duration = Date.now() - startTime;
      
      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
    });

    it('should handle concurrent analytics requests', async () => {
      Analytics.getRealTimeMetrics.mockResolvedValue({
        impressions_per_minute: 250,
        revenue_per_hour: 45.5,
        fill_rate: 0.92,
        avg_response_time: 45.5,
        active_campaigns: 15,
        total_assets: 25,
        timestamp: '2024-01-01T12:00:00.000Z'
      });

      const concurrentRequests = 5;
      const promises = [];

      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          request(app)
            .get('/api/ads/analytics/realtime')
            .set('Authorization', authToken)
        );
      }

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });

  describe('Input Validation', () => {
    it('should validate time range parameters', async () => {
      const validTimeRanges = ['1h', '24h', '7d', '30d', '90d'];
      
      for (const timeRange of validTimeRanges) {
        Analytics.getRealTimeMetrics.mockResolvedValue({});
        
        const response = await request(app)
          .get(`/api/ads/analytics/realtime?timeRange=${timeRange}`)
          .set('Authorization', authToken);

        expect(response.status).toBe(200);
      }
    });

    it('should validate pagination parameters', async () => {
      db.query.mockResolvedValue({ rows: [] });
      Analytics.getCampaignPerformance.mockResolvedValue({});

      const response = await request(app)
        .get('/api/ads/analytics/campaigns?limit=invalid&offset=invalid')
        .set('Authorization', authToken);

      // Should handle invalid pagination gracefully
      expect([200, 400]).toContain(response.status);
    });
  });
}); 