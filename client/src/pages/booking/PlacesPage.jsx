import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Breadcrumbs from '../../components/Breadcrumbs';
import api from '../../services/api';
import {
  Hospital,
  Landmark,
  MapPin,
  Navigation,
  Search,
  ArrowRight,
  Phone,
  Compass,
  Loader2,
  Sparkles,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  LocateFixed,
} from 'lucide-react';
import toast from 'react-hot-toast';

const PlacesPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const initialCategory = searchParams.get('category') || 'Hospital';
  const [category, setCategory] = useState(initialCategory);
  const [radius, setRadius] = useState(10); // 5, 10, 20, 30 km
  const [searchArea, setSearchArea] = useState('');
  const [searchingArea, setSearchingArea] = useState(false);
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [isGpsActive, setIsGpsActive] = useState(false);
  const [coordinates, setCoordinates] = useState({
    lat: 16.3067,
    lng: 80.4365,
    source: 'Guntur Center (Default)',
    locality: 'Guntur',
  });

  // Fetch nearby places from backend
  const fetchPlaces = useCallback(async (cat, lat, lng, rad) => {
    setLoading(true);
    try {
      const res = await api.get('/places/nearby', {
        params: {
          category: cat,
          lat,
          lng,
          radius: rad,
        },
      });

      if (res.data?.success) {
        setPlaces(res.data.places || []);
      }
    } catch (err) {
      console.error('Failed to fetch nearby places:', err);
      toast.error('Could not load nearby places. Please check connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch friendly locality name for coordinates
  const updateLocalityName = useCallback(async (lat, lng, isGps = false) => {
    try {
      const res = await api.get('/places/reverse', {
        params: { lat, lng },
      });
      if (res.data?.success) {
        const areaName = res.data.label || res.data.city || 'Detected Area';
        setCoordinates((prev) => ({
          ...prev,
          source: isGps ? `GPS: ${areaName}` : areaName,
          locality: areaName,
        }));
      }
    } catch (e) {
      // ignore reverse geocode error
    }
  }, []);

  // HTML5 Browser Geolocation with high accuracy
  const handleGetLocation = useCallback((isAuto = false) => {
    if (!navigator.geolocation) {
      if (!isAuto) toast.error('Geolocation is not supported by your browser.');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setLocating(false);
        const { latitude, longitude } = pos.coords;
        setIsGpsActive(true);
        setCoordinates({
          lat: latitude,
          lng: longitude,
          source: 'GPS: Acquiring address...',
          locality: 'Your GPS Location',
        });
        toast.success('Live GPS location detected!');
        await updateLocalityName(latitude, longitude, true);
      },
      (err) => {
        setLocating(false);
        if (!isAuto) {
          console.warn('Geolocation error:', err);
          toast.error('Location access denied or unavailable. You can search any city above.');
        }
      },
      { enableHighAccuracy: true, timeout: 9000, maximumAge: 30000 }
    );
  }, [updateLocalityName]);

  // Request location on first load automatically
  useEffect(() => {
    handleGetLocation(true);
  }, [handleGetLocation]);

  // Refresh places when category, coordinates or radius change
  useEffect(() => {
    fetchPlaces(category, coordinates.lat, coordinates.lng, radius);
  }, [category, coordinates.lat, coordinates.lng, radius, fetchPlaces]);

  // Update query params when category changes
  const handleCategoryChange = (newCat) => {
    setCategory(newCat);
    setSearchParams({ category: newCat });
  };

  // Real Global/City Area Search using Nominatim geocoding
  const handleAreaSearch = async (e) => {
    e.preventDefault();
    const query = searchArea.trim();
    if (!query) {
      fetchPlaces(category, coordinates.lat, coordinates.lng, radius);
      return;
    }

    setSearchingArea(true);
    try {
      const res = await api.get('/places/search-area', {
        params: { query },
      });

      if (res.data?.success && res.data.location) {
        const loc = res.data.location;
        setIsGpsActive(false);
        setCoordinates({
          lat: loc.lat,
          lng: loc.lng,
          source: loc.city || loc.name || query,
          locality: loc.city || query,
        });
        toast.success(`Centered on ${loc.city || query}! Loading nearby hospitals...`);
      } else {
        toast.error(`Could not locate "${query}". Please check the spelling.`);
      }
    } catch (err) {
      // Local client-side name/address filter as fallback
      const filtered = places.filter(
        (p) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.address.toLowerCase().includes(query.toLowerCase())
      );
      if (filtered.length > 0) {
        setPlaces(filtered);
        toast.success(`Found ${filtered.length} facilities matching "${query}"`);
      } else {
        toast.error(`Could not locate "${query}". Showing all nearby facilities.`);
      }
    } finally {
      setSearchingArea(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fcfaff] via-[#f4ecfb] to-[#e9ddf6] text-slate-800 flex flex-col selection:bg-[#B19BD6] selection:text-white">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
        {/* Breadcrumbs */}
        <Breadcrumbs
          items={[
            { label: 'Category', path: '/book' },
            { label: `Nearby ${category}s` },
          ]}
          onBack={() => navigate('/book')}
        />

        {/* Header & Category Switcher */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-2">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#F3ECFB] border border-[#D5C3EE] text-[#6A4C97] text-xs font-semibold uppercase tracking-wider mb-2 shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-[#8164AD]" />
              <span>Step 2 of 4: Select Facility</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
              <span>Nearby {category === 'Hospital' ? 'Hospitals & Clinics' : 'Banks & Branches'}</span>
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Live Data
              </span>
            </h1>
            <p className="text-xs text-slate-600 mt-1">
              Showing real verified facilities near <span className="font-semibold text-slate-800">{coordinates.source}</span> sorted by distance
            </p>
          </div>

          {/* Category Toggle Tabs */}
          <div className="inline-flex p-1 rounded-xl bg-white border border-[#D5C3EE] shadow-xs shrink-0">
            <button
              onClick={() => handleCategoryChange('Hospital')}
              id="switch-category-hospital"
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                category === 'Hospital'
                  ? 'bg-[#8164AD] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Hospital className="w-4 h-4" />
              <span>Hospitals</span>
            </button>
            <button
              onClick={() => handleCategoryChange('Bank')}
              id="switch-category-bank"
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                category === 'Bank'
                  ? 'bg-[#8164AD] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Landmark className="w-4 h-4" />
              <span>Banks</span>
            </button>
          </div>
        </div>

        {/* Location & Radius Control Bar */}
        <div className="bg-white/85 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-[#D5C3EE]/90 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Geolocation Button */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => handleGetLocation(false)}
              disabled={locating}
              id="geolocation-btn"
              className={`inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl text-white text-xs font-semibold shadow-xs transition-all disabled:opacity-50 ${
                isGpsActive ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-[#8164AD] hover:bg-[#6A4C97]'
              }`}
            >
              {locating ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Navigation className="w-4 h-4 text-white" />
              )}
              <span>{locating ? 'Acquiring GPS...' : isGpsActive ? 'Re-Detect GPS Location' : 'Use My GPS Location'}</span>
            </button>

            <div className="text-xs text-slate-700 flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-[#FAF7FD] border border-[#D5C3EE]">
              <MapPin className="w-3.5 h-3.5 text-[#8164AD] shrink-0" />
              <span className="font-semibold text-slate-800 truncate max-w-[220px]">{coordinates.source}</span>
            </div>
          </div>

          {/* Area Search Input & Radius Selector */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search Input */}
            <form onSubmit={handleAreaSearch} className="relative flex-1 sm:w-64">
              {searchingArea ? (
                <Loader2 className="w-4 h-4 text-[#8164AD] animate-spin absolute left-3 top-1/2 -translate-y-1/2" />
              ) : (
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              )}
              <input
                type="text"
                placeholder="Search any city or area..."
                value={searchArea}
                onChange={(e) => setSearchArea(e.target.value)}
                className="w-full glass-input rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none bg-white border border-[#D5C3EE]"
              />
            </form>

            {/* Radius Selector Pills */}
            <div className="flex items-center space-x-1 p-1 bg-[#FAF7FD] rounded-xl border border-[#D5C3EE] self-center">
              <span className="text-[11px] text-slate-600 px-2 font-medium">Radius:</span>
              {[5, 10, 20, 30].map((r) => (
                <button
                  key={r}
                  onClick={() => setRadius(r)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    radius === r
                      ? 'bg-[#8164AD] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {r} km
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Places List / Grid */}
        {loading ? (
          /* Skeleton Loader */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white/70 rounded-2xl p-6 border border-[#E6DAF6] animate-pulse space-y-4">
                <div className="flex justify-between items-center">
                  <div className="w-10 h-10 rounded-xl bg-[#F3ECFB]"></div>
                  <div className="w-16 h-5 rounded-full bg-[#F3ECFB]"></div>
                </div>
                <div className="space-y-2">
                  <div className="w-3/4 h-5 rounded bg-[#F3ECFB]"></div>
                  <div className="w-1/2 h-3 rounded bg-[#F3ECFB]"></div>
                </div>
                <div className="w-full h-10 rounded-xl bg-[#F3ECFB]/60 mt-4"></div>
              </div>
            ))}
          </div>
        ) : places.length === 0 ? (
          /* Empty State */
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-12 border border-[#D5C3EE] text-center max-w-lg mx-auto space-y-4 my-10 shadow-lg">
            <div className="w-14 h-14 rounded-2xl bg-[#FAF7FD] border border-[#D5C3EE] flex items-center justify-center text-[#8164AD] mx-auto">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">No {category.toLowerCase()}s found within {radius} km</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Try increasing your search radius to 20 or 30 km, or enter a neighboring town or city name in the search box.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => setRadius(30)}
                className="px-4 py-2 rounded-xl bg-[#8164AD] hover:bg-[#6A4C97] text-white text-xs font-semibold shadow-xs transition-all"
              >
                Expand to 30 km
              </button>
              <button
                onClick={() => {
                  setCoordinates({ lat: 16.3067, lng: 80.4365, source: 'Guntur Center (Default)', locality: 'Guntur' });
                  setSearchArea('');
                }}
                className="px-4 py-2 rounded-xl bg-white hover:bg-[#FAF7FD] text-slate-700 text-xs font-semibold border border-[#D5C3EE] transition-colors"
              >
                Reset Search
              </button>
            </div>
          </div>
        ) : (
          /* Places Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {places.map((place) => {
              const placeLat = place.location?.coordinates?.[1] || coordinates.lat;
              const placeLng = place.location?.coordinates?.[0] || coordinates.lng;
              const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${placeLat},${placeLng}`;

              return (
                <div
                  key={place._id}
                  className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 border border-[#D5C3EE]/90 hover:border-[#B19BD6] transition-all duration-300 flex flex-col justify-between group shadow-md shadow-[#53377F]/5 hover:shadow-xl hover:-translate-y-1"
                >
                  <div className="space-y-4">
                    {/* Top Bar: Icon + Distance Badge */}
                    <div className="flex items-center justify-between">
                      <div
                        className={`w-12 h-12 rounded-xl border flex items-center justify-center transition-transform group-hover:scale-105 ${
                          place.category === 'Hospital'
                            ? 'bg-[#F3ECFB] border-[#D5C3EE] text-[#8164AD]'
                            : 'bg-[#F3ECFB] border-[#D5C3EE] text-[#6A4C97]'
                        }`}
                      >
                        {place.category === 'Hospital' ? (
                          <Hospital className="w-6 h-6" />
                        ) : (
                          <Landmark className="w-6 h-6" />
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#FAF7FD] border border-[#D5C3EE] text-xs font-mono font-semibold text-[#6A4C97]">
                          <Compass className="w-3.5 h-3.5 text-[#8164AD]" />
                          <span>{place.distance} km</span>
                        </div>
                      </div>
                    </div>

                    {/* Title & Category */}
                    <div>
                      <div className="flex items-center flex-wrap gap-1.5">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                            place.category === 'Hospital'
                              ? 'bg-[#F3ECFB] text-[#6A4C97] border border-[#D5C3EE]'
                              : 'bg-[#F3ECFB] text-[#53377F] border border-[#D5C3EE]'
                          }`}
                        >
                          {place.category}
                        </span>
                        <span className="text-[9px] uppercase tracking-wider font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          <span>Verified Real Data</span>
                        </span>
                      </div>
                      <h2 className="text-lg font-bold text-slate-900 mt-2 group-hover:text-[#8164AD] transition-colors leading-snug">
                        {place.name}
                      </h2>
                    </div>

                    {/* Address & Navigation Link */}
                    <div className="space-y-2 text-xs text-slate-600">
                      <p className="flex items-start space-x-2">
                        <MapPin className="w-3.5 h-3.5 text-[#8164AD] shrink-0 mt-0.5" />
                        <span className="leading-tight text-slate-700">{place.address}</span>
                      </p>
                      {place.phone && (
                        <p className="flex items-center space-x-2 text-slate-600">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{place.phone}</span>
                        </p>
                      )}
                      <div>
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-1 text-[11px] font-semibold text-[#8164AD] hover:text-[#6A4C97] hover:underline"
                        >
                          <span>Open Directions on Google Maps</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="mt-6 pt-4 border-t border-[#E6DAF6]">
                    <button
                      onClick={() =>
                        navigate(
                          `/book/places/${place._id}?name=${encodeURIComponent(
                            place.name
                          )}&category=${place.category}&address=${encodeURIComponent(
                            place.address
                          )}&lat=${placeLat}&lng=${placeLng}`
                        )
                      }
                      className="w-full py-2.5 px-4 rounded-xl bg-[#8164AD] hover:bg-[#6A4C97] text-white font-semibold text-xs shadow-xs transition-all flex items-center justify-center space-x-2"
                    >
                      <span>View Departments & Book Token</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default PlacesPage;
