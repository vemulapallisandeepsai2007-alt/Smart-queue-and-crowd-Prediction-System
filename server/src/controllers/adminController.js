const Staff = require('../models/Staff');
const Place = require('../models/Place');
const Department = require('../models/Department');
const { logActivity } = require('../services/activityService');

/**
 * GET /api/admin/staff?status=
 * Fetch staff members optionally filtered by status ('pending', 'approved', 'rejected')
 */
const getStaffList = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};

    if (status && ['pending', 'approved', 'rejected', 'deactivated'].includes(status)) {
      filter.status = status;
    }

    const staffList = await Staff.find(filter)
      .populate('place', 'name category city address')
      .populate('department', 'name avgServiceMinutes')
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: staffList.length,
      staff: staffList,
    });
  } catch (error) {
    console.error('Error in getStaffList:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch staff members.',
    });
  }
};

/**
 * GET /api/admin/facilities
 * Returns all database places and their departments for admin staff assignment dropdown
 */
const getFacilitiesForAssignment = async (req, res) => {
  try {
    const places = await Place.find().sort({ name: 1 }).lean();
    const placesWithDepts = await Promise.all(
      places.map(async (p) => {
        const departments = await Department.find({ place: p._id }).sort({ name: 1 }).lean();
        return {
          ...p,
          departments,
        };
      })
    );
    return res.json({
      success: true,
      count: placesWithDepts.length,
      places: placesWithDepts,
    });
  } catch (error) {
    console.error('Error in getFacilitiesForAssignment:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch facilities.',
    });
  }
};

/**
 * PATCH /api/admin/staff/:id/approve
 * Confirms approval for staff member at their chosen hospital/bank.
 * No longer asks for place or department selection.
 */
const approveStaff = async (req, res) => {
  try {
    const { id } = req.params;

    const staff = await Staff.findById(id).populate('place');
    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found.',
      });
    }

    // If an optional placeId was sent, update it; otherwise staff already chose their place at signup
    if (req.body.placeId) {
      staff.place = req.body.placeId;
    }

    if (!staff.place) {
      return res.status(400).json({
        success: false,
        message: 'Cannot approve staff member without an associated hospital or bank.',
      });
    }

    staff.status = 'approved';
    await staff.save();

    await logActivity({
      place: staff.place._id || staff.place,
      department: staff.department || null,
      type: 'staff_approved',
      description: `Staff member ${staff.name} (${staff.staffId}) approved for ${staff.place.name || 'facility'}`,
      metadata: { staffName: staff.name, staffId: staff.staffId, placeName: staff.place.name },
    });

    const updatedStaff = await Staff.findById(id)
      .populate('place', 'name category city address')
      .populate('department', 'name avgServiceMinutes');

    return res.json({
      success: true,
      message: `Staff member ${staff.name} (${staff.staffId}) approved successfully for ${updatedStaff.place?.name || 'facility'}.`,
      staff: updatedStaff,
    });
  } catch (error) {
    console.error('Error in approveStaff:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to approve staff member.',
    });
  }
};

/**
 * PATCH /api/admin/staff/:id/reject
 * Reject a pending staff application
 */
const rejectStaff = async (req, res) => {
  try {
    const { id } = req.params;

    const staff = await Staff.findById(id);
    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found.',
      });
    }

    staff.status = 'rejected';
    await staff.save();

    return res.json({
      success: true,
      message: `Staff member ${staff.name} application was rejected.`,
      staff,
    });
  } catch (error) {
    console.error('Error in rejectStaff:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to reject staff member.',
    });
  }
};

/**
 * PATCH /api/admin/staff/:id/deactivate
 * Deactivate an approved staff member (sets status to 'deactivated')
 */
const deactivateStaff = async (req, res) => {
  try {
    const { id } = req.params;

    const staff = await Staff.findById(id);
    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found.',
      });
    }

    staff.status = 'deactivated';
    await staff.save();

    if (staff.place) {
      await logActivity({
        place: staff.place,
        department: staff.department,
        type: 'staff_deactivated',
        description: `Staff member ${staff.name} (${staff.staffId}) was deactivated by Administrator`,
        metadata: { staffName: staff.name, staffId: staff.staffId },
      });
    }

    return res.json({
      success: true,
      message: `Staff member ${staff.name} (${staff.staffId}) has been deactivated.`,
      staff,
    });
  } catch (error) {
    console.error('Error in deactivateStaff:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to deactivate staff member.',
    });
  }
};

module.exports = {
  getStaffList,
  getFacilitiesForAssignment,
  approveStaff,
  rejectStaff,
  deactivateStaff,
};

