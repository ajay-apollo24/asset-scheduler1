// routes/cacheRoutes.js
const express = require('express');
const router = express.Router();
const CacheController = require('../controllers/cacheController');
const authMiddleware = require('../middleware/auth');

// Cache management routes (admin only)
router.delete('/', authMiddleware, CacheController.clearCache);
router.get('/status', authMiddleware, CacheController.getCacheStatus);

module.exports = router; 