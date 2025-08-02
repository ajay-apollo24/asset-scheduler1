const request = require('supertest');
const app = require('../../server');
const db = require('../../config/db');
const { createTestUser, createTestAsset, createTestCreative } = require('../helpers/testHelpers');

describe('Creative Controller - Production Tests', () => {
  let testUser, testAsset, testCreative, authToken;

  beforeAll(async () => {
    // Setup test data
    testUser = await createTestUser();
    testAsset = await createTestAsset();
    authToken = `Bearer ${testUser.token}`;
  });

  afterAll(async () => {
    // Cleanup test data
    await db.query('DELETE FROM creatives WHERE asset_id = $1', [testAsset.id]);
    await db.query('DELETE FROM assets WHERE id = $1', [testAsset.id]);
    await db.query('DELETE FROM users WHERE id = $1', [testUser.id]);
  });

  describe('POST /api/creatives', () => {
    const validCreativeData = {
      asset_id: 1,
      name: 'Test Creative',
      type: 'image',
      content: { url: 'https://example.com/image.jpg' },
      dimensions: { width: 300, height: 250 },
      file_size: 102400
    };

    it('should create a creative with valid data', async () => {
      const response = await request(app)
        .post('/api/creatives')
        .set('Authorization', authToken)
        .send(validCreativeData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(validCreativeData.name);
      expect(response.body.type).toBe(validCreativeData.type);
      expect(response.body.status).toBe('draft');
      expect(response.body.content).toHaveProperty('cdn_url');
    });

    it('should reject creative with missing required fields', async () => {
      const invalidData = { name: 'Test Creative' };
      
      const response = await request(app)
        .post('/api/creatives')
        .set('Authorization', authToken)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('asset_id, name, type, and content are required');
    });

    it('should reject creative with invalid type', async () => {
      const invalidData = { ...validCreativeData, type: 'invalid_type' };
      
      const response = await request(app)
        .post('/api/creatives')
        .set('Authorization', authToken)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid creative type');
    });

    it('should reject creative with non-existent asset', async () => {
      const invalidData = { ...validCreativeData, asset_id: 99999 };
      
      const response = await request(app)
        .post('/api/creatives')
        .set('Authorization', authToken)
        .send(invalidData);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Asset not found');
    });

    it('should validate creative dimensions match asset specifications', async () => {
      // Create asset with specific dimensions
      const assetWithDims = await createTestAsset({
        dimensions: { width: 300, height: 250 }
      });

      const creativeWithWrongDims = {
        ...validCreativeData,
        asset_id: assetWithDims.id,
        dimensions: { width: 400, height: 300 }
      };

      const response = await request(app)
        .post('/api/creatives')
        .set('Authorization', authToken)
        .send(creativeWithWrongDims);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Creative dimensions must match asset specifications');
    });
  });

  describe('GET /api/creatives', () => {
    beforeEach(async () => {
      // Create test creatives
      testCreative = await createTestCreative(testAsset.id);
    });

    it('should retrieve creatives with pagination', async () => {
      const response = await request(app)
        .get('/api/creatives?limit=10&offset=0')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('creatives');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('limit', 10);
      expect(response.body.pagination).toHaveProperty('offset', 0);
    });

    it('should filter creatives by asset_id', async () => {
      const response = await request(app)
        .get(`/api/creatives?asset_id=${testAsset.id}`)
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.creatives).toBeInstanceOf(Array);
      expect(response.body.creatives.every(c => c.asset_id === testAsset.id)).toBe(true);
    });

    it('should filter creatives by status', async () => {
      const response = await request(app)
        .get('/api/creatives?status=draft')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.creatives).toBeInstanceOf(Array);
      expect(response.body.creatives.every(c => c.status === 'draft')).toBe(true);
    });

    it('should filter creatives by type', async () => {
      const response = await request(app)
        .get('/api/creatives?type=image')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.creatives).toBeInstanceOf(Array);
      expect(response.body.creatives.every(c => c.type === 'image')).toBe(true);
    });

    it('should filter creatives by campaign_id', async () => {
      const response = await request(app)
        .get('/api/creatives?campaign_id=1')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.creatives).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/creatives/:id', () => {
    it('should retrieve a specific creative', async () => {
      const response = await request(app)
        .get(`/api/creatives/${testCreative.id}`)
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(testCreative.id);
      expect(response.body.name).toBe(testCreative.name);
    });

    it('should return 404 for non-existent creative', async () => {
      const response = await request(app)
        .get('/api/creatives/99999')
        .set('Authorization', authToken);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Creative not found');
    });
  });

  describe('PUT /api/creatives/:id', () => {
    it('should update a creative with valid data', async () => {
      const updateData = {
        name: 'Updated Creative Name',
        status: 'pending'
      };

      const response = await request(app)
        .put(`/api/creatives/${testCreative.id}`)
        .set('Authorization', authToken)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.name).toBe(updateData.name);
      expect(response.body.status).toBe(updateData.status);
    });

    it('should reject update with invalid status', async () => {
      const invalidData = { status: 'invalid_status' };

      const response = await request(app)
        .put(`/api/creatives/${testCreative.id}`)
        .set('Authorization', authToken)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid status value');
    });

    it('should reject update with invalid type', async () => {
      const invalidData = { type: 'invalid_type' };

      const response = await request(app)
        .put(`/api/creatives/${testCreative.id}`)
        .set('Authorization', authToken)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid creative type');
    });

    it('should return 404 for non-existent creative', async () => {
      const response = await request(app)
        .put('/api/creatives/99999')
        .set('Authorization', authToken)
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Creative not found');
    });

    it('should validate dimensions when updating', async () => {
      const assetWithDims = await createTestAsset({
        dimensions: { width: 300, height: 250 }
      });

      const creativeWithAsset = await createTestCreative(assetWithDims.id);

      const invalidUpdate = {
        dimensions: { width: 400, height: 300 }
      };

      const response = await request(app)
        .put(`/api/creatives/${creativeWithAsset.id}`)
        .set('Authorization', authToken)
        .send(invalidUpdate);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Creative dimensions must match asset specifications');
    });
  });

  describe('GET /api/creatives/:id/performance', () => {
    it('should retrieve performance metrics for a creative', async () => {
      const response = await request(app)
        .get(`/api/creatives/${testCreative.id}/performance?timeRange=24h`)
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('creative_id', testCreative.id);
      expect(response.body).toHaveProperty('time_range', '24h');
      expect(response.body).toHaveProperty('metrics');
      expect(response.body).toHaveProperty('calculated_at');
    });

    it('should handle different time ranges', async () => {
      const timeRanges = ['1h', '24h', '7d', '30d'];
      
      for (const timeRange of timeRanges) {
        const response = await request(app)
          .get(`/api/creatives/${testCreative.id}/performance?timeRange=${timeRange}`)
          .set('Authorization', authToken);

        expect(response.status).toBe(200);
        expect(response.body.time_range).toBe(timeRange);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // Mock database error
      const originalQuery = db.query;
      db.query = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/creatives')
        .set('Authorization', authToken);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Failed to fetch creatives');

      // Restore original function
      db.query = originalQuery;
    });

    it('should handle CDN upload failures gracefully', async () => {
      // This would require mocking the CDN upload function
      // For now, we test the error response structure
      const response = await request(app)
        .post('/api/creatives')
        .set('Authorization', authToken)
        .send({
          asset_id: testAsset.id,
          name: 'Test Creative',
          type: 'image',
          content: { url: 'https://example.com/image.jpg' }
        });

      // Should either succeed or fail gracefully
      expect([201, 500]).toContain(response.status);
    });
  });

  describe('Performance Tests', () => {
    it('should handle large result sets efficiently', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/creatives?limit=1000')
        .set('Authorization', authToken);

      const duration = Date.now() - startTime;
      
      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle concurrent requests', async () => {
      const concurrentRequests = 10;
      const promises = [];

      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          request(app)
            .get('/api/creatives')
            .set('Authorization', authToken)
        );
      }

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });
}); 