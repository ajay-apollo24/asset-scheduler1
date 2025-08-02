// controllers/creativeController.js
const Creative = require('../models/Creative');
const Asset = require('../../asset-booking/models/Asset');
const AuditLog = require('../../shared/models/AuditLog');
const logger = require('../../shared/utils/logger');
const db = require('../../../config/db');

// Validation utilities
const validateAssetAndDimensions = async (asset_id, dimensions) => {
  const asset = await Asset.findById(asset_id);
  if (!asset) {
    throw new Error('Asset not found');
  }
  
  // Validate creative dimensions match asset specifications
  if (dimensions && asset.dimensions) {
    const assetDims = typeof asset.dimensions === 'string' ? JSON.parse(asset.dimensions) : asset.dimensions;
    const creativeDims = typeof dimensions === 'string' ? JSON.parse(dimensions) : dimensions;
    
    if (assetDims.width !== creativeDims.width || assetDims.height !== creativeDims.height) {
      throw new Error('Creative dimensions must match asset specifications');
    }
  }
  
  return asset;
};

const uploadToCDN = async (content, type, name) => {
  try {
    // TODO: Implement actual CDN upload logic
    // For production, integrate with AWS S3, CloudFront, or similar CDN
    const cdnUrl = `https://cdn.example.com/creatives/${Date.now()}_${name.replace(/[^a-zA-Z0-9]/g, '_')}`;
    logger.info('CDN upload successful', { cdnUrl, type, name });
    return cdnUrl;
  } catch (error) {
    logger.error('CDN upload failed', { error: error.message, type, name });
    throw new Error('Failed to upload creative to CDN');
  }
};

const validateUpdatePermissions = async (creative_id, user_id, updates) => {
  const creative = await Creative.findById(creative_id);
  if (!creative) {
    throw new Error('Creative not found');
  }
  
  // Check if user can update this creative
  // TODO: Implement role-based permission checks based on your RBAC system
  const canUpdate = true; // Placeholder - implement based on user roles and creative ownership
  
  if (!canUpdate) {
    throw new Error('Insufficient permissions to update creative');
  }
  
  // Validate status transitions
  if (updates.status && !['draft', 'pending', 'approved', 'rejected'].includes(updates.status)) {
    throw new Error('Invalid status value');
  }
  
  // Validate type constraints
  if (updates.type && !['image', 'video', 'html5', 'native'].includes(updates.type)) {
    throw new Error('Invalid creative type');
  }
  
  return creative;
};

