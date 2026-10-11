const mongoose = require('mongoose');
const Place = require('../models/Place');
const Department = require('../models/Department');
const Token = require('../models/Token');
const Staff = require('../models/Staff');
const { emitDepartmentUpdates } = require('../services/socketService');
const { getKolkataTime } = require('../services/estimateService');

// ==========================================
// PLACES CRUD
// ==========================================

/**
 * GET /api/admin/places
 */
const getPlaces = async (req, res) => {
  try {
    const places = await Place.find().sort({ name: 1 });
    // Enrich with department counts
    const placesWithCounts = await Promise.all(
      places.map(async (p) => {
        const deptCount = await Department.countDocuments({ place: p._id });
        const pObj = p.toObject();
        pObj.departmentCount = deptCount;
        return pObj;
      })
    );

    return res.json({
      success: true,
      count: placesWithCounts.length,
      places: placesWithCounts,
    });
  } catch (error) {
    console.error('Error in getPlaces:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch places.' });
  }
};

/**
 * POST /api/admin/places
 */
const createPlace = async (req, res) => {
  try {
    const { name, category, address, city = 'Guntur', phone = '', coordinates } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Facility name is required.' });
    }
    if (!['Hospital', 'Bank'].includes(category)) {
      return res.status(400).json({ success: false, message: 'Category must be Hospital or Bank.' });
    }
    if (!address || !address.trim()) {
      return res.status(400).json({ success: false, message: 'Address is required.' });
    }

    let coords = [80.4365, 16.3067]; // default center of Guntur
    if (Array.isArray(coordinates) && coordinates.length === 2) {
      const lng = Number(coordinates[0]);
      const lat = Number(coordinates[1]);
      if (!isNaN(lng) && !isNaN(lat)) {
        coords = [lng, lat];
      }
    }

    const place = await Place.create({
      name: name.trim(),
      category,
      address: address.trim(),
      city: city.trim(),
      phone: phone.trim(),
      location: {
        type: 'Point',
        coordinates: coords,
      },
      source: 'db',
    });

    return res.status(201).json({
      success: true,
      message: 'Facility created successfully.',
      place,
    });
  } catch (error) {
    console.error('Error in createPlace:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to create facility.' });
  }
};

/**
 * PUT /api/admin/places/:id
 */
const updatePlace = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, address, city, phone, coordinates } = req.body;

    const place = await Place.findById(id);
    if (!place) {
      return res.status(404).json({ success: false, message: 'Facility not found.' });
    }

    if (name && name.trim()) place.name = name.trim();
    if (category && ['Hospital', 'Bank'].includes(category)) place.category = category;
    if (address && address.trim()) place.address = address.trim();
    if (city && city.trim()) place.city = city.trim();
    if (phone !== undefined) place.phone = phone.trim();

    if (Array.isArray(coordinates) && coordinates.length === 2) {
      const lng = Number(coordinates[0]);
      const lat = Number(coordinates[1]);
      if (!isNaN(lng) && !isNaN(lat)) {
        place.location = {
          type: 'Point',
          coordinates: [lng, lat],
        };
      }
    }

    await place.save();

    return res.json({
      success: true,
      message: 'Facility updated successfully.',
      place,
    });
  } catch (error) {
    console.error('Error in updatePlace:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to update facility.' });
  }
};

/**
 * DELETE /api/admin/places/:id
 */
const deletePlace = async (req, res) => {
  try {
    const { id } = req.params;
    const place = await Place.findById(id);
    if (!place) {
      return res.status(404).json({ success: false, message: 'Facility not found.' });
    }

    // Cascade delete departments and their tokens
    const depts = await Department.find({ place: id });
    const deptIds = depts.map((d) => d._id);

    await Token.deleteMany({ department: { $in: deptIds } });
    await Department.deleteMany({ place: id });
    await Staff.updateMany({ place: id }, { $set: { status: 'rejected', place: null, department: null } });
    await Place.findByIdAndDelete(id);

    return res.json({
      success: true,
      message: `Facility "${place.name}" and its associated departments were deleted.`,
    });
  } catch (error) {
    console.error('Error in deletePlace:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete facility.' });
  }
};

// ==========================================
// DEPARTMENTS CRUD
// ==========================================

/**
 * GET /api/admin/departments?placeId=
 */
