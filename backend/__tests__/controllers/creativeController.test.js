const request = require('supertest');
const db = require('../../config/db');

describe('Creative Controller - Integration Tests', () => {
  let testUser, testAsset, testCreative, authToken;

  beforeAll(async () => {
    // Wait for server to be ready
    await global.testUtils.waitForServer();
    
    // Setup test data in real database
    testUser = await global.testUtils.createTestUser();
    testAsset = await global.testUtils.createTestAsset();
    authToken = `Bearer ${testUser.token || 'test-token'}`;
  });

  afterAll(async () => {
    // Cleanup test data from real database
    await global.testUtils.cleanup();
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
      const response = await request(global.testUtils.baseURL)
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
      
      const response = await request(global.testUtils.baseURL)
        .post('/api/creatives')
        .set('Authorization', authToken)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('asset_id, name, type, and content are required');
    });

    it('should reject creative with invalid type', async () => {
      const invalidData = { ...validCreativeData, type: 'invalid_type' };
      
      const response = await request(global.testUtils.baseURL)
        .post('/api/creatives')
        .set('Authorization', authToken)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid creative type');
    });

    it('should reject creative with non-existent asset', async () => {
      const invalidData = { ...validCreativeData, asset_id: 99999 };
      
      const response = await request(global.testUtils.baseURL)
        .post('/api/creatives')
        .set('Authorization', authToken)
        .send(invalidData);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Asset not found');
    });

    it('should validate creative dimensions match asset specifications', async () => {
      // Create asset with specific dimensions
      const assetWithDims = await global.testUtils.createTestAsset({
        dimensions: { width: 300, height: 250 }
      });

      const creativeWithWrongDims = {
        ...validCreativeData,
        asset_id: assetWithDims.id,
        dimensions: { width: 400, height: 300 }
      };

      const response = await request(global.testUtils.baseURL)
        .post('/api/creatives')
        .set('Authorization', authToken)
        .send(creativeWithWrongDims);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Creative dimensions do not match asset specifications');
    });
  });

  describe('GET /api/creatives', () => {
    beforeEach(async () => {
      // Create test creatives for this test suite
      testCreative = await global.testUtils.createTestCreative();
    });

    it('should return list of creatives', async () => {
      const response = await request(global.testUtils.baseURL)
        .get('/api/creatives')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('creatives');
      expect(Array.isArray(response.body.creatives)).toBe(true);
      expect(response.body.creatives.length).toBeGreaterThan(0);
    });

    it('should filter creatives by status', async () => {
      const response = await request(global.testUtils.baseURL)
        .get('/api/creatives?status=approved')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.creatives.every(c => c.status === 'approved')).toBe(true);
    });

    it('should filter creatives by asset_id', async () => {
      const response = await request(global.testUtils.baseURL)
        .get(`/api/creatives?asset_id=${testAsset.id}`)
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.creatives.every(c => c.asset_id === testAsset.id)).toBe(true);
    });
  });

  describe('GET /api/creatives/:id', () => {
    beforeEach(async () => {
      testCreative = await global.testUtils.createTestCreative();
    });

    it('should return creative by id', async () => {
      const response = await request(global.testUtils.baseURL)
        .get(`/api/creatives/${testCreative.id}`)
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(testCreative.id);
      expect(response.body.name).toBe(testCreative.name);
    });

    it('should return 404 for non-existent creative', async () => {
      const response = await request(global.testUtils.baseURL)
        .get('/api/creatives/99999')
        .set('Authorization', authToken);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Creative not found');
    });
  });

  describe('PUT /api/creatives/:id', () => {
    beforeEach(async () => {
      testCreative = await global.testUtils.createTestCreative();
    });

    it('should update creative with valid data', async () => {
      const updateData = {
        name: 'Updated Creative Name',
        status: 'approved'
      };

      const response = await request(global.testUtils.baseURL)
        .put(`/api/creatives/${testCreative.id}`)
        .set('Authorization', authToken)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.name).toBe(updateData.name);
      expect(response.body.status).toBe(updateData.status);
    });

    it('should reject update with invalid status', async () => {
      const invalidData = { status: 'invalid_status' };

      const response = await request(global.testUtils.baseURL)
        .put(`/api/creatives/${testCreative.id}`)
        .set('Authorization', authToken)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid status');
    });
  });

  describe('GET /api/creatives/:id/performance', () => {
    beforeEach(async () => {
      testCreative = await global.testUtils.createTestCreative();
    });

    it('should return creative performance metrics', async () => {
      const response = await request(global.testUtils.baseURL)
        .get(`/api/creatives/${testCreative.id}/performance`)
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('creative_id');
      expect(response.body).toHaveProperty('performance');
      expect(response.body.performance).toHaveProperty('impressions');
      expect(response.body.performance).toHaveProperty('clicks');
      expect(response.body.performance).toHaveProperty('revenue');
    });

    it('should return 404 for non-existent creative performance', async () => {
      const response = await request(global.testUtils.baseURL)
        .get('/api/creatives/99999/performance')
        .set('Authorization', authToken);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Creative not found');
    });
  });
}); 