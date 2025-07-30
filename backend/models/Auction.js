const db = require('../config/db');

const Auction = {
  async createAuction(asset_id, user_context, page_context) {
    const result = await db.query(
      `INSERT INTO auctions (asset_id, user_context, page_context, status)
       VALUES ($1, $2, $3, 'active')
       RETURNING id`,
      [asset_id, JSON.stringify(user_context), JSON.stringify(page_context)]
    );
    return result.rows[0];
  },

  async submitBid(auction_id, bidder_id, bid_amount, creative_id) {
    const result = await db.query(
      `INSERT INTO bids (auction_id, bidder_id, bid_amount, creative_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [auction_id, bidder_id, bid_amount, creative_id]
    );
    return result.rows[0];
  },

  async selectWinner(auction_id) {
    const result = await db.query(
      `SELECT b.*, c.content, c.type
       FROM bids b
       JOIN creatives c ON b.creative_id = c.id
       WHERE b.auction_id = $1
       ORDER BY b.bid_amount DESC
       LIMIT 1`,
      [auction_id]
    );
    return result.rows[0];
  }
};

module.exports = Auction;
