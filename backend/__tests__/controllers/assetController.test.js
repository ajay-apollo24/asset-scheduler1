// __tests__/controllers/assetController.test.js
const AssetController = require('../../controllers/assetController');
const Asset = require('../../models/Asset');
const AuditLog = require('../../models/AuditLog');
const TestDBHelper = require('../../tests/helpers/dbHelper');

// Mock dependencies
jest.mock('../../models/Asset');
jest.mock('../../models/AuditLog');

describe('AssetController', () => {
  let req, res, next;

  beforeAll(async () => {
    await TestDBHelper.setupTestDB();
  }, 30000);

  beforeEach(async () => {
    // Setup test database
    await TestDBHelper.cleanupTestDB();
    await TestDBHelper.insertTestData();

    // Reset mocks
    jest.clearAllMocks();

    // Setup request/response objects
    req = global.testUtils.mockRequest();
    res = global.testUtils.mockResponse();
    next = global.testUtils.mockNext();
  }, 15000);

  afterEach(async () => {
    await TestDBHelper.cleanupTestDB();
    await global.testUtils.cleanup();
  }, 15000);

  afterAll(async () => {
    await TestDBHelper.cleanupTestDB();
  }, 15000);

  describe('create', () => {
    it('should create an asset successfully', async () => {
      // Arrange
      const assetData = {
        name: 'Test Asset',
        location: 'test_location',
        type: 'banner',
        max_slots: 1,
        importance: 1,
        impressions_per_day: 1000,
        value_per_day: 100,
        level: 'secondary',
        is_active: true
      };

      req.body = assetData;
      req.user = global.testUtils.generateTestUser({ user_id: 1 });

      const mockAsset = {
        id: 1,
        ...assetData
      };

      Asset.create.mockResolvedValue(mockAsset);
      AuditLog.create.mockResolvedValue({ id: 1 });

      // Act
      await AssetController.create(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockAsset);
      expect(Asset.create).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Test Asset',
        location: 'test_location',
        type: 'banner'
      }));
      expect(AuditLog.create).toHaveBeenCalledWith(expect.objectContaining({
        action: 'CREATE_ASSET',
        entity_type: 'asset',
        entity_id: 1
      }));
    }, 15000);

    it('should return 400 when required fields are missing', async () => {
      // Arrange
      req.body = {
        name: 'Test Asset'
        // Missing location, type, max_slots
      };

      // Act
      await AssetController.create(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'name, location, type, and max_slots are required'
      });
    }, 15000);

    it('should handle database errors gracefully', async () => {
      // Arrange
      req.body = global.testUtils.generateTestAsset();
      req.user = global.testUtils.generateTestUser({ user_id: 1 });
      
      const dbError = new Error('Database error');
      Asset.create.mockRejectedValue(dbError);

      // Act
      await AssetController.create(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Failed to create asset'
      });
    }, 15000);
  });

  describe('getAll', () => {
    it('should get all assets successfully', async () => {
      // Arrange
      const mockAssets = [
        { id: 1, name: 'Asset 1', location: 'loc1' },
        { id: 2, name: 'Asset 2', location: 'loc2' }
      ];

      Asset.findAll.mockResolvedValue(mockAssets);

      // Act
      await AssetController.getAll(req, res);

      // Assert
      expect(res.json).toHaveBeenCalledWith(mockAssets);
    }, 15000);

    it('should handle database errors in getAll', async () => {
      // Arrange
      const dbError = new Error('Database error');
      Asset.findAll.mockRejectedValue(dbError);

      // Act
      await AssetController.getAll(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Failed to fetch assets'
      });
    }, 15000);
  });

  describe('getById', () => {
    it('should get asset by id successfully', async () => {
      // Arrange
      const mockAsset = { id: 1, name: 'Test Asset', location: 'test_location' };
      req.params = { id: '1' };

      Asset.findById.mockResolvedValue(mockAsset);

      // Act
      await AssetController.getById(req, res);

      // Assert
      expect(res.json).toHaveBeenCalledWith(mockAsset);
    }, 15000);

    it('should return 404 when asset not found', async () => {
      // Arrange
      req.params = { id: '999' };
      Asset.findById.mockResolvedValue(null);

      // Act
      await AssetController.getById(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Asset not found'
      });
    }, 15000);
  });

  describe('update', () => {
    it('should update asset successfully', async () => {
      // Arrange
      const updateData = { name: 'Updated Asset' };
      const mockAsset = { id: 1, ...updateData };
      
      req.params = { id: '1' };
      req.body = updateData;
      req.user = global.testUtils.generateTestUser({ user_id: 1 });

      Asset.findById.mockResolvedValue(mockAsset);
      Asset.update.mockResolvedValue(mockAsset);
      AuditLog.create.mockResolvedValue({ id: 1 });

      // Act
      await AssetController.update(req, res);

      // Assert
      expect(res.json).toHaveBeenCalledWith(mockAsset);
    }, 15000);

    it('should return 404 when asset not found for update', async () => {
      // Arrange
      req.params = { id: '999' };
      req.body = { name: 'Updated Asset' };
      
      Asset.findById.mockResolvedValue(null);

      // Act
      await AssetController.update(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Asset not found'
      });
    }, 15000);
  });
}); 