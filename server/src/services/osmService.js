const https = require('https');

// In-memory cache for discovered OSM places so subsequent requests for departments find them
const osmPlaceCache = new Map();

// In-memory reverse-geocoding cache
const geoCache = new Map();

/**
 * Calculate Haversine distance in kilometers between two geographic coordinates
 */
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(2));
}

/**
 * Helper to perform an HTTPS GET request returning parsed JSON
 */
function httpsGetJson(url, timeoutMs = 6000) {
  return new Promise((resolve) => {
    const req = https.get(
      url,
      {
        headers: {
          'User-Agent': 'SmartQueueSystem/2.0 (OpenLocationService; contact: support@smartqueue.io)',
          'Accept-Language': 'en',
          Accept: 'application/json',
        },
        timeout: timeoutMs,
      },
      (res) => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return resolve(null);
        }
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(null);
          }
        });
      }
    );

    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });

    req.on('error', () => {
      resolve(null);
    });
  });
}

/**
 * Calculate Bounding Box coordinates for a given center lat/lng and radius in km
 */
function getBoundingBox(lat, lng, radiusKm) {
  const safeRadius = Math.max(1, Math.min(radiusKm, 50));
  const deltaLat = safeRadius / 111;
  const deltaLng = safeRadius / (111 * Math.cos((lat * Math.PI) / 180));
  return {
    minLng: parseFloat((lng - deltaLng).toFixed(5)),
    maxLat: parseFloat((lat + deltaLat).toFixed(5)),
    maxLng: parseFloat((lng + deltaLng).toFixed(5)),
    minLat: parseFloat((lat - deltaLat).toFixed(5)),
  };
}

/**
 * Fetch real places using Nominatim Search API
 */
