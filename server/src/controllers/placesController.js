const mongoose = require('mongoose');
const Place = require('../models/Place');
const Department = require('../models/Department');
const {
  fetchOverpassPlaces,
  calculateDistanceKm,
  getCachedOsmPlace,
  reverseGeocode,
  geocodeAddress,
} = require('../services/osmService');

/**
 * Standardize text for deduplication
 */
function normalizeName(name = '') {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Helper to auto-create 3 realistic default departments for a newly imported place
 */
async function createDefaultDepartmentsForPlace(place) {
  const isHospital = place.category === 'Hospital';

  const defaultDepts = isHospital
    ? [
        {
          place: place._id,
          name: 'General Medicine & OPD',
          avgServiceMinutes: 10,
          opensAt: '08:30',
          closesAt: '17:00',
          doctors: [
            {
              name: 'Dr. Consultation Physician',
              experienceYears: 8,
              designation: 'Senior General Physician',
            },
          ],
        },
        {
          place: place._id,
          name: 'Emergency & Trauma Care',
          avgServiceMinutes: 7,
          opensAt: '00:00',
          closesAt: '23:59',
          doctors: [
            {
              name: 'Dr. Emergency In-Charge',
              experienceYears: 11,
              designation: 'Chief Medical Officer',
            },
          ],
        },
        {
          place: place._id,
          name: 'Pediatrics & Family Health',
          avgServiceMinutes: 10,
          opensAt: '09:00',
          closesAt: '16:30',
          doctors: [
            {
              name: 'Dr. Family Health Specialist',
              experienceYears: 6,
              designation: 'Consultant Pediatrician',
            },
          ],
        },
      ]
    : [
        {
          place: place._id,
          name: 'Cash Deposit & Withdrawal Counter',
          avgServiceMinutes: 5,
          opensAt: '10:00',
          closesAt: '16:00',
          doctors: [],
        },
        {
          place: place._id,
          name: 'Account Opening & KYC Desk',
          avgServiceMinutes: 10,
          opensAt: '10:00',
          closesAt: '15:30',
          doctors: [],
        },
        {
          place: place._id,
          name: 'Loans & Customer Inquiries',
          avgServiceMinutes: 15,
          opensAt: '10:30',
          closesAt: '16:00',
          doctors: [],
        },
      ];

  return await Department.insertMany(defaultDepts);
}

/**
 * GET /api/places/nearby?category=&lat=&lng=&radius=
 * Merges DB results (with 2dsphere / distance) and OpenStreetMap Overpass results.
 * Deduplicates by name + distance, sorts by distance ascending.
 * Never crashes if Overpass fails.
 */
const getNearbyPlaces = async (req, res) => {
  try {
    const { category } = req.query;
    // Default coordinates: Guntur center (approx 16.3067, 80.4365)
    const lat = parseFloat(req.query.lat) || 16.3067;
    const lng = parseFloat(req.query.lng) || 80.4365;
    const radius = Math.min(Math.max(parseFloat(req.query.radius) || 10, 1), 50); // clamp 1-50 km

    const dbQuery = {};
    if (category && (category === 'Hospital' || category === 'Bank')) {
      dbQuery.category = category;
    }

    // 1. Fetch DB Places
    let dbPlaces = [];
    try {
      // Try $geoNear aggregation first with 2dsphere index
      const maxDistanceMeters = radius * 1000;
      const geoResults = await Place.aggregate([
        {
          $geoNear: {
            near: { type: 'Point', coordinates: [lng, lat] },
            distanceField: 'distanceMeters',
            maxDistance: maxDistanceMeters,
            query: dbQuery,
            spherical: true,
          },
        },
      ]);

      dbPlaces = geoResults.map((p) => ({
        _id: p._id.toString(),
        name: p.name,
        category: p.category,
        address: p.address,
        city: p.city,
        location: p.location,
        phone: p.phone,
        source: p.source || 'db',
        distance: parseFloat((p.distanceMeters / 1000).toFixed(2)),
      }));
    } catch (geoErr) {
      console.warn('GeoNear query fallback to manual Haversine computation:', geoErr.message);
      // Fallback: load all matching category places and compute Haversine manually
      const rawPlaces = await Place.find(dbQuery).lean();
      dbPlaces = rawPlaces
        .map((p) => {
          const pLng = p.location?.coordinates?.[0] || lng;
          const pLat = p.location?.coordinates?.[1] || lat;
          const distance = calculateDistanceKm(lat, lng, pLat, pLng);
          return {
            _id: p._id.toString(),
            name: p.name,
            category: p.category,
            address: p.address,
            city: p.city,
            location: p.location,
            phone: p.phone,
            source: p.source || 'db',
            distance,
          };
        })
        .filter((p) => p.distance <= radius);
    }

    // 2. Fetch OpenStreetMap Overpass Places (with resilient 4-sec timeout, never crashes)
    let osmPlaces = [];
    try {
      osmPlaces = await fetchOverpassPlaces(category, lat, lng, radius);
    } catch (osmErr) {
      console.warn('Overpass fetch failed, continuing with DB only:', osmErr.message);
      osmPlaces = [];
    }

    // 3. Deduplication:
    // If an OSM place has the same name or is very close (<0.3km) to an existing DB place, favor DB place
    const mergedPlaces = [...dbPlaces];
    const existingDbSignatures = new Set(
      dbPlaces.map((p) => normalizeName(p.name))
    );

    for (const osm of osmPlaces) {
      const normOsmName = normalizeName(osm.name);

      // Check if duplicate name or close proximity with duplicate name
      const isDuplicate =
        existingDbSignatures.has(normOsmName) ||
        dbPlaces.some((p) => {
          const nameMatch = normOsmName.includes(normalizeName(p.name)) || normalizeName(p.name).includes(normOsmName);
          const pLng = p.location?.coordinates?.[0];
          const pLat = p.location?.coordinates?.[1];
          const closeDist = pLat && pLng ? calculateDistanceKm(osm.location.coordinates[1], osm.location.coordinates[0], pLat, pLng) < 0.4 : false;
          return nameMatch || closeDist;
        });

      if (!isDuplicate) {
        mergedPlaces.push(osm);
      }
    }

    // 4. Sort all by distance ascending
    mergedPlaces.sort((a, b) => a.distance - b.distance);

    return res.json({
      success: true,
      count: mergedPlaces.length,
      category: category || 'All',
      center: { lat, lng },
      radiusKm: radius,
      places: mergedPlaces,
    });
  } catch (error) {
    console.error('Error in getNearbyPlaces:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch nearby places',
      places: [],
    });
  }
};

