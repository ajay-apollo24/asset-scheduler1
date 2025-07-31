// controllers/assetController.js
const Asset = require('../../asset-booking/models/Asset');
const AuditLog = require('../../shared/models/AuditLog');
const logger = require('../../shared/utils/logger');

const AssetController = {
  async create(req, res) {
    const { name, location, type, max_slots, importance, impressions_per_day, value_per_day, level, is_active } = req.body;
    const user_id = req.user.user_id;
    const startTime = Date.now();

    logger.asset('CREATE_ATTEMPT', null, user_id, {
      name,
      location,
      type,
      max_slots,
      importance,
      impressions_per_day,
      value_per_day,
      level,
      is_active
    });

    if (!name || !location || !type || max_slots == null) {
      logger.warn('Asset creation failed - missing required fields', {
        userId: user_id,
        providedFields: { name, location, type, max_slots }
      });
      return res.status(400).json({ message: 'name, location, type, and max_slots are required' });
    }

    try {
      const asset = await Asset.create({
        name,
        location,
        type,
        max_slots,
        importance: importance ?? 1,
        impressions_per_day: impressions_per_day ?? 0,
        value_per_day: value_per_day ?? 0,
        level: level ?? 'secondary',
        is_active: is_active ?? true
      });

      // Audit logging for asset creation
      await AuditLog.create({
        user_id,
        action: 'CREATE_ASSET',
        entity_type: 'asset',
        entity_id: asset.id,
        metadata: {
          name: asset.name,
          location: asset.location,
          type: asset.type,
          max_slots: asset.max_slots,
          importance: asset.importance,
          impressions_per_day: asset.impressions_per_day,
          value_per_day: asset.value_per_day,
          level: asset.level,
          is_active: asset.is_active
        },
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      });

      const duration = Date.now() - startTime;
      logger.performance('ASSET_CREATE', duration, {
        assetId: asset.id,
        userId: user_id
      });

      logger.asset('CREATE_SUCCESS', asset.id, user_id, {
        name: asset.name,
        location: asset.location,
        level: asset.level
      });

      // Invalidate related cache entries
      const cacheInvalidation = require('../../shared/utils/cacheInvalidation');
      cacheInvalidation.smartInvalidate(req, 'asset_create', user_id, {
        assetId: asset.id,
        assetName: asset.name
      });

      res.status(201).json(asset);
    } catch (err) {
      const duration = Date.now() - startTime;
      logger.logError(err, {
        context: 'asset_create',
        userId: user_id,
        duration
      });
      res.status(500).json({ message: 'Failed to create asset' });
    }
  },

  async getAll(req, res) {
    const user_id = req.user.user_id;
    const startTime = Date.now();

    logger.asset('GET_ALL_ATTEMPT', null, user_id);

    try {
      const assets = await Asset.findAll();
      const duration = Date.now() - startTime;
      
      logger.performance('ASSET_GET_ALL', duration, {
        userId: user_id,
        assetCount: assets.length
      });

      logger.asset('GET_ALL_SUCCESS', null, user_id, {
        assetCount: assets.length
      });

      res.json(assets);
    } catch (err) {
      const duration = Date.now() - startTime;
      logger.logError(err, {
        context: 'asset_get_all',
        userId: user_id,
        duration
      });
      res.status(500).json({ message: 'Failed to fetch assets' });
    }
  },

  async getById(req, res) {
    const { id } = req.params;
    const user_id = req.user.user_id;
    const startTime = Date.now();

    logger.asset('GET_BY_ID_ATTEMPT', id, user_id);

    try {
      const asset = await Asset.findById(id);
      if (!asset) {
        logger.warn('Asset not found', {
          userId: user_id,
          assetId: id
        });
        return res.status(404).json({ message: 'Asset not found' });
      }

      const duration = Date.now() - startTime;
      logger.performance('ASSET_GET_BY_ID', duration, {
        assetId: id,
        userId: user_id
      });

      logger.asset('GET_BY_ID_SUCCESS', id, user_id, {
        name: asset.name,
        level: asset.level
      });

      res.json(asset);
    } catch (err) {
      const duration = Date.now() - startTime;
      logger.logError(err, {
        context: 'asset_get_by_id',
        userId: user_id,
        assetId: id,
        duration
      });
      res.status(500).json({ message: 'Error retrieving asset' });
    }
  },

  async update(req, res) {
    const { id } = req.params;
    const updates = req.body;
    const user_id = req.user.user_id;
    const startTime = Date.now();

    logger.asset('UPDATE_ATTEMPT', id, user_id, {
      updates: Object.keys(updates)
    });

    try {
      // Get current asset state for audit
      const currentAsset = await Asset.findById(id);
      if (!currentAsset) {
        logger.warn('Asset update failed - asset not found', {
          userId: user_id,
          assetId: id
        });
        return res.status(404).json({ message: 'Asset not found' });
      }

      const updated = await Asset.update(id, updates);

      // Audit logging for asset update
      await AuditLog.create({
        user_id,
        action: 'UPDATE_ASSET',
        entity_type: 'asset',
        entity_id: id,
        metadata: {
          asset_name: currentAsset.name,
          updated_fields: Object.keys(updates),
          previous_values: Object.keys(updates).reduce((acc, key) => {
            acc[key] = currentAsset[key];
            return acc;
          }, {}),
          new_values: updates
        },
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      });

      const duration = Date.now() - startTime;
      logger.performance('ASSET_UPDATE', duration, {
        assetId: id,
        userId: user_id
      });

      logger.asset('UPDATE_SUCCESS', id, user_id, {
        updatedFields: Object.keys(updates)
      });

      // Invalidate related cache entries
      const cacheInvalidation = require('../../shared/utils/cacheInvalidation');
      cacheInvalidation.smartInvalidate(req, 'asset_update', user_id, {
        assetId: id,
        updatedFields: Object.keys(updates)
      });

      res.json(updated);
    } catch (err) {
      const duration = Date.now() - startTime;
      logger.logError(err, {
        context: 'asset_update',
        userId: user_id,
        assetId: id,
        duration
      });
      res.status(500).json({ message: 'Failed to update asset' });
    }
  },

  async delete(req, res) {
    const { id } = req.params;
    const user_id = req.user?.user_id;
    const startTime = Date.now();

    logger.asset('DELETE_ATTEMPT', id, user_id);

    try {
      // Get current asset state for audit
      const currentAsset = await Asset.findById(id);
      if (!currentAsset) {
        logger.warn('Asset delete failed - asset not found', {
          userId: user_id,
          assetId: id
        });
        return res.status(404).json({ message: 'Asset not found' });
      }

      const result = await Asset.delete(id);
      if (!result) {
        return res.status(404).json({ message: 'Asset not found' });
      }

      // Audit logging for asset deletion
      if (user_id) {
        await AuditLog.create({
          user_id,
          action: 'DELETE_ASSET',
          entity_type: 'asset',
          entity_id: id,
          metadata: {
            asset_name: currentAsset.name,
            asset_location: currentAsset.location,
            asset_type: currentAsset.type
          },
          ip_address: req.ip,
          user_agent: req.get('User-Agent')
        });
      }

      const duration = Date.now() - startTime;
      logger.performance('ASSET_DELETE', duration, {
        assetId: id,
        userId: user_id
      });

      logger.asset('DELETE_SUCCESS', id, user_id, {
        name: currentAsset.name
      });

      // Invalidate related cache entries
      const cacheInvalidation = require('../../shared/utils/cacheInvalidation');
      cacheInvalidation.smartInvalidate(req, 'asset_delete', user_id, {
        assetId: id,
        assetName: currentAsset.name
      });

      res.json({ message: 'Asset deleted successfully' });
    } catch (err) {
      const duration = Date.now() - startTime;
      logger.logError(err, {
        context: 'asset_delete',
        userId: user_id,
        assetId: id,
        duration
      });
      res.status(500).json({ message: 'Failed to delete asset' });
    }
  }
};

module.exports = AssetController;