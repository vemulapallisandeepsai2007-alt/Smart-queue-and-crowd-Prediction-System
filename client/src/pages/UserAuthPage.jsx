import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { User, Phone, Lock, Mail, Calendar, Sparkles, ArrowRight, Loader2, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

const UserAuthPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, role, loginUser, signupUser } = useAuth();

  const initialMode = searchParams.get('mode') === 'signup' ? 'signup' : 'signin';
  const [mode, setMode] = useState(initialMode);
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in as user
  useEffect(() => {
    if (user && role === 'user') {
      navigate('/user/dashboard');
    }
  }, [user, role, navigate]);

  // Sync mode with query params
  useEffect(() => {
    const queryMode = searchParams.get('mode');
    if (queryMode === 'signup' || queryMode === 'signin') {
      setMode(queryMode);
    }
  }, [searchParams]);

  // Form states
  const [signInData, setSignInData] = useState({
    phone: '',
    password: '',
  });

  const [signUpData, setSignUpData] = useState({
    name: '',
    phone: '',
    gender: 'Male',
    dob: '',
    age: '',
    email: '',
    password: '',
  });

  const calculateAge = (dobString) => {
    if (!dobString) return '';
    const [y, m, d] = dobString.split('-').map(Number);
    const birth = new Date(y, m - 1, d);
    if (isNaN(birth.getTime())) return '';
    const today = new Date();
    let a = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      a--;
    }
    return Math.max(0, a);
  };

  const handleDobChange = (e) => {
    const newDob = e.target.value;
    if (newDob) {
      const calcAge = calculateAge(newDob);
      setSignUpData((prev) => ({
        ...prev,
        dob: newDob,
        age: calcAge !== '' ? String(calcAge) : prev.age,
      }));
    } else {
      setSignUpData((prev) => ({
        ...prev,
        dob: '',
      }));
    }
  };

  const handleModeChange = (newMode) => {
    setMode(newMode);
    setSearchParams({ mode: newMode });
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    if (!/^\d{10}$/.test(signInData.phone.trim())) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }
    if (!signInData.password) {
      toast.error('Password is required');
      return;
    }

    setLoading(true);
    const res = await loginUser({
      phone: signInData.phone.trim(),
      password: signInData.password,
    });
    setLoading(false);

    if (res.success) {
      navigate('/user/dashboard');
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (!signUpData.name.trim() || signUpData.name.trim().length < 2) {
      toast.error('Name must be at least 2 characters');
      return;
    }
    if (!/^\d{10}$/.test(signUpData.phone.trim())) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }
    if (!signUpData.dob) {
      toast.error('Date of birth is required');
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    if (signUpData.dob > today) {
      toast.error('Date of birth cannot be in the future');
      return;
    }

    // Age validation (0-120, required, matches DOB when both given)
    if (signUpData.age === '' || signUpData.age === null || isNaN(Number(signUpData.age))) {
      toast.error('Age is required (0-120)');
      return;
    }
    const ageNum = Number(signUpData.age);
    if (ageNum < 0 || ageNum > 120) {
      toast.error('Age must be between 0 and 120');
      return;
    }
    if (signUpData.dob) {
      const expectedAge = calculateAge(signUpData.dob);
      if (expectedAge !== '' && ageNum !== expectedAge) {
        toast.error(`Age (${ageNum}) does not match Date of Birth (${expectedAge})`);
        return;
      }
    }

    if (signUpData.password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    const res = await signupUser({
      name: signUpData.name.trim(),
      phone: signUpData.phone.trim(),
      gender: signUpData.gender,
      dob: signUpData.dob,
      age: ageNum,
      email: signUpData.email.trim() || undefined,
      password: signUpData.password,
    });
    setLoading(false);

    if (res.success) {
      navigate('/user/dashboard');
    }
  };

  // Quick fill sample credentials for convenient testing
  const fillSampleUser = () => {
    setSignInData({
      phone: '9123456789',
      password: 'User@123',
    });
    toast.success('Sample credentials filled!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fcfaff] via-[#f4ecfb] to-[#e9ddf6] text-slate-800 flex flex-col selection:bg-[#B19BD6] selection:text-white">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md">
          {/* Header Card */}
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-8 border border-[#D5C3EE]/90 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#B19BD6]/15 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>

            {/* Title & Tabs */}
            <div className="text-center space-y-2 mb-6">
              <div className="inline-flex p-3 rounded-2xl bg-[#F3ECFB] text-[#8164AD] mb-1 border border-[#D5C3EE] shadow-xs">
                <User className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Citizen / User Portal</h1>
              <p className="text-xs text-slate-600">Book hospital tokens & manage bank counter queues</p>
            </div>

            {/* Segmented Switcher */}
            <div className="grid grid-cols-2 p-1 bg-[#FAF7FD] rounded-xl border border-[#D5C3EE] mb-6">
              <button
                type="button"
                onClick={() => handleModeChange('signin')}
                className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                  mode === 'signin'
                    ? 'bg-[#8164AD] text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('signup')}
                className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                  mode === 'signup'
                    ? 'bg-[#8164AD] text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sign Up
              </button>
            </div>

            {/* SIGN IN FORM */}
            {mode === 'signin' && (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    10-Digit Mobile Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      maxLength={10}
                      required
                      placeholder="e.g. 9123456789"
                      value={signInData.phone}
                      onChange={(e) =>
                        setSignInData({ ...signInData, phone: e.target.value.replace(/\D/g, '') })
                      }
                      className="w-full glass-input rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={signInData.password}
                      onChange={(e) =>
                        setSignInData({ ...signInData, password: e.target.value })
                      }
                      className="w-full glass-input rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-[#8164AD] hover:bg-[#6A4C97] text-white font-semibold text-sm shadow-md shadow-[#8164AD]/25 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Sign In to Q-Flow</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* Demo Helper Button */}
                <div className="pt-3 border-t border-[#E6DAF6] text-center">
                  <button
                    type="button"
                    onClick={fillSampleUser}
                    className="text-xs text-[#8164AD] hover:text-[#6A4C97] font-medium transition-colors inline-flex items-center space-x-1"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Fill Sample User Credentials (9123456789)</span>
                  </button>
                </div>
              </form>
            )}

            {/* SIGN UP FORM */}
            {mode === 'signup' && (
              <form onSubmit={handleSignUp} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Anil Kumar Varma"
                      value={signUpData.name}
                      onChange={(e) => setSignUpData({ ...signUpData, name: e.target.value })}
                      className="w-full glass-input rounded-xl pl-10 pr-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    10-Digit Mobile Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      maxLength={10}
                      required
                      placeholder="9876543210"
                      value={signUpData.phone}
                      onChange={(e) =>
                        setSignUpData({
                          ...signUpData,
                          phone: e.target.value.replace(/\D/g, ''),
                        })
                      }
                      className="w-full glass-input rounded-xl pl-10 pr-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Gender
                    </label>
                    <select
                      value={signUpData.gender}
                      onChange={(e) =>
                        setSignUpData({ ...signUpData, gender: e.target.value })
                      }
                      className="w-full glass-input rounded-xl px-2.5 py-2 text-sm text-slate-900 focus:outline-none bg-white border border-[#D5C3EE]"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Date of Birth <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      max={new Date().toISOString().split('T')[0]}
                      value={signUpData.dob}
                      onChange={handleDobChange}
                      className="w-full glass-input rounded-xl px-2 py-2 text-xs text-slate-900 focus:outline-none bg-white border border-[#D5C3EE]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Age <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="120"
                      required
                      placeholder="0 - 120"
                      value={signUpData.age}
                      readOnly={Boolean(signUpData.dob)}
                      onChange={(e) => setSignUpData({ ...signUpData, age: e.target.value })}
                      id="signup-age-input"
                      className={`w-full glass-input rounded-xl px-2.5 py-2 text-sm text-slate-900 focus:outline-none border border-[#D5C3EE] ${
                        signUpData.dob
                          ? 'bg-slate-100/80 cursor-not-allowed text-slate-700 font-semibold'
                          : 'bg-white'
                      }`}
                    />
                  </div>
                </div>
                {signUpData.dob && (
                  <p className="text-[10px] text-[#8164AD] -mt-1 font-medium">
                    ⚡ Age is auto-calculated from Date of Birth.
                  </p>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Email Address <span className="text-slate-400">(Optional)</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      placeholder="anil@example.com"
                      value={signUpData.email}
                      onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                      className="w-full glass-input rounded-xl pl-10 pr-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Create Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      placeholder="Minimum 6 characters"
                      value={signUpData.password}
                      onChange={(e) =>
                        setSignUpData({ ...signUpData, password: e.target.value })
                      }
                      className="w-full glass-input rounded-xl pl-10 pr-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 mt-2 rounded-xl bg-[#8164AD] hover:bg-[#6A4C97] text-white font-semibold text-sm shadow-md shadow-[#8164AD]/25 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Create Account & Continue</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default UserAuthPage;
