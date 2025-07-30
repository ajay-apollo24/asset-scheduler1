// controllers/bookingController.js
const Booking = require('../models/Booking');
const AuditLog = require('../../shared/models/AuditLog');
const logger = require('../../shared/utils/logger');

const BookingController = {
  async create(req, res) {
    const { asset_id, title, lob, purpose, creative_url, start_date, end_date } = req.body;
    const user_id = req.user.user_id;
    const startTime = Date.now();

    logger.booking('CREATE_ATTEMPT', null, user_id, {
      asset_id,
      title,
      lob,
      purpose,
      start_date,
      end_date,
      hasCreativeUrl: !!creative_url
    });

    if (!asset_id || !title || !lob || !purpose || !start_date || !end_date) {
      logger.warn('Booking creation failed - missing required fields', {
        userId: user_id,
        providedFields: { asset_id, title, lob, purpose, start_date, end_date }
      });
      return res.status(400).json({ message: 'All fields are required' });
    }

    try {
      // Validate asset exists & fetch extra metadata
      const Asset = require('../../asset-booking/models/Asset');
      const asset = await Asset.findById(asset_id);
      if (!asset) {
        logger.warn('Booking creation failed - asset not found', {
          userId: user_id,
          asset_id
        });
        return res.status(404).json({ message: 'Asset not found' });
      }

      logger.asset('BOOKING_REFERENCE', asset_id, user_id, {
        assetName: asset.name,
        assetLevel: asset.level
      });

      // Core date-overlap conflicts
      const conflicts = await Booking.findConflicts(asset_id, start_date, end_date);
      if (conflicts.length > 0) {
        logger.warn('Booking creation failed - slot conflict', {
          userId: user_id,
          asset_id,
          start_date,
          end_date,
          conflictCount: conflicts.length
        });
        return res.status(409).json({ message: 'Slot already booked for the given dates', conflicts });
      }

      // Rule-engine validation (additional fairness constraints)
      const { validateBookingRules } = require('../utils/ruleEngine');
      const ruleErrors = await validateBookingRules({ asset_id, lob, purpose, start_date, end_date, asset_type: asset.type });
      
      if (ruleErrors.length) {
        logger.warn('Booking creation failed - rule validation', {
          userId: user_id,
          asset_id,
          ruleErrors,
          ruleCount: ruleErrors.length
        });
        return res.status(422).json({ message: 'Rule validation failed', errors: ruleErrors });
      }

      const booking = await Booking.create({
        asset_id,
        user_id,
        title,
        lob,
        purpose,
        creative_url,
        start_date,
        end_date,
        status: 'pending'
      });

      // append estimated cost to response (value_per_day * days)
      const { differenceInCalendarDays, parseISO } = require('date-fns');
      const spanDays = differenceInCalendarDays(parseISO(end_date), parseISO(start_date)) + 1;
      booking.estimated_cost = spanDays * (asset.value_per_day || 0);

      // create approval steps (simple 2-step workflow: admin → marketing_ops)
      const Approval = require('../models/Approval');
      await Approval.createSteps(booking.id, ['admin', 'marketing_ops']);

      // Comprehensive audit logging
      await AuditLog.create({
        user_id,
        action: 'CREATE_BOOKING',
        entity_type: 'booking',
        entity_id: booking.id,
        metadata: {
          title,
          lob,
          purpose,
          asset_id,
          asset_name: asset.name,
          asset_level: asset.level,
          start_date,
          end_date,
          span_days: spanDays,
          estimated_cost: booking.estimated_cost,
          creative_url: creative_url || null,
          status: 'pending',
          rule_errors: ruleErrors.length > 0 ? ruleErrors : null
        },
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      });

      const duration = Date.now() - startTime;
      logger.performance('BOOKING_CREATE', duration, {
        bookingId: booking.id,
        userId: user_id,
        assetId: asset_id
      });

      logger.booking('CREATE_SUCCESS', booking.id, user_id, {
        title,
        lob,
        estimatedCost: booking.estimated_cost,
        spanDays
      });

      res.status(201).json(booking);
    } catch (err) {
      const duration = Date.now() - startTime;
      logger.logError(err, {
        context: 'booking_create',
        userId: user_id,
        duration
      });
      res.status(500).json({ message: 'Failed to create booking' });
    }
  },

  async getAll(req, res) {
    const startTime = Date.now();
    const user_id = req.user.user_id;

    logger.booking('GET_ALL_ATTEMPT', null, user_id);

    try {
      const bookings = await Booking.findAll();
      const duration = Date.now() - startTime;
      
      logger.performance('BOOKING_GET_ALL', duration, {
        userId: user_id,
        bookingCount: bookings.length
      });

      logger.booking('GET_ALL_SUCCESS', null, user_id, {
        bookingCount: bookings.length
      });

      res.json(bookings);
    } catch (err) {
      const duration = Date.now() - startTime;
      logger.logError(err, {
        context: 'booking_get_all',
        userId: user_id,
        duration
      });
      res.status(500).json({ message: 'Failed to fetch bookings' });
    }
  },

  async getById(req, res) {
    const { id } = req.params;
    const user_id = req.user.user_id;
    const startTime = Date.now();

    logger.booking('GET_BY_ID_ATTEMPT', id, user_id);

    try {
      const booking = await Booking.findById(id);
      if (!booking) {
        logger.warn('Booking not found', {
          userId: user_id,
          bookingId: id
        });
        return res.status(404).json({ message: 'Booking not found' });
      }

      const duration = Date.now() - startTime;
      logger.performance('BOOKING_GET_BY_ID', duration, {
        bookingId: id,
        userId: user_id
      });

      logger.booking('GET_BY_ID_SUCCESS', id, user_id);
      res.json(booking);
    } catch (err) {
      const duration = Date.now() - startTime;
      logger.logError(err, {
        context: 'booking_get_by_id',
        userId: user_id,
        bookingId: id,
        duration
      });
      res.status(500).json({ message: 'Failed to retrieve booking' });
    }
  },

  async updateStatus(req, res) {
    const { status } = req.body;
    const { id } = req.params;
    const user_id = req.user.user_id;
    const startTime = Date.now();

    logger.booking('UPDATE_STATUS_ATTEMPT', id, user_id, { status });

    if (!['approved', 'rejected'].includes(status)) {
      logger.warn('Invalid status update attempt', {
        userId: user_id,
        bookingId: id,
        invalidStatus: status
      });
      return res.status(400).json({ message: 'Invalid status' });
    }

    try {
      const updated = await Booking.updateStatus(id, status);

      // Audit logging for status change
      await AuditLog.create({
        user_id,
        action: 'UPDATE_BOOKING_STATUS',
        entity_type: 'booking',
        entity_id: id,
        metadata: {
          previous_status: updated.status === 'approved' ? 'pending' : 'pending',
          new_status: status,
          booking_title: updated.title,
          booking_lob: updated.lob,
          reason: req.body.reason || null
        },
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      });

      const duration = Date.now() - startTime;
      logger.performance('BOOKING_UPDATE_STATUS', duration, {
        bookingId: id,
        userId: user_id,
        status
      });

      logger.booking('UPDATE_STATUS_SUCCESS', id, user_id, { status });
      res.json(updated);
    } catch (err) {
      const duration = Date.now() - startTime;
      logger.logError(err, {
        context: 'booking_update_status',
        userId: user_id,
        bookingId: id,
        status,
        duration
      });
      res.status(500).json({ message: 'Failed to update booking status' });
    }
  },

  async delete(req, res) {
    const { id } = req.params;
    const userRole = req.user.role;
    const user_id = req.user.user_id;
    const startTime = Date.now();

    logger.booking('DELETE_ATTEMPT', id, user_id, { userRole });

    if (userRole !== 'admin') {
      logger.security('UNAUTHORIZED_DELETE_ATTEMPT', user_id, req.ip, {
        bookingId: id,
        userRole
      });
      return res.status(403).json({ message: 'Only admin can delete bookings' });
    }

    try {
      // Get booking details before deletion for audit
      const booking = await Booking.findById(id);
      
      const deleted = await Booking.softDelete(id);

      // Audit logging for deletion
      await AuditLog.create({
        user_id,
        action: 'DELETE_BOOKING',
        entity_type: 'booking',
        entity_id: id,
        metadata: {
          booking_title: booking?.title,
          booking_lob: booking?.lob,
          booking_status: booking?.status,
          deletion_type: 'soft_delete',
          reason: req.body.reason || null
        },
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      });

      const duration = Date.now() - startTime;
      logger.performance('BOOKING_DELETE', duration, {
        bookingId: id,
        userId: user_id
      });

      logger.booking('DELETE_SUCCESS', id, user_id);
      res.json(deleted);
    } catch (err) {
      const duration = Date.now() - startTime;
      logger.logError(err, {
        context: 'booking_delete',
        userId: user_id,
        bookingId: id,
        duration
      });
      res.status(500).json({ message: 'Failed to delete booking' });
    }
  },

  // Update dates (drag/resized)
  async updateDates(req, res) {
    const { id } = req.params;
    const { start_date, end_date } = req.body;
    const user = req.user;
    const startTime = Date.now();

    logger.booking('UPDATE_DATES_ATTEMPT', id, user.user_id, {
      start_date,
      end_date,
      userRole: user.role
    });

    if (!start_date || !end_date) {
      logger.warn('Date update failed - missing dates', {
        userId: user.user_id,
        bookingId: id,
        providedDates: { start_date, end_date }
      });
      return res.status(400).json({ message: 'start_date and end_date required' });
    }

    try {
      const booking = await Booking.findById(id);
      if (!booking) {
        logger.warn('Date update failed - booking not found', {
          userId: user.user_id,
          bookingId: id
        });
        return res.status(404).json({ message: 'Booking not found' });
      }

      // permission: owner or admin
      if (user.role !== 'admin' && booking.user_id !== user.user_id) {
        logger.security('UNAUTHORIZED_DATE_UPDATE', user.user_id, req.ip, {
          bookingId: id,
          bookingOwner: booking.user_id,
          userRole: user.role
        });
        return res.status(403).json({ message: 'Forbidden' });
      }

      // conflict & rule check
      const conflicts = await Booking.findConflicts(booking.asset_id, start_date, end_date);
      const otherConflicts = conflicts.filter((c) => c.id !== booking.id);
      if (otherConflicts.length) {
        logger.warn('Date update failed - slot conflict', {
          userId: user.user_id,
          bookingId: id,
          assetId: booking.asset_id,
          conflictCount: otherConflicts.length
        });
        return res.status(409).json({ message: 'Slot conflict', conflicts: otherConflicts });
      }

      const { validateBookingRules } = require('../utils/ruleEngine');
      const ruleErrors = await validateBookingRules({
        id,
        asset_id: booking.asset_id,
        lob: booking.lob,
        purpose: booking.purpose,
        start_date,
        end_date,
      });
      if (ruleErrors.length) {
        logger.warn('Date update failed - rule validation', {
          userId: user.user_id,
          bookingId: id,
          ruleErrors,
          ruleCount: ruleErrors.length
        });
        return res.status(422).json({ message: 'Rule validation failed', errors: ruleErrors });
      }

      const updated = await Booking.updateDates(id, start_date, end_date);

      // Audit logging for date update
      await AuditLog.create({
        user_id: user.user_id,
        action: 'UPDATE_BOOKING_DATES',
        entity_type: 'booking',
        entity_id: id,
        metadata: {
          booking_title: booking.title,
          booking_lob: booking.lob,
          previous_start_date: booking.start_date,
          previous_end_date: booking.end_date,
          new_start_date: start_date,
          new_end_date: end_date,
          update_method: 'drag_resize',
          rule_errors: ruleErrors.length > 0 ? ruleErrors : null
        },
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      });

      const duration = Date.now() - startTime;
      logger.performance('BOOKING_UPDATE_DATES', duration, {
        bookingId: id,
        userId: user.user_id
      });

      logger.booking('UPDATE_DATES_SUCCESS', id, user.user_id, {
        start_date,
        end_date
      });

      res.json(updated);
    } catch (err) {
      const duration = Date.now() - startTime;
      logger.logError(err, {
        context: 'booking_update_dates',
        userId: user.user_id,
        bookingId: id,
        duration
      });
      res.status(500).json({ message: 'Failed to update booking dates' });
    }
  },

  // Update full booking (title, lob, purpose, dates, creative_url)
  async update(req, res) {
    const { id } = req.params;
    const { title, lob, purpose, creative_url, start_date, end_date } = req.body;
    const user = req.user;
    const startTime = Date.now();

    logger.booking('UPDATE_FULL_ATTEMPT', id, user.user_id, {
      title,
      lob,
      purpose,
      start_date,
      end_date,
      hasCreativeUrl: !!creative_url
    });

    if (!title || !lob || !purpose || !start_date || !end_date) {
      logger.warn('Full update failed - missing required fields', {
        userId: user.user_id,
        bookingId: id,
        providedFields: { title, lob, purpose, start_date, end_date }
      });
      return res.status(400).json({ message: 'All fields are required' });
    }

    try {
      const booking = await Booking.findById(id);
      if (!booking) {
        logger.warn('Full update failed - booking not found', {
          userId: user.user_id,
          bookingId: id
        });
        return res.status(404).json({ message: 'Booking not found' });
      }

      // permission: owner or admin
      if (user.role !== 'admin' && booking.user_id !== user.user_id) {
        logger.security('UNAUTHORIZED_FULL_UPDATE', user.user_id, req.ip, {
          bookingId: id,
          bookingOwner: booking.user_id,
          userRole: user.role
        });
        return res.status(403).json({ message: 'Forbidden' });
      }

      // Get asset details for rule validation
      const Asset = require('../../asset-booking/models/Asset');
      const asset = await Asset.findById(booking.asset_id);
      if (!asset) {
        logger.warn('Full update failed - asset not found', {
          userId: user.user_id,
          bookingId: id,
          assetId: booking.asset_id
        });
        return res.status(404).json({ message: 'Asset not found' });
      }

      // Check for conflicts if dates changed
      if (start_date !== booking.start_date || end_date !== booking.end_date) {
        const conflicts = await Booking.findConflicts(booking.asset_id, start_date, end_date);
        const otherConflicts = conflicts.filter((c) => c.id !== booking.id);
        if (otherConflicts.length) {
          logger.warn('Full update failed - slot conflict', {
            userId: user.user_id,
            bookingId: id,
            assetId: booking.asset_id,
            conflictCount: otherConflicts.length
          });
          return res.status(409).json({ message: 'Slot already booked for the given dates', conflicts: otherConflicts });
        }
      }

      // Rule-engine validation
      const { validateBookingRules } = require('../utils/ruleEngine');
      const ruleErrors = await validateBookingRules({
        id,
        asset_id: booking.asset_id,
        lob,
        purpose,
        start_date,
        end_date,
        asset_type: asset.type
      });
      if (ruleErrors.length) {
        logger.warn('Full update failed - rule validation', {
          userId: user.user_id,
          bookingId: id,
          ruleErrors,
          ruleCount: ruleErrors.length
        });
        return res.status(422).json({ message: 'Rule validation failed', errors: ruleErrors });
      }

      const updated = await Booking.update(id, {
        title,
        lob,
        purpose,
        creative_url,
        start_date,
        end_date
      });

      // Calculate estimated cost
      const { differenceInCalendarDays, parseISO } = require('date-fns');
      const spanDays = differenceInCalendarDays(parseISO(end_date), parseISO(start_date)) + 1;
      updated.estimated_cost = spanDays * (asset.value_per_day || 0);

      // Audit logging for full update
      await AuditLog.create({
        user_id: user.user_id,
        action: 'UPDATE_BOOKING_FULL',
        entity_type: 'booking',
        entity_id: id,
        metadata: {
          previous_title: booking.title,
          previous_lob: booking.lob,
          previous_purpose: booking.purpose,
          previous_start_date: booking.start_date,
          previous_end_date: booking.end_date,
          new_title: title,
          new_lob: lob,
          new_purpose: purpose,
          new_start_date: start_date,
          new_end_date: end_date,
          new_creative_url: creative_url,
          asset_id: booking.asset_id,
          asset_name: asset.name,
          estimated_cost: updated.estimated_cost,
          span_days: spanDays,
          rule_errors: ruleErrors.length > 0 ? ruleErrors : null
        },
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      });

      const duration = Date.now() - startTime;
      logger.performance('BOOKING_UPDATE_FULL', duration, {
        bookingId: id,
        userId: user.user_id
      });

      logger.booking('UPDATE_FULL_SUCCESS', id, user.user_id, {
        title,
        lob,
        estimatedCost: updated.estimated_cost,
        spanDays
      });

      res.json(updated);
    } catch (err) {
      const duration = Date.now() - startTime;
      logger.logError(err, {
        context: 'booking_update_full',
        userId: user.user_id,
        bookingId: id,
        duration
      });
      res.status(500).json({ message: 'Failed to update booking' });
    }
  }
};

module.exports = BookingController;