// Unified Campaign Module
// This module unifies internal bookings and external campaigns into a single system

// Controllers
const UnifiedCampaignController = require('./controllers/unifiedCampaignController');

// Models
const UnifiedCampaign = require('./models/UnifiedCampaign');

// Routes
const unifiedCampaignRoutes = require('./routes/unifiedCampaignRoutes');

// Utils
const UnifiedBiddingEngine = require('./utils/unifiedBiddingEngine');

module.exports = {
  // Controllers
  UnifiedCampaignController,
  
  // Models
  UnifiedCampaign,
  
  // Routes
  unifiedCampaignRoutes,
  
  // Utils
  UnifiedBiddingEngine
}; 