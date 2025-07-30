// Asset Booking Module
// This module handles asset scheduling, booking, and approval workflows

// Controllers
const AssetController = require('./controllers/assetController');
const BookingController = require('./controllers/bookingController');
const ApprovalController = require('./controllers/approvalController');
const BiddingController = require('./controllers/biddingController');

// Models
const Asset = require('./models/Asset');
const Booking = require('./models/Booking');
const Approval = require('./models/Approval');
const Bid = require('./models/Bid');

// Routes
const assetRoutes = require('./routes/assetRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const approvalRoutes = require('./routes/approvalRoutes');
const biddingRoutes = require('./routes/biddingRoutes');

// Utils
const ruleEngine = require('./utils/ruleEngine');
const fairAllocation = require('./utils/fairAllocation');

module.exports = {
  // Controllers
  AssetController,
  BookingController,
  ApprovalController,
  BiddingController,
  
  // Models
  Asset,
  Booking,
  Approval,
  Bid,
  
  // Routes
  assetRoutes,
  bookingRoutes,
  approvalRoutes,
  biddingRoutes,
  
  // Utils
  ruleEngine,
  fairAllocation
}; 