const getDepartments = async (req, res) => {
  try {
    const { placeId } = req.query;
    const filter = {};
    if (placeId && mongoose.Types.ObjectId.isValid(placeId)) {
      filter.place = placeId;
    }

    const departments = await Department.find(filter)
      .populate('place', 'name category address city')
      .sort({ name: 1 });

    return res.json({
      success: true,
      count: departments.length,
      departments,
    });
  } catch (error) {
    console.error('Error in getDepartments:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch departments.' });
  }
};

/**
 * POST /api/admin/departments
 */
const createDepartment = async (req, res) => {
  try {
    const { placeId, name, avgServiceMinutes = 10, opensAt = '09:00', closesAt = '17:00', doctors = [] } = req.body;

    if (!placeId || !mongoose.Types.ObjectId.isValid(placeId)) {
      return res.status(400).json({ success: false, message: 'Valid Place ID is required.' });
    }
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Department name is required.' });
    }

    const placeExists = await Place.findById(placeId);
    if (!placeExists) {
      return res.status(404).json({ success: false, message: 'Selected facility does not exist.' });
    }

    const department = await Department.create({
      place: placeId,
      name: name.trim(),
      avgServiceMinutes: Math.max(1, Number(avgServiceMinutes) || 10),
      opensAt: opensAt || '09:00',
      closesAt: closesAt || '17:00',
      doctors: Array.isArray(doctors) ? doctors : [],
    });

    const populated = await Department.findById(department._id).populate('place', 'name category');

    return res.status(201).json({
      success: true,
      message: 'Department created successfully.',
      department: populated,
    });
  } catch (error) {
    console.error('Error in createDepartment:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to create department.' });
  }
};

/**
 * PUT /api/admin/departments/:id
 */
function parseTimeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, avgServiceMinutes, opensAt, closesAt, slots, breaks } = req.body;

    const department = await Department.findById(id);
    if (!department) {
      return res.status(404).json({ success: false, message: 'Department not found.' });
    }

    if (name && name.trim()) department.name = name.trim();
    if (avgServiceMinutes !== undefined) {
      department.avgServiceMinutes = Math.max(1, Number(avgServiceMinutes) || 10);
    }
    if (opensAt) department.opensAt = opensAt;
    if (closesAt) department.closesAt = closesAt;

    if (slots) {
      if (!Array.isArray(slots) || slots.length !== 3) {
        return res.status(400).json({
          success: false,
          message: 'Department must have exactly 3 slots: Morning, Afternoon, Evening.',
        });
      }

      const expectedNames = ['Morning', 'Afternoon', 'Evening'];
      for (let i = 0; i < 3; i++) {
        const s = slots[i];
        if (s.name !== expectedNames[i]) {
          return res.status(400).json({
            success: false,
            message: `Slot #${i + 1} must be named '${expectedNames[i]}'.`,
          });
        }
        const tokenCount = Number(s.tokenTo) - Number(s.tokenFrom) + 1;
        if (tokenCount !== 25) {
          return res.status(400).json({
            success: false,
            message: `Slot '${s.name}' must have exactly 25 tokens (found ${tokenCount}).`,
          });
        }
        const sStart = parseTimeToMinutes(s.startTime);
        const sEnd = parseTimeToMinutes(s.endTime);
        if (sStart >= sEnd) {
          return res.status(400).json({
            success: false,
            message: `Slot '${s.name}' start time (${s.startTime}) must be earlier than end time (${s.endTime}).`,
          });
        }
      }

      const m1End = parseTimeToMinutes(slots[0].endTime);
      const m2Start = parseTimeToMinutes(slots[1].startTime);
      const m2End = parseTimeToMinutes(slots[1].endTime);
      const m3Start = parseTimeToMinutes(slots[2].startTime);

      if (m1End > m2Start) {
        return res.status(400).json({
          success: false,
          message: 'Morning and Afternoon slots overlap. Slot timings must not overlap.',
        });
      }
      if (m2End > m3Start) {
        return res.status(400).json({
          success: false,
          message: 'Afternoon and Evening slots overlap. Slot timings must not overlap.',
        });
      }

      department.slots = slots;
    }

    if (breaks) {
      if (!Array.isArray(breaks)) {
        return res.status(400).json({
          success: false,
          message: 'Breaks must be an array.',
        });
      }
      for (const b of breaks) {
        if (!b.label || !b.startTime || !b.endTime) {
          return res.status(400).json({
            success: false,
            message: 'Each break requires a label, startTime, and endTime.',
          });
        }
        const bStart = parseTimeToMinutes(b.startTime);
        const bEnd = parseTimeToMinutes(b.endTime);
        if (bStart >= bEnd) {
          return res.status(400).json({
            success: false,
            message: `Break '${b.label}' start time (${b.startTime}) must be earlier than end time (${b.endTime}).`,
          });
        }
      }
      department.breaks = breaks;
    }

    await department.save();
    const populated = await Department.findById(department._id).populate('place', 'name category');

    const todayStr = getKolkataTime().dateStr;
    emitDepartmentUpdates(department._id, todayStr);

    return res.json({
      success: true,
      message: 'Department updated successfully.',
      department: populated,
    });
  } catch (error) {
    console.error('Error in updateDepartment:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to update department.' });
  }
};

