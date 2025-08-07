const request = require('supertest');
const app = require('../../server');
const Booking = require('../../modules/asset-booking/models/Booking');
const Approval = require('../../modules/asset-booking/models/Approval');
const AuditLog = require('../../modules/shared/models/AuditLog');
const cacheInvalidation = require('../../modules/shared/utils/cacheInvalidation');

// Mock dependencies
jest.mock('../../modules/asset-booking/models/Booking');
jest.mock('../../modules/asset-booking/models/Approval');
jest.mock('../../modules/shared/models/AuditLog');
jest.mock('../../modules/shared/utils/cacheInvalidation');

describe('BookingController', () => {
  let mockUser, mockAsset, mockBooking;

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup mock user
    mockUser = {
      id: 1,
      email: 'test@example.com',
      organization_id: 1,
      roles: ['user']
    };

    // Setup mock asset
    mockAsset = {
      id: 1,
      name: 'Test Asset',
      level: 'secondary',
      max_slots: 2,
      is_active: true
    };

    // Setup mock booking (now campaign)
    mockBooking = {
      id: 1,
      asset_id: 1,
      title: 'Test Booking',
      lob: 'Pharmacy',
      purpose: 'Test Purpose',
      start_date: '2024-01-15',
      end_date: '2024-01-20',
      user_id: 1,
      status: 'pending',
      estimated_cost: 600
    };

    // Mock successful responses
    Booking.create = jest.fn().mockResolvedValue(mockBooking);
    Booking.findById = jest.fn().mockResolvedValue(mockBooking);
    Booking.updateStatus = jest.fn().mockResolvedValue({ ...mockBooking, status: 'approved' });
    Booking.updateDates = jest.fn().mockResolvedValue({ ...mockBooking, start_date: '2024-02-01', end_date: '2024-02-05' });
    Booking.update = jest.fn().mockResolvedValue({ ...mockBooking, lob: 'Diagnostics', title: 'Updated Booking' });
    Booking.softDelete = jest.fn().mockResolvedValue({ ...mockBooking, is_deleted: true });
    Booking.getAll = jest.fn().mockResolvedValue([mockBooking]);
    
    Approval.createSteps.mockResolvedValue([{ id: 1, role: 'admin' }]);
    AuditLog.create.mockResolvedValue({ id: 1 });
    cacheInvalidation.smartInvalidate.mockResolvedValue();
  });

  afterEach(async () => {
    // Clean up test data - use campaigns table instead of bookings
    try {
      const db = require('../../config/db');
      await db.query('DELETE FROM creatives WHERE name LIKE \'Test%\'');
      await db.query('DELETE FROM campaigns WHERE name LIKE \'Test%\'');
      await db.query('DELETE FROM assets WHERE name LIKE \'Test%\'');
      await db.query('DELETE FROM bids WHERE bid_amount > 0');
      await db.query('DELETE FROM approvals WHERE decided_by IN (SELECT id FROM users WHERE email LIKE \'test%@%\' OR email LIKE \'admin%@%\')');
    } catch (error) {
      console.warn('Cleanup warning:', error.message);
    }
  });

  describe('create', () => {
    it('should create a booking successfully', async () => {
      const bookingData = {
        asset_id: 1,
        title: 'Test Booking',
        lob: 'Pharmacy',
        purpose: 'Test Purpose',
        start_date: '2024-01-15',
        end_date: '2024-01-20'
      };

      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${global.testUtils.generateToken(mockUser)}`)
        .send(bookingData);

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        id: 1,
        asset_id: 1,
        title: 'Test Booking',
        lob: 'Pharmacy',
        purpose: 'Test Purpose',
        start_date: '2024-01-15',
        end_date: '2024-01-20',
        user_id: 1,
        status: 'pending',
        estimated_cost: 600
      });

      expect(Booking.create).toHaveBeenCalledWith(expect.objectContaining({
        asset_id: 1,
        user_id: 1,
        title: 'Test Booking',
        lob: 'Pharmacy',
        purpose: 'Test Purpose',
        start_date: '2024-01-15',
        end_date: '2024-01-20',
        status: 'pending'
      }));

      expect(Approval.createSteps).toHaveBeenCalledWith(1, ['admin']);
      expect(AuditLog.create).toHaveBeenCalledWith(expect.objectContaining({
        user_id: 1,
        action: 'CREATE_BOOKING',
        entity_type: 'booking',
        entity_id: 1
      }));
      expect(cacheInvalidation.smartInvalidate).toHaveBeenCalledWith('booking_create', 1, expect.any(Object));
    });

    it('should return 400 when required fields are missing', async () => {
      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${global.testUtils.generateToken(mockUser)}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
    });

    it('should return 404 when asset not found', async () => {
      Booking.create.mockRejectedValue(new Error('Asset not found'));

      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${global.testUtils.generateToken(mockUser)}`)
        .send({
          asset_id: 999,
          title: 'Test Booking',
          start_date: '2024-01-15',
          end_date: '2024-01-20'
        });

      expect(response.status).toBe(404);
    });

    it('should return 409 when slot conflict exists', async () => {
      Booking.create.mockRejectedValue(new Error('Slot conflict'));

      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${global.testUtils.generateToken(mockUser)}`)
        .send({
          asset_id: 1,
          title: 'Test Booking',
          start_date: '2024-01-15',
          end_date: '2024-01-20'
        });

      expect(response.status).toBe(409);
    });

    it('should return 422 when rule validation fails', async () => {
      Booking.create.mockRejectedValue(new Error('Rule validation failed'));

      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${global.testUtils.generateToken(mockUser)}`)
        .send({
          asset_id: 1,
          title: 'Test Booking',
          start_date: '2024-01-15',
          end_date: '2024-01-20'
        });

      expect(response.status).toBe(422);
    });

    it('should handle database errors gracefully', async () => {
      Booking.create.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${global.testUtils.generateToken(mockUser)}`)
        .send({
          asset_id: 1,
          title: 'Test Booking',
          start_date: '2024-01-15',
          end_date: '2024-01-20'
        });

      expect(response.status).toBe(500);
    });
  });

  describe('getAll', () => {
    it('should return all bookings', async () => {
      const response = await request(app)
        .get('/api/bookings')
        .set('Authorization', `Bearer ${global.testUtils.generateToken(mockUser)}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject(mockBooking);
      expect(Booking.getAll).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      Booking.getAll.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/bookings')
        .set('Authorization', `Bearer ${global.testUtils.generateToken(mockUser)}`);

      expect(response.status).toBe(500);
    });
  });

  describe('getById', () => {
    it('should return booking by id', async () => {
      const response = await request(app)
        .get('/api/bookings/1')
        .set('Authorization', `Bearer ${global.testUtils.generateToken(mockUser)}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject(mockBooking);
      expect(Booking.findById).toHaveBeenCalledWith('1');
    });

    it('should return 404 when booking not found', async () => {
      Booking.findById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/bookings/999')
        .set('Authorization', `Bearer ${global.testUtils.generateToken(mockUser)}`);

      expect(response.status).toBe(404);
    });
  });

  describe('updateStatus', () => {
    it('should update booking status successfully', async () => {
      const mockUpdatedBooking = {
        id: 1,
        lob: 'Pharmacy',
        status: 'approved',
        title: 'Test Booking'
      };

      const response = await request(app)
        .patch('/api/bookings/1/status')
        .set('Authorization', `Bearer ${global.testUtils.generateToken(mockUser)}`)
        .send({ status: 'approved' });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject(mockUpdatedBooking);
      expect(Booking.updateStatus).toHaveBeenCalledWith('1', 'approved');
      expect(AuditLog.create).toHaveBeenCalledWith(expect.objectContaining({
        action: 'UPDATE_BOOKING_STATUS',
        entity_type: 'booking',
        entity_id: 1
      }));
    });

    it('should return 400 for invalid status', async () => {
      const response = await request(app)
        .patch('/api/bookings/1/status')
        .set('Authorization', `Bearer ${global.testUtils.generateToken(mockUser)}`)
        .send({ status: 'invalid_status' });

      expect(response.status).toBe(400);
    });
  });

  describe('delete', () => {
    it('should soft delete booking for admin', async () => {
      const mockDeletedBooking = {
        id: 1,
        is_deleted: true
      };

      const adminUser = { ...mockUser, roles: ['admin'] };

      const response = await request(app)
        .delete('/api/bookings/1')
        .set('Authorization', `Bearer ${global.testUtils.generateToken(adminUser)}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject(mockDeletedBooking);
      expect(Booking.softDelete).toHaveBeenCalledWith('1');
    });

    it('should return 403 for non-admin users', async () => {
      const response = await request(app)
        .delete('/api/bookings/1')
        .set('Authorization', `Bearer ${global.testUtils.generateToken(mockUser)}`);

      expect(response.status).toBe(403);
    });
  });

  describe('updateDates', () => {
    it('should update booking dates successfully', async () => {
      const mockUpdatedBooking = {
        id: 1,
        start_date: '2024-02-01',
        end_date: '2024-02-05'
      };

      const response = await request(app)
        .patch('/api/bookings/1/dates')
        .set('Authorization', `Bearer ${global.testUtils.generateToken(mockUser)}`)
        .send({
          start_date: '2024-02-01',
          end_date: '2024-02-05'
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject(mockUpdatedBooking);
      expect(Booking.updateDates).toHaveBeenCalledWith('1', '2024-02-01', '2024-02-05');
    });

    it('should return 403 for unauthorized users', async () => {
      const response = await request(app)
        .patch('/api/bookings/1/dates')
        .set('Authorization', `Bearer ${global.testUtils.generateToken({ ...mockUser, id: 999 })}`)
        .send({
          start_date: '2024-02-01',
          end_date: '2024-02-05'
        });

      expect(response.status).toBe(403);
    });
  });

  describe('update', () => {
    it('should update booking successfully', async () => {
      const response = await request(app)
        .put('/api/bookings/1')
        .set('Authorization', `Bearer ${global.testUtils.generateToken(mockUser)}`)
        .send({
          title: 'Updated Booking',
          lob: 'Diagnostics'
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        title: 'Updated Booking',
        lob: 'Diagnostics'
      });
      expect(Booking.update).toHaveBeenCalledWith('1', expect.objectContaining({
        title: 'Updated Booking',
        lob: 'Diagnostics'
      }));
    });
  });
}); 