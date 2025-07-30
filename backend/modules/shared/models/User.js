// models/User.js
const db = require('../../../config/db');
const bcrypt = require('bcryptjs');

const User = {
  async create({ email, password, role }) {
    const password_hash = await bcrypt.hash(password, 10);
    const result = await db.query(
      `INSERT INTO users (email, password_hash, role)
       VALUES ($1, $2, $3)
       RETURNING id, email, role`,
      [email, password_hash, role]
    );
    return result.rows[0];
  },

  async findByEmail(email) {
    const result = await db.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0];
  },

  async findById(id) {
    const result = await db.query(
      'SELECT id, email, role FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }
};

module.exports = User;