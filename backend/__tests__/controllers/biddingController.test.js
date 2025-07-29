const BiddingController = require('../../controllers/biddingController');
const Bid = require('../../models/Bid');
const Booking = require('../../models/Booking');
const User = require('../../models/User');

// Mock dependencies
jest.mock('../../models/Bid');
jest.mock('../../models/Booking');
jest.mock('../../models/User');
jest.mock('../../utils/logger');
jest.mock('../../utils/fairAllocation');

describe('Bidding Controller', () => {
  let req, res, next;
  let mockUser;
  let mockBooking;
  let mockBid;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock user
    mockUser = {
      user_id: 1,
      email: 'test@example.com',
      role: 'user'
    };

    // Mock booking
    mockBooking = {
      id: 1,
      title: 'Test Campaign',
      asset_id: 1,
      user_id: 1,
      start_date: '2024-01-01',
      end_date: '2024-01-05',
      lob: 'Marketing',
      status: 'approved',
      auction_status: 'active',
      estimated_cost: 10000
    };

    // Mock bid
    mockBid = {
      id: 1,
      booking_id: 1,
      user_id: 2,
      lob: 'Sales',
      bid_amount: 12000,
      max_bid: 15000,
      bid_reason: 'High priority campaign',
      created_at: new Date()
    };

    // Setup request/response objects
    req = {
      body: {},
      params: {},
      user: mockUser,
      app: {
        locals: {
          responseCache: new Map()
        }
      }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  describe('placeBid', () => {
    it('should place a bid successfully', async () => {
      // Arrange
      req.body = {
        booking_id: 1,
        bid_amount: 12000,
        max_bid: 15000,
        bid_reason: 'High priority campaign'
      };

      Booking.findById.mockResolvedValue(mockBooking);
      Bid.getActiveBids.mockResolvedValue([]);
      Bid.create.mockResolvedValue(mockBid);

      // Act
      await BiddingController.placeBid(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Bid placed successfully',
        bid: mockBid
      });
      expect(Bid.create).toHaveBeenCalledWith({
        booking_id: 1,
        lob: 'Marketing',
        bid_amount: 12000,
        max_bid: 15000,
        bid_reason: 'High priority campaign',
        user_id: 1
      });
    });

    it('should return 404 if booking not found', async () => {
      // Arrange
      req.body = { booking_id: 999, bid_amount: 12000 };
      Booking.findById.mockResolvedValue(null);

      // Act
      await BiddingController.placeBid(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Booking not found' });
    });

    it('should return 400 if auction is not active', async () => {
      // Arrange
      const inactiveBooking = { ...mockBooking, auction_status: 'completed' };
      req.body = { booking_id: 1, bid_amount: 12000 };
      Booking.findById.mockResolvedValue(inactiveBooking);

      // Act
      await BiddingController.placeBid(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ 
        message: 'Booking is not available for bidding',
        auctionStatus: 'completed'
      });
    });

    it('should update existing bid if user already bid', async () => {
      // Arrange
      req.body = { booking_id: 1, bid_amount: 13000 };
      const existingBid = { ...mockBid, user_id: 1 };
      
      Booking.findById.mockResolvedValue(mockBooking);
      Bid.getActiveBids.mockResolvedValue([existingBid]);
      Bid.updateBid.mockResolvedValue({ ...existingBid, bid_amount: 13000 });

      // Act
      await BiddingController.placeBid(req, res);

      // Assert
      expect(res.json).toHaveBeenCalledWith({
        message: 'Bid updated successfully',
        bid: { ...existingBid, bid_amount: 13000 }
      });
    });
  });

  describe('getBidsForBooking', () => {
    it('should return all bids for a booking', async () => {
      // Arrange
      req.params = { booking_id: 1 };
      const mockBids = [mockBid, { ...mockBid, id: 2, bid_amount: 13000 }];
      
      Bid.getActiveBids.mockResolvedValue(mockBids);
      
      const fairAllocation = require('../../utils/fairAllocation');
      fairAllocation.calculateFairnessScore.mockResolvedValue(0.5);

      // Act
      await BiddingController.getBidsForBooking(req, res);

      // Assert
      expect(res.json).toHaveBeenCalledWith({
        bids: expect.arrayContaining([
          expect.objectContaining({ id: 1, bid_amount: 12000 }),
          expect.objectContaining({ id: 2, bid_amount: 13000 })
        ]),
        totalBids: 2
      });
    });
  });

  describe('startAuction', () => {
    it('should start auction successfully', async () => {
      // Arrange
      req.params = { booking_id: 1 };
      Booking.update.mockResolvedValue({ ...mockBooking, auction_status: 'active' });

      // Act
      await BiddingController.startAuction(req, res);

      // Assert
      expect(res.json).toHaveBeenCalledWith({
        message: 'Auction started successfully',
        booking: { ...mockBooking, auction_status: 'active' }
      });
      expect(Booking.update).toHaveBeenCalledWith(1, {
        auction_status: 'active'
      });
    });
  });

  describe('endAuction', () => {
    it('should end auction and select winner', async () => {
      // Arrange
      req.params = { booking_id: 1 };
      const mockBids = [
        { ...mockBid, id: 1, bid_amount: 12000 },
        { ...mockBid, id: 2, bid_amount: 13000, user_id: 3 }
      ];

      Bid.getActiveBids.mockResolvedValue(mockBids);
      Booking.update.mockResolvedValue([1]);
      Bid.updateBid.mockResolvedValue([1]);

      const fairAllocation = require('../../utils/fairAllocation');
      fairAllocation.resolveConflicts.mockResolvedValue([mockBids[1]]);

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
      Bid.getActiveBids.mockResolvedValue([]);
      Booking.update.mockResolvedValue([1]);

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
      req.params = { lob: 'Marketing' };
      req.query = { days: '30' };
      const mockHistory = [mockBid, { ...mockBid, id: 2 }];
      
      Bid.getBiddingHistory.mockResolvedValue(mockHistory);

      // Act
      await BiddingController.getBiddingHistory(req, res);

      // Assert
      expect(res.json).toHaveBeenCalledWith({
        lob: 'Marketing',
        history: mockHistory,
        totalBids: 2
      });
    });
  });
}); 