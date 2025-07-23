// models/Asset.js
const db = require('../config/db');

const Asset = {
  async create({ name, location, type, max_slots, is_active = true }) {
    const result = await db.query(
      `INSERT INTO assets (name, location, type, max_slots, is_active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, location, type, max_slots, is_active`,
      [name, location, type, max_slots, is_active]
    );
    return result.rows[0];
  },

  async findAll() {
    const result = await db.query(
      'SELECT id, name, location, type, max_slots, is_active FROM assets ORDER BY name ASC'
    );
    return result.rows;
  },

  async findById(id) {
    const result = await db.query(
      'SELECT id, name, location, type, max_slots, is_active FROM assets WHERE id = $1',
      [id]
    );
    return result.rows[0];
  },

  async update(id, updates) {
    const fields = [];
    const values = [];
    let idx = 1;

    for (const key in updates) {
      fields.push(`${key} = $${idx}`);
      values.push(updates[key]);
      idx++;
    }

    values.push(id); // last value is the WHERE id
    const query = `
      UPDATE assets SET ${fields.join(', ')}
      WHERE id = $${idx}
      RETURNING id, name, location, type, max_slots, is_active
    `;

    const result = await db.query(query, values);
    return result.rows[0];
  }
};

module.exports = Asset;