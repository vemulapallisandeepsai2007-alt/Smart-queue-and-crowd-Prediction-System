const express = require('express');
const {
  getNearbyPlaces,
  getPlaceDepartments,
  reverseGeocodeLocation,
  geocodeSearchLocation,
  getIpLocation,
} = require('../controllers/placesController');

const router = express.Router();

// GET /api/places/nearby?category=&lat=&lng=&radius=
router.get('/nearby', getNearbyPlaces);

// GET /api/places/ip-location
router.get('/ip-location', getIpLocation);

// GET /api/places/reverse?lat=&lng=
router.get('/reverse', reverseGeocodeLocation);

// GET /api/places/search-area?query=
router.get('/search-area', geocodeSearchLocation);

// GET /api/places/:id/departments
router.get('/:id/departments', getPlaceDepartments);

module.exports = router;
