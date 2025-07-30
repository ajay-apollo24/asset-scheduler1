// models/Approval.js
const db = require('../../../config/db');

const Approval = {
  /**
   * Bulk create initial approval steps for a new booking.
   * steps = array of role strings in order.
   */
  async createSteps(booking_id, steps) {
    const values = steps.map((role, idx) => `(${booking_id}, ${idx}, '${role}', 'pending')`).join(',');
    const sql = `INSERT INTO approvals (booking_id, step_order, role, status)
                 VALUES ${values} RETURNING *`;
    const { rows } = await db.query(sql);
    return rows;
  },

  /** fetch pending approvals for a user based on role */
  async findPendingByRole(role) {
    const { rows } = await db.query(
      `SELECT a.*, b.title, b.start_date, b.end_date, u.email AS requester_email
       FROM approvals a
       JOIN bookings b ON a.booking_id = b.id
       JOIN users u ON b.user_id = u.id
       WHERE a.role = $1 AND a.status = 'pending'
         AND NOT EXISTS (
           SELECT 1 FROM approvals a2
           WHERE a2.booking_id = a.booking_id
             AND a2.step_order < a.step_order
             AND a2.status <> 'approved'
         )`,
      [role]
    );
    return rows;
  },

  async act({ approval_id, user_id, status, comment }) {
    const { rows } = await db.query(
      `UPDATE approvals
         SET status = $1,
             decided_by = $2,
             comment = $3,
             decided_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [status, user_id, comment, approval_id]
    );
    return rows[0];
  },

  async areAllApproved(booking_id) {
    const { rows } = await db.query(
      `SELECT COUNT(*) FILTER (WHERE status = 'pending') AS pending
       FROM approvals WHERE booking_id = $1`,
      [booking_id]
    );
    return Number(rows[0].pending) === 0;
  }
};

module.exports = Approval; 