async function fetchNominatimPlaces(category, lat, lng, radiusKm) {
  try {
    const bb = getBoundingBox(lat, lng, radiusKm);
    const searchTerm = category === 'Bank' ? 'bank' : 'hospital';
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${searchTerm}&viewbox=${bb.minLng},${bb.maxLat},${bb.maxLng},${bb.minLat}&bounded=1&limit=40&addressdetails=1`;

    const data = await httpsGetJson(url, 7000);
    if (!Array.isArray(data)) return [];

    const results = [];
    for (const item of data) {
      const itemLat = parseFloat(item.lat);
      const itemLng = parseFloat(item.lon);
      if (!itemLat || !itemLng) continue;

      const dist = calculateDistanceKm(lat, lng, itemLat, itemLng);
      if (dist > radiusKm * 1.3) continue; // safety filter

      const addrObj = item.address || {};
      const rawName = item.name || item.display_name?.split(',')?.[0] || 'Medical Center';
      
      // Clean up generic or messy names
      let cleanName = rawName.trim();
      if (cleanName.toLowerCase() === 'hospital' || cleanName.toLowerCase() === 'clinic') {
        const locality = addrObj.suburb || addrObj.neighbourhood || addrObj.city || 'Area';
        cleanName = `${locality} ${category}`;
      }

      const city =
        addrObj.city ||
        addrObj.town ||
        addrObj.municipality ||
        addrObj.suburb ||
        addrObj.state_district ||
        'Local Area';

      const placeId = `osm_${item.osm_type || 'node'}_${item.osm_id || Math.random().toString(36).substr(2, 9)}`;

      const placeItem = {
        _id: placeId,
        osmId: placeId,
        name: cleanName,
        category: category || 'Hospital',
        address: item.display_name || `${cleanName}, ${city}`,
        city,
        location: {
          type: 'Point',
          coordinates: [itemLng, itemLat],
        },
        phone: addrObj.phone || '',
        source: 'osm',
        distance: dist,
        type: item.type || (category === 'Hospital' ? 'hospital' : 'bank'),
      };

      osmPlaceCache.set(placeId, placeItem);
      results.push(placeItem);
    }

    return results;
  } catch (err) {
    console.warn('[Nominatim] Fetch failed:', err.message);
    return [];
  }
}

/**
 * Fetch real places using Overpass API with multiple mirrors
 */
async function fetchOverpassMirrors(category, lat, lng, radiusKm) {
  const mirrors = [
    'https://lz4.overpass-api.de/api/interpreter',
    'https://overpass-api.de/api/interpreter',
  ];

  const radiusMeters = Math.min(radiusKm, 50) * 1000;
  const tag = category === 'Bank' ? 'bank' : 'hospital';
  const overpassQL = `[out:json][timeout:8];(node["amenity"="${tag}"](around:${radiusMeters},${lat},${lng});way["amenity"="${tag}"](around:${radiusMeters},${lat},${lng}););out center 35;`;

  for (const mirror of mirrors) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(mirror, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'SmartQueueSystem/2.0 (OverpassSearch)',
        },
        body: `data=${encodeURIComponent(overpassQL)}`,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const json = await response.json();
        if (json && Array.isArray(json.elements) && json.elements.length > 0) {
          const results = [];
          for (const el of json.elements) {
            const tags = el.tags || {};
            const itemLat = el.lat || el.center?.lat;
            const itemLng = el.lon || el.center?.lon;
            if (!itemLat || !itemLng) continue;

            const name = tags.name || tags['name:en'] || (category === 'Bank' ? 'Bank Branch' : 'Health Center');
            const dist = calculateDistanceKm(lat, lng, itemLat, itemLng);

            const city = tags['addr:city'] || tags['addr:suburb'] || 'Local Area';
            const addressParts = [tags['addr:street'], tags['addr:suburb'], city].filter(Boolean);
            const address = addressParts.length > 0 ? addressParts.join(', ') : `${name}, ${city}`;

            const placeId = `osm_${el.type}_${el.id}`;
            const placeItem = {
              _id: placeId,
              osmId: placeId,
              name: name.trim(),
              category: category || 'Hospital',
              address,
              city,
              location: {
                type: 'Point',
                coordinates: [itemLng, itemLat],
              },
              phone: tags.phone || tags['contact:phone'] || '',
              source: 'osm',
              distance: dist,
            };

            osmPlaceCache.set(placeId, placeItem);
            results.push(placeItem);
          }
          return results;
        }
      }
    } catch (e) {
      // try next mirror
    }
  }

  return [];
}

/**
 * Unified Real-World Places Fetcher
 * Combines Nominatim and Overpass mirrors, deduplicates by proximity and name
 */
async function fetchOverpassPlaces(category, lat, lng, radiusKm) {
  const [nominatimResults, overpassResults] = await Promise.all([
    fetchNominatimPlaces(category, lat, lng, radiusKm),
    fetchOverpassMirrors(category, lat, lng, radiusKm),
  ]);

  const map = new Map();

  // Combine results
  const all = [...nominatimResults, ...overpassResults];
  for (const place of all) {
    const key = place.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!map.has(key)) {
      map.set(key, place);
    } else {
      // Keep whichever has better address or phone
      const existing = map.get(key);
      if (!existing.phone && place.phone) {
        existing.phone = place.phone;
      }
      if (existing.address.length < place.address.length) {
        existing.address = place.address;
      }
    }
  }

  const merged = Array.from(map.values());
  merged.sort((a, b) => a.distance - b.distance);
  return merged;
}

/**
 * Reverse Geocode: Get human-readable area & city for GPS coordinates
 */
async function reverseGeocode(lat, lng) {
  const cacheKey = `${lat.toFixed(4)}_${lng.toFixed(4)}`;
  if (geoCache.has(cacheKey)) {
    return geoCache.get(cacheKey);
  }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`;
    const data = await httpsGetJson(url, 4000);

    if (data && data.address) {
      const a = data.address;
      const suburb = a.suburb || a.neighbourhood || a.quarter || a.residential;
      const city = a.city || a.town || a.village || a.state_district || 'Your Area';
      const state = a.state || '';
      
      const label = suburb ? `${suburb}, ${city}` : city;
      const result = { label, city, state, displayName: data.display_name };
      geoCache.set(cacheKey, result);
      return result;
    }
  } catch (err) {
    console.warn('[ReverseGeocode] Failed:', err.message);
  }

  return { label: 'Current GPS Location', city: 'Detected Area', state: '' };
}

/**
 * Geocode Search: Resolve search query string to coordinates
 */
async function geocodeAddress(query) {
  if (!query || query.trim().length === 0) return null;

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&addressdetails=1`;
    const data = await httpsGetJson(url, 5000);

    if (Array.isArray(data) && data.length > 0) {
      const item = data[0];
      const lat = parseFloat(item.lat);
      const lng = parseFloat(item.lon);
      const addr = item.address || {};
      const city = addr.city || addr.town || addr.state_district || item.display_name.split(',')[0];

      return {
        lat,
        lng,
        city,
        displayName: item.display_name,
        name: item.name || query,
      };
    }
  } catch (err) {
    console.warn('[GeocodeSearch] Failed:', err.message);
  }

  return null;
}

/**
 * Retrieve cached OSM place data by ID
 */
function getCachedOsmPlace(id) {
  return osmPlaceCache.get(id) || null;
}

module.exports = {
  fetchOverpassPlaces,
  calculateDistanceKm,
  getCachedOsmPlace,
  reverseGeocode,
  geocodeAddress,
  osmPlaceCache,
};
