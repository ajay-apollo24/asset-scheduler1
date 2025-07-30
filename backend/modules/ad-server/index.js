// Ad Server Module
// This module handles ad serving, creative management, and analytics

// Controllers
const AdController = require('./controllers/adController');
const CreativeController = require('./controllers/creativeController');
const RTBController = require('./controllers/rtbController');

// Models
const Creative = require('./models/Creative');
const Campaign = require('./models/Campaign');
const AdRequest = require('./models/AdRequest');
const Impression = require('./models/Impression');
const Auction = require('./models/Auction');

// Routes
const adRoutes = require('./routes/adRoutes');
const creativeRoutes = require('./routes/creativeRoutes');
const rtbRoutes = require('./routes/rtbRoutes');

// Utils
const adServer = require('./utils/adServer');
const analytics = require('./utils/analytics');
const mlEngine = require('./utils/mlEngine');

module.exports = {
  // Controllers
  AdController,
  CreativeController,
  RTBController,
  
  // Models
  Creative,
  Campaign,
  AdRequest,
  Impression,
  Auction,
  
  // Routes
  adRoutes,
  creativeRoutes,
  rtbRoutes,
  
  // Utils
  adServer,
  analytics,
  mlEngine
}; 