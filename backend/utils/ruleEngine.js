// utils/ruleEngine.js
const Booking = require('../models/Booking');
const Asset = require('../models/Asset');
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

function toDate(value) {
  if (value instanceof Date) return value;
  if (typeof value === 'string') return parseISO(value);
  return new Date(value);
}

// Load rule parameters from external JSON so they can be edited without code changes
const ruleConfig = require('../config/ruleConfig.json');

/**
 * Validates a booking object against all active rules.
 * @param {Object} booking - new booking request { asset_id, lob, start_date, end_date }
 * @returns {Promise<string[]>} - array of error messages (empty if valid)
 */
async function validateBookingRules(booking) {
  const errors = [];
  const currentId = String(booking.id);

  // Get asset details for level-specific rules
  const asset = await Asset.findById(booking.asset_id);
  if (!asset) {
    errors.push('Asset not found');
    return errors;
  }

  // 1. Max days per booking
  if (ruleConfig.maxDaysPerBooking.enabled) {
    const start = parseISO(booking.start_date);
    const end = parseISO(booking.end_date);
    const span = differenceInCalendarDays(end, start) + 1; // inclusive
    if (span > ruleConfig.maxDaysPerBooking.maxDays) {
      errors.push(`Exceeds maximum allowed booking length of ${ruleConfig.maxDaysPerBooking.maxDays} days`);
    }
  }

  // 2. No consecutive bookings for same asset + LOB (with level-specific exceptions)
  if (ruleConfig.noConsecutiveSameAssetLOB.enabled) {
    // Check if this is a primary asset and monetization is allowed consecutive bookings
    const isPrimaryAsset = asset.level === 'primary';
    const isMonetization = booking.lob === 'Monetization';
    const allowConsecutive = isPrimaryAsset && isMonetization && 
      ruleConfig.levelSpecificRules?.primary?.monetizationConsecutiveBlock?.enabled;

    if (!allowConsecutive) {
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
  }

  // 3. Rolling window quota (days booked by this LOB on this asset in last N days)
  if (ruleConfig.rollingWindowQuota.enabled) {
    const { windowDays, maxDays } = ruleConfig.rollingWindowQuota;
    const from = subDays(toDate(booking.start_date), windowDays);
    const to = toDate(booking.end_date);
    const prev = await Booking.findByAssetLOBWithinWindow(
      booking.asset_id,
      booking.lob,
      from.toISOString().slice(0, 10),
      to.toISOString().slice(0, 10)
    );
    const filteredPrev = prev.filter((b) => String(b.id) !== currentId);
    const bookedDays = filteredPrev.reduce((sum, b) => {
      const s = toDate(b.start_date);
      const e = toDate(b.end_date);
      return sum + (differenceInCalendarDays(e, s) + 1);
    }, 0);
    if (bookedDays + (differenceInCalendarDays(to, toDate(booking.start_date)) + 1) > maxDays) {
      errors.push(`Rolling window quota exceeded: max ${maxDays} days in ${windowDays}-day window`);
    }
  }

  // 4. Minimum lead time
  if (ruleConfig.minLeadTime.enabled) {
    const now = startOfDay(new Date());
    const minStart = addDays(now, ruleConfig.minLeadTime.days);
    if (isBefore(toDate(booking.start_date), minStart)) {
      errors.push(`Bookings must be created at least ${ruleConfig.minLeadTime.days} days in advance`);
    }
  }

  // 5. Cool-down period between repeat bookings
  if (ruleConfig.cooldownPeriod.enabled) {
    const last = await Booking.findLastBookingByAssetLOB(booking.asset_id, booking.lob);
    if (last && String(last.id) !== currentId) {
      const gapStart = addDays(toDate(last.end_date), ruleConfig.cooldownPeriod.days);
      if (isBefore(toDate(booking.start_date), gapStart)) {
        errors.push(`Need a ${ruleConfig.cooldownPeriod.days}-day gap after previous booking for same asset & LOB`);
      }
    }
  }

  // 6. Concurrent booking cap per LOB
  if (ruleConfig.concurrentBookingCap.enabled) {
    const active = (await Booking.findActiveByLOB(booking.lob, booking.start_date)).filter((b)=>String(b.id)!==currentId);
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
    const startQ = startOfQuarter(toDate(booking.start_date));
    const endQ = endOfQuarter(toDate(booking.start_date));
    const prevRaw = await Booking.findByAssetLOBWithinWindow(
      booking.asset_id,
      booking.lob,
      startQ.toISOString().slice(0, 10),
      endQ.toISOString().slice(0, 10)
    );
    const prev = prevRaw.filter((b)=>String(b.id)!==currentId);
    const totalQuarterDays = differenceInCalendarDays(endQ, startQ) + 1;
    const bookedByLOB = prev.reduce((sum, b) => {
      const s = toDate(b.start_date);
      const e = toDate(b.end_date);
      return sum + (differenceInCalendarDays(e, s) + 1);
    }, 0);
    const currentSpan = differenceInCalendarDays(toDate(booking.end_date), toDate(booking.start_date)) + 1;
    if ((bookedByLOB + currentSpan) / totalQuarterDays > ruleConfig.percentageShareCap.percent) {
      errors.push(`LOB exceeds ${ruleConfig.percentageShareCap.percent * 100}% share of asset days in this quarter`);
    }
  }

  // 9. Purpose duplication guard
  if (ruleConfig.purposeDuplication.enabled && booking.purpose) {
    const { windowDays } = ruleConfig.purposeDuplication;
    const from = subDays(toDate(booking.start_date), windowDays);
    const dupesAll = await Booking.findByAssetPurposeWithinWindow(
      booking.asset_id,
      booking.purpose,
      from.toISOString().slice(0, 10),
      booking.end_date
    );
    const dupes = dupesAll.filter((b)=>String(b.id)!==currentId);
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

  // 11. Level-specific rules
  if (ruleConfig.levelSpecificRules?.enabled) {
    await validateLevelSpecificRules(booking, asset, errors, currentId);
  }

  return errors;
}

/**
 * Validates level-specific rules for assets
 */
async function validateLevelSpecificRules(booking, asset, errors, currentId) {
  const { level } = asset;
  const levelRules = ruleConfig.levelSpecificRules[level];

  if (!levelRules) return;

  // Primary asset rules
  if (level === 'primary') {
    // Monetization quota check
    if (levelRules.monetizationQuota?.enabled) {
      const { percent } = levelRules.monetizationQuota;
      const startQ = startOfQuarter(toDate(booking.start_date));
      const endQ = endOfQuarter(toDate(booking.start_date));
      
      // Get all bookings for this asset in the quarter
      const allBookings = await Booking.findByAssetLOBWithinWindow(
        booking.asset_id,
        null, // all LOBs
        startQ.toISOString().slice(0, 10),
        endQ.toISOString().slice(0, 10)
      );
      
      const filteredBookings = allBookings.filter((b) => String(b.id) !== currentId);
      
      // Calculate total days and monetization days
      const totalQuarterDays = differenceInCalendarDays(endQ, startQ) + 1;
      let totalBookedDays = 0;
      let monetizationDays = 0;
      
      filteredBookings.forEach((b) => {
        const s = toDate(b.start_date);
        const e = toDate(b.end_date);
        const days = differenceInCalendarDays(e, s) + 1;
        totalBookedDays += days;
        if (b.lob === 'Monetization') {
          monetizationDays += days;
        }
      });
      
      // Add current booking days
      const currentSpan = differenceInCalendarDays(toDate(booking.end_date), toDate(booking.start_date)) + 1;
      const isMonetization = booking.lob === 'Monetization';
      
      if (isMonetization) {
        monetizationDays += currentSpan;
      }
      totalBookedDays += currentSpan;
      
      // Check if monetization exceeds quota
      if (totalBookedDays > 0 && (monetizationDays / totalBookedDays) > percent) {
        errors.push(`Monetization quota exceeded: ${(monetizationDays / totalBookedDays * 100).toFixed(1)}% booked (max ${percent * 100}%)`);
      }
    }
  }
}

module.exports = {
  validateBookingRules,
  ruleConfig,
}; 