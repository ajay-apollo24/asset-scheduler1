// routes/creativeRoutes.js
const express = require('express');
const router = express.Router();
const CreativeController = require('../controllers/creativeController');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');

// Creative management routes
router.post('/', auth, authorize(['admin', 'creative_manager']), CreativeController.create);
router.get('/', auth, authorize(['admin', 'creative_manager', 'analyst']), CreativeController.getAll);
router.get('/:id', auth, authorize(['admin', 'creative_manager', 'analyst']), CreativeController.getById);
router.put('/:id', auth, authorize(['admin', 'creative_manager']), CreativeController.update);
router.get('/:id/performance', auth, authorize(['admin', 'creative_manager', 'analyst']), CreativeController.getPerformanceMetrics);

module.exports = router; 