/**
 * DELETE /api/admin/departments/:id
 */
const deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const department = await Department.findById(id);
    if (!department) {
      return res.status(404).json({ success: false, message: 'Department not found.' });
    }

    await Token.deleteMany({ department: id });
    await Staff.updateMany({ department: id }, { $set: { status: 'rejected', department: null } });
    await Department.findByIdAndDelete(id);

    return res.json({
      success: true,
      message: `Department "${department.name}" and its tokens were removed.`,
    });
  } catch (error) {
    console.error('Error in deleteDepartment:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete department.' });
  }
};

// ==========================================
// DOCTORS CRUD (Sub-documents of Department)
// ==========================================

/**
 * POST /api/admin/departments/:id/doctors
 */
const addDoctor = async (req, res) => {
  try {
    const { id: departmentId } = req.params;
    const { name, designation, experienceYears = 1 } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Doctor name is required.' });
    }
    if (!designation || !designation.trim()) {
      return res.status(400).json({ success: false, message: 'Designation is required.' });
    }

    const department = await Department.findById(departmentId);
    if (!department) {
      return res.status(404).json({ success: false, message: 'Department not found.' });
    }

    department.doctors.push({
      name: name.trim(),
      designation: designation.trim(),
      experienceYears: Math.max(0, Number(experienceYears) || 0),
    });

    await department.save();
    const newDoctor = department.doctors[department.doctors.length - 1];

    return res.status(201).json({
      success: true,
      message: 'Doctor added successfully.',
      doctor: newDoctor,
      doctors: department.doctors,
    });
  } catch (error) {
    console.error('Error in addDoctor:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to add doctor.' });
  }
};

/**
 * PUT /api/admin/departments/:id/doctors/:docId
 */
const updateDoctor = async (req, res) => {
  try {
    const { id: departmentId, docId } = req.params;
    const { name, designation, experienceYears } = req.body;

    const department = await Department.findById(departmentId);
    if (!department) {
      return res.status(404).json({ success: false, message: 'Department not found.' });
    }

    const doctor = department.doctors.id(docId);
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found in department.' });
    }

    if (name && name.trim()) doctor.name = name.trim();
    if (designation && designation.trim()) doctor.designation = designation.trim();
    if (experienceYears !== undefined) {
      doctor.experienceYears = Math.max(0, Number(experienceYears) || 0);
    }

    await department.save();

    return res.json({
      success: true,
      message: 'Doctor updated successfully.',
      doctor,
      doctors: department.doctors,
    });
  } catch (error) {
    console.error('Error in updateDoctor:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to update doctor.' });
  }
};

/**
 * DELETE /api/admin/departments/:id/doctors/:docId
 */
const deleteDoctor = async (req, res) => {
  try {
    const { id: departmentId, docId } = req.params;

    const department = await Department.findById(departmentId);
    if (!department) {
      return res.status(404).json({ success: false, message: 'Department not found.' });
    }

    const doctor = department.doctors.id(docId);
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found.' });
    }

    department.doctors.pull(docId);
    await department.save();

    return res.json({
      success: true,
      message: 'Doctor removed successfully.',
      doctors: department.doctors,
    });
  } catch (error) {
    console.error('Error in deleteDoctor:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to remove doctor.' });
  }
};

module.exports = {
  getPlaces,
  createPlace,
  updatePlace,
  deletePlace,
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  addDoctor,
  updateDoctor,
  deleteDoctor,
};
