const express = require('express');
const {
  getDepartmentTokens,
  callNextToken,
  pauseCounter,
  resumeCounter,
} = require('../controllers/tokenController');
const { authenticateToken, requireRole, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/departments/:id/tokens?date=
router.get('/:id/tokens', optionalAuth, getDepartmentTokens);

// Staff department-specific operations
router.post('/:id/call-next', authenticateToken, requireRole('staff'), callNextToken);
router.post('/:id/pause', authenticateToken, requireRole('staff'), pauseCounter);
router.post('/:id/resume', authenticateToken, requireRole('staff'), resumeCounter);

module.exports = router;
