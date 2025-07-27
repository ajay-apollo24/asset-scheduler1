// models/AuditLog.js
const db = require('../config/db');

const AuditLog = {
  async create({ user_id, action, entity_type, entity_id, metadata = {}, ip_address = null, user_agent = null }) {
    const result = await db.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, user_id, action, entity_type, entity_id, metadata, ip_address, user_agent, created_at`,
      [user_id, action, entity_type, entity_id, metadata, ip_address, user_agent]
    );
    return result.rows[0];
  },

  async findByEntity(entity_type, entity_id) {
    const result = await db.query(
      `SELECT al.*, u.email as user_email
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       WHERE al.entity_type = $1 AND al.entity_id = $2
       ORDER BY al.created_at DESC`,
      [entity_type, entity_id]
    );
    return result.rows;
  },

  async findByUser(user_id) {
    const result = await db.query(
      `SELECT al.*, u.email as user_email
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       WHERE al.user_id = $1
       ORDER BY al.created_at DESC`,
      [user_id]
    );
    return result.rows;
  },

  async findByAction(action, limit = 100) {
    const result = await db.query(
      `SELECT al.*, u.email as user_email
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       WHERE al.action = $1
       ORDER BY al.created_at DESC
       LIMIT $2`,
      [action, limit]
    );
    return result.rows;
  },

  async findByEntityType(entity_type, limit = 100) {
    const result = await db.query(
      `SELECT al.*, u.email as user_email
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       WHERE al.entity_type = $1
       ORDER BY al.created_at DESC
       LIMIT $2`,
      [entity_type, limit]
    );
    return result.rows;
  },

  async getRecentActivity(limit = 50) {
    const result = await db.query(
      `SELECT al.*, u.email as user_email
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ORDER BY al.created_at DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  },

  async getActivitySummary(days = 30) {
    const result = await db.query(
      `SELECT 
         action,
         entity_type,
         COUNT(*) as count,
         DATE(created_at) as date
       FROM audit_logs
       WHERE created_at >= NOW() - INTERVAL '$1 days'
       GROUP BY action, entity_type, DATE(created_at)
       ORDER BY date DESC, count DESC`,
      [days]
    );
    return result.rows;
  },

  async getBookingAuditTrail(booking_id) {
    const result = await db.query(
      `SELECT al.*, u.email as user_email
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       WHERE al.entity_type = 'booking' AND al.entity_id = $1
       ORDER BY al.created_at ASC`,
      [booking_id]
    );
    return result.rows;
  },

  async getAssetAuditTrail(asset_id) {
    const result = await db.query(
      `SELECT al.*, u.email as user_email
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       WHERE al.entity_type = 'asset' AND al.entity_id = $1
       ORDER BY al.created_at ASC`,
      [asset_id]
    );
    return result.rows;
  },

  async getApprovalAuditTrail(approval_id) {
    const result = await db.query(
      `SELECT al.*, u.email as user_email
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       WHERE al.entity_type = 'approval' AND al.entity_id = $1
       ORDER BY al.created_at ASC`,
      [approval_id]
    );
    return result.rows;
  }
};

module.exports = AuditLog;