// models/Bid.js
const db = require('../config/db');

const Bid = {
  /**
   * Create a new bid for a slot
   */
  async create({ booking_id, lob, bid_amount, max_bid, bid_reason, user_id }) {
    const result = await db.query(
      `INSERT INTO bids (booking_id, lob, bid_amount, max_bid, bid_reason, user_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'active')
       RETURNING *`,
      [booking_id, lob, bid_amount, max_bid, bid_reason, user_id]
    );
    return result.rows[0];
  },

  /**
   * Get all active bids for a booking
   */
  async getActiveBids(booking_id) {
    const result = await db.query(
      `SELECT b.*, u.email as user_email 
       FROM bids b 
       LEFT JOIN users u ON b.user_id = u.id 
       WHERE b.booking_id = $1 AND b.status = 'active'
       ORDER BY b.bid_amount DESC`,
      [booking_id]
    );
    return result.rows;
  },

  /**
   * Get highest bid for a booking
   */
  async getHighestBid(booking_id) {
    const result = await db.query(
      `SELECT * FROM bids 
       WHERE booking_id = $1 AND status = 'active'
       ORDER BY bid_amount DESC 
       LIMIT 1`,
      [booking_id]
    );
    return result.rows[0] || null;
  },

  /**
   * Update bid amount
   */
  async updateBid(bid_id, new_amount, user_id) {
    const result = await db.query(
      `UPDATE bids 
       SET bid_amount = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [new_amount, bid_id, user_id]
    );
    return result.rows[0];
  },

  /**
   * Cancel a bid
   */
  async cancelBid(bid_id, user_id) {
    const result = await db.query(
      `UPDATE bids 
       SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [bid_id, user_id]
    );
    return result.rows[0];
  },

  /**
   * Get bidding history for a LOB
   */
  async getBiddingHistory(lob, days = 30) {
    const result = await db.query(
      `SELECT b.*, bk.title as booking_title, bk.start_date, bk.end_date
       FROM bids b
       LEFT JOIN bookings bk ON b.booking_id = bk.id
       WHERE b.lob = $1 AND b.created_at >= NOW() - INTERVAL '${days} days'
       ORDER BY b.created_at DESC`,
      [lob]
    );
    return result.rows;
  },

  /**
   * Get total bid amount for a LOB in a period
   */
  async getTotalBidAmount(lob, start_date, end_date) {
    const result = await db.query(
      `SELECT SUM(bid_amount) as total_amount, COUNT(*) as bid_count
       FROM bids b
       LEFT JOIN bookings bk ON b.booking_id = bk.id
       WHERE b.lob = $1 AND b.status = 'active'
       AND bk.start_date >= $2 AND bk.end_date <= $3`,
      [lob, start_date, end_date]
    );
    return result.rows[0];
  },

  /**
   * Auto-bid system for LOBs
   */
  async autoBid(booking_id, lob, max_amount, user_id) {
    const currentHighest = await this.getHighestBid(booking_id);
    const currentAmount = currentHighest ? currentHighest.bid_amount : 0;
    
    // Auto-bid 10% higher than current highest, up to max_amount
    const newBidAmount = Math.min(
      Math.ceil(currentAmount * 1.1),
      max_amount
    );

    if (newBidAmount > currentAmount) {
      return await this.create({
        booking_id,
        lob,
        bid_amount: newBidAmount,
        max_bid: max_amount,
        bid_reason: 'Auto-bid',
        user_id
      });
    }

    return null;
  }
};

module.exports = Bid; 