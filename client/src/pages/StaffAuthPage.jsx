import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  Building2,
  Lock,
  Mail,
  Phone,
  BadgeCheck,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Sparkles,
  ShieldAlert,
  Info,
  MapPin,
  Compass,
  Search,
  CheckCircle2,
  Check,
  Hospital,
  Landmark,
  LocateFixed,
  Shield,
  User,
} from 'lucide-react';
import toast from 'react-hot-toast';

const StaffAuthPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, role, loginStaff, signupStaff } = useAuth();

  const initialMode = searchParams.get('mode') === 'signup' ? 'signup' : 'signin';
  const [mode, setMode] = useState(initialMode);
  const [loading, setLoading] = useState(false);
  const [statusNotice, setStatusNotice] = useState(null); // for 'pending', 'rejected', 'deactivated' block banners

  // Multi-step signup state: 1: Category, 2: Location, 3: Select Facility, 4: Personal Details & Summary
  const [signupStep, setSignupStep] = useState(1);

  // Redirect if already logged in as staff
  useEffect(() => {
    if (user && role === 'staff') {
      navigate('/staff/dashboard');
    }
  }, [user, role, navigate]);

  useEffect(() => {
    const queryMode = searchParams.get('mode');
    if (queryMode === 'signup' || queryMode === 'signin') {
      setMode(queryMode);
      setStatusNotice(null);
    }
  }, [searchParams]);

  // Sign In Form State
  const [signInData, setSignInData] = useState({
    staffId: '',
    password: '',
  });

  // Sign Up Form State
  const [category, setCategory] = useState('Hospital');
  const [radius, setRadius] = useState(10); // 5, 10, 20 km
  const [searchArea, setSearchArea] = useState('');
  const [searchingArea, setSearchingArea] = useState(false);
  const [locating, setLocating] = useState(false);
  const [places, setPlaces] = useState([]);
  const [loadingPlaces, setLoadingPlaces] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [selectingPlace, setSelectingPlace] = useState(false);

  const [coordinates, setCoordinates] = useState({
    lat: 16.3067,
    lng: 80.4365,
    source: 'Guntur Center (Default)',
    locality: 'Guntur',
  });

  const [signUpDetails, setSignUpDetails] = useState({
    name: '',
    staffId: '',
    email: '',
    phone: '',
    password: '',
  });

  const handleModeChange = (newMode) => {
    setMode(newMode);
    setStatusNotice(null);
    if (newMode === 'signup') {
      setSignupStep(1);
    }
    setSearchParams({ mode: newMode });
  };

  // Reverse geocoding helper
  const updateLocalityName = useCallback(async (lat, lng, isGps = false) => {
    try {
      const res = await api.get('/places/reverse', { params: { lat, lng } });
      if (res.data?.success) {
        const areaName = res.data.label || res.data.city || 'Detected Area';
        setCoordinates((prev) => ({
          ...prev,
          source: isGps ? `GPS: ${areaName}` : areaName,
          locality: areaName,
        }));
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // HTML5 Browser Geolocation
  const handleGetLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setLocating(false);
        const { latitude, longitude } = pos.coords;
        setCoordinates({
          lat: latitude,
          lng: longitude,
          source: 'Live GPS Location',
          locality: 'Your GPS Location',
        });
        toast.success('Live GPS coordinates acquired!');
        await updateLocalityName(latitude, longitude, true);
      },
      (err) => {
        setLocating(false);
        console.warn('Geolocation error:', err);
        toast.error('Location access denied or unavailable. You can search city/area below.');
      },
      { enableHighAccuracy: true, timeout: 9000, maximumAge: 30000 }
    );
  }, [updateLocalityName]);

  // Fetch nearby places using /api/places/nearby
  const fetchNearbyPlaces = useCallback(async (cat, lat, lng, rad) => {
    setLoadingPlaces(true);
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
      console.error('Failed to fetch nearby places for staff signup:', err);
      toast.error('Could not load nearby places. Please check network connection.');
    } finally {
      setLoadingPlaces(false);
    }
  }, []);

  // Automatically refresh places when category, coordinates or radius change in step 2/3
  useEffect(() => {
    if (mode === 'signup' && (signupStep === 2 || signupStep === 3)) {
      fetchNearbyPlaces(category, coordinates.lat, coordinates.lng, radius);
    }
  }, [mode, signupStep, category, coordinates.lat, coordinates.lng, radius, fetchNearbyPlaces]);

  // City / Area Geocoding Search
  const handleAreaSearch = async (e) => {
    e.preventDefault();
    const query = searchArea.trim();
    if (!query) {
      fetchNearbyPlaces(category, coordinates.lat, coordinates.lng, radius);
      return;
    }

    setSearchingArea(true);
    try {
      const res = await api.get('/places/search-area', { params: { query } });
      if (res.data?.success && res.data.location) {
        const loc = res.data.location;
        setCoordinates({
          lat: loc.lat,
          lng: loc.lng,
          source: loc.city || loc.name || query,
          locality: loc.city || query,
        });
        toast.success(`Centered on ${loc.city || query}!`);
      } else {
        toast.error(`Could not locate "${query}". Showing available facilities.`);
      }
    } catch (err) {
      toast.error(`Could not locate "${query}". Showing facilities for default location.`);
    } finally {
      setSearchingArea(false);
    }
  };

  // Step 3 -> 4: When staff member selects a facility
  // For OSM places not yet in DB, calling /api/places/:id/departments auto-creates the DB Place and 3 default departments
  const handleSelectPlace = async (place) => {
    setSelectingPlace(true);
    try {
      const placeLat = place.location?.coordinates?.[1] || coordinates.lat;
      const placeLng = place.location?.coordinates?.[0] || coordinates.lng;

      const res = await api.get(`/places/${place._id}/departments`, {
        params: {
          name: place.name,
          category: place.category || category,
          address: place.address,
          city: place.city || coordinates.locality || 'Guntur',
          lat: placeLat,
          lng: placeLng,
          phone: place.phone || '',
        },
      });

      if (res.data?.success && res.data.place?._id) {
        setSelectedPlace(res.data.place);
        toast.success(`Selected "${res.data.place.name}"`);
        setSignupStep(4);
      } else {
        setSelectedPlace(place);
        setSignupStep(4);
      }
    } catch (err) {
      console.warn('Place verification warning:', err);
      setSelectedPlace(place);
      setSignupStep(4);
    } finally {
      setSelectingPlace(false);
    }
  };

  // Sign In Submission
  const handleSignIn = async (e) => {
    e.preventDefault();
    setStatusNotice(null);

    if (!signInData.staffId.trim()) {
      toast.error('Staff ID is required');
      return;
    }
    if (!signInData.password) {
      toast.error('Password is required');
      return;
    }

    setLoading(true);
    const res = await loginStaff({
      staffId: signInData.staffId.trim().toUpperCase(),
      password: signInData.password,
    });
    setLoading(false);

    if (res.success) {
      // Redirect to staff dashboard
      navigate('/staff/dashboard');
    } else if (res.error) {
      const errLower = res.error.toLowerCase();
      if (errLower.includes('approval') || errLower.includes('pending') || errLower.includes('waiting')) {
        setStatusNotice({
          type: 'pending',
          title: 'Account Awaiting Admin Approval',
          message: 'Your account is waiting for admin approval. Please contact the administrator.',
        });
      } else if (errLower.includes('rejected')) {
        setStatusNotice({
          type: 'rejected',
          title: 'Registration Rejected',
          message: 'Your request was rejected by the administrator.',
        });
      } else if (errLower.includes('deactivated')) {
        setStatusNotice({
          type: 'deactivated',
          title: 'Account Deactivated',
          message: 'Your account has been deactivated. Please contact the administrator.',
        });
      } else {
        setStatusNotice({
          type: 'error',
          title: 'Authentication Failed',
          message: res.error,
        });
      }
    }
  };

  // Sign Up Submission (Step 4)
  const handleSignUpSubmit = async (e) => {
    e.preventDefault();
    setStatusNotice(null);

    if (!selectedPlace || !selectedPlace._id) {
      toast.error('Please select a hospital or bank first.');
      setSignupStep(3);
      return;
    }
    if (!signUpDetails.name.trim() || signUpDetails.name.trim().length < 2) {
      toast.error('Name must be at least 2 characters');
      return;
    }
    if (!signUpDetails.staffId.trim()) {
      toast.error('Staff ID is required');
      return;
    }
    if (!signUpDetails.email.trim()) {
      toast.error('Valid email is required');
      return;
    }
    if (!/^\d{10}$/.test(signUpDetails.phone.trim())) {
      toast.error('Phone number must be exactly 10 digits');
      return;
    }
    if (signUpDetails.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    const res = await signupStaff({
      category,
      name: signUpDetails.name.trim(),
      staffId: signUpDetails.staffId.trim().toUpperCase(),
      email: signUpDetails.email.trim().toLowerCase(),
      phone: signUpDetails.phone.trim(),
      password: signUpDetails.password,
      place: selectedPlace._id,
    });
    setLoading(false);

    if (res.success) {
      setStatusNotice({
        type: 'pending',
        title: 'Registration Submitted Successfully',
        message:
          'Your account is waiting for admin approval. Once approved by the administrator, you can log in to access your facility dashboard.',
      });
      // Pre-fill sign in form with the new staff ID and switch to sign in view
      setSignInData({
        staffId: signUpDetails.staffId.trim().toUpperCase(),
        password: '',
      });
      handleModeChange('signin');
    }
  };

  // Demo helpers for testing
  const fillSampleApproved = () => {
    setSignInData({
      staffId: 'STAFF-HOSP-01',
      password: 'Staff@123',
    });
    setStatusNotice(null);
  };

  const fillSamplePending = () => {
    setSignInData({
      staffId: 'STAFF-BANK-02',
      password: 'Staff@123',
    });
    setStatusNotice(null);
  };

  const fillSampleRejected = () => {
    setSignInData({
      staffId: 'STAFF-HOSP-03',
      password: 'Staff@123',
    });
    setStatusNotice(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fcfaff] via-[#f4ecfb] to-[#e9ddf6] text-slate-800 flex flex-col selection:bg-[#B19BD6] selection:text-white">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex flex-col justify-center">
        {/* Top Header Badge */}
        <div className="text-center space-y-2 mb-6">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-[#F3ECFB] border border-[#D5C3EE] text-[#6A4C97] text-xs font-semibold shadow-xs">
            <Building2 className="w-3.5 h-3.5 text-[#8164AD]" />
            <span>Facility Staff & Counter Operator Portal</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {mode === 'signup' ? 'Staff Registration' : 'Staff Portal Sign In'}
          </h1>
          <p className="text-xs text-slate-600 max-w-md mx-auto">
            {mode === 'signup'
              ? 'Select your assigned hospital or bank branch, provide your credentials, and submit for admin approval.'
              : 'Enter your Staff ID and password to dispatch tokens and manage live counter operations.'}
          </p>
        </div>

        {/* Status Notice Banner (Pending, Rejected, Deactivated) */}
        {statusNotice && (
          <div
            className={`mb-6 p-4 rounded-2xl border backdrop-blur-xl flex items-start space-x-3.5 shadow-md animate-fadeIn ${
              statusNotice.type === 'pending'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-900'
                : statusNotice.type === 'rejected'
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-900'
                : statusNotice.type === 'deactivated'
                ? 'bg-slate-800/10 border-slate-700/40 text-slate-900'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-900'
            }`}
          >
            <div
              className={`p-2 rounded-xl shrink-0 ${
                statusNotice.type === 'pending'
                  ? 'bg-amber-500/20 text-amber-600'
                  : 'bg-rose-500/20 text-rose-600'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="space-y-1 text-xs">
              <h2 className="font-bold text-sm">{statusNotice.title}</h2>
              <p className="leading-relaxed opacity-90">{statusNotice.message}</p>
            </div>
          </div>
        )}

        {/* Main Card Container */}
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl border border-[#D5C3EE] shadow-xl p-6 sm:p-8 space-y-6">
          {/* Mode Switcher Tabs */}
          <div className="flex p-1 rounded-2xl bg-[#FAF7FD] border border-[#D5C3EE] max-w-md mx-auto">
            <button
              onClick={() => handleModeChange('signin')}
              id="staff-tab-signin"
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                mode === 'signin'
                  ? 'bg-[#8164AD] text-white shadow-md shadow-[#8164AD]/25'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign In to Counter
            </button>
            <button
              onClick={() => handleModeChange('signup')}
              id="staff-tab-signup"
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                mode === 'signup'
                  ? 'bg-[#8164AD] text-white shadow-md shadow-[#8164AD]/25'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              New Staff Sign Up
            </button>
          </div>

          {/* ========================================================= */}
          {/* SIGN IN FORM */}
          {/* ========================================================= */}
          {mode === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-4 max-w-md mx-auto pt-2">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">Staff ID</label>
                <div className="relative">
                  <BadgeCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    id="staff-signin-id"
                    placeholder="e.g. STAFF-HOSP-01"
                    value={signInData.staffId}
                    onChange={(e) =>
                      setSignInData({ ...signInData, staffId: e.target.value.toUpperCase() })
                    }
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-[#D5C3EE] text-slate-900 text-xs font-mono font-bold placeholder-slate-400 focus:outline-none focus:border-[#8164AD] focus:ring-2 focus:ring-[#8164AD]/20"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    id="staff-signin-password"
                    placeholder="Enter your password"
                    value={signInData.password}
                    onChange={(e) =>
                      setSignInData({ ...signInData, password: e.target.value })
                    }
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-[#D5C3EE] text-slate-900 text-xs placeholder-slate-400 focus:outline-none focus:border-[#8164AD] focus:ring-2 focus:ring-[#8164AD]/20"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                id="staff-signin-submit"
                className="w-full py-3 px-4 rounded-xl bg-[#8164AD] hover:bg-[#6A4C97] text-white font-bold text-xs shadow-md shadow-[#8164AD]/25 transition-all flex items-center justify-center space-x-2 mt-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Sign In & Open Counter</span>}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>

              {/* Demo Fill Helpers */}
              <div className="pt-4 border-t border-[#E6DAF6] text-center space-y-2">
                <span className="text-[11px] text-slate-500 font-semibold block">
                  Quick Demo Testing Shortcuts:
                </span>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={fillSampleApproved}
                    id="demo-staff-approved"
                    className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold hover:bg-emerald-100 transition-colors"
                  >
                    ✓ Approved Staff
                  </button>
                  <button
                    type="button"
                    onClick={fillSamplePending}
                    id="demo-staff-pending"
                    className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-semibold hover:bg-amber-100 transition-colors"
                  >
                    ⏳ Pending Staff
                  </button>
                  <button
                    type="button"
                    onClick={fillSampleRejected}
                    id="demo-staff-rejected"
                    className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-semibold hover:bg-rose-100 transition-colors"
                  >
                    ✕ Rejected Staff
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* ========================================================= */}
          {/* MULTI-STEP SIGN UP WIZARD */}
          {/* ========================================================= */}
          {mode === 'signup' && (
            <div className="space-y-6">
              {/* Step Progress Indicators */}
              <div className="flex items-center justify-between max-w-xl mx-auto px-2">
                {[
                  { step: 1, label: 'Category' },
                  { step: 2, label: 'Location' },
                  { step: 3, label: 'Select Place' },
                  { step: 4, label: 'Account' },
                ].map((s) => (
                  <div key={s.step} className="flex items-center space-x-2">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        signupStep === s.step
                          ? 'bg-[#8164AD] text-white ring-4 ring-[#8164AD]/20'
                          : signupStep > s.step
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-100 text-slate-400 border border-slate-200'
                      }`}
                    >
                      {signupStep > s.step ? <Check className="w-3.5 h-3.5" /> : s.step}
                    </div>
                    <span
                      className={`text-xs font-semibold hidden sm:inline ${
                        signupStep === s.step ? 'text-[#8164AD]' : 'text-slate-400'
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* ----------------------------------------------------- */}
              {/* STEP 1: SELECT CATEGORY */}
              {/* ----------------------------------------------------- */}
              {signupStep === 1 && (
                <div className="space-y-6 max-w-xl mx-auto animate-fadeIn">
                  <div className="text-center space-y-1">
                    <h2 className="text-lg font-bold text-slate-900">Step 1: Select Facility Category</h2>
                    <p className="text-xs text-slate-500">
                      Choose whether you work in a Healthcare facility or a Banking branch.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div
                      onClick={() => setCategory('Hospital')}
                      id="staff-signup-choose-hospital"
                      className={`p-5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between space-y-3 ${
                        category === 'Hospital'
                          ? 'bg-[#F3ECFB] border-[#8164AD] ring-2 ring-[#8164AD]/30 shadow-md'
                          : 'bg-white border-[#D5C3EE] hover:border-[#B19BD6]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="w-12 h-12 rounded-xl bg-white border border-[#D5C3EE] text-[#8164AD] flex items-center justify-center shadow-xs">
                          <Hospital className="w-6 h-6" />
                        </div>
                        {category === 'Hospital' && (
                          <span className="w-6 h-6 rounded-full bg-[#8164AD] text-white flex items-center justify-center">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">Hospital & Clinics</h3>
                        <p className="text-xs text-slate-500 mt-1">
                          Manage OPD consultations, emergency admissions, and medical department queues.
                        </p>
                      </div>
                    </div>

                    <div
                      onClick={() => setCategory('Bank')}
                      id="staff-signup-choose-bank"
                      className={`p-5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between space-y-3 ${
                        category === 'Bank'
                          ? 'bg-[#F3ECFB] border-[#8164AD] ring-2 ring-[#8164AD]/30 shadow-md'
                          : 'bg-white border-[#D5C3EE] hover:border-[#B19BD6]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="w-12 h-12 rounded-xl bg-white border border-[#D5C3EE] text-[#6A4C97] flex items-center justify-center shadow-xs">
                          <Landmark className="w-6 h-6" />
                        </div>
                        {category === 'Bank' && (
                          <span className="w-6 h-6 rounded-full bg-[#8164AD] text-white flex items-center justify-center">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">Bank & Financial Branch</h3>
                        <p className="text-xs text-slate-500 mt-1">
                          Manage cash transactions, loan inquiries, account services, and KYC counters.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <button
                      type="button"
                      onClick={() => setSignupStep(2)}
                      id="staff-signup-step1-next"
                      className="py-2.5 px-6 rounded-xl bg-[#8164AD] hover:bg-[#6A4C97] text-white font-bold text-xs shadow-md shadow-[#8164AD]/25 transition-all flex items-center space-x-2"
                    >
                      <span>Next: Set Location</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* ----------------------------------------------------- */}
              {/* STEP 2: LOCATION & RADIUS */}
              {/* ----------------------------------------------------- */}
              {signupStep === 2 && (
                <div className="space-y-6 max-w-xl mx-auto animate-fadeIn">
                  <div className="text-center space-y-1">
                    <h2 className="text-lg font-bold text-slate-900">Step 2: Detect Location & Search Radius</h2>
                    <p className="text-xs text-slate-500">
                      Use browser GPS geolocation or search any city/area to locate your {category.toLowerCase()}.
                    </p>
                  </div>

                  {/* Geolocation Button */}
                  <div className="bg-[#FAF7FD] p-4 rounded-2xl border border-[#D5C3EE] space-y-3">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="flex items-center space-x-3 text-xs">
                        <div className="w-10 h-10 rounded-xl bg-white border border-[#D5C3EE] text-[#8164AD] flex items-center justify-center shrink-0">
                          <LocateFixed className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="font-bold text-slate-800 block">Current Search Center</span>
                          <span className="text-slate-500 font-medium">{coordinates.source}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleGetLocation}
                        disabled={locating}
                        id="staff-signup-gps-btn"
                        className="w-full sm:w-auto px-4 py-2 rounded-xl bg-white hover:bg-[#F3ECFB] text-[#8164AD] border border-[#D5C3EE] text-xs font-bold transition-all flex items-center justify-center space-x-1.5 shadow-xs"
                      >
                        {locating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Compass className="w-3.5 h-3.5" />}
                        <span>{locating ? 'Detecting GPS...' : 'Use Browser GPS'}</span>
                      </button>
                    </div>

                    {/* City/Area Search Fallback */}
                    <form onSubmit={handleAreaSearch} className="flex gap-2 pt-2 border-t border-[#E6DAF6]">
                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search city, town, or area (e.g. Guntur, Vijayawada)..."
                          value={searchArea}
                          onChange={(e) => setSearchArea(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-[#D5C3EE] text-slate-900 text-xs placeholder-slate-400 focus:outline-none focus:border-[#8164AD]"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={searchingArea}
                        className="px-4 py-2 rounded-xl bg-[#8164AD] hover:bg-[#6A4C97] text-white text-xs font-semibold transition-all shrink-0 flex items-center space-x-1"
                      >
                        {searchingArea ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Search Area</span>}
                      </button>
                    </form>

                    {/* Radius Selector: 5 / 10 / 20 km */}
                    <div className="flex items-center justify-between pt-2 text-xs">
                      <span className="text-slate-600 font-semibold">Search Distance Radius:</span>
                      <div className="inline-flex rounded-xl bg-white p-1 border border-[#D5C3EE]">
                        {[5, 10, 20].map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => setRadius(r)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
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

                  <div className="flex items-center justify-between pt-4">
                    <button
                      type="button"
                      onClick={() => setSignupStep(1)}
                      className="py-2 px-4 rounded-xl text-slate-600 hover:text-slate-900 text-xs font-semibold flex items-center space-x-1"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Category</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSignupStep(3)}
                      id="staff-signup-step2-next"
                      className="py-2.5 px-6 rounded-xl bg-[#8164AD] hover:bg-[#6A4C97] text-white font-bold text-xs shadow-md shadow-[#8164AD]/25 transition-all flex items-center space-x-2"
                    >
                      <span>View Nearby {category}s</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* ----------------------------------------------------- */}
              {/* STEP 3: SELECT SPECIFIC HOSPITAL OR BANK */}
              {/* ----------------------------------------------------- */}
              {signupStep === 3 && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#E6DAF6]">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">Step 3: Select Your Facility</h2>
                      <p className="text-xs text-slate-500">
                        Choose your specific {category.toLowerCase()} from the verified list below.
                      </p>
                    </div>
                    <div className="text-xs font-mono text-[#8164AD] font-semibold bg-[#F3ECFB] px-3 py-1 rounded-full border border-[#D5C3EE] self-start sm:self-auto">
                      {places.length} facilities within {radius} km
                    </div>
                  </div>

                  {loadingPlaces ? (
                    <div className="text-center py-12 space-y-3">
                      <Loader2 className="w-8 h-8 animate-spin text-[#8164AD] mx-auto" />
                      <p className="text-xs text-slate-500">Loading nearby verified facilities...</p>
                    </div>
                  ) : places.length === 0 ? (
                    <div className="text-center py-12 bg-[#FAF7FD] rounded-2xl border border-[#D5C3EE] space-y-3 p-6">
                      <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
                      <h3 className="text-sm font-bold text-slate-900">No {category}s found within {radius} km</h3>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        Try expanding the radius to 20 km or search for another city/area in the previous step.
                      </p>
                      <button
                        type="button"
                        onClick={() => setSignupStep(2)}
                        className="px-4 py-2 rounded-xl bg-[#8164AD] text-white text-xs font-semibold"
                      >
                        Adjust Location & Radius
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[380px] overflow-y-auto pr-1">
                      {places.map((p) => (
                        <div
                          key={p._id}
                          className="bg-white p-4 rounded-2xl border border-[#D5C3EE] hover:border-[#8164AD] transition-all flex flex-col justify-between space-y-3 shadow-xs hover:shadow-md group"
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#F3ECFB] text-[#6A4C97] border border-[#D5C3EE]">
                                {p.category}
                              </span>
                              <span className="text-[11px] font-mono font-semibold text-[#8164AD]">
                                {p.distance} km
                              </span>
                            </div>
                            <h3 className="font-bold text-slate-900 text-sm group-hover:text-[#8164AD] transition-colors">
                              {p.name}
                            </h3>
                            <p className="text-xs text-slate-500 flex items-start space-x-1.5">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                              <span className="truncate">{p.address}</span>
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleSelectPlace(p)}
                            disabled={selectingPlace}
                            className="w-full py-2 px-3 rounded-xl bg-[#8164AD] hover:bg-[#6A4C97] text-white text-xs font-bold transition-all flex items-center justify-center space-x-1.5 shadow-xs"
                          >
                            {selectingPlace ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Select This Facility</span>}
                            {!selectingPlace && <ArrowRight className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-[#E6DAF6]">
                    <button
                      type="button"
                      onClick={() => setSignupStep(2)}
                      className="py-2 px-4 rounded-xl text-slate-600 hover:text-slate-900 text-xs font-semibold flex items-center space-x-1"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Location</span>
                    </button>
                  </div>
                </div>
              )}

              {/* ----------------------------------------------------- */}
              {/* STEP 4: PERSONAL DETAILS & SUMMARY */}
              {/* ----------------------------------------------------- */}
              {signupStep === 4 && selectedPlace && (
                <form onSubmit={handleSignUpSubmit} className="space-y-5 animate-fadeIn">
                  <div className="text-center space-y-1">
                    <h2 className="text-lg font-bold text-slate-900">Step 4: Operator Account Details</h2>
                    <p className="text-xs text-slate-500">
                      Provide your credentials. Your registration will be sent to the administrator for approval.
                    </p>
                  </div>

                  {/* Summary Card of Chosen Facility */}
                  <div className="p-4 rounded-2xl bg-[#F3ECFB] border border-[#8164AD]/40 flex items-start justify-between shadow-xs">
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-white border border-[#D5C3EE] text-[#8164AD] flex items-center justify-center shrink-0 mt-0.5">
                        {category === 'Hospital' ? <Hospital className="w-5 h-5" /> : <Landmark className="w-5 h-5" />}
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#6A4C97]">
                          Chosen {category}:
                        </span>
                        <h3 className="font-extrabold text-slate-900 text-sm leading-tight">
                          {selectedPlace.name}
                        </h3>
                        <p className="text-xs text-slate-600 mt-0.5 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-[#8164AD] shrink-0" />
                          <span>{selectedPlace.address}</span>
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSignupStep(3)}
                      className="text-[11px] font-semibold text-[#8164AD] hover:underline shrink-0"
                    >
                      Change
                    </button>
                  </div>

                  {/* Personal Inputs Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-700">Full Name</label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          placeholder="e.g. Ramesh Kumar"
                          value={signUpDetails.name}
                          onChange={(e) => setSignUpDetails({ ...signUpDetails, name: e.target.value })}
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-[#D5C3EE] text-slate-900 text-xs placeholder-slate-400 focus:outline-none focus:border-[#8164AD]"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-700">Staff ID (Unique)</label>
                      <div className="relative">
                        <BadgeCheck className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          placeholder="e.g. STAFF-HOSP-12"
                          value={signUpDetails.staffId}
                          onChange={(e) =>
                            setSignUpDetails({ ...signUpDetails, staffId: e.target.value.toUpperCase() })
                          }
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-[#D5C3EE] text-slate-900 text-xs font-mono font-bold placeholder-slate-400 focus:outline-none focus:border-[#8164AD]"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-700">Email Address</label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          required
                          placeholder="staff@facility.com"
                          value={signUpDetails.email}
                          onChange={(e) => setSignUpDetails({ ...signUpDetails, email: e.target.value })}
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-[#D5C3EE] text-slate-900 text-xs placeholder-slate-400 focus:outline-none focus:border-[#8164AD]"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-700">Phone (10 Digits)</label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="tel"
                          required
                          maxLength={10}
                          placeholder="10-digit mobile number"
                          value={signUpDetails.phone}
                          onChange={(e) => setSignUpDetails({ ...signUpDetails, phone: e.target.value })}
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-[#D5C3EE] text-slate-900 text-xs font-mono placeholder-slate-400 focus:outline-none focus:border-[#8164AD]"
                        />
                      </div>
                    </div>

                    <div className="space-y-1 sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700">Password</label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="password"
                          required
                          minLength={6}
                          placeholder="At least 6 characters"
                          value={signUpDetails.password}
                          onChange={(e) => setSignUpDetails({ ...signUpDetails, password: e.target.value })}
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-[#D5C3EE] text-slate-900 text-xs placeholder-slate-400 focus:outline-none focus:border-[#8164AD]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-[#E6DAF6]">
                    <button
                      type="button"
                      onClick={() => setSignupStep(3)}
                      className="py-2 px-4 rounded-xl text-slate-600 hover:text-slate-900 text-xs font-semibold flex items-center space-x-1"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Facility Selection</span>
                    </button>

                    <button
                      type="submit"
                      disabled={loading}
                      id="staff-signup-submit"
                      className="py-3 px-6 rounded-xl bg-[#8164AD] hover:bg-[#6A4C97] text-white font-bold text-xs shadow-md shadow-[#8164AD]/25 transition-all flex items-center space-x-2"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Submit for Admin Approval</span>}
                      {!loading && <Check className="w-4 h-4" />}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default StaffAuthPage;
