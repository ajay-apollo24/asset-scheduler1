// controllers/creativeController.js
const Creative = require('../models/Creative');
const Asset = require('../../asset-booking/models/Asset');
const AuditLog = require('../../shared/models/AuditLog');
const logger = require('../../shared/utils/logger');

const CreativeController = {
  async create(req, res) {
    const { asset_id, name, type, content, dimensions, file_size } = req.body;
    const user_id = req.user.user_id;
    const startTime = Date.now();

    logger.creative('CREATE_ATTEMPT', null, user_id, {
      asset_id,
      name,
      type,
      dimensions,
      file_size
    });

    if (!asset_id || !name || !type || !content) {
      logger.warn('Creative creation failed - missing required fields', {
        userId: user_id,
        providedFields: { asset_id, name, type, content }
      });
      return res.status(400).json({ message: 'asset_id, name, type, and content are required' });
    }

    try {
      // TODO: Implement creative creation
      // 1. Validate asset exists
      // 2. Validate creative dimensions match asset
      // 3. Upload creative files to CDN
      // 4. Create creative record
      // 5. Create audit log

      const creative = await Creative.create({
        asset_id,
        name,
        type,
        content,
        dimensions,
        file_size,
        status: 'draft'
      });

      await AuditLog.create({
        user_id,
        action: 'CREATE_CREATIVE',
        entity_type: 'creative',
        entity_id: creative.id,
        metadata: {
          asset_id,
          name,
          type,
          dimensions,
          file_size
        }
      });

      const duration = Date.now() - startTime;
      logger.performance('CREATIVE_CREATE', duration, {
        creativeId: creative.id,
        userId: user_id
      });

      logger.creative('CREATE_SUCCESS', creative.id, user_id, {
        name,
        type,
        asset_id
      });

      res.status(201).json(creative);
    } catch (err) {
      const duration = Date.now() - startTime;
      logger.logError(err, {
        context: 'creative_create',
        userId: user_id,
        duration
      });
      res.status(500).json({ message: 'Failed to create creative' });
    }
  },

  async getAll(req, res) {
    const { asset_id, status, type } = req.query;
    const startTime = Date.now();

    logger.creative('GET_ALL_ATTEMPT', null, req.user?.user_id, {
      asset_id,
      status,
      type
    });

    try {
      // TODO: Implement creative retrieval with filters
      let creatives = [];

      if (asset_id) {
        creatives = await Creative.findByAssetId(asset_id);
      } else {
        // TODO: Implement general creative retrieval
        creatives = [
          { id: 1, name: 'Creative 1', type: 'image', status: 'approved' },
          { id: 2, name: 'Creative 2', type: 'video', status: 'pending' }
        ];
      }

      const duration = Date.now() - startTime;
      logger.performance('CREATIVE_GET_ALL', duration, {
        count: creatives.length
      });

      logger.creative('GET_ALL_SUCCESS', null, req.user?.user_id, {
        count: creatives.length
      });

      res.json(creatives);
    } catch (err) {
      const duration = Date.now() - startTime;
      logger.logError(err, {
        context: 'creative_get_all',
        duration
      });
      res.status(500).json({ message: 'Failed to fetch creatives' });
    }
  },

  async getById(req, res) {
    const { id } = req.params;
    const startTime = Date.now();

    logger.creative('GET_BY_ID_ATTEMPT', id, req.user?.user_id);

    try {
      const creative = await Creative.findById(id);
      
      if (!creative) {
        logger.warn('Creative not found', { creativeId: id });
        return res.status(404).json({ message: 'Creative not found' });
      }

      const duration = Date.now() - startTime;
      logger.performance('CREATIVE_GET_BY_ID', duration, { creativeId: id });

      logger.creative('GET_BY_ID_SUCCESS', id, req.user?.user_id);

      res.json(creative);
    } catch (err) {
      const duration = Date.now() - startTime;
      logger.logError(err, {
        context: 'creative_get_by_id',
        creativeId: id,
        duration
      });
      res.status(500).json({ message: 'Failed to fetch creative' });
    }
  },

  async update(req, res) {
    const { id } = req.params;
    const updates = req.body;
    const user_id = req.user.user_id;
    const startTime = Date.now();

    logger.creative('UPDATE_ATTEMPT', id, user_id, { updates });

    try {
      // TODO: Implement creative update
      // 1. Validate creative exists
      // 2. Validate update permissions
      // 3. Update creative record
      // 4. Create audit log

      const creative = await Creative.update(id, updates);

      await AuditLog.create({
        user_id,
        action: 'UPDATE_CREATIVE',
        entity_type: 'creative',
        entity_id: id,
        metadata: { updates }
      });

      const duration = Date.now() - startTime;
      logger.performance('CREATIVE_UPDATE', duration, { creativeId: id });

      logger.creative('UPDATE_SUCCESS', id, user_id);

      res.json(creative);
    } catch (err) {
      const duration = Date.now() - startTime;
      logger.logError(err, {
        context: 'creative_update',
        creativeId: id,
        userId: user_id,
        duration
      });
      res.status(500).json({ message: 'Failed to update creative' });
    }
  },

  async getPerformanceMetrics(req, res) {
    const { id } = req.params;
    const startTime = Date.now();

    logger.creative('GET_PERFORMANCE_ATTEMPT', id, req.user?.user_id);

    try {
      const metrics = await Creative.getPerformanceMetrics(id);

      const duration = Date.now() - startTime;
      logger.performance('CREATIVE_GET_PERFORMANCE', duration, { creativeId: id });

      logger.creative('GET_PERFORMANCE_SUCCESS', id, req.user?.user_id);

      res.json(metrics);
    } catch (err) {
      const duration = Date.now() - startTime;
      logger.logError(err, {
        context: 'creative_get_performance',
        creativeId: id,
        duration
      });
      res.status(500).json({ message: 'Failed to fetch performance metrics' });
    }
  }
};

module.exports = CreativeController; 