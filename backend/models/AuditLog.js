// models/AuditLog.js
const db = require('../config/db');

const AuditLog = {
  async create({ user_id, action, entity_type, entity_id, metadata = {} }) {
    const result = await db.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, user_id, action, entity_type, entity_id, metadata, created_at`,
      [user_id, action, entity_type, entity_id, metadata]
    );
    return result.rows[0];
  },

  async findByEntity(entity_type, entity_id) {
    const result = await db.query(
      `SELECT * FROM audit_logs
       WHERE entity_type = $1 AND entity_id = $2
       ORDER BY created_at DESC`,
      [entity_type, entity_id]
    );
    return result.rows;
  },

  async findByUser(user_id) {
    const result = await db.query(
      `SELECT * FROM audit_logs
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [user_id]
    );
    return result.rows;
  }
};

module.exports = AuditLog;