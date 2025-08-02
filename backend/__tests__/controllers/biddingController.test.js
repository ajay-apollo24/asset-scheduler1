// __tests__/controllers/biddingController.test.js
const BiddingController = require('../../modules/asset-booking/controllers/biddingController');
const Booking = require('../../modules/asset-booking/models/Booking');
const Bid = require('../../modules/asset-booking/models/Bid');
const AuditLog = require('../../modules/shared/models/AuditLog');

// Mock dependencies
jest.mock('../../modules/asset-booking/models/Booking');
jest.mock('../../modules/asset-booking/models/Bid');
jest.mock('../../modules/shared/models/AuditLog');
jest.mock('../../modules/asset-booking/utils/biddingValidation');
jest.mock('../../modules/asset-booking/utils/fairAllocation');

describe('Bidding Controller', () => {
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

  describe('placeBid', () => {
    it('should place a bid successfully', async () => {
      // Arrange
      const bidData = {
        booking_id: 1,
        bid_amount: 10000
      };

      req.body = bidData;
      req.user = { user_id: 1, role: 'user' };
      req.ip = '127.0.0.1';
      req.get = jest.fn().mockReturnValue('test-user-agent');

      const mockBooking = {
        id: 1,
        title: 'Test Booking',
        status: 'auction_active'
      };

      const mockBid = {
        id: 1,
        booking_id: 1,
        user_id: 1,
        bid_amount: 10000,
        status: 'active'
      };

      Booking.findById.mockResolvedValue(mockBooking);
      Bid.getActiveBids.mockResolvedValue([]);
      Bid.create.mockResolvedValue(mockBid);
      AuditLog.create.mockResolvedValue({ id: 1 });

      // Mock bidding validation
      const { validateBid } = require('../../modules/asset-booking/utils/biddingValidation');
      validateBid.mockResolvedValue({ isValid: true, errors: [] });

      // Act
      await BiddingController.placeBid(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockBid);
      expect(Bid.create).toHaveBeenCalledWith(expect.objectContaining({
        booking_id: 1,
        user_id: 1,
        bid_amount: 10000
      }));
    });

    it('should return 404 if booking not found', async () => {
      // Arrange
      req.body = { booking_id: 999, bid_amount: 10000 };
      req.user = { user_id: 1, role: 'user' };
      Booking.findById.mockResolvedValue(null);

      // Act
      await BiddingController.placeBid(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Booking not found'
      });
    });

    it('should return 400 if auction is not active', async () => {
      // Arrange
      req.body = { booking_id: 1, bid_amount: 10000 };
      req.user = { user_id: 1, role: 'user' };
      const mockBooking = {
        id: 1,
        title: 'Test Booking',
        status: 'pending'
      };

      Booking.findById.mockResolvedValue(mockBooking);

      // Act
      await BiddingController.placeBid(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Booking is not available for bidding'
      });
    });

    it('should update existing bid if user already bid', async () => {
      // Arrange
      const bidData = {
        booking_id: 1,
        bid_amount: 13000
      };

      req.body = bidData;
      req.user = { user_id: 1, role: 'user' };
      req.ip = '127.0.0.1';
      req.get = jest.fn().mockReturnValue('test-user-agent');

      const mockBooking = {
        id: 1,
        title: 'Test Booking',
        status: 'auction_active'
      };

      const existingBid = {
        id: 1,
        booking_id: 1,
        user_id: 1,
        bid_amount: 10000,
        status: 'active'
      };

      Booking.findById.mockResolvedValue(mockBooking);
      Bid.getActiveBids.mockResolvedValue([existingBid]);
      Bid.updateBid.mockResolvedValue({ ...existingBid, bid_amount: 13000 });
      AuditLog.create.mockResolvedValue({ id: 1 });

      // Mock bidding validation
      const { validateBid } = require('../../modules/asset-booking/utils/biddingValidation');
      validateBid.mockResolvedValue({ isValid: true, errors: [] });

      // Act
      await BiddingController.placeBid(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        bid_amount: 13000
      }));
      expect(Bid.updateBid).toHaveBeenCalledWith(1, 13000);
    });
  });

  describe('getBidsForBooking', () => {
    it('should return all bids for a booking', async () => {
      // Arrange
      req.params = { booking_id: 1 };
      req.user = { user_id: 1, role: 'user' };

      const mockBids = [
        { id: 1, user_id: 1, bid_amount: 10000, status: 'active' },
        { id: 2, user_id: 2, bid_amount: 12000, status: 'active' }
      ];

      Bid.getBidsForBooking.mockResolvedValue(mockBids);
      AuditLog.create.mockResolvedValue({ id: 1 });

      // Mock fair allocation
      const fairAllocation = require('../../modules/asset-booking/utils/fairAllocation');
      fairAllocation.calculateFairnessScore.mockResolvedValue(0.5);

      // Act
      await BiddingController.getBidsForBooking(req, res);

      // Assert
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        bids: mockBids
      }));
      expect(Bid.getBidsForBooking).toHaveBeenCalledWith('1');
    });
  });

  describe('startAuction', () => {
    it('should start auction successfully', async () => {
      // Arrange
      req.params = { booking_id: 1 };
      req.user = { user_id: 1, role: 'user' };
      req.ip = '127.0.0.1';
      req.get = jest.fn().mockReturnValue('test-user-agent');

      const mockBooking = {
        id: 1,
        title: 'Test Booking',
        status: 'pending'
      };

      Booking.findById.mockResolvedValue(mockBooking);
      Booking.updateStatus.mockResolvedValue({ ...mockBooking, status: 'auction_active' });
      AuditLog.create.mockResolvedValue({ id: 1 });

      // Act
      await BiddingController.startAuction(req, res);

      // Assert
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Auction started successfully'
      }));
      expect(Booking.updateStatus).toHaveBeenCalledWith('1', 'auction_active');
    });
  });

  describe('endAuction', () => {
    it('should end auction and select winner', async () => {
      // Arrange
      req.params = { booking_id: 1 };
      req.user = { user_id: 1, role: 'user' };
      req.ip = '127.0.0.1';
      req.get = jest.fn().mockReturnValue('test-user-agent');

      const mockBooking = {
        id: 1,
        title: 'Test Booking',
        status: 'auction_active'
      };

      const mockBids = [
        { id: 1, user_id: 1, bid_amount: 10000, status: 'active' },
        { id: 2, user_id: 2, bid_amount: 12000, status: 'active' }
      ];

      Booking.findById.mockResolvedValue(mockBooking);
      Bid.getActiveBids.mockResolvedValue(mockBids);
      Booking.update.mockResolvedValue([1]);
      Bid.updateBid.mockResolvedValue([1]);

      const fairAllocation = require('../../modules/asset-booking/utils/fairAllocation');
      fairAllocation.resolveConflicts.mockResolvedValue([mockBids[1]]);

      AuditLog.create.mockResolvedValue({ id: 1 });

      // Act
      await BiddingController.endAuction(req, res);

      // Assert
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        winner: mockBids[1]
      }));
      expect(Booking.updateStatus).toHaveBeenCalledWith('1', 'booked');
    });

    it('should handle auction with no bids', async () => {
      // Arrange
      req.params = { booking_id: 1 };
      req.user = { user_id: 1, role: 'user' };
      req.ip = '127.0.0.1';
      req.get = jest.fn().mockReturnValue('test-user-agent');

      const mockBooking = {
        id: 1,
        title: 'Test Booking',
        status: 'auction_active'
      };

      Booking.findById.mockResolvedValue(mockBooking);
      Bid.getActiveBids.mockResolvedValue([]);

      // Act
      await BiddingController.endAuction(req, res);

      // Assert
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Auction cancelled - no bids received'
      }));
      expect(Booking.updateStatus).toHaveBeenCalledWith('1', 'cancelled');
    });
  });

  describe('cancelBid', () => {
    it('should cancel bid successfully', async () => {
      // Arrange
      req.params = { bid_id: 1 };
      req.user = { user_id: 1, role: 'user' };
      req.ip = '127.0.0.1';
      req.get = jest.fn().mockReturnValue('test-user-agent');

      const mockBid = {
        id: 1,
        user_id: 1,
        bid_amount: 10000,
        status: 'cancelled'
      };

      Bid.cancelBid.mockResolvedValue(mockBid);
      AuditLog.create.mockResolvedValue({ id: 1 });

      // Act
      await BiddingController.cancelBid(req, res);

      // Assert
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        bid: mockBid,
        message: 'Bid cancelled successfully'
      }));
      expect(Bid.cancelBid).toHaveBeenCalledWith('1');
    });

    it('should return 404 if bid not found', async () => {
      // Arrange
      req.params = { bid_id: 999 };
      req.user = { user_id: 1, role: 'user' };

      Bid.cancelBid.mockResolvedValue(null);

      // Act
      await BiddingController.cancelBid(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Bid not found or not authorized'
      });
    });
  });

  describe('getBiddingHistory', () => {
    it('should return bidding history', async () => {
      // Arrange
      req.params = { booking_id: 1 };
      req.user = { user_id: 1, role: 'user' };

      const mockHistory = [
        { id: 1, bid_amount: 10000, status: 'active', created_at: '2024-01-01' },
        { id: 2, bid_amount: 12000, status: 'cancelled', created_at: '2024-01-02' }
      ];

      Bid.getBiddingHistory.mockResolvedValue(mockHistory);

      // Act
      await BiddingController.getBiddingHistory(req, res);

      // Assert
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        history: mockHistory
      }));
      expect(Bid.getBiddingHistory).toHaveBeenCalledWith('1');
    });
  });
}); 