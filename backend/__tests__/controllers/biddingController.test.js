// __tests__/controllers/biddingController.test.js
const BiddingController = require('../../modules/asset-booking/controllers/biddingController');
const Booking = require('../../modules/asset-booking/models/Booking');
const Bid = require('../../modules/asset-booking/models/Bid');
const Asset = require('../../modules/asset-booking/models/Asset');
const AuditLog = require('../../modules/shared/models/AuditLog');

// Mock dependencies
jest.mock('../../modules/asset-booking/models/Booking');
jest.mock('../../modules/asset-booking/models/Bid');
jest.mock('../../modules/asset-booking/models/Asset');
jest.mock('../../modules/shared/models/AuditLog');
jest.mock('../../modules/asset-booking/utils/biddingValidation');
jest.mock('../../modules/asset-booking/utils/fairAllocation');
jest.mock('../../modules/shared/utils/cacheInvalidation');
jest.mock('../../modules/shared/utils/logger');

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
        auction_status: 'active',
        asset_id: 1,
        lob: 'Pharmacy'
      };

      const mockAsset = {
        id: 1,
        value_per_day: 500,
        level: 'secondary'
      };

      const mockBid = {
        id: 1,
        booking_id: 1,
        user_id: 1,
        bid_amount: 10000,
        status: 'active'
      };

      Booking.findById.mockResolvedValue(mockBooking);
      Asset.findById.mockResolvedValue(mockAsset);
      Bid.getActiveBids.mockResolvedValue([]);
      Bid.create.mockResolvedValue(mockBid);
      AuditLog.create.mockResolvedValue({ id: 1 });

      // Mock bidding validation
      const { validateBid } = require('../../modules/asset-booking/utils/biddingValidation');
      validateBid.mockResolvedValue({ valid: true, errors: [], warnings: [] });

      // Mock cache invalidation
      const cacheInvalidation = require('../../modules/shared/utils/cacheInvalidation');
      cacheInvalidation.smartInvalidate = jest.fn();
      cacheInvalidation.invalidatePatterns = jest.fn();

      // Act
      await BiddingController.placeBid(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Bid placed successfully',
        bid: mockBid
      });
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
        auction_status: 'closed'
      };

      Booking.findById.mockResolvedValue(mockBooking);

      // Act
      await BiddingController.placeBid(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Booking is not available for bidding',
        auctionStatus: 'closed'
      });
    });

    it('should update existing bid if user already bid', async () => {
      // Arrange
      const bidData = {
        booking_id: 1,
        bid_amount: 15000
      };

      req.body = bidData;
      req.user = { user_id: 1, role: 'user' };

      const mockBooking = {
        id: 1,
        auction_status: 'active',
        asset_id: 1,
        lob: 'Pharmacy'
      };

      const mockAsset = {
        id: 1,
        value_per_day: 500,
        level: 'secondary'
      };

      const existingBid = {
        id: 1,
        booking_id: 1,
        user_id: 1,
        bid_amount: 10000,
        status: 'active'
      };

      const updatedBid = {
        ...existingBid,
        bid_amount: 15000
      };

      Booking.findById.mockResolvedValue(mockBooking);
      Asset.findById.mockResolvedValue(mockAsset);
      Bid.getActiveBids.mockResolvedValue([existingBid]);
      Bid.updateBid.mockResolvedValue(updatedBid);
      AuditLog.create.mockResolvedValue({ id: 1 });

      // Mock bidding validation
      const { validateBid } = require('../../modules/asset-booking/utils/biddingValidation');
      validateBid.mockResolvedValue({ valid: true, errors: [], warnings: [] });

      // Mock cache invalidation
      const cacheInvalidation = require('../../modules/shared/utils/cacheInvalidation');
      cacheInvalidation.smartInvalidate = jest.fn();
      cacheInvalidation.invalidatePatterns = jest.fn();

      // Act
      await BiddingController.placeBid(req, res);

      // Assert
      expect(res.status).not.toHaveBeenCalled(); // No status call for 200
      expect(res.json).toHaveBeenCalledWith({
        message: 'Bid updated successfully',
        bid: updatedBid
      });
      expect(Bid.updateBid).toHaveBeenCalledWith(1, 15000, 1);
    });
  });

  describe('getBidsForBooking', () => {
    it('should return all bids for a booking', async () => {
      // Arrange
      req.params = { booking_id: 1 };
      req.user = { user_id: 1, role: 'admin' };

      const mockBids = [
        { id: 1, booking_id: 1, user_id: 1, bid_amount: 10000 },
        { id: 2, booking_id: 1, user_id: 2, bid_amount: 12000 }
      ];

      Bid.getActiveBids.mockResolvedValue(mockBids);

      // Act
      await BiddingController.getBidsForBooking(req, res);

      // Assert
      expect(res.json).toHaveBeenCalledWith({
        bids: expect.arrayContaining([
          expect.objectContaining({ id: 1, bid_amount: 10000 }),
          expect.objectContaining({ id: 2, bid_amount: 12000 })
        ]),
        totalBids: 2
      });
    });
  });

  describe('startAuction', () => {
    it('should start auction successfully', async () => {
      // Arrange
      req.params = { booking_id: 1 };
      req.user = { user_id: 1, role: 'admin' };

      const mockBooking = {
        id: 1,
        auction_status: 'pending'
      };

      Booking.findById.mockResolvedValue(mockBooking);
      Booking.update.mockResolvedValue({ ...mockBooking, auction_status: 'active' });

      // Act
      await BiddingController.startAuction(req, res);

      // Assert
      expect(res.json).toHaveBeenCalledWith({
        message: 'Auction started successfully',
        booking: expect.objectContaining({ auction_status: 'active' })
      });
    });
  });

  describe('endAuction', () => {
    it('should end auction and select winner', async () => {
      // Arrange
      req.params = { booking_id: 1 };
      req.user = { user_id: 1, role: 'admin' };

      const mockBooking = {
        id: 1,
        auction_status: 'active'
      };

      const mockBids = [
        { id: 1, user_id: 1, bid_amount: 10000, lob: 'Pharmacy' },
        { id: 2, user_id: 2, bid_amount: 12000, lob: 'Pharmacy' }
      ];

      Booking.update.mockResolvedValue({ ...mockBooking, auction_status: 'completed' });
      Bid.getActiveBids.mockResolvedValue(mockBids);
      Bid.updateBid.mockResolvedValue({ id: 1 });

      // Mock fair allocation
      const fairAllocation = require('../../modules/asset-booking/utils/fairAllocation');
      fairAllocation.resolveConflicts.mockResolvedValue([mockBids[1]]);

      // Mock cache invalidation
      const cacheInvalidation = require('../../modules/shared/utils/cacheInvalidation');
      cacheInvalidation.smartInvalidate = jest.fn();

      // Act
      await BiddingController.endAuction(req, res);

      // Assert
      expect(res.json).toHaveBeenCalledWith({
        message: 'Auction completed successfully',
        winner: mockBids[1],
        totalBids: 2
      });
    });

    it('should handle auction with no bids', async () => {
      // Arrange
      req.params = { booking_id: 1 };
      req.user = { user_id: 1, role: 'admin' };

      const mockBooking = {
        id: 1,
        auction_status: 'active'
      };

      Booking.update.mockResolvedValue({ ...mockBooking, auction_status: 'cancelled' });
      Bid.getActiveBids.mockResolvedValue([]);

      // Act
      await BiddingController.endAuction(req, res);

      // Assert
      expect(res.json).toHaveBeenCalledWith({
        message: 'Auction cancelled - no bids received',
        winner: null
      });
    });
  });

  describe('cancelBid', () => {
    it('should cancel bid successfully', async () => {
      // Arrange
      req.params = { bid_id: 1 };
      req.user = { user_id: 1, role: 'user' };

      const mockBid = {
        id: 1,
        user_id: 1,
        status: 'cancelled',
        booking_id: 1
      };

      Bid.cancelBid.mockResolvedValue(mockBid);

      // Act
      await BiddingController.cancelBid(req, res);

      // Assert
      expect(res.json).toHaveBeenCalledWith({
        message: 'Bid cancelled successfully',
        bid: mockBid
      });
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
      req.params = { lob: 'Pharmacy' };
      req.query = { days: '30' };
      req.user = { user_id: 1, role: 'admin' };

      const mockHistory = [
        { id: 1, action: 'placed', bid_amount: 10000, timestamp: '2024-01-01' },
        { id: 2, action: 'updated', bid_amount: 12000, timestamp: '2024-01-02' }
      ];

      Bid.getBiddingHistory.mockResolvedValue(mockHistory);

      // Act
      await BiddingController.getBiddingHistory(req, res);

      // Assert
      expect(res.json).toHaveBeenCalledWith({
        lob: 'Pharmacy',
        history: mockHistory,
        totalBids: 2
      });
    });
  });
}); 