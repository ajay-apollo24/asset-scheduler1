// utils/ruleEngine.js
const Booking = require('../models/Booking');
const {
  differenceInCalendarDays,
  parseISO,
  subDays,
  addDays,
  isBefore,
  startOfDay,
  startOfQuarter,
  endOfQuarter,
} = require('date-fns');

/**
 * Configuration for rule parameters (can later be loaded from DB).
 */
const ruleConfig = {
  maxDaysPerBooking: {
    enabled: true,
    maxDays: 7
  },
  noConsecutiveSameAssetLOB: {
    enabled: true
  },

  // Rolling-window quota (per asset+LOB)
  rollingWindowQuota: {
    enabled: true,
    windowDays: 30,
    maxDays: 14
  },

  // Minimum lead-time before start date
  minLeadTime: {
    enabled: true,
    days: 3
  },

  // Cool-down period between repeat bookings for same asset+LOB
  cooldownPeriod: {
    enabled: true,
    days: 3
  },

  // Max concurrent active bookings for an LOB
  concurrentBookingCap: {
    enabled: true,
    maxActive: 2
  },

  // Black-out dates (no bookings allowed)
  blackoutDates: {
    enabled: true,
    dates: ['2024-12-25', '2024-12-31'] // ISO strings, extend as needed
  },

  // Percentage share cap of available days in a quarter
  percentageShareCap: {
    enabled: true,
    percent: 0.4 // 40 %
  },

  // Purpose duplication guard
  purposeDuplication: {
    enabled: true,
    windowDays: 30
  },

  // Asset-type exclusivity (allowed LOBs per asset type)
  assetTypeExclusivity: {
    enabled: true,
    allowed: {
      // example
      Takeover: ['Marketing', 'Growth'],
      Banner: ['Growth', 'CRM', 'Brand']
    }
  },
};

/**
 * Validates a booking object against all active rules.
 * @param {Object} booking - new booking request { asset_id, lob, start_date, end_date }
 * @returns {Promise<string[]>} - array of error messages (empty if valid)
 */
