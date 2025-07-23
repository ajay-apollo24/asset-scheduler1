// routes/bookingRoutes.js
const express = require('express');
const router = express.Router();
const BookingController = require('../controllers/bookingController');
const authMiddleware = require('../middleware/auth');

router.post('/', authMiddleware, BookingController.create);             // Create new booking
router.get('/', authMiddleware, BookingController.getAll);              // List all bookings
router.get('/:id', authMiddleware, BookingController.getById);          // Get one booking
router.put('/:id/status', authMiddleware, BookingController.updateStatus); // Approve/reject

module.exports = router;