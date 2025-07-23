// controllers/bookingController.js
const Booking = require('../models/Booking');
const AuditLog = require('../models/AuditLog');

const BookingController = {
  async create(req, res) {
    const { asset_id, title, start_date, end_date } = req.body;
    const user_id = req.user.user_id;

    if (!asset_id || !title || !start_date || !end_date) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    try {
      // Check for conflicts
      const conflicts = await Booking.findConflicts(asset_id, start_date, end_date);
      if (conflicts.length > 0) {
        return res.status(409).json({ message: 'Slot already booked for the given dates', conflicts });
      }

      const booking = await Booking.create({
        asset_id,
        user_id,
        title,
        start_date,
        end_date,
        status: 'pending'
      });

      await AuditLog.create({
        user_id,
        action: 'create_booking',
        entity_type: 'booking',
        entity_id: booking.id,
        metadata: { title }
      });

      res.status(201).json(booking);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to create booking' });
    }
  },

  async getAll(req, res) {
    try {
      const bookings = await Booking.findAll();
      res.json(bookings);
    } catch (err) {
      res.status(500).json({ message: 'Failed to fetch bookings' });
    }
  },

  async getById(req, res) {
    try {
      const booking = await Booking.findById(req.params.id);
      if (!booking) return res.status(404).json({ message: 'Booking not found' });
      res.json(booking);
    } catch (err) {
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
      res.status(500).json({ message: 'Failed to update booking status' });
    }
  }
};

module.exports = BookingController;