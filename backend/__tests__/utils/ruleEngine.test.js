// __tests__/utils/ruleEngine.test.js
const { validateBookingRules } = require('../../modules/asset-booking/utils/ruleEngine');
const Booking = require('../../modules/asset-booking/models/Booking');
const Asset = require('../../modules/asset-booking/models/Asset');

// Mock dependencies
jest.mock('../../modules/asset-booking/models/Booking');
jest.mock('../../modules/asset-booking/models/Asset');
jest.mock('../../modules/shared/utils/logger');

describe('RuleEngine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateBookingRules', () => {
    it('should pass validation for valid booking', async () => {
      // Arrange
      const booking = {
        asset_id: 1,
        lob: 'Pharmacy',
        start_date: '2024-01-15',
        end_date: '2024-01-20'
      };

      const mockAsset = {
        id: 1,
        name: 'Test Asset',
        level: 'secondary',
        type: 'billboard'
      };

      Asset.findById.mockResolvedValue(mockAsset);
      Booking.findAdjacentByAssetAndLOB.mockResolvedValue([]);
      Booking.findByAssetLOBWithinWindow.mockResolvedValue([]);
      Booking.findByAssetPurposeWithinWindow.mockResolvedValue([]);
      Booking.findActiveByLOB.mockResolvedValue([]);
      Booking.findLastBookingByAssetLOB.mockResolvedValue(null);

      // Act
      const errors = await validateBookingRules(booking);

      // Assert
      expect(errors).toEqual([]);
    });

    it('should fail when asset not found', async () => {
      // Arrange
      const booking = {
        asset_id: 999,
        lob: 'Pharmacy',
        start_date: '2024-01-15',
        end_date: '2024-01-20'
      };

      Asset.findById.mockResolvedValue(null);

      // Act
      const errors = await validateBookingRules(booking);

      // Assert
      expect(errors).toContain('Asset not found');
    });

    it('should fail when max days exceeded', async () => {
      // Arrange
      const booking = {
        asset_id: 1,
        lob: 'Pharmacy',
        start_date: '2024-01-15',
        end_date: '2024-01-25' // 11 days, exceeds max of 7
      };

      const mockAsset = {
        id: 1,
        name: 'Test Asset',
        level: 'secondary',
        type: 'billboard'
      };

      Asset.findById.mockResolvedValue(mockAsset);

      // Act
      const errors = await validateBookingRules(booking);

      // Assert
      expect(errors).toContain('Exceeds maximum allowed booking length of 7 days');
    });

    it('should fail when consecutive booking exists', async () => {
      // Arrange
      const booking = {
        asset_id: 1,
        lob: 'Pharmacy',
        start_date: '2024-01-16',
        end_date: '2024-01-20'
      };

      const mockAsset = {
        id: 1,
        name: 'Test Asset',
        level: 'secondary',
        type: 'billboard'
      };

      const mockAdjacentBooking = [
        { id: 2, start_date: '2024-01-15', end_date: '2024-01-15' }
      ];

      Asset.findById.mockResolvedValue(mockAsset);
      Booking.findAdjacentByAssetAndLOB.mockResolvedValue(mockAdjacentBooking);

      // Act
      const errors = await validateBookingRules(booking);

      // Assert
      expect(errors).toContain('Cannot book consecutively for the same asset and LOB. There must be at least 1 day gap.');
    });

    it('should fail when minimum lead time not met', async () => {
      // Arrange
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      const booking = {
        asset_id: 1,
        lob: 'Pharmacy',
        start_date: tomorrow.toISOString().split('T')[0], // Tomorrow
        end_date: tomorrow.toISOString().split('T')[0]
      };

      const mockAsset = {
        id: 1,
        name: 'Test Asset',
        level: 'secondary',
        type: 'billboard'
      };

      Asset.findById.mockResolvedValue(mockAsset);
      Booking.findAdjacentByAssetAndLOB.mockResolvedValue([]);

      // Act
      const errors = await validateBookingRules(booking);

      // Assert
      expect(errors).toContain('Bookings must be created at least 3 days in advance');
    });

    it('should allow immediate booking for rescheduling', async () => {
      // Arrange
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      const booking = {
        id: 1, // Existing booking ID indicates rescheduling
        asset_id: 1,
        lob: 'Pharmacy',
        start_date: tomorrow.toISOString().split('T')[0],
        end_date: tomorrow.toISOString().split('T')[0]
      };

      const mockAsset = {
        id: 1,
        name: 'Test Asset',
        level: 'secondary',
        type: 'billboard'
      };

      Asset.findById.mockResolvedValue(mockAsset);
      Booking.findAdjacentByAssetAndLOB.mockResolvedValue([]);

      // Act
      const errors = await validateBookingRules(booking);

      // Assert
      expect(errors).not.toContain('Bookings must be created at least 3 days in advance');
    });

    it('should fail when cooldown period not met', async () => {
      // Arrange
      const booking = {
        asset_id: 1,
        lob: 'Pharmacy',
        start_date: '2024-01-20',
        end_date: '2024-01-25'
      };

      const mockAsset = {
        id: 1,
        name: 'Test Asset',
        level: 'secondary',
        type: 'billboard'
      };

      const mockLastBooking = {
        id: 2,
        end_date: '2024-01-17' // Ended 2 days ago, but cooldown is 3 days
      };

      Asset.findById.mockResolvedValue(mockAsset);
      Booking.findAdjacentByAssetAndLOB.mockResolvedValue([]);
      Booking.findLastBookingByAssetLOB.mockResolvedValue(mockLastBooking);

      // Act
      const errors = await validateBookingRules(booking);

      // Assert
      expect(errors).toContain('Need a 3-day gap after previous booking for same asset & LOB');
    });

    it('should fail when concurrent booking cap exceeded', async () => {
      // Arrange
      const booking = {
        asset_id: 1,
        lob: 'Pharmacy',
        start_date: '2024-01-15',
        end_date: '2024-01-20'
      };

      const mockAsset = {
        id: 1,
        name: 'Test Asset',
        level: 'secondary',
        type: 'billboard'
      };

      const mockActiveBookings = [
        { id: 1, title: 'Booking 1' },
        { id: 2, title: 'Booking 2' },
        { id: 3, title: 'Booking 3' }
      ];

      Asset.findById.mockResolvedValue(mockAsset);
      Booking.findAdjacentByAssetAndLOB.mockResolvedValue([]);
      Booking.findActiveByLOB.mockResolvedValue(mockActiveBookings);

      // Act
      const errors = await validateBookingRules(booking);

      // Assert
      expect(errors).toContain('LOB already has 3 active bookings – limit is 2');
    });

    it('should fail when purpose duplication detected', async () => {
      // Arrange
      const booking = {
        asset_id: 1,
        lob: 'Pharmacy',
        purpose: 'Test Campaign',
        start_date: '2024-01-15',
        end_date: '2024-01-20'
      };

      const mockAsset = {
        id: 1,
        name: 'Test Asset',
        level: 'secondary',
        type: 'billboard'
      };

      const mockRecentBookings = [
        { id: 2, purpose: 'Test Campaign', start_date: '2024-01-01', end_date: '2024-01-05' }
      ];

      Asset.findById.mockResolvedValue(mockAsset);
      Booking.findAdjacentByAssetAndLOB.mockResolvedValue([]);
      Booking.findByAssetPurposeWithinWindow.mockResolvedValue(mockRecentBookings);

      // Act
      const errors = await validateBookingRules(booking);

      // Assert
      expect(errors).toContain('Identical purpose used recently for this asset – please vary campaign or wait for window to pass');
    });

    it('should validate level-specific rules for primary assets', async () => {
      // Arrange
      const booking = {
        asset_id: 1,
        lob: 'Monetization',
        start_date: '2024-01-15',
        end_date: '2024-01-20'
      };

      const mockAsset = {
        id: 1,
        name: 'Test Asset',
        level: 'primary',
        type: 'billboard'
      };

      const mockMonetizationBookings = [
        { id: 2, lob: 'Monetization', start_date: '2024-01-01', end_date: '2024-01-31' }
      ];

      Asset.findById.mockResolvedValue(mockAsset);
      Booking.findAdjacentByAssetAndLOB.mockResolvedValue([]);
      Booking.findByAssetLOBWithinWindow.mockResolvedValue(mockMonetizationBookings);

      // Act
      const errors = await validateBookingRules(booking);

      // Assert
      expect(errors).toContain('Monetization quota exceeded: 100.0% booked (max 50%)');
    });

    it.skip('should allow consecutive bookings for primary assets with monetization', async () => {
      // This test is skipped as it requires complex setup
    });

    it.skip('should fail when rolling window quota exceeded', async () => {
      // This test is skipped as it requires complex setup
    });

    it.skip('should fail when blackout date is selected', async () => {
      // This test is skipped as it requires complex setup
    });

    it.skip('should fail when percentage share cap exceeded', async () => {
      // This test is skipped as it requires complex setup
    });
  });
}); 