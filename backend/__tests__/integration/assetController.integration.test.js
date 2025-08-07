/**
 * Integration Tests for Asset Controller
 * These tests run against a real server and database
 * 
 * To run these tests:
 * 1. Start the server: npm start
 * 2. Run: TEST_MODE=integration npm test -- --testPathPattern="assetController.integration.test.js"
 */

describe('Asset Controller - Integration Tests', () => {
  let authToken;
  let testAssetId;

  beforeAll(async () => {
    await global.testUtils.setupTestDatabase();
    
    // Create a test user and get authentication token
    try {
      // Create a test user for integration tests
      const testUser = await global.testUtils.createTestUser({
        email: 'integration-test@example.com',
        role: 'admin'
      });
      
      // Try to login to get a proper token
      try {
        const loginResponse = await global.testUtils.loginUser(testUser.email, 'password123');
        authToken = loginResponse.token;
      } catch (loginError) {
        console.log('⚠️  Login failed, using generated token:', loginError.message);
        // Fallback to generated token if login fails
        authToken = global.testUtils.generateToken(testUser);
      }
    } catch (error) {
      console.log('⚠️  User creation failed, using fallback token:', error.message);
      // Fallback to generated token if user creation fails
      const testUser = {
        id: 1,
        email: 'integration-test@example.com',
        organization_id: 1,
        roles: ['admin']
      };
      authToken = global.testUtils.generateToken(testUser);
    }
  });

  afterAll(async () => {
    if (global.testUtils.isIntegrationMode) {
      await global.testUtils.cleanup();
    }
  });

  describe('GET /api/assets', () => {
    it('should return all assets when authenticated', async () => {
      if (!global.testUtils.isIntegrationMode) {
        console.log('⏭️  Skipping integration test');
        return;
      }

      const response = await global.testUtils.makeRequest('GET', '/api/assets', null, authToken);
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('assets');
      expect(Array.isArray(response.data.assets)).toBe(true);
      expect(response.data.assets.length).toBeGreaterThan(0);
      
      // Verify asset structure
      const asset = response.data.assets[0];
      expect(asset).toHaveProperty('id');
      expect(asset).toHaveProperty('name');
      expect(asset).toHaveProperty('type');
      expect(asset).toHaveProperty('location');
      expect(asset).toHaveProperty('level');
    });

    it('should return 401 when not authenticated', async () => {
      if (!global.testUtils.isIntegrationMode) {
        console.log('⏭️  Skipping integration test');
        return;
      }

      const response = await global.testUtils.makeRequest('GET', '/api/assets');
      
      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/assets', () => {
    it('should create a new asset when authenticated', async () => {
      if (!global.testUtils.isIntegrationMode) {
        console.log('⏭️  Skipping integration test');
        return;
      }

      const newAsset = {
        name: 'Integration Test Asset',
        type: 'billboard',
        location: 'Test Location',
        level: 'secondary',
        max_slots: 2,
        importance: 3,
        impressions_per_day: 10000,
        value_per_day: 500.00
      };

      const response = await global.testUtils.makeRequest('POST', '/api/assets', newAsset, authToken);
      
      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('asset');
      expect(response.data.asset.name).toBe(newAsset.name);
      expect(response.data.asset.type).toBe(newAsset.type);
      
      // Store for cleanup
      testAssetId = response.data.asset.id;
    });

    it('should return 400 when required fields are missing', async () => {
      if (!global.testUtils.isIntegrationMode) {
        console.log('⏭️  Skipping integration test');
        return;
      }

      const invalidAsset = {
        name: 'Invalid Asset'
        // Missing required fields
      };

      const response = await global.testUtils.makeRequest('POST', '/api/assets', invalidAsset, authToken);
      
      expect(response.status).toBe(400);
      expect(response.data).toHaveProperty('message');
    });
  });

  describe('GET /api/assets/:id', () => {
    it('should return specific asset by ID', async () => {
      if (!global.testUtils.isIntegrationMode) {
        console.log('⏭️  Skipping integration test');
        return;
      }

      // First get all assets to get an ID
      const assetsResponse = await global.testUtils.makeRequest('GET', '/api/assets', null, authToken);
      const assetId = assetsResponse.data.assets[0].id;

      const response = await global.testUtils.makeRequest('GET', `/api/assets/${assetId}`, null, authToken);
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('asset');
      expect(response.data.asset.id).toBe(assetId);
    });

    it('should return 404 for non-existent asset', async () => {
      if (!global.testUtils.isIntegrationMode) {
        console.log('⏭️  Skipping integration test');
        return;
      }

      const response = await global.testUtils.makeRequest('GET', '/api/assets/99999', null, authToken);
      
      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/assets/:id', () => {
    it('should update an existing asset', async () => {
      if (!global.testUtils.isIntegrationMode) {
        console.log('⏭️  Skipping integration test');
        return;
      }

      // First get all assets to get an ID
      const assetsResponse = await global.testUtils.makeRequest('GET', '/api/assets', null, authToken);
      const assetId = assetsResponse.data.assets[0].id;

      const updateData = {
        name: 'Updated Asset Name',
        value_per_day: 750.00
      };

      const response = await global.testUtils.makeRequest('PUT', `/api/assets/${assetId}`, updateData, authToken);
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('asset');
      expect(response.data.asset.name).toBe(updateData.name);
      expect(response.data.asset.value_per_day).toBe(updateData.value_per_day);
    });
  });

  describe('DELETE /api/assets/:id', () => {
    it('should delete an asset', async () => {
      if (!global.testUtils.isIntegrationMode) {
        console.log('⏭️  Skipping integration test');
        return;
      }

      // First create an asset to delete
      const newAsset = {
        name: 'Asset to Delete',
        type: 'billboard',
        location: 'Test Location',
        level: 'secondary',
        max_slots: 1,
        importance: 1,
        impressions_per_day: 5000,
        value_per_day: 250.00
      };

      const createResponse = await global.testUtils.makeRequest('POST', '/api/assets', newAsset, authToken);
      const assetId = createResponse.data.asset.id;

      // Now delete it
      const response = await global.testUtils.makeRequest('DELETE', `/api/assets/${assetId}`, null, authToken);
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('message');
      expect(response.data.message).toContain('deleted');
    });
  });
}); 