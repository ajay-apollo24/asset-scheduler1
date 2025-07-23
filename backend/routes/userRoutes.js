// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');

router.post('/', authMiddleware, UserController.create);     // Admin creates user
router.get('/', authMiddleware, UserController.getAll);      // List all users (optional)
router.get('/:id', authMiddleware, UserController.getById);  // Get user by ID

module.exports = router;