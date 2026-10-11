const express = require('express');
const {
  getSummary,
  getPeakHours,
  getCrowdPrediction,
  getDailyVisitors,
} = require('../controllers/analyticsController');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/summary', optionalAuth, getSummary);
router.get('/peak-hours', optionalAuth, getPeakHours);
router.get('/crowd-prediction', optionalAuth, getCrowdPrediction);
router.get('/daily-visitors', optionalAuth, getDailyVisitors);

module.exports = router;
