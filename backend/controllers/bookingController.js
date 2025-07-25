// controllers/bookingController.js
const Booking = require('../models/Booking');
const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

const BookingController = {
  async create(req, res) {
    const { asset_id, title, lob, purpose, creative_url, start_date, end_date } = req.body;
    const user_id = req.user.user_id;

    if (!asset_id || !title || !lob || !purpose || !start_date || !end_date) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    try {
      // Validate asset exists & fetch extra metadata
      const Asset = require('../models/Asset');
      const asset = await Asset.findById(asset_id);
      if (!asset) {
        return res.status(404).json({ message: 'Asset not found' });
      }

      // Core date-overlap conflicts
      const conflicts = await Booking.findConflicts(asset_id, start_date, end_date);
      if (conflicts.length > 0) {
        return res.status(409).json({ message: 'Slot already booked for the given dates', conflicts });
      }

      // Rule-engine validation (additional fairness constraints)
      const { validateBookingRules } = require('../utils/ruleEngine');
      const ruleErrors = await validateBookingRules({ asset_id, lob, purpose, start_date, end_date, asset_type: asset.type });
      if (ruleErrors.length) {
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

      await AuditLog.create({
        user_id,
        action: 'create_booking',
        entity_type: 'booking',
        entity_id: booking.id,
        metadata: { title }
      });

      res.status(201).json(booking);
    } catch (err) {
      logger.error(err);
      res.status(500).json({ message: 'Failed to create booking' });
    }
  },

  async getAll(req, res) {
    try {
      const bookings = await Booking.findAll();
      res.json(bookings);
    } catch (err) {
      logger.error(err);
      res.status(500).json({ message: 'Failed to fetch bookings' });
    }
  },

  async getById(req, res) {
    try {
      const booking = await Booking.findById(req.params.id);
      if (!booking) return res.status(404).json({ message: 'Booking not found' });
      res.json(booking);
    } catch (err) {
      logger.error(err);
      res.status(500).json({ message: 'Failed to retrieve booking' });
    }
  },

  async updateStatus(req, res) {
    const { status } = req.body;
    const { id } = req.params;
    const user_id = req.user.user_id;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    try {
      const updated = await Booking.updateStatus(id, status);

      await AuditLog.create({
        user_id,
        action: 'update_booking_status',
        entity_type: 'booking',
        entity_id: id,
        metadata: { status }
      });

      res.json(updated);
    } catch (err) {
      logger.error(err);
      res.status(500).json({ message: 'Failed to update booking status' });
    }
  },

  async delete(req, res) {
    const { id } = req.params;
    const userRole = req.user.role;
    if (userRole !== 'admin') {
      return res.status(403).json({ message: 'Only admin can delete bookings' });
    }

    try {
      const deleted = await Booking.softDelete(id);
      res.json(deleted);
    } catch (err) {
      logger.error(err);
      res.status(500).json({ message: 'Failed to delete booking' });
    }
  },

  // Update dates (drag/resized)
  async updateDates(req, res) {
    const { id } = req.params;
    const { start_date, end_date } = req.body;
    const user = req.user;

    if (!start_date || !end_date) {
      return res.status(400).json({ message: 'start_date and end_date required' });
    }

    try {
      const booking = await Booking.findById(id);
      if (!booking) return res.status(404).json({ message: 'Booking not found' });

      // permission: owner or admin
      if (user.role !== 'admin' && booking.user_id !== user.user_id) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      // conflict & rule check
      const conflicts = await Booking.findConflicts(booking.asset_id, start_date, end_date);
      const otherConflicts = conflicts.filter((c) => c.id !== booking.id);
      if (otherConflicts.length) {
        return res.status(409).json({ message: 'Slot conflict', conflicts: otherConflicts });
      }

      const { validateBookingRules } = require('../utils/ruleEngine');
      const ruleErrors = await validateBookingRules({
        asset_id: booking.asset_id,
        lob: booking.lob,
        purpose: booking.purpose,
        start_date,
        end_date,
      });
      if (ruleErrors.length) {
        return res.status(422).json({ message: 'Rule validation failed', errors: ruleErrors });
      }

      const updated = await Booking.updateDates(id, start_date, end_date);
      res.json(updated);
    } catch (err) {
      logger.error(err);
      res.status(500).json({ message: 'Failed to update booking dates' });
    }
  }
};

module.exports = BookingController;