async function validateBookingRules(booking) {
  const errors = [];

  // 1. Max days per booking
  if (ruleConfig.maxDaysPerBooking.enabled) {
    const start = parseISO(booking.start_date);
    const end = parseISO(booking.end_date);
    const span = differenceInCalendarDays(end, start) + 1; // inclusive
    if (span > ruleConfig.maxDaysPerBooking.maxDays) {
      errors.push(`Exceeds maximum allowed booking length of ${ruleConfig.maxDaysPerBooking.maxDays} days`);
    }
  }

  // 2. No consecutive bookings for same asset + LOB
  if (ruleConfig.noConsecutiveSameAssetLOB.enabled) {
    // look for any approved/pending booking that either ends the day before start OR starts the day after end
    const result = await Booking.findAdjacentByAssetAndLOB(
      booking.asset_id,
      booking.lob,
      booking.start_date,
      booking.end_date
    );
    if (result.length > 0) {
      errors.push('Cannot book consecutively for the same asset and LOB. There must be at least 1 day gap.');
    }
  }

  // 3. Rolling window quota (days booked by this LOB on this asset in last N days)
  if (ruleConfig.rollingWindowQuota.enabled) {
    const { windowDays, maxDays } = ruleConfig.rollingWindowQuota;
    const from = subDays(parseISO(booking.start_date), windowDays);
    const to = parseISO(booking.end_date);
    const prev = await Booking.findByAssetLOBWithinWindow(
      booking.asset_id,
      booking.lob,
      from.toISOString().slice(0, 10),
      to.toISOString().slice(0, 10)
    );
    const bookedDays = prev.reduce((sum, b) => {
      const s = parseISO(b.start_date);
      const e = parseISO(b.end_date);
      return sum + (differenceInCalendarDays(e, s) + 1);
    }, 0);
    if (bookedDays + (differenceInCalendarDays(to, parseISO(booking.start_date)) + 1) > maxDays) {
      errors.push(`Rolling window quota exceeded: max ${maxDays} days in ${windowDays}-day window`);
    }
  }

  // 4. Minimum lead time
  if (ruleConfig.minLeadTime.enabled) {
    const now = startOfDay(new Date());
    const minStart = addDays(now, ruleConfig.minLeadTime.days);
    if (isBefore(parseISO(booking.start_date), minStart)) {
      errors.push(`Bookings must be created at least ${ruleConfig.minLeadTime.days} days in advance`);
    }
  }

  // 5. Cool-down period between repeat bookings
  if (ruleConfig.cooldownPeriod.enabled) {
    const last = await Booking.findLastBookingByAssetLOB(booking.asset_id, booking.lob);
    if (last) {
      const gapStart = addDays(parseISO(last.end_date), ruleConfig.cooldownPeriod.days);
      if (isBefore(parseISO(booking.start_date), gapStart)) {
        errors.push(`Need a ${ruleConfig.cooldownPeriod.days}-day gap after previous booking for same asset & LOB`);
      }
    }
  }

  // 6. Concurrent booking cap per LOB
  if (ruleConfig.concurrentBookingCap.enabled) {
    const active = await Booking.findActiveByLOB(booking.lob, booking.start_date);
    if (active.length >= ruleConfig.concurrentBookingCap.maxActive) {
      errors.push(`LOB already has ${active.length} active bookings – limit is ${ruleConfig.concurrentBookingCap.maxActive}`);
    }
  }

  // 7. Black-out dates
  if (ruleConfig.blackoutDates.enabled) {
    const blackoutHit = ruleConfig.blackoutDates.dates.find((d) => {
      const day = d.slice(0, 10);
      return (
        day >= booking.start_date.slice(0, 10) &&
        day <= booking.end_date.slice(0, 10)
      );
    });
    if (blackoutHit) {
      errors.push(`Bookings are not allowed on blackout date ${blackoutHit}`);
    }
  }

  // 8. Percentage share cap in the quarter
  if (ruleConfig.percentageShareCap.enabled) {
    const startQ = startOfQuarter(parseISO(booking.start_date));
    const endQ = endOfQuarter(parseISO(booking.start_date));
    const prev = await Booking.findByAssetLOBWithinWindow(
      booking.asset_id,
      booking.lob,
      startQ.toISOString().slice(0, 10),
      endQ.toISOString().slice(0, 10)
    );
    const totalQuarterDays = differenceInCalendarDays(endQ, startQ) + 1;
    const bookedByLOB = prev.reduce((sum, b) => {
      const s = parseISO(b.start_date);
      const e = parseISO(b.end_date);
      return sum + (differenceInCalendarDays(e, s) + 1);
    }, 0);
    const currentSpan = differenceInCalendarDays(parseISO(booking.end_date), parseISO(booking.start_date)) + 1;
    if ((bookedByLOB + currentSpan) / totalQuarterDays > ruleConfig.percentageShareCap.percent) {
      errors.push(`LOB exceeds ${ruleConfig.percentageShareCap.percent * 100}% share of asset days in this quarter`);
    }
  }

  // 9. Purpose duplication guard
  if (ruleConfig.purposeDuplication.enabled && booking.purpose) {
    const { windowDays } = ruleConfig.purposeDuplication;
    const from = subDays(parseISO(booking.start_date), windowDays);
    const dupes = await Booking.findByAssetPurposeWithinWindow(
      booking.asset_id,
      booking.purpose,
      from.toISOString().slice(0, 10),
      booking.end_date
    );
    if (dupes.length > 0) {
      errors.push('Identical purpose used recently for this asset – please vary campaign or wait for window to pass');
    }
  }

  // 10. Asset-type exclusivity
  if (ruleConfig.assetTypeExclusivity.enabled && booking.asset_type) {
    const allowed = ruleConfig.assetTypeExclusivity.allowed[booking.asset_type];
    if (allowed && !allowed.includes(booking.lob)) {
      errors.push(`LOB ${booking.lob} is not allowed to book asset type ${booking.asset_type}`);
    }
  }

  return errors;
}

module.exports = {
  validateBookingRules,
  ruleConfig,
}; 