const CreativeController = {
  async create(req, res) {
    const { asset_id, campaign_id, name, type, content, dimensions, file_size } = req.body;
    const user_id = req.user.user_id;
    const startTime = Date.now();

    logger.creative('CREATE_ATTEMPT', null, user_id, {
      asset_id,
      campaign_id,
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

    // Validate creative type
    if (!['image', 'video', 'html5', 'native'].includes(type)) {
      logger.warn('Creative creation failed - invalid type', {
        userId: user_id,
        type
      });
      return res.status(400).json({ message: 'Invalid creative type. Must be image, video, html5, or native' });
    }

    try {
      // Validate asset exists and dimensions match
      const asset = await validateAssetAndDimensions(asset_id, dimensions);
      
      // Upload creative files to CDN
      const cdnUrl = await uploadToCDN(content, type, name);
      
      // Create creative record with CDN URL
      const creative = await Creative.create({
        asset_id,
        campaign_id,
        name,
        type,
        content: { ...content, cdn_url: cdnUrl },
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
          campaign_id,
          name,
          type,
          dimensions,
          file_size,
          cdn_url: cdnUrl
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

      // Invalidate related cache entries
      const cacheInvalidation = require('../../shared/utils/cacheInvalidation');
      cacheInvalidation.smartInvalidate(req, 'creative_create', user_id, {
        creativeId: creative.id,
        assetId: asset_id,
        name
      });

      res.status(201).json(creative);
    } catch (err) {
      const duration = Date.now() - startTime;
      logger.logError(err, {
        context: 'creative_create',
        userId: user_id,
        duration
      });
      
      if (err.message === 'Asset not found') {
        return res.status(404).json({ message: 'Asset not found' });
      } else if (err.message === 'Creative dimensions must match asset specifications') {
        return res.status(400).json({ message: err.message });
      } else if (err.message === 'Failed to upload creative to CDN') {
        return res.status(500).json({ message: 'Failed to upload creative to CDN' });
      }
      
      res.status(500).json({ message: 'Failed to create creative' });
    }
  },

  async getAll(req, res) {
    const { asset_id, status, type, campaign_id, limit = 50, offset = 0 } = req.query;
    const startTime = Date.now();

    logger.creative('GET_ALL_ATTEMPT', null, req.user?.user_id, {
      asset_id,
      status,
      type,
      campaign_id,
      limit,
      offset
    });

    try {
      let query = 'SELECT * FROM creatives WHERE 1=1';
      const params = [];
      let paramIndex = 1;
      
      if (asset_id) {
        query += ` AND asset_id = $${paramIndex++}`;
        params.push(asset_id);
      }
      
      if (status) {
        query += ` AND status = $${paramIndex++}`;
        params.push(status);
      }
      
      if (type) {
        query += ` AND type = $${paramIndex++}`;
        params.push(type);
      }
      
      if (campaign_id) {
        query += ` AND campaign_id = $${paramIndex++}`;
        params.push(campaign_id);
      }
      
      // Add limit and offset for pagination
      query += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
      params.push(parseInt(limit), parseInt(offset));
      
      const result = await db.query(query, params);
      const creatives = result.rows;

      const duration = Date.now() - startTime;
      logger.performance('CREATIVE_GET_ALL', duration, {
        count: creatives.length
      });

      logger.creative('GET_ALL_SUCCESS', null, req.user?.user_id, {
        count: creatives.length
      });

      res.json({
        creatives,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: creatives.length
        }
      });
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
      // Validate creative exists and user has update permissions
      const existingCreative = await validateUpdatePermissions(id, user_id, updates);
      
      // If dimensions are being updated, validate against asset
      if (updates.dimensions) {
        await validateAssetAndDimensions(existingCreative.asset_id, updates.dimensions);
      }
      
      // If content is being updated, upload to CDN
      if (updates.content) {
        const cdnUrl = await uploadToCDN(updates.content, updates.type || existingCreative.type, existingCreative.name);
        updates.content = { ...updates.content, cdn_url: cdnUrl };
      }

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

      // Invalidate related cache entries
      const cacheInvalidation = require('../../shared/utils/cacheInvalidation');
      cacheInvalidation.smartInvalidate(req, 'creative_update', user_id, {
        creativeId: id,
        updates: Object.keys(updates)
      });

      res.json(creative);
    } catch (err) {
      const duration = Date.now() - startTime;
      logger.logError(err, {
        context: 'creative_update',
        creativeId: id,
        userId: user_id,
        duration
      });
      
      if (err.message === 'Creative not found') {
        return res.status(404).json({ message: 'Creative not found' });
      } else if (err.message === 'Insufficient permissions to update creative') {
        return res.status(403).json({ message: 'Insufficient permissions to update creative' });
      } else if (err.message === 'Invalid status value' || err.message === 'Invalid creative type') {
        return res.status(400).json({ message: err.message });
      } else if (err.message === 'Creative dimensions must match asset specifications') {
        return res.status(400).json({ message: err.message });
      }
      
      res.status(500).json({ message: 'Failed to update creative' });
    }
  },

  async getPerformanceMetrics(req, res) {
    const { id } = req.params;
    const { timeRange = '24h' } = req.query;
    const startTime = Date.now();

    logger.creative('GET_PERFORMANCE_ATTEMPT', id, req.user?.user_id);

    try {
      const metrics = await Creative.getPerformanceMetrics(id, timeRange);

      const duration = Date.now() - startTime;
      logger.performance('CREATIVE_GET_PERFORMANCE', duration, { creativeId: id });

      logger.creative('GET_PERFORMANCE_SUCCESS', id, req.user?.user_id);

      res.json({
        creative_id: id,
        time_range: timeRange,
        metrics,
        calculated_at: new Date().toISOString()
      });
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