// config/db.js
const { Pool } = require('pg');
const logger = require('../utils/logger');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://asset_allocation:asset_allocation@localhost:5435/asset_allocation'
});

pool.on('connect', () => {
  logger.info('Connected to PostgreSQL');
});

pool.on('error', (err) => {
  logger.error('Unexpected PG client error', err);
  process.exit(-1);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};