// controllers/adController.js
const Creative = require('../models/Creative');
const Campaign = require('../models/Campaign');
const AdRequest = require('../models/AdRequest');
const Impression = require('../models/Impression');
const Click = require('../models/Click');
const AdServer = require('../utils/adServer');
const logger = require('../../shared/utils/logger');

const AdController = {
  async serveAd(req, res) {
    const { asset_id, user_context, page_context } = req.body;
    const startTime = Date.now();

    logger.ad('SERVE_ATTEMPT', null, null, {
      asset_id,
      user_context,
      page_context
    });

    try {
      // 1. Validate ad request
      const validation = await AdServer.validateAdRequest(asset_id, user_context, page_context);
      if (!validation.valid) {
        logger.warn('Ad request validation failed', {
          asset_id,
          errors: validation.errors
        });
        return res.status(400).json({ 
          message: 'Invalid ad request', 
          errors: validation.errors 
        });
      }

      // 2. Select best creative
      const creative = await AdServer.selectCreative(asset_id, user_context, page_context);
      if (!creative) {
        logger.warn('No creative available for asset', { asset_id });
        return res.status(204).json({ message: 'No ad available' });
      }

      // 3. Calculate bid
      const bid = await AdServer.calculateBid(asset_id, user_context, creative.id);

      // 4. Create ad request record
      const adRequest = await AdRequest.create({ 
        asset_id, 
        user_context, 
        page_context 
      });

      // 5. Generate tracking URLs
      const trackingUrls = {
        impression_url: `${req.protocol}://${req.get('host')}/api/ads/impression?ad_id=${adRequest.id}&creative_id=${creative.id}`,
        click_url: `${req.protocol}://${req.get('host')}/api/ads/click?ad_id=${adRequest.id}&creative_id=${creative.id}`,
        viewability_url: `${req.protocol}://${req.get('host')}/api/ads/viewability?ad_id=${adRequest.id}&creative_id=${creative.id}`
      };

      // 6. Build ad response
      const adResponse = {
        ad_id: adRequest.id,
        creative: {
          id: creative.id,
          type: creative.type,
          content: creative.content,
          dimensions: creative.dimensions
        },
        tracking: trackingUrls,
        bid: bid,
        metadata: {
          campaign_id: creative.campaign_id,
          asset_id: asset_id,
          expires_at: new Date(Date.now() + 3600000).toISOString() // 1 hour
        }
      };

      const duration = Date.now() - startTime;
      logger.performance('AD_SERVE', duration, {
        asset_id,
        creative_id: creative.id,
        response_time: duration
      });

      logger.ad('SERVE_SUCCESS', adResponse.ad_id, null, {
        asset_id,
        creative_id: creative.id,
        creative_type: adResponse.creative.type
      });

      res.json(adResponse);
    } catch (err) {
      const duration = Date.now() - startTime;
      logger.logError(err, {
        context: 'ad_serve',
        asset_id,
        duration
      });
      res.status(500).json({ message: 'Failed to serve ad' });
    }
  },

  async trackImpression(req, res) {
    const { ad_id, creative_id } = req.query;
    const user_id = req.body.user_id || req.query.user_id || 'anonymous';
    const metadata = req.body.metadata || {};
    const startTime = Date.now();

    logger.ad('IMPRESSION_ATTEMPT', ad_id, user_id, {
      creative_id,
      metadata
    });

    try {
      // 1. Validate parameters
      if (!ad_id || !creative_id) {
        return res.status(400).json({ message: 'ad_id and creative_id are required' });
      }

      // 2. Create impression record
      const impression = await Impression.create({ 
        ad_request_id: parseInt(ad_id),
        creative_id: parseInt(creative_id), 
        user_id, 
        metadata 
      });

      // 3. Update performance metrics
      await AdServer.updatePerformanceMetrics(creative_id, 'impression', metadata);

      const duration = Date.now() - startTime;
      logger.performance('IMPRESSION_TRACK', duration, {
        ad_id,
        creative_id
      });

      logger.ad('IMPRESSION_SUCCESS', ad_id, user_id, {
        creative_id,
        impression_id: impression.id
      });

      // Invalidate analytics cache
      const cacheInvalidation = require('../../shared/utils/cacheInvalidation');
      cacheInvalidation.invalidateDashboard(req, 'impression_track', user_id);

      // Return 1x1 pixel
      res.set('Content-Type', 'image/gif');
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      res.send(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'));
    } catch (err) {
      const duration = Date.now() - startTime;
      logger.logError(err, {
        context: 'impression_track',
        ad_id,
        duration
      });
      res.status(500).send('Error tracking impression');
    }
  },

  async trackClick(req, res) {
    const { ad_id, creative_id } = req.query;
    const user_id = req.body.user_id || req.query.user_id || 'anonymous';
    const metadata = req.body.metadata || {};
    const startTime = Date.now();

    console.log('trackClick called with:', { ad_id, creative_id, user_id });

    logger.ad('CLICK_ATTEMPT', ad_id, user_id, {
      creative_id,
      metadata
    });

    try {
      // 1. Validate parameters
      if (!ad_id || !creative_id) {
        return res.status(400).json({ message: 'ad_id and creative_id are required' });
      }

      console.log('Step 1: Parameters validated');

      // 2. Get creative to find destination URL
      const creative = await Creative.findById(creative_id);
      if (!creative) {
        return res.status(404).json({ message: 'Creative not found' });
      }

      console.log('Step 2: Creative found:', creative.id);

      // 3. Get the impression for this ad request
      const impression = await Impression.findByAdRequestId(parseInt(ad_id));
      if (!impression) {
        return res.status(404).json({ message: 'Impression not found for this ad request' });
      }

      console.log('Step 3: Impression found:', impression.id);

      // 4. Create click record
      const click = await Click.create({ 
        impression_id: impression.id,
        user_id, 
        destination_url: creative.content.click_url || creative.content.destination_url,
        metadata: { ...metadata, event_type: 'click' }
      });

      console.log('Step 4: Click created:', click.id);

      // 5. Update performance metrics
      await AdServer.updatePerformanceMetrics(creative_id, 'click', metadata);

      console.log('Step 5: Performance metrics updated');

      // 6. Get destination URL from creative content
      const destinationUrl = creative.content.click_url || creative.content.destination_url;
      if (!destinationUrl) {
        return res.status(400).json({ message: 'No destination URL found' });
      }

      console.log('Step 6: Destination URL:', destinationUrl);

      const duration = Date.now() - startTime;
      logger.performance('CLICK_TRACK', duration, {
        ad_id,
        creative_id
      });

      logger.ad('CLICK_SUCCESS', ad_id, user_id, {
        creative_id,
        destination_url: destinationUrl,
        click_id: click.id
      });

      // Invalidate analytics cache
      // const cacheInvalidation = require('../../shared/utils/cacheInvalidation');
      // cacheInvalidation.invalidateDashboard(req, 'click_track', user_id);

      // Redirect to destination URL
      res.redirect(destinationUrl);
    } catch (err) {
      console.error('Error in trackClick:', err);
      const duration = Date.now() - startTime;
      logger.logError(err, {
        context: 'click_track',
        ad_id,
        duration
      });
      res.status(500).json({ message: 'Failed to track click' });
    }
  },

  async getAdAnalytics(req, res) {
    const { asset_id, timeRange = '24h' } = req.query;
    const startTime = Date.now();

    logger.ad('ANALYTICS_ATTEMPT', null, req.user?.user_id, {
      asset_id,
      timeRange
    });

    try {
      // Get analytics data
      const analytics = await AdRequest.getRequestStats(asset_id, timeRange);
      
      // Get creative performance for the asset
      let creativePerformance = [];
      if (asset_id) {
        const creatives = await Creative.findByAssetId(asset_id);
        creativePerformance = await Promise.all(
          creatives.map(async (creative) => {
            const metrics = await Creative.getPerformanceMetrics(creative.id, timeRange);
            return {
              creative_id: creative.id,
              name: creative.name,
              type: creative.type,
              ...metrics
            };
          })
        );
      }

      const response = {
        asset_id,
        timeRange,
        request_stats: analytics,
        creative_performance: creativePerformance
      };

      const duration = Date.now() - startTime;
      logger.performance('AD_ANALYTICS', duration, { asset_id });

      logger.ad('ANALYTICS_SUCCESS', null, req.user?.user_id, {
        asset_id,
        timeRange
      });

      res.json(response);
    } catch (err) {
      const duration = Date.now() - startTime;
      logger.logError(err, {
        context: 'ad_analytics',
        asset_id,
        duration
      });
      res.status(500).json({ message: 'Failed to fetch analytics' });
    }
  }
};

module.exports = AdController; 