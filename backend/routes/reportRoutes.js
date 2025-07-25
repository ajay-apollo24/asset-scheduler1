// routes/reportRoutes.js
const express = require('express');
const router = express.Router();
const ReportController = require('../controllers/reportController');
const auth = require('../middleware/auth');

router.get('/performance', auth, ReportController.performance);

module.exports = router; 