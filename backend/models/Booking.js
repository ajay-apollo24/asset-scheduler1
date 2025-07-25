// models/Booking.js
const db = require('../config/db');

const Booking = {
  async create({ asset_id, user_id, title, lob, purpose, creative_url = null, start_date, end_date, status = 'pending' }) {
    const result = await db.query(
      `INSERT INTO bookings (asset_id, user_id, title, lob, purpose, creative_url, start_date, end_date, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, asset_id, user_id, title, lob, purpose, creative_url, start_date, end_date, status`,
      [asset_id, user_id, title, lob, purpose, creative_url, start_date, end_date, status]
    );
    return result.rows[0];
  },

  async findAll() {
    const result = await db.query(
      `SELECT b.*, a.name AS asset_name, u.email AS user_email
       FROM bookings b
       JOIN assets a ON b.asset_id = a.id
       JOIN users u ON b.user_id = u.id
       WHERE b.is_deleted = false
       ORDER BY start_date DESC`
    );
    return result.rows;
  },

  async findById(id) {
    const result = await db.query(
      `SELECT * FROM bookings WHERE id = $1 AND is_deleted = false`,
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

  /**
   * Find bookings that sit directly adjacent (one-day gap or no gap) to a proposed booking
   * for the same asset and LOB.
   */
  async findAdjacentByAssetAndLOB(asset_id, lob, start_date, end_date) {
    const result = await db.query(
      `SELECT * FROM bookings
       WHERE asset_id = $1
         AND lob = $2
         AND status IN ('pending', 'approved')
         AND is_deleted = false
         AND (
               end_date = DATE($3) - INTERVAL '1 day'
            OR start_date = DATE($4) + INTERVAL '1 day'
         )`,
      [asset_id, lob, start_date, end_date]
    );
    return result.rows;
  },

  async findConflicts(asset_id, start_date, end_date) {
    const result = await db.query(
      `SELECT * FROM bookings
       WHERE asset_id = $1
         AND status IN ('pending', 'approved')
         AND is_deleted = false
         AND NOT (end_date < $2 OR start_date > $3)`,
      [asset_id, start_date, end_date]
    );
    return result.rows;
  },

  /** Find bookings for a given asset+LOB within a date window */
  async findByAssetLOBWithinWindow(asset_id, lob, from_date, to_date) {
    const result = await db.query(
      `SELECT * FROM bookings
       WHERE asset_id = $1
         AND lob = $2
         AND status IN ('pending', 'approved')
         AND is_deleted = false
         AND NOT (end_date < $3 OR start_date > $4)`,
      [asset_id, lob, from_date, to_date]
    );
    return result.rows;
  },

  /** Active (current) bookings for an LOB across all assets */
  async findActiveByLOB(lob, refDate) {
    const result = await db.query(
      `SELECT * FROM bookings
       WHERE lob = $1
         AND status IN ('pending', 'approved')
         AND is_deleted = false
         AND start_date <= $2 AND end_date >= $2`,
      [lob, refDate]
    );
    return result.rows;
  },

  /** Last booking by asset+lob ordered by end_date desc */
  async findLastBookingByAssetLOB(asset_id, lob) {
    const result = await db.query(
      `SELECT * FROM bookings
       WHERE asset_id = $1 AND lob = $2 AND status IN ('pending', 'approved')
       ORDER BY end_date DESC LIMIT 1`,
      [asset_id, lob]
    );
    return result.rows[0];
  },

  /** bookings with same purpose within window */
  async findByAssetPurposeWithinWindow(asset_id, purpose, from_date, to_date) {
    const result = await db.query(
      `SELECT * FROM bookings
       WHERE asset_id = $1
         AND purpose = $2
         AND status IN ('pending', 'approved')
         AND is_deleted = false
         AND NOT (end_date < $3 OR start_date > $4)`,
      [asset_id, purpose, from_date, to_date]
    );
    return result.rows;
  },

  async softDelete(id) {
    const result = await db.query(
      `UPDATE bookings SET is_deleted = true, status = 'deleted' WHERE id = $1 RETURNING *`,
      [id]
    );
    return result.rows[0];
  },

  async updateDates(id, start_date, end_date) {
    const result = await db.query(
      `UPDATE bookings SET start_date = $2, end_date = $3 WHERE id = $1 RETURNING *`,
      [id, start_date, end_date]
    );
    return result.rows[0];
  },
};

module.exports = Booking;