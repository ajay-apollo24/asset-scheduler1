// config/db.js
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'asset_allocation',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'asset_allocation',
  password: process.env.DB_PASSWORD || 'asset_allocation',
  port: process.env.DB_PORT || 5435,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  /**
   * Gracefully terminate all idle Postgres clients so Jest can exit cleanly.
   * Call this in test afterAll hooks.
   */
  close: async () => {
    try {
      await pool.end();
    } catch (error) {
      console.warn('Error closing database pool:', error.message);
    }
  },
  /**
   * Get pool status for debugging
   */
  getPoolStatus: () => ({
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount
  })
};