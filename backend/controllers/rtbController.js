const Auction = require('../models/Auction');
const logger = require('../utils/logger');

const RTBController = {
  async requestAuction(req, res) {
    const { asset_id, user_context, page_context } = req.body;
    try {
      const auction = await Auction.createAuction(asset_id, user_context, page_context);
      logger.info('Auction created', { auctionId: auction.id, asset_id });
      res.status(201).json({ auction_id: auction.id });
    } catch (error) {
      logger.logError(error, { context: 'rtb_request' });
      res.status(500).json({ message: 'Failed to create auction' });
    }
  },

  async submitBid(req, res) {
    const { auction_id, bidder_id, bid_amount, creative_id } = req.body;
    try {
      const bid = await Auction.submitBid(auction_id, bidder_id, bid_amount, creative_id);
      res.status(201).json({ bid_id: bid.id });
    } catch (error) {
      logger.logError(error, { context: 'rtb_bid' });
      res.status(500).json({ message: 'Failed to submit bid' });
    }
  },

  async getAuctionResult(req, res) {
    const { auction_id } = req.query;
    try {
      const winner = await Auction.selectWinner(auction_id);
      res.json({ winner });
    } catch (error) {
      logger.logError(error, { context: 'rtb_auction' });
      res.status(500).json({ message: 'Failed to retrieve auction result' });
    }
  }
};

module.exports = RTBController;
