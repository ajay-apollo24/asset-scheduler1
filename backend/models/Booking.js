// models/Booking.js
const db = require('../config/db');

const Booking = {
  async create({ asset_id, user_id, title, start_date, end_date, status = 'pending' }) {
    const result = await db.query(
      `INSERT INTO bookings (asset_id, user_id, title, start_date, end_date, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, asset_id, user_id, title, start_date, end_date, status`,
      [asset_id, user_id, title, start_date, end_date, status]
    );
    return result.rows[0];
  },

  async findAll() {
    const result = await db.query(
      `SELECT b.*, a.name AS asset_name, u.email AS user_email
       FROM bookings b
       JOIN assets a ON b.asset_id = a.id
       JOIN users u ON b.user_id = u.id
       ORDER BY start_date DESC`
    );
    return result.rows;
  },

  async findById(id) {
    const result = await db.query(
      `SELECT * FROM bookings WHERE id = $1`,
      [id]
    );
    return result.rows[0];
  },

  async updateStatus(id, status) {
    const result = await db.query(
      `UPDATE bookings SET status = $1 WHERE id = $2 RETURNING *`,
      [status, id]
    );
    return result.rows[0];
  },

  async findConflicts(asset_id, start_date, end_date) {
    const result = await db.query(
      `SELECT * FROM bookings
       WHERE asset_id = $1
         AND status IN ('pending', 'approved')
         AND NOT (end_date < $2 OR start_date > $3)`,
      [asset_id, start_date, end_date]
    );
    return result.rows;
  }
};

module.exports = Booking;