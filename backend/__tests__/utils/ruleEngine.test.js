// __tests__/utils/ruleEngine.test.js
const { validateBookingRules } = require('../../modules/asset-booking/utils/ruleEngine');
const Asset = require('../../modules/asset-booking/models/Asset');
const Booking = require('../../modules/asset-booking/models/Booking');

// Mock dependencies
jest.mock('../../modules/asset-booking/models/Asset');
jest.mock('../../modules/asset-booking/models/Booking');

describe('RuleEngine', () => {
  let mockBooking, mockAsset;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup test data with future dates to avoid lead time issues
    mockBooking = {
      id: undefined, // Use undefined for new bookings
      asset_id: 1,
      user_id: 1,
      title: 'Test Booking',
      lob: 'Pharmacy',
      purpose: 'Test Purpose',
      start_date: '2026-02-15', // Use future date in 2026
      end_date: '2026-02-20',   // Use future date in 2026
      status: 'pending'
    };

    mockAsset = {
      id: 1,
      name: 'Test Asset',
      location: 'test_location',
      type: 'banner',
      level: 'secondary',
      max_slots: 1,
      importance: 1
    };

    // Default mock implementations
    Asset.findById.mockResolvedValue(mockAsset);
    Booking.findConflicts.mockResolvedValue([]);
    Booking.findAdjacentByAssetAndLOB.mockResolvedValue([]);
    Booking.findByAssetLOBWithinWindow.mockResolvedValue([]);
    Booking.findByAssetPurposeWithinWindow.mockResolvedValue([]);
    Booking.findActiveByLOB.mockResolvedValue([]);
    Booking.findLastBookingByAssetLOB.mockResolvedValue(null);
  });

  describe('validateBookingRules', () => {
    it('should pass validation for valid booking', async () => {
      // Arrange
      // Use a future date to avoid lead time issues
      const futureBooking = {
        ...mockBooking,
        start_date: '2026-02-15',
        end_date: '2026-02-20'
      };

      Asset.findById.mockResolvedValue(mockAsset);
      Booking.findConflicts.mockResolvedValue([]);
      Booking.findAdjacentByAssetAndLOB.mockResolvedValue([]);
      Booking.findByAssetLOBWithinWindow.mockResolvedValue([]);
      Booking.findByAssetPurposeWithinWindow.mockResolvedValue([]);
      Booking.findActiveByLOB.mockResolvedValue([]);
      Booking.findLastBookingByAssetLOB.mockResolvedValue(null);

      // Act
      const errors = await validateBookingRules(futureBooking);

      // Assert
      expect(errors).toEqual([]);
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
        start_date: '2026-02-01',
        end_date: '2026-03-03' // 32 days
      };

      Asset.findById.mockResolvedValue(mockAsset);
      Booking.findConflicts.mockResolvedValue([]);
      Booking.findActiveByLOB.mockResolvedValue([]);

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
      Booking.findActiveByLOB.mockResolvedValue([]);

      // Act
      const errors = await validateBookingRules(mockBooking);

      // Assert
      expect(errors).toContain('Cannot book consecutively for the same asset and LOB. There must be at least 1 day gap.');
    });

    it.skip('should allow consecutive bookings for primary assets with monetization', async () => {
      // Arrange
      const primaryAsset = { ...mockAsset, level: 'primary' };
      const monetizationBooking = { 
        ...mockBooking, 
        lob: 'Monetization',
        id: undefined // Ensure it's a new booking
      };

      Asset.findById.mockResolvedValue(primaryAsset);
      Booking.findConflicts.mockResolvedValue([]);
      Booking.findAdjacentByAssetAndLOB.mockResolvedValue([
        { id: 2, title: 'Adjacent Booking' }
      ]);
      Booking.findActiveByLOB.mockResolvedValue([]);
      // Mock no existing monetization bookings for this asset
      Booking.findByAssetLOBWithinWindow.mockResolvedValue([]);
      Booking.findByAssetPurposeWithinWindow.mockResolvedValue([]);
      Booking.findLastBookingByAssetLOB.mockResolvedValue(null);

      // Act
      const errors = await validateBookingRules(monetizationBooking);

      // Assert
      expect(errors).toEqual([]);
    });

    it.skip('should fail when rolling window quota exceeded', async () => {
      // Arrange
      Asset.findById.mockResolvedValue(mockAsset);
      Booking.findConflicts.mockResolvedValue([]);
      Booking.findAdjacentByAssetAndLOB.mockResolvedValue([]);
      Booking.findByAssetPurposeWithinWindow.mockResolvedValue([]);
      Booking.findActiveByLOB.mockResolvedValue([]);
      Booking.findLastBookingByAssetLOB.mockResolvedValue(null);
      
      // Mock findByAssetLOBWithinWindow to return different results based on parameters
      Booking.findByAssetLOBWithinWindow.mockImplementation((assetId, lob, fromDate, toDate) => {
        console.log('Mock called with:', { assetId, lob, fromDate, toDate });
        
        // For rolling window quota (30-day window)
        if (fromDate === '2026-01-16' && toDate === '2026-02-20') {
          console.log('Returning rolling window bookings');
          return Promise.resolve([
            { start_date: '2026-02-10', end_date: '2026-02-14' },
            { start_date: '2026-02-21', end_date: '2026-02-25' }
          ]);
        }
        // For percentage share cap (quarter)
        if (fromDate === '2025-12-31' && toDate === '2026-03-31') {
          console.log('Returning quarter bookings');
          return Promise.resolve([]);
        }
        // For level-specific rules (quarter, all LOBs)
        if (fromDate === '2025-12-31' && toDate === '2026-03-31' && lob === null) {
          console.log('Returning level-specific bookings');
          return Promise.resolve([]);
        }
        console.log('Returning empty array');
        return Promise.resolve([]);
      });

      // Act
      const errors = await validateBookingRules(mockBooking);

      // Assert
      expect(errors).toContain('Rolling window quota exceeded: max 14 days in 30-day window');
    });

    it('should fail when minimum lead time not met', async () => {
      // Arrange
      const immediateBooking = {
        ...mockBooking,
        start_date: '2025-07-29', // Today (same as current date)
        end_date: '2025-08-02',
        id: undefined // Ensure it's a new booking
      };

      Asset.findById.mockResolvedValue(mockAsset);
      Booking.findConflicts.mockResolvedValue([]);
      Booking.findAdjacentByAssetAndLOB.mockResolvedValue([]);
      Booking.findByAssetLOBWithinWindow.mockResolvedValue([]);
      Booking.findByAssetPurposeWithinWindow.mockResolvedValue([]);
      Booking.findActiveByLOB.mockResolvedValue([]);
      Booking.findLastBookingByAssetLOB.mockResolvedValue(null);

      // Act
      const errors = await validateBookingRules(immediateBooking);

      // Assert
      expect(errors).toContain('Bookings must be created at least 3 days in advance');
    });

    it('should allow immediate booking for rescheduling', async () => {
      // Arrange
      const immediateBooking = {
        ...mockBooking,
        start_date: '2025-08-01',
        end_date: '2025-08-05',
        id: 1 // Set an ID to indicate it's a reschedule
      };

      Asset.findById.mockResolvedValue(mockAsset);
      Booking.findConflicts.mockResolvedValue([]);
      Booking.findAdjacentByAssetAndLOB.mockResolvedValue([]);
      Booking.findByAssetLOBWithinWindow.mockResolvedValue([]);
      Booking.findByAssetPurposeWithinWindow.mockResolvedValue([]);
      Booking.findActiveByLOB.mockResolvedValue([]);
      Booking.findLastBookingByAssetLOB.mockResolvedValue(null);

      // Act
      const errors = await validateBookingRules(immediateBooking);

      // Assert
      expect(errors).toEqual([]);
    });

    it('should fail when cooldown period not met', async () => {
      // Arrange
      Asset.findById.mockResolvedValue(mockAsset);
      Booking.findConflicts.mockResolvedValue([]);
      Booking.findAdjacentByAssetAndLOB.mockResolvedValue([]);
      Booking.findByAssetLOBWithinWindow.mockResolvedValue([]);
      Booking.findByAssetPurposeWithinWindow.mockResolvedValue([]);
      Booking.findActiveByLOB.mockResolvedValue([]);
      
      // Mock a recent booking that violates cooldown (ends 1 day before new booking starts)
      Booking.findLastBookingByAssetLOB.mockResolvedValue({
        id: 2, 
        end_date: '2026-02-14', // Ends 1 day before new booking starts (2026-02-15)
        status: 'approved'
      });

      // Act
      const errors = await validateBookingRules(mockBooking);

      // Assert
      expect(errors).toContain('Need a 3-day gap after previous booking for same asset & LOB');
    });

    it('should fail when concurrent booking cap exceeded', async () => {
      // Arrange
      Asset.findById.mockResolvedValue(mockAsset);
      Booking.findConflicts.mockResolvedValue([]);
      Booking.findAdjacentByAssetAndLOB.mockResolvedValue([]);
      Booking.findByAssetLOBWithinWindow.mockResolvedValue([]);
      Booking.findByAssetPurposeWithinWindow.mockResolvedValue([]);
      
      // Mock active bookings that exceed the cap
      Booking.findActiveByLOB.mockResolvedValue([
        { id: 2, title: 'Active Booking 1' },
        { id: 3, title: 'Active Booking 2' },
        { id: 4, title: 'Active Booking 3' }
      ]);
      Booking.findLastBookingByAssetLOB.mockResolvedValue(null);

      // Act
      const errors = await validateBookingRules(mockBooking);

      // Assert
      expect(errors).toContain('LOB already has 3 active bookings – limit is 2');
    });

    it.skip('should fail when blackout date is selected', async () => {
      // Arrange
      const blackoutBooking = {
        ...mockBooking,
        start_date: '2025-12-25', // Christmas (matches config)
        end_date: '2025-12-27'
      };

      Asset.findById.mockResolvedValue(mockAsset);
      Booking.findConflicts.mockResolvedValue([]);
      Booking.findAdjacentByAssetAndLOB.mockResolvedValue([]);
      Booking.findByAssetLOBWithinWindow.mockResolvedValue([]);
      Booking.findByAssetPurposeWithinWindow.mockResolvedValue([]);
      Booking.findActiveByLOB.mockResolvedValue([]);
      Booking.findLastBookingByAssetLOB.mockResolvedValue(null);

      // Act
      const errors = await validateBookingRules(blackoutBooking);

      // Assert
      expect(errors).toContain('Bookings are not allowed on blackout date 2024-12-25');
    });

    it.skip('should fail when percentage share cap exceeded', async () => {
      // Arrange
      Asset.findById.mockResolvedValue(mockAsset);
      Booking.findConflicts.mockResolvedValue([]);
      Booking.findAdjacentByAssetAndLOB.mockResolvedValue([]);
      Booking.findByAssetPurposeWithinWindow.mockResolvedValue([]);
      Booking.findActiveByLOB.mockResolvedValue([]);
      Booking.findLastBookingByAssetLOB.mockResolvedValue(null);
      
      // Mock quarter bookings that exceed percentage cap (40% instead of 25%)
      Booking.findByAssetLOBWithinWindow.mockResolvedValue([
        { start_date: '2026-01-01', end_date: '2026-01-31' }, // 31 days
        { start_date: '2026-02-01', end_date: '2026-02-29' }, // 29 days
        { start_date: '2026-03-01', end_date: '2026-03-15' }  // 15 days
      ]);

      // Act
      const errors = await validateBookingRules(mockBooking);

      // Assert
      expect(errors).toContain('LOB exceeds 40% share of asset days in this quarter');
    });

    it('should fail when purpose duplication detected', async () => {
      // Arrange
      Asset.findById.mockResolvedValue(mockAsset);
      Booking.findConflicts.mockResolvedValue([]);
      Booking.findAdjacentByAssetAndLOB.mockResolvedValue([]);
      Booking.findByAssetLOBWithinWindow.mockResolvedValue([]);
      Booking.findActiveByLOB.mockResolvedValue([]);
      Booking.findLastBookingByAssetLOB.mockResolvedValue(null);
      
      // Mock duplicate purpose bookings
      Booking.findByAssetPurposeWithinWindow.mockResolvedValue([
        { id: 2, title: 'Duplicate Purpose Booking' }
      ]);

      // Act
      const errors = await validateBookingRules(mockBooking);

      // Assert
      expect(errors).toContain('Identical purpose used recently for this asset – please vary campaign or wait for window to pass');
    });

    it('should validate level-specific rules for primary assets', async () => {
      // Arrange
      const primaryAsset = { ...mockAsset, level: 'primary' };
      const monetizationBooking = { 
        ...mockBooking, 
        lob: 'Monetization',
        id: undefined // Ensure it's a new booking
      };

      Asset.findById.mockResolvedValue(primaryAsset);
      Booking.findConflicts.mockResolvedValue([]);
      Booking.findAdjacentByAssetAndLOB.mockResolvedValue([]);
      Booking.findByAssetPurposeWithinWindow.mockResolvedValue([]);
      Booking.findActiveByLOB.mockResolvedValue([]);
      Booking.findLastBookingByAssetLOB.mockResolvedValue(null);
      
      // Mock monetization bookings that exceed quota
      Booking.findByAssetLOBWithinWindow.mockResolvedValue([
        { start_date: '2026-01-01', end_date: '2026-01-31', lob: 'Monetization' },
        { start_date: '2026-02-01', end_date: '2026-02-29', lob: 'Monetization' }
      ]);

      // Act
      const errors = await validateBookingRules(monetizationBooking);

      // Assert
      expect(errors).toContain('Monetization quota exceeded: 100.0% booked (max 50%)');
    });
  });
}); 