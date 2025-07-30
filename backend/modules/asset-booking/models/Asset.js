// models/Asset.js
const db = require('../../../config/db');

const Asset = {
  async create({ name, location, type, max_slots, importance = 1, impressions_per_day = 0, value_per_day = 0, level = 'secondary', is_active = true }) {
    const result = await db.query(
      `INSERT INTO assets (name, location, type, max_slots, importance, impressions_per_day, value_per_day, level, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, name, location, type, max_slots, importance, impressions_per_day, value_per_day, level, is_active`,
      [name, location, type, max_slots, importance, impressions_per_day, value_per_day, level, is_active]
    );
    return result.rows[0];
  },

  async findAll() {
    const result = await db.query(
      'SELECT id, name, location, type, max_slots, importance, impressions_per_day, value_per_day, level, is_active FROM assets ORDER BY name ASC'
    );
    return result.rows;
  },

  async findById(id) {
    const result = await db.query(
      'SELECT id, name, location, type, max_slots, importance, impressions_per_day, value_per_day, level, is_active FROM assets WHERE id = $1',
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
      RETURNING id, name, location, type, max_slots, importance, impressions_per_day, value_per_day, level, is_active
    `;

    const result = await db.query(query, values);
    return result.rows[0];
  },

  // Ad Server Enhancement Methods
  async getAdFormats(id) {
    // TODO: Implement ad formats retrieval
    console.log('Asset.getAdFormats called with:', id);
    return ['image', 'video', 'html5'];
  },

  async getTargetingCriteria(id) {
    // TODO: Implement targeting criteria retrieval
    console.log('Asset.getTargetingCriteria called with:', id);
    return {
      geolocation: ['US', 'CA'],
      demographics: ['18-35'],
      interests: ['technology', 'sports']
    };
  },

  async getPricingModel(id) {
    // TODO: Implement pricing model retrieval
    console.log('Asset.getPricingModel called with:', id);
    return {
      type: 'cpm',
      base_rate: 2.50,
      premium_multiplier: 1.5
    };
  },

  async getAvailableCreatives(id) {
    // TODO: Implement available creatives retrieval
    console.log('Asset.getAvailableCreatives called with:', id);
    return [
      { id: 1, name: 'Creative 1', type: 'image', status: 'approved' },
      { id: 2, name: 'Creative 2', type: 'video', status: 'approved' }
    ];
  }
};

module.exports = Asset;