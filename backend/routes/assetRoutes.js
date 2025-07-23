// routes/assetRoutes.js
const express = require('express');
const router = express.Router();
const AssetController = require('../controllers/assetController');
const authMiddleware = require('../middleware/auth');

router.post('/', authMiddleware, AssetController.create);      // Admin creates asset
router.get('/', authMiddleware, AssetController.getAll);       // Anyone can list
router.get('/:id', authMiddleware, AssetController.getById);   // Get one asset
router.put('/:id', authMiddleware, AssetController.update);    // Admin updates

module.exports = router;