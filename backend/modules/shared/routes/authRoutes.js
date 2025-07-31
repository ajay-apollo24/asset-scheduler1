// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

// Public routes
router.post('/login', authController.login);
router.post('/register', authController.register);
router.post('/verify', authController.verifyToken);

// Protected routes
router.get('/profile', auth, authController.getProfile);

module.exports = router;