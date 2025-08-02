// __tests__/controllers/assetController.test.js
const AssetController = require('../../modules/asset-booking/controllers/assetController');
const Asset = require('../../modules/asset-booking/models/Asset');
const AuditLog = require('../../modules/shared/models/AuditLog');

// Mock dependencies
jest.mock('../../modules/asset-booking/models/Asset');
jest.mock('../../modules/shared/models/AuditLog');
jest.mock('../../modules/shared/utils/logger');

describe('AssetController', () => {
  let req, res, next;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup request/response objects
    req = global.testUtils.mockRequest();
    res = global.testUtils.mockResponse();
    next = global.testUtils.mockNext();
  });

  afterEach(async () => {
    await global.testUtils.cleanup();
  });

  describe('create', () => {
    it('should create an asset successfully', async () => {
      // Arrange
      const assetData = {
        name: 'Test Asset',
        location: 'Test Location',
        type: 'billboard',
        max_slots: 5,
        importance: 2,
        impressions_per_day: 1000,
        value_per_day: 100,
        level: 'primary',
        is_active: true
      };

      req.body = assetData;
      req.user = global.testUtils.generateTestUser({ user_id: 1 });
      req.ip = '127.0.0.1';
      req.get = jest.fn().mockReturnValue('test-user-agent');

      const mockAsset = {
        id: 1,
        ...assetData
      };

      Asset.create.mockResolvedValue(mockAsset);
      AuditLog.create.mockResolvedValue({ id: 1 });

      // Mock cache invalidation
      const cacheInvalidation = require('../../modules/shared/utils/cacheInvalidation');
      cacheInvalidation.smartInvalidate = jest.fn();

      // Act
      await AssetController.create(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockAsset);
      expect(Asset.create).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Test Asset',
        location: 'Test Location',
        type: 'billboard',
        max_slots: 5
      }));
      expect(AuditLog.create).toHaveBeenCalledWith(expect.objectContaining({
        action: 'CREATE_ASSET',
        entity_type: 'asset',
        entity_id: 1
      }));
    });

    it('should return 400 when required fields are missing', async () => {
      // Arrange
      req.body = {
        name: 'Test Asset',
        location: 'Test Location'
        // Missing type and max_slots
      };

      // Act
      await AssetController.create(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'name, location, type, and max_slots are required'
      });
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      const assetData = {
        name: 'Test Asset',
        location: 'Test Location',
        type: 'billboard',
        max_slots: 5
      };

      req.body = assetData;
      req.user = global.testUtils.generateTestUser({ user_id: 1 });

      Asset.create.mockRejectedValue(new Error('Database error'));

      // Act
      await AssetController.create(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Failed to create asset'
      });
    });
  });

  describe('getAll', () => {
    it('should get all assets successfully', async () => {
      // Arrange
      const mockAssets = [
        { id: 1, name: 'Asset 1', type: 'billboard' },
        { id: 2, name: 'Asset 2', type: 'banner' }
      ];

      Asset.findAll.mockResolvedValue(mockAssets);

      // Act
      await AssetController.getAll(req, res);

      // Assert
      expect(res.json).toHaveBeenCalledWith(mockAssets);
      expect(Asset.findAll).toHaveBeenCalled();
    });

    it('should handle database errors in getAll', async () => {
      // Arrange
      Asset.findAll.mockRejectedValue(new Error('Database error'));

      // Act
      await AssetController.getAll(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Failed to fetch assets'
      });
    });
  });

  describe('getById', () => {
    it('should get asset by id successfully', async () => {
      // Arrange
      const mockAsset = { id: 1, name: 'Test Asset', type: 'billboard' };
      req.params = { id: 1 };

      Asset.findById.mockResolvedValue(mockAsset);

      // Act
      await AssetController.getById(req, res);

      // Assert
      expect(res.json).toHaveBeenCalledWith(mockAsset);
      expect(Asset.findById).toHaveBeenCalledWith(1);
    });

    it('should return 404 when asset not found', async () => {
      // Arrange
      req.params = { id: 999 };
      Asset.findById.mockResolvedValue(null);

      // Act
      await AssetController.getById(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Asset not found'
      });
    });
  });

  describe('update', () => {
    it('should update asset successfully', async () => {
      // Arrange
      const updateData = {
        name: 'Updated Asset',
        location: 'Updated Location'
      };

      const mockAsset = { id: 1, name: 'Test Asset', type: 'billboard' };
      const mockUpdatedAsset = { id: 1, ...updateData, type: 'billboard' };

      req.params = { id: 1 };
      req.body = updateData;
      req.user = global.testUtils.generateTestUser({ user_id: 1 });
      req.ip = '127.0.0.1';
      req.get = jest.fn().mockReturnValue('test-user-agent');

      Asset.findById.mockResolvedValue(mockAsset);
      Asset.update.mockResolvedValue(mockUpdatedAsset);
      AuditLog.create.mockResolvedValue({ id: 1 });

      // Mock cache invalidation
      const cacheInvalidation = require('../../modules/shared/utils/cacheInvalidation');
      cacheInvalidation.smartInvalidate = jest.fn();

      // Act
      await AssetController.update(req, res);

      // Assert
      expect(res.json).toHaveBeenCalledWith(mockUpdatedAsset);
      expect(Asset.update).toHaveBeenCalledWith(1, updateData);
      expect(AuditLog.create).toHaveBeenCalledWith(expect.objectContaining({
        action: 'UPDATE_ASSET',
        entity_type: 'asset',
        entity_id: 1
      }));
    }, 15000);

    it('should return 404 when asset not found for update', async () => {
      // Arrange
      req.params = { id: 999 };
      req.body = { name: 'Updated Asset' };

      Asset.findById.mockResolvedValue(null);

      // Act
      await AssetController.update(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Asset not found'
      });
    });
  });
}); 