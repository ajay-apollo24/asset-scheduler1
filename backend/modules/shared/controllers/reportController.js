// controllers/reportController.js
const db = require('../../../config/db');
const logger = require('../../shared/utils/logger');

const ReportController = {
  async performance(req, res) {
    const { from, to } = req.query; // expect YYYY-MM-DD
    try {
      const result = await db.query(
        `SELECT lob,
                SUM(impressions) AS impressions,
                SUM(clicks) AS clicks
         FROM asset_metrics
         WHERE date BETWEEN $1 AND $2
         GROUP BY lob
         ORDER BY impressions DESC`,
        [from, to]
      );
      res.json(result.rows);
    } catch (err) {
      logger.error(err);
      res.status(500).json({ message: 'Failed to generate report' });
    }
  }
};

module.exports = ReportController; 