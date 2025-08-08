// Ad Server Module
// This module handles ad serving, creative management, and analytics

// Controllers
const AdController = require('./controllers/adController');
const CreativeController = require('./controllers/creativeController');
const RTBController = require('./controllers/rtbController');
const targetingController = require('./controllers/targetingController');
const budgetController = require('./controllers/budgetController');
const yieldController = require('./controllers/yieldController');
const attributionController = require('./controllers/attributionController');
const videoController = require('./controllers/videoController');
const activationController = require('./controllers/activationController');
const reportingController = require('./controllers/reportingController');
const reviewController = require('./controllers/reviewController');
const campaignLaunchController = require('./controllers/campaignLaunchController');

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
const campaignRoutes = require('./routes/campaignRoutes');
const targetingRoutes = require('./routes/targetingRoutes');
const budgetRoutes = require('./routes/budgetRoutes');
const yieldRoutes = require('./routes/yieldRoutes');
const attributionRoutes = require('./routes/attributionRoutes');
const videoRoutes = require('./routes/videoRoutes');
const activationRoutes = require('./routes/activationRoutes');
const reportingRoutes = require('./routes/reportingRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const launchRoutes = require('./routes/launchRoutes');

// Utils
const adServer = require('./utils/adServer');
const analytics = require('./utils/analytics');
const mlEngine = require('./utils/mlEngine');
const targetingEngine = require('./utils/targetingEngine');
const budgetPacing = require('./utils/budgetPacing');
const yieldControls = require('./utils/yieldControls');
const attribution = require('./utils/attribution');
const videoEngine = require('./utils/videoEngine');
const crossChannel = require('./utils/crossChannel');
const reporting = require('./utils/reporting');

module.exports = {
  // Controllers
  AdController,
  CreativeController,
  RTBController,
  targetingController,
  budgetController,
  yieldController,
  attributionController,
  videoController,
  activationController,
  reportingController,
  reviewController,
  campaignLaunchController,
  
  // Models
  Creative,
  Campaign,
  AdRequest,
  Impression,
  Auction,
  
  // Routes
  adRoutes,
  creativeRoutes,
  campaignRoutes,
  rtbRoutes,
  targetingRoutes,
  budgetRoutes,
  yieldRoutes,
  attributionRoutes,
  videoRoutes,
  activationRoutes,
  reportingRoutes,
  reviewRoutes,
  launchRoutes,
  
  // Utils
  adServer,
  analytics,
  mlEngine,
  targetingEngine,
  budgetPacing,
  yieldControls,
  attribution,
  videoEngine,
  crossChannel,
  reporting
}; 