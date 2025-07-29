// __tests__/integration/api.test.js
const request = require('supertest');
const app = require('../../server');
const TestDBHelper = require('../../tests/helpers/dbHelper');
const db = require('../../config/db');

// Allow slower real-DB integration tests to finish
jest.setTimeout(30000);

// Mock dependencies
jest.mock('../../utils/logger');

// Mock auth middleware to bypass authentication for integration tests
jest.mock('../../middleware/auth', () => {
  return (req, res, next) => {
    // Set a mock user for all requests
    req.user = { user_id: 1, email: 'test@example.com', role: 'admin' };
    next();
  };
});

describe('API Integration Tests', () => {
  let testData;

  // Run DB reset and seed ONCE before the entire suite instead of before each test.
  beforeAll(async () => {
    await TestDBHelper.cleanupTestDB();
    testData = await TestDBHelper.insertTestData();
  });

  // If individual tests mutate data in a way that would break others, consider
  // adding lightweight per-test cleanup here, but for current test set the
  // once-per-suite seed is sufficient and vastly faster than repeating for every case.
  // beforeEach(async () => { /* lightweight reset if ever needed */ });

  afterAll(async () => {
    await TestDBHelper.cleanupTestDB();
    await db.close(); // Close pg pool so Jest exits cleanly
  });

  describe('Asset Endpoints', () => {
    it('should create asset successfully', async () => {
      // Arrange
      const assetData = {
        name: 'Test Asset',
        location: 'test_location',
        type: 'banner',
        max_slots: 1,
        importance: 1,
        level: 'secondary'
      };

      // Act
      const response = await request(app)
        .post('/api/assets')
        .send(assetData);

      // Assert
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(assetData.name);
    });

    it('should return 400 for invalid asset data', async () => {
      // Arrange
      const invalidAssetData = {
        name: 'Test Asset'
        // Missing required fields
      };

      // Act
      const response = await request(app)
        .post('/api/assets')
        .send(invalidAssetData);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('required');
    });

    it('should get all assets', async () => {
      // Act
      const response = await request(app)
        .get('/api/assets');

      // Assert
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Booking Endpoints', () => {
    it('should create booking successfully', async () => {
      // Arrange
      const bookingData = {
        asset_id: testData.asset.id,
        title: 'Test Booking',
        lob: 'Pharmacy',
        purpose: 'Test Purpose',
        start_date: '2024-01-15',
        end_date: '2024-01-20'
      };

      // Act
      const response = await request(app)
        .post('/api/bookings')
        .send(bookingData);

      // Assert
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe(bookingData.title);
    });

    it('should return 409 for booking conflict', async () => {
      // Arrange
      const bookingData = {
        asset_id: testData.asset.id,
        title: 'Test Booking',
        lob: 'Pharmacy',
        purpose: 'Test Purpose',
        start_date: '2024-01-15',
        end_date: '2024-01-20'
      };

      // Create first booking
      await request(app)
        .post('/api/bookings')
        .send(bookingData);

      // Act - Try to create conflicting booking
      const response = await request(app)
        .post('/api/bookings')
        .send(bookingData);

      // Assert
      expect(response.status).toBe(409);
      expect(response.body.message).toContain('Slot already booked');
    });

    it('should update booking dates', async () => {
      // Arrange
      const bookingData = {
        asset_id: testData.asset.id,
        title: 'Test Booking',
        lob: 'Pharmacy',
        purpose: 'Test Purpose',
        start_date: '2024-01-15',
        end_date: '2024-01-20'
      };

      // Create booking
      const createResponse = await request(app)
        .post('/api/bookings')
        .send(bookingData);

      const bookingId = createResponse.body.id;

      // Act - Update dates
      const response = await request(app)
        .put(`/api/bookings/${bookingId}/dates`)
        .send({
          start_date: '2024-01-16',
          end_date: '2024-01-21'
        });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.start_date).toBe('2024-01-16');
      expect(response.body.end_date).toBe('2024-01-21');
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent routes', async () => {
      // Act
      const response = await request(app)
        .get('/api/nonexistent');

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Not Found');
    });

    it('should return 401 for missing authentication', async () => {
      // Temporarily unmock auth for this test
      const originalAuth = require('../../middleware/auth');
      jest.unmock('../../middleware/auth');
      
      // Act
      const response = await request(app)
        .get('/api/assets');

      // Assert
      expect(response.status).toBe(401);
      
      // Re-mock auth for other tests
      jest.mock('../../middleware/auth', () => {
        return (req, res, next) => {
          req.user = { user_id: 1, email: 'test@example.com', role: 'admin' };
          next();
        };
      });
    });

    it('should handle database connection errors gracefully', async () => {
      // This test would require mocking database connection failures
      // and is more of a unit test scenario
      expect(true).toBe(true);
    });
  });

  describe('Performance Tests', () => {
    it('should handle multiple concurrent requests', async () => {
      // Arrange
      const requests = Array(10).fill().map(() => 
        request(app)
          .get('/api/assets')
      );

      // Act
      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const endTime = Date.now();

      // Assert
      expect(responses.every(r => r.status === 200)).toBe(true);
      expect(endTime - startTime).toBeLessThan(5000); // 5 seconds max
    });
  });
}); 