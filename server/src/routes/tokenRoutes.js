const express = require('express');
const {
  bookToken,
  walkInToken,
  skipToken,
  recallToken,
  cancelToken,
  completeToken,
  getTokenDetails,
} = require('../controllers/tokenController');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/tokens/:id/details (Staff only, assigned facility)
router.get('/:id/details', authenticateToken, requireRole('staff'), getTokenDetails);

// POST /api/tokens/:id/book (Authenticated User)
router.post('/:id/book', authenticateToken, bookToken);

// POST /api/tokens/:id/walkin (Staff only)
router.post('/:id/walkin', authenticateToken, requireRole('staff'), walkInToken);

// POST /api/tokens/:id/skip (Staff only)
router.post('/:id/skip', authenticateToken, requireRole('staff'), skipToken);

// POST /api/tokens/:id/recall (Staff only)
router.post('/:id/recall', authenticateToken, requireRole('staff'), recallToken);

// POST /api/tokens/:id/cancel (User owner or assigned Staff)
router.post('/:id/cancel', authenticateToken, cancelToken);

// POST /api/tokens/:id/complete (Staff only, department assigned)
router.post('/:id/complete', authenticateToken, requireRole('staff'), completeToken);

module.exports = router;
