const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth');
const Staff = require('../models/Staff');
const Department = require('../models/Department');

const router = express.Router();

/**
 * GET /api/staff/departments
 * Returns only the departments of the staff member's assigned place.
 * Enforces:
 * - Must be authenticated staff
 * - Account must be approved
 * - Staff must have place linked
 */
router.get('/departments', authenticateToken, requireRole('staff'), async (req, res) => {
  try {
    const staff = await Staff.findById(req.user.id).populate('place');
    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff account not found.',
      });
    }

    if (staff.status !== 'approved') {
      return res.status(403).json({
        success: false,
        message: 'Staff account is not approved.',
      });
    }

    if (!staff.place) {
      return res.status(400).json({
        success: false,
        message: 'Your account has no hospital linked. Please contact the admin.',
      });
    }

    const departments = await Department.find({ place: staff.place._id }).sort({ name: 1 });

    return res.json({
      success: true,
      place: staff.place,
      departments,
    });
  } catch (error) {
    console.error('Error fetching staff departments:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch staff departments.',
    });
  }
});

module.exports = router;
