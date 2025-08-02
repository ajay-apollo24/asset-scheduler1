// __tests__/controllers/bookingController.test.js
const BookingController = require('../../modules/asset-booking/controllers/bookingController');
const Booking = require('../../modules/asset-booking/models/Booking');
const Asset = require('../../modules/asset-booking/models/Asset');
const AuditLog = require('../../modules/shared/models/AuditLog');
const TestDBHelper = require('../helpers/dbHelper');

// Mock dependencies
jest.mock('../../modules/asset-booking/models/Booking');
jest.mock('../../modules/asset-booking/models/Asset');
jest.mock('../../modules/shared/models/AuditLog');
jest.mock('../../modules/asset-booking/utils/ruleEngine');

// Mock date-fns
jest.mock('date-fns', () => ({
  differenceInCalendarDays: jest.fn().mockReturnValue(5),
  parseISO: jest.fn().mockImplementation((date) => {
    console.log('parseISO called with:', date);
    return new Date(date);
  })
}));

// Mock Approval model
jest.mock('../../modules/asset-booking/models/Approval', () => ({
  createSteps: jest.fn().mockImplementation((bookingId, steps) => {
    console.log('Approval.createSteps called with:', bookingId, steps);
    return Promise.resolve();
  })
}));

// Mock cache invalidation
jest.mock('../../modules/shared/utils/cacheInvalidation', () => ({
  smartInvalidate: jest.fn().mockImplementation((req, type, userId, metadata) => {
    console.log('cacheInvalidation.smartInvalidate called with:', type, userId, metadata);
  })
}));

