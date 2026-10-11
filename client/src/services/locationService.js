import api from './api';

export const QUICK_CITIES = [
  { name: 'Guntur', lat: 16.3067, lng: 80.4365, state: 'Andhra Pradesh' },
  { name: 'Vijayawada', lat: 16.5062, lng: 80.6480, state: 'Andhra Pradesh' },
  { name: 'Amaravati', lat: 16.5735, lng: 80.3575, state: 'Andhra Pradesh' },
  { name: 'Hyderabad', lat: 17.3850, lng: 78.4867, state: 'Telangana' },
  { name: 'Visakhapatnam', lat: 17.6868, lng: 83.2185, state: 'Andhra Pradesh' },
  { name: 'Tirupati', lat: 13.6288, lng: 79.4192, state: 'Andhra Pradesh' },
  { name: 'Bengaluru', lat: 12.9716, lng: 77.5946, state: 'Karnataka' },
];

/**
 * Promise-wrapped HTML5 Geolocation with custom accuracy and timeout
 */
const getBrowserPosition = (enableHighAccuracy, timeoutMs) => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      return reject(new Error('Geolocation not supported by browser'));
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos),
      (err) => reject(err),
      {
        enableHighAccuracy,
        timeout: timeoutMs,
        maximumAge: enableHighAccuracy ? 30000 : 300000,
      }
    );
  });
};

/**
 * Smart Multi-Tier Location Detection:
 * 1. High Accuracy Browser GPS (5s)
 * 2. Low Accuracy Browser Wi-Fi/Network (6s)
 * 3. Backend IP Geolocation (/api/places/ip-location)
 * 4. Client HTTPS IP Geolocation (freeipapi.com)
 * 5. Safe Fallback (Guntur Center)
 */
export const detectUserLocation = async () => {
  // Step 1: Try High Accuracy GPS
  try {
    const pos = await getBrowserPosition(true, 5000);
    const { latitude, longitude } = pos.coords;
    return {
      success: true,
      lat: latitude,
      lng: longitude,
      type: 'gps',
      source: 'Live GPS Coordinates',
      locality: 'Your Live Location',
      message: 'Live GPS coordinates acquired!',
    };
  } catch (gpsErr) {
    console.warn('[Location] High-accuracy GPS failed:', gpsErr.message || gpsErr.code);

    // If permission was NOT explicitly denied (e.g. TIMEOUT or POSITION_UNAVAILABLE),
    // try low-accuracy browser location (Wi-Fi triangulation)
    if (gpsErr.code !== 1) {
      try {
        const lowPos = await getBrowserPosition(false, 6000);
        const { latitude, longitude } = lowPos.coords;
        return {
          success: true,
          lat: latitude,
          lng: longitude,
          type: 'gps',
          source: 'Device Location (Wi-Fi/Network)',
          locality: 'Your Area',
          message: 'Device location acquired via Wi-Fi network!',
        };
      } catch (lowErr) {
        console.warn('[Location] Low-accuracy GPS also failed:', lowErr.message || lowErr.code);
      }
    }
  }

  // Step 2: Try Backend IP Geolocation Endpoint
  try {
    const backendRes = await api.get('/places/ip-location', { timeout: 4000 });
    if (backendRes.data?.success && backendRes.data.lat && backendRes.data.lng) {
      const data = backendRes.data;
      return {
        success: true,
        lat: data.lat,
        lng: data.lng,
        city: data.city,
        region: data.region,
        type: 'network',
        source: data.source || `Network: ${data.city}`,
        locality: data.city || 'Detected City',
        message: `Detected location via Network (${data.city || 'Your Area'}). Live GPS was unavailable on this device.`,
      };
    }
  } catch (beErr) {
    console.warn('[Location] Backend IP lookup failed, trying direct HTTPS fallback:', beErr.message);
  }

  // Step 3: Direct Client-Side HTTPS IP Geolocation (CORS-friendly freeipapi)
  try {
    const response = await fetch('https://freeipapi.com/api/json', {
      signal: AbortSignal.timeout(4000),
    });
    if (response.ok) {
      const data = await response.json();
      if (data && data.latitude && data.longitude) {
        const cityName = data.cityName || 'Detected Area';
        const regionName = data.regionName || '';
        return {
          success: true,
          lat: data.latitude,
          lng: data.longitude,
          city: cityName,
          region: regionName,
          type: 'network',
          source: `Network: ${cityName}${regionName ? ', ' + regionName : ''}`,
          locality: cityName,
          message: `Detected location via Network (${cityName}). Live GPS was unavailable on this device.`,
        };
      }
    }
  } catch (ipErr) {
    console.warn('[Location] Direct IP fallback failed:', ipErr.message);
  }

  // Step 4: Safe Default (Guntur Center)
  return {
    success: false,
    lat: 16.3067,
    lng: 80.4365,
    city: 'Guntur',
    region: 'Andhra Pradesh',
    type: 'default',
    source: 'Guntur Center (Default)',
    locality: 'Guntur',
    message: 'Location hardware unavailable. Centered on Guntur (Default). You can search your city above.',
  };
};
