const express = require('express');
const {
  getStaffList,
  getFacilitiesForAssignment,
  approveStaff,
  rejectStaff,
  deactivateStaff,
} = require('../controllers/adminController');
const {
  getSettings,
  updateSettings,
} = require('../controllers/settingsController');
const {
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
} = require('../controllers/facilityController');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// All admin routes require admin authentication
router.use(authenticateToken);
router.use(requireRole('admin'));

// Facilities lookup for staff assignment
router.get('/facilities', getFacilitiesForAssignment);

// Staff approval workflow
router.get('/staff', getStaffList);
router.patch('/staff/:id/approve', approveStaff);
router.patch('/staff/:id/reject', rejectStaff);
router.patch('/staff/:id/deactivate', deactivateStaff);

// System Settings
router.get('/settings', getSettings);
router.put('/settings', updateSettings);

// Hospitals & Banks Overview & Details
const {
  getPlacesOverview,
  getPlaceDetails,
  getPlaceActivity,
} = require('../controllers/adminPlacesController');

router.get('/places/overview', getPlacesOverview);
router.get('/places/:id/details', getPlaceDetails);
router.get('/places/:id/activity', getPlaceActivity);

// Places CRUD
router.get('/places', getPlaces);
router.post('/places', createPlace);
router.put('/places/:id', updatePlace);
router.delete('/places/:id', deletePlace);

// Departments CRUD
router.get('/departments', getDepartments);
router.post('/departments', createDepartment);
router.put('/departments/:id', updateDepartment);
router.delete('/departments/:id', deleteDepartment);

// Doctors CRUD
router.post('/departments/:id/doctors', addDoctor);
router.put('/departments/:id/doctors/:docId', updateDoctor);
router.delete('/departments/:id/doctors/:docId', deleteDoctor);

// Demo Simulation
const { runSimulation, resetSimulation } = require('../controllers/simulationController');
router.post('/simulate', runSimulation);
router.post('/simulate/reset', resetSimulation);

module.exports = router;
