const Analytics = require('../../modules/ad-server/utils/analytics');
const db = require('../../config/db');

// Mock the database module
jest.mock('../../config/db');
jest.mock('../../modules/shared/utils/logger');

describe('Analytics Utilities - Production Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getRealTimeMetrics', () => {
    it('should calculate real-time metrics correctly', async () => {
      // Mock database responses
      db.query
        .mockResolvedValueOnce({ rows: [{ count: 1250 }] }) // impressions
        .mockResolvedValueOnce({ rows: [{ total_revenue: 1092.00 }] }) // revenue
        .mockResolvedValueOnce({ rows: [{ count: 1358 }] }) // requests
        .mockResolvedValueOnce({ rows: [{ avg_response_time: 45.5 }] }) // response time
        .mockResolvedValueOnce({ rows: [{ count: 15 }] }) // active campaigns
        .mockResolvedValueOnce({ rows: [{ count: 25 }] }); // total assets

      const metrics = await Analytics.getRealTimeMetrics();

      expect(metrics).toEqual({
        impressions_per_minute: 250,
        revenue_per_hour: 45.5,
        fill_rate: 0.92,
        avg_response_time: 45.5,
        active_campaigns: 15,
        total_assets: 25,
        timestamp: expect.any(String)
      });

      expect(db.query).toHaveBeenCalledTimes(6);
    });

    it('should handle zero values gracefully', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ count: 0 }] })
        .mockResolvedValueOnce({ rows: [{ total_revenue: 0 }] })
        .mockResolvedValueOnce({ rows: [{ count: 0 }] })
        .mockResolvedValueOnce({ rows: [{ avg_response_time: null }] })
        .mockResolvedValueOnce({ rows: [{ count: 0 }] })
        .mockResolvedValueOnce({ rows: [{ count: 0 }] });

      const metrics = await Analytics.getRealTimeMetrics();

      expect(metrics.fill_rate).toBe(0);
      expect(metrics.avg_response_time).toBe(0);
      expect(metrics.impressions_per_minute).toBe(0);
      expect(metrics.revenue_per_hour).toBe(0);
    });

    it('should handle database errors gracefully', async () => {
      db.query.mockRejectedValue(new Error('Database connection failed'));

      await expect(Analytics.getRealTimeMetrics()).rejects.toThrow('Database connection failed');
    });
  });

  describe('getCampaignPerformance', () => {
    it('should calculate campaign performance for 24h time range', async () => {
      const mockCampaignData = {
        rows: [{
          campaign_id: 1,
          campaign_name: 'Test Campaign',
          budget: 1000.00,
          total_impressions: 100000,
          total_clicks: 1500,
          total_revenue: 500.00,
          ctr: 1.5,
          budget_utilization: 50.0,
          cpm: 5.0,
          cpc: 0.33
        }]
      };

      db.query.mockResolvedValue(mockCampaignData);

      const performance = await Analytics.getCampaignPerformance(1, '24h');

      expect(performance).toEqual({
        campaign_id: 1,
        campaign_name: 'Test Campaign',
        budget: 1000.00,
        total_impressions: 100000,
        total_clicks: 1500,
        total_revenue: 500.00,
        ctr: 1.5,
        budget_utilization: 50.0,
        cpm: 5.0,
        cpc: 0.33,
        time_range: '24h',
        calculated_at: expect.any(String)
      });
    });

    it('should handle different time ranges correctly', async () => {
      const timeRanges = ['1h', '24h', '7d', '30d'];
      
      for (const timeRange of timeRanges) {
        db.query.mockResolvedValue({ rows: [{}] });
        
        const performance = await Analytics.getCampaignPerformance(1, timeRange);
        
        expect(performance.time_range).toBe(timeRange);
      }
    });

    it('should return default values for non-existent campaign', async () => {
      db.query.mockResolvedValue({ rows: [] });

      const performance = await Analytics.getCampaignPerformance(999, '24h');

      expect(performance).toEqual({
        campaign_id: 999,
        campaign_name: 'Unknown Campaign',
        budget: 0,
        total_impressions: 0,
        total_clicks: 0,
        total_revenue: 0,
        ctr: 0,
        budget_utilization: 0,
        cpm: 0,
        cpc: 0,
        time_range: '24h',
        calculated_at: expect.any(String)
      });
    });
  });

  describe('getTopPerformingCreatives', () => {
    it('should return top performing creatives', async () => {
      const mockCreativesData = {
        rows: [
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
        ]
      };

      db.query.mockResolvedValue(mockCreativesData);

      const result = await Analytics.getTopPerformingCreatives(10, '7d');

      expect(result).toEqual({
        creatives: mockCreativesData.rows,
        time_range: '7d',
        limit: 10,
        calculated_at: expect.any(String)
      });
    });

    it('should respect the limit parameter', async () => {
      db.query.mockResolvedValue({ rows: [] });

      await Analytics.getTopPerformingCreatives(5, '7d');

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $1'),
        [5]
      );
    });
  });

  describe('getAssetPerformance', () => {
    it('should return asset performance metrics', async () => {
      const mockAssetData = {
        rows: [{
          asset_id: 1,
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
          total_campaigns: 2
        }]
      };

      db.query.mockResolvedValue(mockAssetData);

      const performance = await Analytics.getAssetPerformance(1, '30d');

      expect(performance).toEqual({
        asset_id: 1,
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
        calculated_at: expect.any(String)
      });
    });

    it('should return default values for non-existent asset', async () => {
      db.query.mockResolvedValue({ rows: [] });

      const performance = await Analytics.getAssetPerformance(999, '30d');

      expect(performance.asset_id).toBe(999);
      expect(performance.asset_name).toBe('Unknown Asset');
      expect(performance.total_impressions).toBe(0);
    });
  });

  describe('getRevenueTrends', () => {
    it('should return revenue trends for 30d time range', async () => {
      const mockTrendsData = {
        rows: [
          {
            period: '2024-01-01',
            impressions: 10000,
            clicks: 150,
            revenue: 50.00,
            ctr: 1.5
          }
        ]
      };

      db.query.mockResolvedValue(mockTrendsData);

      const trends = await Analytics.getRevenueTrends('30d');

      expect(trends).toEqual({
        trends: mockTrendsData.rows,
        time_range: '30d',
        calculated_at: expect.any(String)
      });
    });

    it('should handle 90d time range with weekly grouping', async () => {
      const mockTrendsData = {
        rows: [
          {
            period: '2024-01-01 00:00:00',
            impressions: 70000,
            clicks: 1050,
            revenue: 350.00,
            ctr: 1.5
          }
        ]
      };

      db.query.mockResolvedValue(mockTrendsData);

      const trends = await Analytics.getRevenueTrends('90d');

      expect(trends.time_range).toBe('90d');
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('DATE_TRUNC'),
        []
      );
    });
  });

  describe('getGeographicPerformance', () => {
    it('should return geographic performance data', async () => {
      const mockGeoData = {
        rows: [
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
        ]
      };

      db.query.mockResolvedValue(mockGeoData);

      const geoPerformance = await Analytics.getGeographicPerformance('30d');

      expect(geoPerformance).toEqual({
        geographic_performance: mockGeoData.rows,
        time_range: '30d',
        calculated_at: expect.any(String)
      });
    });

    it('should order results by revenue descending', async () => {
      db.query.mockResolvedValue({ rows: [] });

      await Analytics.getGeographicPerformance('30d');

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY revenue DESC'),
        expect.any(Array)
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors in all methods', async () => {
      const methods = [
        () => Analytics.getRealTimeMetrics(),
        () => Analytics.getCampaignPerformance(1, '24h'),
        () => Analytics.getTopPerformingCreatives(10, '7d'),
        () => Analytics.getAssetPerformance(1, '30d'),
        () => Analytics.getRevenueTrends('30d'),
        () => Analytics.getGeographicPerformance('30d')
      ];

      for (const method of methods) {
        db.query.mockRejectedValue(new Error('Database error'));
        await expect(method()).rejects.toThrow('Database error');
      }
    });

    it('should handle null database responses', async () => {
      db.query.mockResolvedValue({ rows: null });

      await expect(Analytics.getRealTimeMetrics()).rejects.toThrow();
    });
  });

  describe('Performance Tests', () => {
    it('should complete real-time metrics calculation within reasonable time', async () => {
      const startTime = Date.now();
      
      db.query
        .mockResolvedValue({ rows: [{ count: 1000 }] })
        .mockResolvedValue({ rows: [{ total_revenue: 1000 }] })
        .mockResolvedValue({ rows: [{ count: 1100 }] })
        .mockResolvedValue({ rows: [{ avg_response_time: 50 }] })
        .mockResolvedValue({ rows: [{ count: 10 }] })
        .mockResolvedValue({ rows: [{ count: 20 }] });

      await Analytics.getRealTimeMetrics();
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle concurrent analytics requests', async () => {
      db.query.mockResolvedValue({ rows: [{ count: 1000 }] });

      const concurrentRequests = 5;
      const promises = [];

      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(Analytics.getRealTimeMetrics());
      }

      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(concurrentRequests);
      results.forEach(result => {
        expect(result).toHaveProperty('impressions_per_minute');
        expect(result).toHaveProperty('revenue_per_hour');
      });
    });
  });

  describe('Data Validation', () => {
    it('should validate time range parameters', async () => {
      const validTimeRanges = ['1h', '24h', '7d', '30d', '90d'];
      
      for (const timeRange of validTimeRanges) {
        db.query.mockResolvedValue({ rows: [] });
        
        // These should not throw errors
        await expect(Analytics.getCampaignPerformance(1, timeRange)).resolves.toBeDefined();
        await expect(Analytics.getTopPerformingCreatives(10, timeRange)).resolves.toBeDefined();
        await expect(Analytics.getAssetPerformance(1, timeRange)).resolves.toBeDefined();
        await expect(Analytics.getRevenueTrends(timeRange)).resolves.toBeDefined();
        await expect(Analytics.getGeographicPerformance(timeRange)).resolves.toBeDefined();
      }
    });

    it('should handle invalid time ranges gracefully', async () => {
      db.query.mockResolvedValue({ rows: [] });
      
      // Should default to 24h for campaign performance
      await expect(Analytics.getCampaignPerformance(1, 'invalid')).resolves.toBeDefined();
      
      // Should default to 7d for top creatives
      await expect(Analytics.getTopPerformingCreatives(10, 'invalid')).resolves.toBeDefined();
      
      // Should default to 30d for asset performance
      await expect(Analytics.getAssetPerformance(1, 'invalid')).resolves.toBeDefined();
    });
  });
}); 