const express = require('express');
const { getMyTokens } = require('../controllers/tokenController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/my/tokens
router.get('/tokens', authenticateToken, getMyTokens);

module.exports = router;