describe('BookingController', () => {
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
    it('should create a booking successfully', async () => {
      // Arrange
      const bookingData = {
        asset_id: 1,
        title: 'Test Booking',
        lob: 'Pharmacy',
        purpose: 'Test Purpose',
        start_date: '2024-01-15',
        end_date: '2024-01-20'
      };

      req.body = bookingData;
      req.user = { user_id: 1, role: 'user' }; // Fix user object structure
      req.ip = '127.0.0.1';
      req.get = jest.fn().mockReturnValue('test-user-agent');

      const mockAsset = {
        id: 1,
        name: 'Test Asset',
        level: 'secondary',
        value_per_day: 100,
        type: 'billboard'
      };

      const mockBooking = {
        id: 1,
        ...bookingData,
        user_id: 1,
        status: 'pending',
        estimated_cost: 600
      };

      Asset.findById.mockResolvedValue(mockAsset);
      Booking.findConflicts.mockResolvedValue([]);
      Booking.create.mockImplementation((data) => {
        console.log('Booking.create called with:', data);
        return Promise.resolve(mockBooking);
      });
      AuditLog.create.mockImplementation((data) => {
        console.log('AuditLog.create called with:', data);
        return Promise.resolve({ id: 1 });
      });

      // Mock rule engine
      const { validateBookingRules } = require('../../modules/asset-booking/utils/ruleEngine');
      validateBookingRules.mockResolvedValue([]);

      // Act
      await BookingController.create(req, res);

      // Debug: Log what was actually called
      console.log('Status calls:', res.status.mock.calls);
      console.log('JSON calls:', res.json.mock.calls);

      // Assert
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        id: 1,
        title: 'Test Booking',
        status: 'pending'
      }));
      expect(Booking.create).toHaveBeenCalledWith(expect.objectContaining({
        asset_id: 1,
        user_id: 1,
        title: 'Test Booking'
      }));
      expect(AuditLog.create).toHaveBeenCalledWith(expect.objectContaining({
        action: 'CREATE_BOOKING',
        entity_type: 'booking',
        entity_id: 1
      }));
    });

    it('should return 400 when required fields are missing', async () => {
      // Arrange
      req.body = {
        asset_id: 1,
        title: 'Test Booking'
        // Missing lob, purpose, start_date, end_date
      };

      // Act
      await BookingController.create(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'All fields are required'
      });
    });

    it('should return 404 when asset not found', async () => {
      // Arrange
      const bookingData = {
        asset_id: 999,
        title: 'Test Booking',
        lob: 'Pharmacy',
        purpose: 'Test Purpose',
        start_date: '2024-01-15',
        end_date: '2024-01-20'
      };

      req.body = bookingData;
      req.user = global.testUtils.generateTestUser({ user_id: 1 });

      Asset.findById.mockResolvedValue(null);

      // Act
      await BookingController.create(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Asset not found'
      });
    });

    it('should return 409 when slot conflict exists', async () => {
      // Arrange
      const bookingData = {
        asset_id: 1,
        title: 'Test Booking',
        lob: 'Pharmacy',
        purpose: 'Test Purpose',
        start_date: '2024-01-15',
        end_date: '2024-01-20'
      };

      req.body = bookingData;
      req.user = global.testUtils.generateTestUser({ user_id: 1 });

      const mockAsset = {
        id: 1,
        name: 'Test Asset',
        level: 'secondary',
        value_per_day: 100,
        type: 'billboard'
      };

      const mockConflicts = [
        { id: 2, title: 'Existing Booking', start_date: '2024-01-16', end_date: '2024-01-18' }
      ];

      Asset.findById.mockResolvedValue(mockAsset);
      Booking.findConflicts.mockResolvedValue(mockConflicts);

      // Act
      await BookingController.create(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Slot already booked for the given dates',
        conflicts: mockConflicts
      });
    });

    it('should return 422 when rule validation fails', async () => {
      // Arrange
      const bookingData = {
        asset_id: 1,
        title: 'Test Booking',
        lob: 'Pharmacy',
        purpose: 'Test Purpose',
        start_date: '2024-01-15',
        end_date: '2024-01-20'
      };

      req.body = bookingData;
      req.user = global.testUtils.generateTestUser({ user_id: 1 });

      const mockAsset = {
        id: 1,
        name: 'Test Asset',
        level: 'secondary',
        value_per_day: 100,
        type: 'billboard'
      };

      const mockRuleErrors = ['Booking exceeds maximum allowed duration'];

      Asset.findById.mockResolvedValue(mockAsset);
      Booking.findConflicts.mockResolvedValue([]);

      // Mock rule engine
      const { validateBookingRules } = require('../../modules/asset-booking/utils/ruleEngine');
      validateBookingRules.mockResolvedValue(mockRuleErrors);

      // Act
      await BookingController.create(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Rule validation failed',
        errors: mockRuleErrors
      });
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      const bookingData = {
        asset_id: 1,
        title: 'Test Booking',
        lob: 'Pharmacy',
        purpose: 'Test Purpose',
        start_date: '2024-01-15',
        end_date: '2024-01-20'
      };

      req.body = bookingData;
      req.user = global.testUtils.generateTestUser({ user_id: 1 });

      Asset.findById.mockRejectedValue(new Error('Database error'));

      // Act
      await BookingController.create(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Failed to create booking'
      });
    });
  });

  describe('getAll', () => {
    it('should return all bookings', async () => {
      // Arrange
      const mockBookings = [
        { id: 1, title: 'Booking 1', status: 'pending' },
        { id: 2, title: 'Booking 2', status: 'approved' }
      ];

      Booking.findAll.mockResolvedValue(mockBookings);

      // Act
      await BookingController.getAll(req, res);

      // Assert
      expect(res.json).toHaveBeenCalledWith(mockBookings);
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      Booking.findAll.mockRejectedValue(new Error('Database error'));

      // Act
      await BookingController.getAll(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Failed to fetch bookings'
      });
    });
  });

  describe('getById', () => {
    it('should return booking by id', async () => {
      // Arrange
      const mockBooking = { id: 1, title: 'Test Booking', status: 'pending' };
      req.params = { id: 1 };

      Booking.findById.mockResolvedValue(mockBooking);

      // Act
      await BookingController.getById(req, res);

      // Assert
      expect(res.json).toHaveBeenCalledWith(mockBooking);
    });

    it('should return 404 when booking not found', async () => {
      // Arrange
      req.params = { id: 999 };
      Booking.findById.mockResolvedValue(null);

      // Act
      await BookingController.getById(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Booking not found'
      });
    });
  });

  describe('updateStatus', () => {
    it('should update booking status successfully', async () => {
      // Arrange
      const mockUpdatedBooking = { id: 1, status: 'approved', title: 'Test Booking', lob: 'Pharmacy' };
      req.params = { id: 1 };
      req.body = { status: 'approved' };
      req.user = global.testUtils.generateTestUser({ user_id: 1 });

      Booking.updateStatus.mockResolvedValue(mockUpdatedBooking);
      AuditLog.create.mockResolvedValue({ id: 1 });

      // Act
      await BookingController.updateStatus(req, res);

      // Assert
      expect(res.json).toHaveBeenCalledWith(mockUpdatedBooking);
      expect(Booking.updateStatus).toHaveBeenCalledWith('1', 'approved');
      expect(AuditLog.create).toHaveBeenCalledWith(expect.objectContaining({
        action: 'UPDATE_BOOKING_STATUS',
        entity_type: 'booking',
        entity_id: 1
      }));
    });

    it('should return 400 for invalid status', async () => {
      // Arrange
      req.params = { id: 1 };
      req.body = { status: 'invalid_status' };

      // Act
      await BookingController.updateStatus(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Invalid status'
      });
    });
  });

  describe('delete', () => {
    it('should soft delete booking for admin', async () => {
      // Arrange
      const mockDeletedBooking = { id: 1, is_deleted: true };
      req.params = { id: 1 };
      req.user = global.testUtils.generateTestUser({ user_id: 1, role: 'admin' });

      Booking.findById.mockResolvedValue({ id: 1, title: 'Test Booking' });
      Booking.softDelete.mockResolvedValue(mockDeletedBooking);
      AuditLog.create.mockResolvedValue({ id: 1 });

      // Act
      await BookingController.delete(req, res);

      // Assert
      expect(res.json).toHaveBeenCalledWith(mockDeletedBooking);
      expect(Booking.softDelete).toHaveBeenCalledWith('1');
    });

    it('should return 403 for non-admin users', async () => {
      // Arrange
      req.params = { id: 1 };
      req.user = global.testUtils.generateTestUser({ user_id: 1, role: 'user' });

      // Act
      await BookingController.delete(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Only admin can delete bookings'
      });
    });
  });

  describe('updateDates', () => {
    it('should update booking dates successfully', async () => {
      // Arrange
      const mockBooking = { id: 1, title: 'Test Booking', asset_id: 1, user_id: 1 };
      const mockUpdatedBooking = { id: 1, start_date: '2024-02-01', end_date: '2024-02-05' };
      req.params = { id: 1 };
      req.body = { start_date: '2024-02-01', end_date: '2024-02-05' };
      req.user = global.testUtils.generateTestUser({ user_id: 1 });

      Booking.findById.mockResolvedValue(mockBooking);
      Booking.findConflicts.mockResolvedValue([]);
      Booking.updateDates.mockResolvedValue(mockUpdatedBooking);
      AuditLog.create.mockResolvedValue({ id: 1 });

      // Mock rule engine
      const { validateBookingRules } = require('../../modules/asset-booking/utils/ruleEngine');
      validateBookingRules.mockResolvedValue([]);

      // Act
      await BookingController.updateDates(req, res);

      // Assert
      expect(res.json).toHaveBeenCalledWith(mockUpdatedBooking);
      expect(Booking.updateDates).toHaveBeenCalledWith('1', '2024-02-01', '2024-02-05');
    });

    it('should return 403 for unauthorized users', async () => {
      // Arrange
      req.params = { id: 1 };
      req.body = { start_date: '2024-02-01', end_date: '2024-02-05' };
      req.user = global.testUtils.generateTestUser({ user_id: 2 }); // Different user

      Booking.findById.mockResolvedValue({ id: 1, user_id: 1, title: 'Test Booking' });

      // Act
      await BookingController.updateDates(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Forbidden'
      });
    });
  });

  describe('update', () => {
    it('should update booking successfully', async () => {
      // Arrange
      const mockBooking = { id: 1, title: 'Test Booking', user_id: 1, asset_id: 1 };
      const mockUpdatedBooking = { id: 1, title: 'Updated Booking', lob: 'Diagnostics' };
      req.params = { id: 1 };
      req.body = { 
        title: 'Updated Booking', 
        lob: 'Diagnostics',
        purpose: 'Test Purpose',
        start_date: '2024-01-15',
        end_date: '2024-01-20'
      };
      req.user = global.testUtils.generateTestUser({ user_id: 1 });

      const mockAsset = {
        id: 1,
        name: 'Test Asset',
        type: 'billboard'
      };

      Booking.findById.mockResolvedValue(mockBooking);
      Asset.findById.mockResolvedValue(mockAsset);
      Booking.findConflicts.mockResolvedValue([]);
      Booking.update.mockResolvedValue(mockUpdatedBooking);
      AuditLog.create.mockResolvedValue({ id: 1 });

      // Mock rule engine
      const { validateBookingRules } = require('../../modules/asset-booking/utils/ruleEngine');
      validateBookingRules.mockResolvedValue([]);

      // Act
      await BookingController.update(req, res);

      // Assert
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Updated Booking',
        lob: 'Diagnostics'
      }));
      expect(Booking.update).toHaveBeenCalledWith('1', {
        title: 'Updated Booking',
        lob: 'Diagnostics',
        purpose: 'Test Purpose',
        start_date: '2024-01-15',
        end_date: '2024-01-20'
      });
    });
  });
}); 