/**
 * GET /api/places/:id/departments
 * Fetches place details and all departments with doctor rosters.
 * For OSM places not in our DB, auto-creates the Place and 3 default departments.
 */
const getPlaceDepartments = async (req, res) => {
  try {
    const { id } = req.params;
    let place = null;

    // Check if valid Mongo ObjectId
    const isValidObjectId = mongoose.Types.ObjectId.isValid(id) && id.length === 24;

    if (isValidObjectId) {
      place = await Place.findById(id);
    }

    // If not found in DB or ID starts with 'osm_'
    if (!place) {
      // Check OSM cache or query parameters
      const cachedOsm = getCachedOsmPlace(id);
      const name = req.query.name || cachedOsm?.name || 'Selected Facility';
      const category = req.query.category || cachedOsm?.category || 'Hospital';
      const address = req.query.address || cachedOsm?.address || `${name}, Guntur`;
      const city = req.query.city || cachedOsm?.city || 'Guntur';
      const coordinates = cachedOsm?.location?.coordinates || [
        parseFloat(req.query.lng) || 80.4365,
        parseFloat(req.query.lat) || 16.3067,
      ];

      // Check if place already exists in DB by matching name and city
      let existing = await Place.findOne({
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        city,
      });

      if (existing) {
        place = existing;
      } else {
        // Auto-create Place in DB
        place = await Place.create({
          category,
          name,
          address,
          city,
          location: {
            type: 'Point',
            coordinates,
          },
          phone: cachedOsm?.phone || req.query.phone || '',
          source: 'osm',
        });
        console.log(`Auto-created OSM Place in database: "${place.name}" (${place._id})`);
      }
    }

    // Now find departments for this place
    let departments = await Department.find({ place: place._id });

    // If no departments exist for this place yet, auto-create 3 default departments
    if (departments.length === 0) {
      console.log(`Auto-creating 3 default departments for Place: ${place.name}`);
      departments = await createDefaultDepartmentsForPlace(place);
    }

    return res.json({
      success: true,
      place,
      departments,
    });
  } catch (error) {
    console.error('Error in getPlaceDepartments:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch facility departments',
    });
  }
};

/**
 * GET /api/places/reverse?lat=&lng=
 * Returns friendly locality/city name for given coordinates
 */
const reverseGeocodeLocation = async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    if (!lat || !lng) {
      return res.status(400).json({ success: false, message: 'Valid lat and lng query params are required' });
    }
    const result = await reverseGeocode(lat, lng);
    return res.json({ success: true, ...result });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/places/search-area?query=
 * Resolves address/city search query to geographic coordinates
 */
const geocodeSearchLocation = async (req, res) => {
  try {
    const query = req.query.query;
    if (!query) {
      return res.status(400).json({ success: false, message: 'query parameter is required' });
    }
    const result = await geocodeAddress(query);
    if (!result) {
      return res.status(404).json({ success: false, message: 'Area not found' });
    }
    return res.json({ success: true, location: result });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getNearbyPlaces,
  getPlaceDepartments,
  reverseGeocodeLocation,
  geocodeSearchLocation,
};
