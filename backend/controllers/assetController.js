// controllers/assetController.js
const Asset = require('../models/Asset');
const logger = require('../utils/logger');

const AssetController = {
  async create(req, res) {
    const { name, location, type, max_slots, is_active } = req.body;

    if (!name || !location || !type || max_slots == null) {
      return res.status(400).json({ message: 'name, location, type, and max_slots are required' });
    }

    try {
      const asset = await Asset.create({
        name,
        location,
        type,
        max_slots,
        is_active: is_active ?? true
      });
      res.status(201).json(asset);
    } catch (err) {
      logger.error(err);
      res.status(500).json({ message: 'Failed to create asset' });
    }
  },

  async getAll(req, res) {
    try {
      const assets = await Asset.findAll();
      res.json(assets);
    } catch (err) {
      logger.error(err);
      res.status(500).json({ message: 'Failed to fetch assets' });
    }
  },

  async getById(req, res) {
    try {
      const asset = await Asset.findById(req.params.id);
      if (!asset) return res.status(404).json({ message: 'Asset not found' });
      res.json(asset);
    } catch (err) {
      logger.error(err);
      res.status(500).json({ message: 'Error retrieving asset' });
    }
  },

  async update(req, res) {
    try {
      const updated = await Asset.update(req.params.id, req.body);
      res.json(updated);
    } catch (err) {
      logger.error(err);
      res.status(500).json({ message: 'Failed to update asset' });
    }
  }
};

module.exports = AssetController;