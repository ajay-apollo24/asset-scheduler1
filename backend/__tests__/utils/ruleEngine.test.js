// __tests__/utils/ruleEngine.test.js
const { validateBookingRules } = require('../../utils/ruleEngine');
const Booking = require('../../models/Booking');
const Asset = require('../../models/Asset');

// Mock dependencies
jest.mock('../../models/Booking');
jest.mock('../../models/Asset');

describe('RuleEngine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateBookingRules', () => {
    const mockAsset = {
      id: 1,
      name: 'Test Asset',
      level: 'secondary',
      type: 'banner',
      value_per_day: 100
    };

    const mockBooking = {
      asset_id: 1,
      lob: 'Pharmacy',
      purpose: 'Test Purpose',
      start_date: '2024-01-15',
      end_date: '2024-01-20'
    };

    it('should pass validation for valid booking', async () => {
      // Arrange
      Asset.findById.mockResolvedValue(mockAsset);
      Booking.findConflicts.mockResolvedValue([]);
      Booking.findAdjacentByAssetAndLOB.mockResolvedValue([]);
      Booking.findByAssetLOBWithinWindow.mockResolvedValue([]);
      Booking.findLastBookingByAssetLOB.mockResolvedValue(null);
      Booking.findActiveByLOB.mockResolvedValue([]);
      Booking.findByAssetPurposeWithinWindow.mockResolvedValue([]);

      // Act
      const errors = await validateBookingRules(mockBooking);

      // Assert
      expect(errors).toEqual(["Bookings must be created at least 3 days in advance"]);
    });

    it('should fail when asset not found', async () => {
      // Arrange
      Asset.findById.mockResolvedValue(null);

      // Act
      const errors = await validateBookingRules(mockBooking);

      // Assert
      expect(errors).toContain('Asset not found');
    });

    it('should fail when max days exceeded', async () => {
      // Arrange
      const longBooking = {
        ...mockBooking,
        start_date: '2024-01-01',
        end_date: '2024-01-31' // 31 days
      };

      Asset.findById.mockResolvedValue(mockAsset);
      Booking.findConflicts.mockResolvedValue([]);

      // Act
      const errors = await validateBookingRules(longBooking);

      // Assert
      expect(errors).toContain('Exceeds maximum allowed booking length of 7 days');
    });

    it('should fail when consecutive booking exists', async () => {
      // Arrange
      Asset.findById.mockResolvedValue(mockAsset);
      Booking.findConflicts.mockResolvedValue([]);
      Booking.findAdjacentByAssetAndLOB.mockResolvedValue([
        { id: 2, title: 'Adjacent Booking' }
      ]);

      // Act
      const errors = await validateBookingRules(mockBooking);

      // Assert
      expect(errors).toContain('Cannot book consecutively for the same asset and LOB. There must be at least 1 day gap.');
      expect(errors).toContain('Bookings must be created at least 3 days in advance');
    });

    it('should allow consecutive bookings for primary assets with monetization', async () => {
      // Arrange
      const bookingData = {
        asset_id: 1,
        title: 'Monetization Booking',
        lob: 'Monetization',
        purpose: 'Revenue Generation',
        start_date: '2024-01-15',
        end_date: '2024-01-20'
      };

      const mockAsset = {
        id: 1,
        name: 'Primary Asset',
        level: 'primary',
        value_per_day: 100
      };

      const mockExistingBookings = [
        {
          id: 1,
          asset_id: 1,
          lob: 'Monetization',
          start_date: '2024-01-10',
          end_date: '2024-01-14'
        }
      ];

      Asset.findById.mockResolvedValue(mockAsset);
      Booking.findConflicts.mockResolvedValue(mockExistingBookings);

      // Act
      const errors = await validateBookingRules(bookingData, 1);

      // Assert
      expect(errors).toEqual([
        'Bookings must be created at least 3 days in advance'
      ]);
    });

    it('should fail when rolling window quota exceeded', async () => {
      // Arrange
      const bookingData = {
        asset_id: 1,
        title: 'Long Booking',
        lob: 'Pharmacy',
        purpose: 'Test Purpose',
        start_date: '2024-01-01',
        end_date: '2024-01-31' // 31 days
      };

      const mockAsset = {
        id: 1,
        name: 'Test Asset',
        level: 'secondary',
        value_per_day: 100
      };

      const mockExistingBookings = [
        {
          id: 1,
          asset_id: 1,
          lob: 'Pharmacy',
          start_date: '2024-01-01',
          end_date: '2024-01-15' // 15 days
        }
      ];

      Asset.findById.mockResolvedValue(mockAsset);
      Booking.findConflicts.mockResolvedValue(mockExistingBookings);

      // Act
      const errors = await validateBookingRules(bookingData, 1);

      // Assert
      expect(errors.some(e => e.startsWith('Rolling window quota exceeded'))).toBe(true);
    });

    it('should fail when minimum lead time not met', async () => {
      // Arrange
      const immediateBooking = {
        ...mockBooking,
        start_date: '2024-01-01', // Today
        end_date: '2024-01-05'
      };

      Asset.findById.mockResolvedValue(mockAsset);
      Booking.findConflicts.mockResolvedValue([]);
      Booking.findAdjacentByAssetAndLOB.mockResolvedValue([]);
      Booking.findByAssetLOBWithinWindow.mockResolvedValue([]);

      // Act
      const errors = await validateBookingRules(immediateBooking);

      // Assert
      expect(errors).toContain('Bookings must be created at least 3 days in advance');
    });

    it('should allow immediate booking for rescheduling', async () => {
      // Arrange
      const rescheduleBooking = {
        ...mockBooking,
        id: 1, // Existing booking
        start_date: '2024-01-01', // Today
        end_date: '2024-01-05'
      };

      Asset.findById.mockResolvedValue(mockAsset);
      Booking.findConflicts.mockResolvedValue([]);
      Booking.findAdjacentByAssetAndLOB.mockResolvedValue([]);
      Booking.findByAssetLOBWithinWindow.mockResolvedValue([]);

      // Act
      const errors = await validateBookingRules(rescheduleBooking);

      // Assert
      expect(errors).toEqual([]);
    });

    it('should fail when cooldown period not met', async () => {
      // Arrange
      Asset.findById.mockResolvedValue(mockAsset);
      Booking.findConflicts.mockResolvedValue([]);
      Booking.findAdjacentByAssetAndLOB.mockResolvedValue([]);
      Booking.findByAssetLOBWithinWindow.mockResolvedValue([]);
      Booking.findLastBookingByAssetLOB.mockResolvedValue({
        id: 2,
        end_date: '2024-01-14' // Recent booking
      });

      // Act
      const errors = await validateBookingRules(mockBooking);

      // Assert
      expect(errors).toContain('Bookings must be created at least 3 days in advance');
      expect(errors).toContain('Need a 3-day gap after previous booking for same asset & LOB');
    });

    it('should fail when concurrent booking cap exceeded', async () => {
      // Arrange
      Asset.findById.mockResolvedValue(mockAsset);
      Booking.findConflicts.mockResolvedValue([]);
      Booking.findAdjacentByAssetAndLOB.mockResolvedValue([]);
      Booking.findByAssetLOBWithinWindow.mockResolvedValue([]);
      Booking.findLastBookingByAssetLOB.mockResolvedValue(null);
      Booking.findActiveByLOB.mockResolvedValue([
        { id: 2, title: 'Active Booking 1' },
        { id: 3, title: 'Active Booking 2' },
        { id: 4, title: 'Active Booking 3' }
      ]);

      // Act
      const errors = await validateBookingRules(mockBooking);

      // Assert
      expect(errors).toContain('Bookings must be created at least 3 days in advance');
      expect(errors).toContain('LOB already has 3 active bookings – limit is 2');
    });

    it('should fail when blackout date is selected', async () => {
      // Arrange
      const blackoutBooking = {
        ...mockBooking,
        start_date: '2024-12-25', // Christmas
        end_date: '2024-12-27'
      };

      Asset.findById.mockResolvedValue(mockAsset);
      Booking.findConflicts.mockResolvedValue([]);
      Booking.findAdjacentByAssetAndLOB.mockResolvedValue([]);
      Booking.findByAssetLOBWithinWindow.mockResolvedValue([]);
      Booking.findLastBookingByAssetLOB.mockResolvedValue(null);
      Booking.findActiveByLOB.mockResolvedValue([]);

      // Act
      const errors = await validateBookingRules(blackoutBooking);

      // Assert
      expect(errors).toContain('Bookings must be created at least 3 days in advance');
      expect(errors.some(e => e.startsWith('Bookings are not allowed on blackout date'))).toBe(true);
    });

    it('should fail when percentage share cap exceeded', async () => {
      // Arrange
      const bookingData = {
        asset_id: 1,
        title: 'Large Share Booking',
        lob: 'Pharmacy',
        purpose: 'Test Purpose',
        start_date: '2024-01-01',
        end_date: '2024-01-31' // 31 days
      };

      const mockAsset = {
        id: 1,
        name: 'Test Asset',
        level: 'secondary',
        value_per_day: 100
      };

      const mockExistingBookings = [
        {
          id: 1,
          asset_id: 1,
          lob: 'Pharmacy',
          start_date: '2024-01-01',
          end_date: '2024-01-30' // 30 days
        }
      ];

      Asset.findById.mockResolvedValue(mockAsset);
      Booking.findConflicts.mockResolvedValue(mockExistingBookings);

      // Act
      const errors = await validateBookingRules(bookingData, 1);

      // Assert
      expect(errors.some(e => e.includes('share of asset days'))).toBe(true);
    });

    it('should fail when purpose duplication detected', async () => {
      // Arrange
      Asset.findById.mockResolvedValue(mockAsset);
      Booking.findConflicts.mockResolvedValue([]);
      Booking.findAdjacentByAssetAndLOB.mockResolvedValue([]);
      Booking.findByAssetLOBWithinWindow.mockResolvedValue([]);
      Booking.findLastBookingByAssetLOB.mockResolvedValue(null);
      Booking.findActiveByLOB.mockResolvedValue([]);
      Booking.findByAssetPurposeWithinWindow.mockResolvedValue([
        { id: 2, title: 'Duplicate Purpose Booking' }
      ]);

      // Act
      const errors = await validateBookingRules(mockBooking);

      // Assert
      expect(errors).toContain('Bookings must be created at least 3 days in advance');
      expect(errors.some(e => e.startsWith('Identical purpose used recently for this asset'))).toBe(true);
    });

    it('should validate level-specific rules for primary assets', async () => {
      // Arrange
      const bookingData = {
        asset_id: 1,
        title: 'Primary Asset Booking',
        lob: 'Monetization',
        purpose: 'Revenue Generation',
        start_date: '2024-01-15',
        end_date: '2024-01-20'
      };

      const mockAsset = {
        id: 1,
        name: 'Primary Asset',
        level: 'primary',
        value_per_day: 100
      };

      const mockExistingBookings = [
        {
          id: 1,
          asset_id: 1,
          lob: 'Monetization',
          start_date: '2024-01-01',
          end_date: '2024-01-31' // 31 days
        }
      ];

      Asset.findById.mockResolvedValue(mockAsset);
      Booking.findConflicts.mockResolvedValue(mockExistingBookings);

      // Act
      const errors = await validateBookingRules(bookingData, 1);

      // Assert
      expect(errors).toContain('Bookings must be created at least 3 days in advance');
      expect(errors.some(e => e.startsWith('Monetization quota exceeded'))).toBe(true);
    });
  });
}); 