import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '../../components/Navbar';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { getSocket } from '../../services/socket';
import {
  Building2,
  Hospital,
  Landmark,
  BadgeCheck,
  CheckCircle2,
  XCircle,
  Megaphone,
  ArrowLeft,
  ArrowRight,
  Clock,
  Users,
  Play,
  Pause,
  RefreshCw,
  Loader2,
  MapPin,
  AlertTriangle,
  Stethoscope,
  Briefcase,
  User,
  Shield,
  Phone,
  Coffee,
  Sun,
  Sunset,
  Moon,
  RotateCcw,
  UserPlus,
  FastForward,
  Check,
} from 'lucide-react';
import toast from 'react-hot-toast';

const StaffDashboard = () => {
  const { user } = useAuth();
  const todayStr = new Date().toISOString().split('T')[0];

  // Department State
  const [departments, setDepartments] = useState([]);
  const [loadingDepts, setLoadingDepts] = useState(true);
  const [selectedDept, setSelectedDept] = useState(null);

  // Slot and Token State for selected department
  const [selectedSlot, setSelectedSlot] = useState('Morning'); // 'Morning' | 'Afternoon' | 'Evening'
  const [allTokens, setAllTokens] = useState([]);
  const [slotSummaries, setSlotSummaries] = useState([]);
  const [breaks, setBreaks] = useState([]);
  const [currentBreak, setCurrentBreak] = useState(null);
  const [nowServing, setNowServing] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [refreshingTokens, setRefreshingTokens] = useState(false);

  // Modals State
  // 1. Walk-in modal (clicking white available token)
  const [walkInModalToken, setWalkInModalToken] = useState(null);
  const [walkInForm, setWalkInForm] = useState({
    patientName: '',
    phone: '',
    age: '',
    gender: 'Male',
  });
  const [walkInLoading, setWalkInLoading] = useState(false);

  // 2. Unified Token details & action modal (booked, skipped, completed, cancelled)
  const [tokenModalData, setTokenModalData] = useState(null);
  const [tokenModalLoading, setTokenModalLoading] = useState(false);
  const [activeTokenModal, setActiveTokenModal] = useState(null);
  const [skipReason, setSkipReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // 3. Skipped token modal fallback
  const [skippedTokenModal, setSkippedTokenModal] = useState(null);

  // Counter dispatch action loading
  const [callNextLoading, setCallNextLoading] = useState(false);
  const [pauseLoading, setPauseLoading] = useState(false);

  // Socket connectivity
  const [socketConnected, setSocketConnected] = useState(false);

  // 1. Fetch departments of the staff member's place
  const fetchStaffDepartments = useCallback(async () => {
    if (!user?.place) {
      setLoadingDepts(false);
      return;
    }

    setLoadingDepts(true);
    try {
      const res = await api.get('/staff/departments');
      if (res.data?.success) {
        setDepartments(res.data.departments || []);
      }
    } catch (err) {
      console.error('Failed to load staff departments:', err);
      toast.error('Could not load departments for your facility.');
    } finally {
      setLoadingDepts(false);
    }
  }, [user]);

  useEffect(() => {
    fetchStaffDepartments();
  }, [fetchStaffDepartments]);

  // 2. Fetch tokens and slot summaries for the selected department
  const fetchDeptTokens = useCallback(
    async (silent = false) => {
      if (!selectedDept?._id) return;

      if (!silent) setLoadingTokens(true);
      else setRefreshingTokens(true);

      try {
        const res = await api.get(`/departments/${selectedDept._id}/tokens`, {
          params: { date: todayStr },
        });

        if (res.data?.success) {
          const rawTokens = res.data.allTokens || res.data.tokens || [];
          setAllTokens(rawTokens);
          setSlotSummaries(res.data.slotSummaries || []);
          setBreaks(res.data.breaks || []);
          setCurrentBreak(res.data.currentBreak || null);
          setNowServing(res.data.nowServingToken || null);
          setIsPaused(Boolean(res.data.isPaused));
        }
      } catch (err) {
        console.error('Failed to load tokens for department:', err);
        toast.error('Could not load tokens for today.');
      } finally {
        setLoadingTokens(false);
        setRefreshingTokens(false);
      }
    },
    [selectedDept, todayStr]
  );

  useEffect(() => {
    if (selectedDept) {
      fetchDeptTokens();
    }
  }, [selectedDept, fetchDeptTokens]);

  // 3. Socket.IO Real-time Synchronization
  useEffect(() => {
    if (!selectedDept?._id) return;

    const socket = getSocket();
    setSocketConnected(socket.connected);

    socket.emit('join:department', { departmentId: selectedDept._id, date: todayStr });

    const handleConnect = () => setSocketConnected(true);
    const handleDisconnect = () => setSocketConnected(false);

    // Single token update (walkin, booked, completed, skipped, cancelled, recalled)
    const handleTokenUpdated = ({ departmentId, date, token }) => {
      if (departmentId?.toString() === selectedDept._id.toString() && date === todayStr) {
        setAllTokens((prev) =>
          prev.map((t) => (t._id === token._id ? { ...t, ...token } : t))
        );
      }
    };

    // Batch tokens update
    const handleBatchTokens = ({
      departmentId,
      date,
      tokens: updatedTokens,
      nowServingToken: srvServing,
      isPaused: srvPaused,
    }) => {
      if (departmentId?.toString() === selectedDept._id.toString() && date === todayStr) {
        setAllTokens(updatedTokens);
        if (srvServing !== undefined) setNowServing(srvServing);
        if (srvPaused !== undefined) setIsPaused(Boolean(srvPaused));
      }
    };

    // "queue:nowServing"
    const handleNowServing = ({ departmentId, date, tokenNumber }) => {
      if (departmentId?.toString() === selectedDept._id.toString() && date === todayStr) {
        setNowServing(tokenNumber);
        toast(`📢 Now Calling Token #${tokenNumber}!`, {
          icon: '🛎️',
          duration: 5000,
          style: { background: '#1e1b4b', color: '#c7d2fe', border: '1px solid #4338ca' },
        });
      }
    };

    // "counter:paused"
    const handleCounterPaused = ({ departmentId, isPaused: pState }) => {
      if (departmentId?.toString() === selectedDept._id.toString()) {
        setIsPaused(pState);
        if (pState) {
          toast('⏸️ Counter operations paused.', { icon: 'ℹ️' });
        } else {
          toast.success('▶️ Counter operations resumed!');
        }
      }
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('token:updated', handleTokenUpdated);
    socket.on('tokens:batch', handleBatchTokens);
    socket.on('queue:nowServing', handleNowServing);
    socket.on('counter:paused', handleCounterPaused);

    return () => {
      socket.emit('leave:department', { departmentId: selectedDept._id, date: todayStr });
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('token:updated', handleTokenUpdated);
      socket.off('tokens:batch', handleBatchTokens);
      socket.off('queue:nowServing', handleNowServing);
      socket.off('counter:paused', handleCounterPaused);
    };
  }, [selectedDept, todayStr]);

  // Click on token tile handler
  const handleTokenTileClick = async (token) => {
    if (token.status === 'available') {
      // White tile: open walk-in booking modal
      setWalkInModalToken(token);
      setWalkInForm({ patientName: '', phone: '', age: '', gender: 'Male' });
      return;
    }

    // Set initial token modal state so modal opens immediately
    setTokenModalData(token);
    setSkipReason(token.skipReason || '');
    setTokenModalLoading(true);

    try {
      const res = await api.get(`/tokens/${token._id}/details`);
      if (res.data?.success) {
        setTokenModalData((prev) => ({
          ...prev,
          ...res.data,
          patient: res.data.patient || {},
        }));
      }
    } catch (err) {
      if (err.status === 403) {
        toast.error('Forbidden: You are not authorized to view patient details for this facility.');
        setTokenModalData(null);
      } else {
        toast.error(err.message || 'Failed to load token details.');
      }
    } finally {
      setTokenModalLoading(false);
    }
  };

  // Staff Action: Book Walk-in Token
  const handleWalkInSubmit = async (e) => {
    e.preventDefault();
    if (!walkInModalToken) return;

    if (!walkInForm.patientName.trim()) {
      toast.error('Patient name is required.');
      return;
    }
    if (!walkInForm.phone.trim()) {
      toast.error('Patient phone number is required.');
      return;
    }

    if (walkInForm.age === '' || walkInForm.age === null || isNaN(Number(walkInForm.age))) {
      toast.error('Patient age is required (0-120).');
      return;
    }
    const ageNum = Number(walkInForm.age);
    if (ageNum < 0 || ageNum > 120) {
      toast.error('Patient age must be between 0 and 120.');
      return;
    }

    setWalkInLoading(true);
    try {
      const res = await api.post(`/tokens/${walkInModalToken._id}/walkin`, {
        patientName: walkInForm.patientName.trim(),
        phone: walkInForm.phone.trim(),
        age: ageNum,
        gender: walkInForm.gender,
      });

      if (res.data?.success) {
        toast.success(`Walk-in Token #${walkInModalToken.number} booked successfully!`);
        setWalkInModalToken(null);
        await fetchDeptTokens(true);
      }
    } catch (err) {
      if (err.status === 409) {
        toast.error(`Conflict: Token #${walkInModalToken.number} was just booked by another user!`);
      } else {
        toast.error(err.message || 'Failed to book walk-in token.');
      }
      setWalkInModalToken(null);
      fetchDeptTokens(true);
    } finally {
      setWalkInLoading(false);
    }
  };

  // Staff Action: Mark Token Completed (booked -> completed)
  const handleMarkCompleted = async () => {
    const target = tokenModalData || activeTokenModal;
    if (!target) return;

    setActionLoading(true);
    try {
      const res = await api.post(`/tokens/${target._id}/complete`);
      if (res.data?.success) {
        toast.success(`Token #${target.number} marked as Completed!`);
        setTokenModalData(null);
        setActiveTokenModal(null);
        await fetchDeptTokens(true);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to complete token.');
    } finally {
      setActionLoading(false);
    }
  };

  // Staff Action: Skip Token (booked -> skipped)
  const handleSkipToken = async () => {
    const target = tokenModalData || activeTokenModal;
    if (!target) return;

    setActionLoading(true);
    try {
      const res = await api.post(`/tokens/${target._id}/skip`, {
        reason: skipReason.trim() || 'Patient not present at counter',
      });
      if (res.data?.success) {
        toast(`Token #${target.number} skipped (turned amber).`, {
          icon: '⚠️',
          style: { background: '#78350f', color: '#fef3c7' },
        });
        setTokenModalData(null);
        setActiveTokenModal(null);
        await fetchDeptTokens(true);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to skip token.');
    } finally {
      setActionLoading(false);
    }
  };

  // Staff Action: Cancel Token (booked -> cancelled OR skipped -> cancelled)
  const handleCancelToken = async (targetToken) => {
    const token = targetToken || tokenModalData || activeTokenModal || skippedTokenModal;
    if (!token) return;

    setActionLoading(true);
    try {
      const res = await api.post(`/tokens/${token._id}/cancel`);
      if (res.data?.success) {
        toast.success(`Token #${token.number} cancelled.`);
        setTokenModalData(null);
        setActiveTokenModal(null);
        setSkippedTokenModal(null);
        await fetchDeptTokens(true);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to cancel token.');
    } finally {
      setActionLoading(false);
    }
  };

  // Staff Action: Recall Skipped Token (skipped -> booked)
  const handleRecallToken = async () => {
    const target = tokenModalData || skippedTokenModal;
    if (!target) return;

    setActionLoading(true);
    try {
      const res = await api.post(`/tokens/${target._id}/recall`);
      if (res.data?.success) {
        toast.success(`Token #${target.number} recalled back into active queue!`);
        setTokenModalData(null);
        setSkippedTokenModal(null);
        await fetchDeptTokens(true);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to recall token.');
    } finally {
      setActionLoading(false);
    }
  };

  // Staff Action: Call Next Token (lowest booked token in current slot, ignores skipped)
  const handleCallNext = async () => {
    if (!selectedDept?._id) return;

    if (currentBreak?.onBreak) {
      toast.error(
        currentBreak.message || 'Doctor is currently on break. Token calling is disabled.',
        { icon: '☕' }
      );
      return;
    }

    setCallNextLoading(true);
    try {
      const res = await api.post(
        `/departments/${selectedDept._id}/call-next?date=${todayStr}&slot=${selectedSlot}`
      );
      if (res.data?.success) {
        setNowServing(res.data.tokenNumber);
        toast.success(`Now calling Token #${res.data.tokenNumber}!`);
        await fetchDeptTokens(true);
      }
    } catch (err) {
      toast.error(err.message || `No booked tokens in this slot (${selectedSlot}).`);
    } finally {
      setCallNextLoading(false);
    }
  };

  // Staff Action: Pause / Resume Counter
  const handleTogglePause = async () => {
    if (!selectedDept?._id) return;

    setPauseLoading(true);
    try {
      const endpoint = isPaused
        ? `/departments/${selectedDept._id}/resume`
        : `/departments/${selectedDept._id}/pause`;
      const res = await api.post(endpoint);
      if (res.data?.success) {
        setIsPaused(res.data.isPaused);
        toast.success(res.data.message);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update counter state.');
    } finally {
      setPauseLoading(false);
    }
  };

  // Filter 25 tokens for the selected slot
  const slotTokens = allTokens.filter((t) => {
    if (t.slot) return t.slot === selectedSlot;
    if (selectedSlot === 'Morning') return t.number <= 25;
    if (selectedSlot === 'Afternoon') return t.number >= 26 && t.number <= 50;
    return t.number >= 51 && t.number <= 75;
  });

  const lunchBreak = breaks.find((b) => b.label?.toLowerCase().includes('lunch')) || {
    label: 'Lunch',
    startTime: '12:30',
    endTime: '14:00',
  };
  const teaBreak = breaks.find((b) => b.label?.toLowerCase().includes('tea')) || {
    label: 'Tea',
    startTime: '17:00',
    endTime: '17:30',
  };

  // EDGE CASE: If staff has no place linked
  if (!user?.place) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#fcfaff] via-[#f4ecfb] to-[#e9ddf6] text-slate-800 flex flex-col selection:bg-[#B19BD6] selection:text-white">
        <Navbar />
        <main className="flex-1 max-w-lg mx-auto px-4 py-16 w-full flex flex-col justify-center">
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-8 border border-amber-300 shadow-xl text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Facility Not Linked</h1>
            <p className="text-sm text-slate-600 leading-relaxed font-medium">
              Your account has no hospital/bank facility linked. Please contact the administrator.
            </p>
            <div className="pt-2 text-xs text-slate-400">
              Staff ID: <span className="font-mono font-bold text-slate-700">{user?.staffId || 'N/A'}</span>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const place = user.place;
  const isHospital = place.category === 'Hospital';

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fcfaff] via-[#f4ecfb] to-[#e9ddf6] text-slate-800 flex flex-col selection:bg-[#B19BD6] selection:text-white">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
        {/* ========================================================= */}
        {/* DASHBOARD HEADER: FACILITY DETAILS & OPERATOR BADGE */}
        {/* ========================================================= */}
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-[#D5C3EE] shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#B19BD6]/15 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
            <div className="flex items-start space-x-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#8164AD] to-[#B19BD6] flex items-center justify-center text-white shadow-lg shadow-[#8164AD]/25 shrink-0">
                {isHospital ? <Hospital className="w-8 h-8" /> : <Landmark className="w-8 h-8" />}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center flex-wrap gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#F3ECFB] text-[#6A4C97] border border-[#D5C3EE]">
                    {place.category || user.category}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Authorized Facility</span>
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
                  {place.name}
                </h1>

                <p className="text-xs text-slate-600 flex items-center space-x-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#8164AD] shrink-0" />
                  <span>
                    {place.address}
                    {place.city ? `, ${place.city}` : ''}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row md:flex-col items-start sm:items-center md:items-end gap-2.5 shrink-0">
              <div className="px-4 py-2 rounded-2xl bg-[#FAF7FD] border border-[#D5C3EE] text-xs space-y-0.5 text-right">
                <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#8164AD]" />
                  <span>{user.name}</span>
                </div>
                <div className="font-mono text-[#8164AD] text-[11px] font-bold">
                  ID: {user.staffId}
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full bg-white border border-[#D5C3EE]">
                <span
                  className={`w-2 h-2 rounded-full ${
                    socketConnected ? 'bg-emerald-500 animate-pulse' : 'bg-emerald-500'
                  }`}
                />
                <span className="text-emerald-700">Live Counter Network</span>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* VIEW A: SELECT DEPARTMENT */}
        {/* ========================================================= */}
        {!selectedDept && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center justify-between pb-2 border-b border-[#D5C3EE]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8164AD]">
                  Counter Operation Units
                </span>
                <h2 className="text-xl font-bold text-slate-900 mt-0.5">
                  Select Department to Dispatch Tokens
                </h2>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                {departments.length} Active Counter{departments.length !== 1 ? 's' : ''}
              </span>
            </div>

            {loadingDepts ? (
              <div className="text-center py-16 space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-[#8164AD] mx-auto" />
                <p className="text-xs text-slate-500">Loading department rosters...</p>
              </div>
            ) : departments.length === 0 ? (
              <div className="text-center py-16 bg-white/80 rounded-3xl border border-[#D5C3EE] p-8 space-y-3">
                <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
                <h3 className="font-bold text-slate-900 text-sm">No departments found</h3>
                <p className="text-xs text-slate-500">
                  Please contact administrator to configure departments for this facility.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {departments.map((dept) => (
                  <div
                    key={dept._id}
                    onClick={() => setSelectedDept(dept)}
                    className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 border border-[#D5C3EE] hover:border-[#8164AD] transition-all duration-300 flex flex-col justify-between group shadow-md shadow-[#53377F]/5 hover:shadow-xl hover:-translate-y-1 cursor-pointer space-y-5"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="w-12 h-12 rounded-2xl bg-[#F3ECFB] border border-[#D5C3EE] text-[#8164AD] flex items-center justify-center transition-transform group-hover:scale-105 shadow-xs">
                          {isHospital ? <Stethoscope className="w-6 h-6" /> : <Briefcase className="w-6 h-6" />}
                        </div>

                        <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#FAF7FD] border border-[#D5C3EE] text-xs font-mono font-semibold text-[#6A4C97]">
                          <Clock className="w-3.5 h-3.5 text-[#8164AD]" />
                          <span>~{dept.avgServiceMinutes || 10}m/token</span>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-bold text-slate-900 group-hover:text-[#8164AD] transition-colors leading-snug">
                          {dept.name}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          3 Slots: Morning (1-25), Afternoon (26-50), Evening (51-75)
                        </p>
                      </div>

                      {/* Doctor Details */}
                      <div className="pt-3 border-t border-[#E6DAF6]">
                        {isHospital ? (
                          dept.doctors && dept.doctors.length > 0 ? (
                            <div className="space-y-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6A4C97] block">
                                Assigned Medical Officer:
                              </span>
                              {dept.doctors.map((doc, idx) => (
                                <div key={idx} className="bg-[#FAF7FD] p-3 rounded-xl border border-[#D5C3EE]/60 space-y-0.5">
                                  <div className="text-xs font-bold text-slate-900">{doc.name}</div>
                                  <div className="text-[11px] text-[#8164AD] font-semibold">{doc.designation}</div>
                                  <div className="text-[10px] text-slate-500">{doc.experienceYears} years experience</div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-xs text-slate-400 italic">Consultant roster on rotation</div>
                          )
                        ) : (
                          <div className="space-y-1 text-xs">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6A4C97] block">
                              Banking Service Desk:
                            </span>
                            <p className="text-slate-700 font-medium">Counter Service: {dept.name}</p>
                            <p className="text-[11px] text-slate-500">Live token processing and customer desk</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#E6DAF6] flex items-center justify-between">
                      <span className="text-xs font-bold text-[#8164AD] group-hover:text-[#6A4C97] flex items-center gap-1.5">
                        <span>Open 3-Slot Grid</span>
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </span>
                      {dept.nowServingToken ? (
                        <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          Now #{dept.nowServingToken}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">Ready</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW B: 3-SLOT DISPATCH CONSOLE FOR SELECTED DEPARTMENT */}
        {/* ========================================================= */}
        {selectedDept && (
          <div className="space-y-6 animate-fadeIn">
            {/* Header with Back Button and Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#D5C3EE]">
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setSelectedDept(null)}
                  id="staff-back-to-departments"
                  className="p-2.5 rounded-2xl bg-white hover:bg-[#F3ECFB] text-[#8164AD] border border-[#D5C3EE] shadow-xs transition-all flex items-center space-x-1.5 font-bold text-xs"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Departments</span>
                </button>

                <div>
                  <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                    <span>{selectedDept.name}</span>
                    <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-[#F3ECFB] text-[#6A4C97] border border-[#D5C3EE]">
                      Slot: {selectedSlot}
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Live Dispatch Console • 3 Slots of 25 Tokens
                  </p>
                </div>
              </div>

              {/* Action Toolbar: Call Next, Pause / Resume, Refresh */}
              <div className="flex items-center flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleCallNext}
                  disabled={callNextLoading || isPaused || currentBreak?.onBreak}
                  id="staff-call-next-btn"
                  className="px-4 py-2 rounded-xl bg-[#8164AD] hover:bg-[#6A4C97] text-white text-xs font-bold shadow-md shadow-[#8164AD]/25 transition-all flex items-center space-x-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {callNextLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Megaphone className="w-3.5 h-3.5" />
                  )}
                  <span>Call Next Token</span>
                </button>

                <button
                  type="button"
                  onClick={handleTogglePause}
                  disabled={pauseLoading}
                  id="staff-pause-btn"
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center space-x-1.5 ${
                    isPaused
                      ? 'bg-amber-500 text-white border-amber-600 shadow-md shadow-amber-500/20'
                      : 'bg-white hover:bg-slate-50 text-slate-700 border-[#D5C3EE]'
                  }`}
                >
                  {pauseLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : isPaused ? (
                    <Play className="w-3.5 h-3.5 fill-current" />
                  ) : (
                    <Pause className="w-3.5 h-3.5 fill-current" />
                  )}
                  <span>{isPaused ? 'Resume Counter' : 'Pause Counter'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => fetchDeptTokens(true)}
                  disabled={refreshingTokens}
                  className="p-2 rounded-xl bg-white hover:bg-[#FAF7FD] text-slate-600 border border-[#D5C3EE] shadow-xs transition-all"
                  title="Refresh Grid"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshingTokens ? 'animate-spin text-[#8164AD]' : ''}`} />
                </button>
              </div>
            </div>

            {/* DOCTOR BREAK BANNER */}
            {currentBreak?.onBreak && (
              <div className="bg-amber-500 text-white rounded-3xl p-5 shadow-lg border border-amber-600 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fadeIn">
                <div className="flex items-center space-x-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 text-white flex items-center justify-center shrink-0 border border-white/30">
                    <Coffee className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-100 block">
                      Counter Intermission
                    </span>
                    <h3 className="text-lg font-black tracking-tight">
                      Doctor on break until {currentBreak.endTime}
                    </h3>
                    <p className="text-xs text-amber-100">
                      Call Next is disabled during intermission. Counter resumes automatically when break ends.
                    </p>
                  </div>
                </div>

                <div className="px-4 py-2 rounded-2xl bg-white/15 border border-white/25 text-xs font-semibold text-white">
                  Manual Pause / Resume Available
                </div>
              </div>
            )}

            {/* "Now Serving" Live Announcement Banner */}
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-3xl p-5 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 border border-indigo-900/50">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/30">
                  <Megaphone className="w-6 h-6 animate-bounce" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                    Live Counter Dispatch
                  </span>
                  <div className="text-xl sm:text-2xl font-black tracking-tight">
                    {isPaused ? (
                      <span className="text-amber-400">Counter Operations Paused</span>
                    ) : nowServing ? (
                      <span>Now Serving Token #{nowServing}</span>
                    ) : (
                      <span>Counter Waiting for Next Token</span>
                    )}
                  </div>
                </div>
              </div>

              {nowServing && !isPaused && (
                <div className="px-4 py-2 rounded-2xl bg-indigo-500/30 border border-indigo-400/40 text-xs font-mono font-bold flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                  <span>TOKEN #{nowServing} AT COUNTER</span>
                </div>
              )}
            </div>

            {/* ========================================================= */}
            {/* 3 SLOT CARDS & BREAK ROWS (STAFF FLOW) */}
            {/* ========================================================= */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Select Working Slot:
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  Switch slots to dispatch or book walk-ins
                </span>
              </div>

              {/* Slot 1: Morning Card */}
              {(() => {
                const summary = slotSummaries.find((s) => s.name === 'Morning') || {
                  available: 25,
                  booked: 0,
                  completed: 0,
                  skipped: 0,
                  cancelled: 0,
                  walkIns: 0,
                  startTime: '09:00',
                  endTime: '12:30',
                };
                const isSelected = selectedSlot === 'Morning';

                return (
                  <div
                    onClick={() => setSelectedSlot('Morning')}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer bg-white/95 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                      isSelected
                        ? 'border-[#8164AD] ring-4 ring-[#D5C3EE]/50 shadow-md'
                        : 'border-[#E6DAF6] hover:border-[#B19BD6]'
                    }`}
                  >
                    <div className="flex items-center space-x-3.5">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base shadow-xs ${
                          isSelected ? 'bg-[#8164AD] text-white' : 'bg-[#F3ECFB] text-[#8164AD]'
                        }`}
                      >
                        <Sun className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-extrabold text-slate-900 text-base">Morning Shift</h4>
                          <span className="text-xs text-slate-500 font-mono">Tokens 1 - 25</span>
                        </div>
                        <p className="text-xs text-[#8164AD] font-semibold flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{summary.startTime || '09:00'} - {summary.endTime || '12:30'}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center flex-wrap gap-2 text-xs">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold">
                        {summary.available} Available
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-[#BFDBFE] text-blue-900 font-bold">
                        {summary.booked} Booked
                      </span>
                      {summary.skipped > 0 && (
                        <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 font-bold">
                          {summary.skipped} Skipped
                        </span>
                      )}
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold">
                        {summary.completed} Done
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Lunch Break Row */}
              <div className="bg-[#FAF7FD] border border-dashed border-[#D5C3EE] rounded-xl py-1.5 px-4 flex items-center justify-between text-xs text-[#6A4C97] font-semibold">
                <div className="flex items-center space-x-2">
                  <Coffee className="w-3.5 h-3.5 text-[#8164AD]" />
                  <span>
                    Doctor break: {lunchBreak.startTime} - {lunchBreak.endTime} ({lunchBreak.label || 'Lunch'})
                  </span>
                </div>
                <span className="text-[10px] text-slate-400">Intermission</span>
              </div>

              {/* Slot 2: Afternoon Card */}
              {(() => {
                const summary = slotSummaries.find((s) => s.name === 'Afternoon') || {
                  available: 25,
                  booked: 0,
                  completed: 0,
                  skipped: 0,
                  cancelled: 0,
                  walkIns: 0,
                  startTime: '14:00',
                  endTime: '17:00',
                };
                const isSelected = selectedSlot === 'Afternoon';

                return (
                  <div
                    onClick={() => setSelectedSlot('Afternoon')}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer bg-white/95 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                      isSelected
                        ? 'border-[#8164AD] ring-4 ring-[#D5C3EE]/50 shadow-md'
                        : 'border-[#E6DAF6] hover:border-[#B19BD6]'
                    }`}
                  >
                    <div className="flex items-center space-x-3.5">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base shadow-xs ${
                          isSelected ? 'bg-[#8164AD] text-white' : 'bg-[#F3ECFB] text-[#8164AD]'
                        }`}
                      >
                        <Sunset className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-extrabold text-slate-900 text-base">Afternoon Shift</h4>
                          <span className="text-xs text-slate-500 font-mono">Tokens 26 - 50</span>
                        </div>
                        <p className="text-xs text-[#8164AD] font-semibold flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{summary.startTime || '14:00'} - {summary.endTime || '17:00'}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center flex-wrap gap-2 text-xs">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold">
                        {summary.available} Available
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-[#BFDBFE] text-blue-900 font-bold">
                        {summary.booked} Booked
                      </span>
                      {summary.skipped > 0 && (
                        <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 font-bold">
                          {summary.skipped} Skipped
                        </span>
                      )}
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold">
                        {summary.completed} Done
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Tea Break Row */}
              <div className="bg-[#FAF7FD] border border-dashed border-[#D5C3EE] rounded-xl py-1.5 px-4 flex items-center justify-between text-xs text-[#6A4C97] font-semibold">
                <div className="flex items-center space-x-2">
                  <Coffee className="w-3.5 h-3.5 text-[#8164AD]" />
                  <span>
                    Doctor break: {teaBreak.startTime} - {teaBreak.endTime} ({teaBreak.label || 'Tea'})
                  </span>
                </div>
                <span className="text-[10px] text-slate-400">Intermission</span>
              </div>

              {/* Slot 3: Evening Card */}
              {(() => {
                const summary = slotSummaries.find((s) => s.name === 'Evening') || {
                  available: 25,
                  booked: 0,
                  completed: 0,
                  skipped: 0,
                  cancelled: 0,
                  walkIns: 0,
                  startTime: '17:30',
                  endTime: '20:30',
                };
                const isSelected = selectedSlot === 'Evening';

                return (
                  <div
                    onClick={() => setSelectedSlot('Evening')}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer bg-white/95 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                      isSelected
                        ? 'border-[#8164AD] ring-4 ring-[#D5C3EE]/50 shadow-md'
                        : 'border-[#E6DAF6] hover:border-[#B19BD6]'
                    }`}
                  >
                    <div className="flex items-center space-x-3.5">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base shadow-xs ${
                          isSelected ? 'bg-[#8164AD] text-white' : 'bg-[#F3ECFB] text-[#8164AD]'
                        }`}
                      >
                        <Moon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-extrabold text-slate-900 text-base">Evening Shift</h4>
                          <span className="text-xs text-slate-500 font-mono">Tokens 51 - 75</span>
                        </div>
                        <p className="text-xs text-[#8164AD] font-semibold flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{summary.startTime || '17:30'} - {summary.endTime || '20:30'}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center flex-wrap gap-2 text-xs">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold">
                        {summary.available} Available
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-[#BFDBFE] text-blue-900 font-bold">
                        {summary.booked} Booked
                      </span>
                      {summary.skipped > 0 && (
                        <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 font-bold">
                          {summary.skipped} Skipped
                        </span>
                      )}
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold">
                        {summary.completed} Done
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Legend Bar with Amber for Skipped */}
            <div className="bg-white/90 p-4 rounded-2xl border border-[#D5C3EE] flex flex-wrap items-center justify-between gap-3 text-xs">
              <span className="font-semibold text-slate-700">Token Status Legend:</span>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center space-x-1.5">
                  <span className="w-4 h-4 rounded bg-white border border-slate-300 shadow-xs"></span>
                  <span className="text-slate-600">White = Available (Click to Walk-In)</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-4 h-4 rounded bg-[#BFDBFE] border border-blue-400 shadow-xs"></span>
                  <span className="text-blue-900 font-bold">Light Blue = Booked (Click to manage)</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-4 h-4 rounded bg-amber-400 border border-amber-500 shadow-xs"></span>
                  <span className="text-amber-800 font-bold">Amber = Skipped (Click to recall)</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-4 h-4 rounded bg-emerald-500 border border-emerald-600 shadow-xs"></span>
                  <span className="text-emerald-700 font-semibold">Green = Completed</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-4 h-4 rounded bg-rose-500 border border-rose-600 shadow-xs"></span>
                  <span className="text-rose-700 font-semibold">Red = Cancelled</span>
                </div>
              </div>
            </div>

            {/* 25-TOKEN GRID FOR SELECTED SLOT */}
            {loadingTokens ? (
              <div className="text-center py-20 space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-[#8164AD] mx-auto" />
                <p className="text-xs text-slate-500">Loading {selectedSlot} token grid...</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {slotTokens.map((t) => {
                  const isAvailable = t.status === 'available';
                  const isBooked = t.status === 'booked';
                  const isCompleted = t.status === 'completed';
                  const isCancelled = t.status === 'cancelled';
                  const isSkipped = t.status === 'skipped';

                  return (
                    <div
                      key={t._id || t.number}
                      id={`staff-token-tile-${t.number}`}
                      title={
                        isBooked
                          ? `${t.patientName || t.patient?.name || 'Patient'}, ${t.patientAge ?? t.patient?.age ?? 'N/A'}`
                          : isSkipped || isCompleted
                          ? `${t.patientName || t.patient?.name || 'Patient'} (${t.status})`
                          : undefined
                      }
                      onClick={() => handleTokenTileClick(t)}
                      className={`group p-3 rounded-2xl border transition-all flex flex-col justify-between text-left select-none relative cursor-pointer ${
                        isBooked
                          ? 'bg-[#BFDBFE] border-blue-400 hover:border-blue-600 text-blue-950 font-bold shadow-sm hover:scale-105 ring-2 ring-blue-300/40'
                          : isSkipped
                          ? 'bg-amber-400 border-amber-500 hover:border-amber-600 text-amber-950 font-bold shadow-sm hover:scale-105 ring-2 ring-amber-300/60'
                          : isCompleted
                          ? 'bg-emerald-500 border-emerald-600 text-white font-bold shadow-xs'
                          : isCancelled
                          ? 'bg-rose-500 border-rose-600 text-white font-bold shadow-xs opacity-80'
                          : 'bg-white border-slate-200 text-slate-700 shadow-xs hover:border-[#8164AD] hover:scale-105'
                      }`}
                    >
                      {/* Hover Tooltip for Booked Tiles (Name, age) */}
                      {isBooked && (
                        <div className="group-hover:opacity-100 opacity-0 pointer-events-none transition-opacity absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-semibold py-1 px-2.5 rounded-lg whitespace-nowrap shadow-xl z-30">
                          {t.patientName || t.patient?.name || 'Patient'}, {t.patientAge ?? t.patient?.age ?? 'N/A'}
                          <div className="w-1.5 h-1.5 bg-slate-900 rotate-45 absolute -bottom-0.5 left-1/2 -translate-x-1/2"></div>
                        </div>
                      )}

                      {/* Top Bar: Number & Status Badge */}
                      <div className="flex items-center justify-between">
                        <span className="text-base font-black tracking-tight">#{t.number}</span>
                        {isBooked && (
                          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                        )}
                        {isSkipped && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-amber-600 text-white font-extrabold">
                            SKIPPED
                          </span>
                        )}
                        {isCompleted && <Check className="w-3.5 h-3.5 text-white" />}
                        {isCancelled && <XCircle className="w-3.5 h-3.5 text-white" />}
                        {isAvailable && (
                          <UserPlus className="w-3.5 h-3.5 text-slate-400 hover:text-[#8164AD]" />
                        )}
                      </div>

                      {/* Short Patient Name for staff grid scanning */}
                      {(isBooked || isSkipped || isCompleted) && (t.patientName || t.patient?.name) && (
                        <div className={`mt-1 text-[11px] font-bold truncate max-w-full leading-tight ${
                          isCompleted ? 'text-white' : isSkipped ? 'text-amber-950' : 'text-blue-950'
                        }`}>
                          {t.patientName || t.patient?.name}
                        </div>
                      )}

                      {/* Walk-in Badge */}
                      {t.walkIn && (
                        <div className="mt-1">
                          <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-blue-800 text-white">
                            Walk-in
                          </span>
                        </div>
                      )}

                      {/* Estimated Time */}
                      <div className="mt-1.5 space-y-0.5">
                        <div
                          className={`text-[11px] font-mono leading-tight ${
                            isBooked
                              ? 'text-blue-900 font-semibold'
                              : isSkipped
                              ? 'text-amber-950 font-semibold'
                              : isCompleted || isCancelled
                              ? 'text-white/90'
                              : 'text-slate-600'
                          }`}
                        >
                          {t.estimatedClockTime || '~10:00 AM'}
                        </div>

                        <div
                          className={`text-[10px] ${
                            isBooked
                              ? 'text-blue-800'
                              : isSkipped
                              ? 'text-amber-900'
                              : isCompleted || isCancelled
                              ? 'text-white/80'
                              : 'text-slate-400'
                          }`}
                        >
                          {t.mayOverflow ? (
                            <span className="text-amber-900 font-bold bg-amber-200 px-1 rounded text-[8px]">
                              May overflow
                            </span>
                          ) : t.peopleAhead !== undefined ? (
                            `${t.peopleAhead} ahead`
                          ) : (
                            '0 ahead'
                          )}
                        </div>
                      </div>

                      {/* Status Label */}
                      <div className="mt-2 pt-1 border-t border-black/5 text-[9px] uppercase font-extrabold tracking-wider">
                        {isBooked ? (
                          <span className="text-blue-900 underline">Booked (Click)</span>
                        ) : isSkipped ? (
                          <span className="text-amber-950 underline">Skipped (Click)</span>
                        ) : isCompleted ? (
                          <span className="text-white underline">Completed (Click)</span>
                        ) : isCancelled ? (
                          <span className="text-white underline">Cancelled (Click)</span>
                        ) : (
                          <span className="text-[#8164AD]">+ Book Walk-in</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* MODAL 1: WALK-IN BOOKING MODAL (CLICKING AVAILABLE TOKEN) */}
        {/* ========================================================= */}
        {walkInModalToken && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-[#D5C3EE] shadow-2xl space-y-5 animate-fadeIn">
              <div className="flex items-center justify-between pb-3 border-b border-[#E6DAF6]">
                <div className="flex items-center space-x-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-white border-2 border-[#8164AD] text-[#8164AD] flex items-center justify-center font-black text-base shadow-xs">
                    #{walkInModalToken.number}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base">
                      Book Walk-in Patient (Token #{walkInModalToken.number})
                    </h3>
                    <p className="text-xs text-slate-500">
                      Slot: {walkInModalToken.slot || selectedSlot} • No citizen account required
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setWalkInModalToken(null)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleWalkInSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Patient Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Reddy"
                    value={walkInForm.patientName}
                    onChange={(e) => setWalkInForm({ ...walkInForm, patientName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#8164AD] focus:ring-2 focus:ring-[#D5C3EE] text-xs text-slate-900 font-medium outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Patient Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9876543210"
                    value={walkInForm.phone}
                    onChange={(e) => setWalkInForm({ ...walkInForm, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#8164AD] focus:ring-2 focus:ring-[#D5C3EE] text-xs text-slate-900 font-medium outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Age <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="120"
                      required
                      placeholder="e.g. 42"
                      value={walkInForm.age}
                      onChange={(e) => setWalkInForm({ ...walkInForm, age: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#8164AD] focus:ring-2 focus:ring-[#D5C3EE] text-xs text-slate-900 font-medium outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Gender
                    </label>
                    <select
                      value={walkInForm.gender}
                      onChange={(e) => setWalkInForm({ ...walkInForm, gender: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#8164AD] focus:ring-2 focus:ring-[#D5C3EE] text-xs text-slate-900 font-medium outline-none bg-white"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 flex items-center space-x-3">
                  <button
                    type="submit"
                    disabled={walkInLoading}
                    id="submit-walkin-btn"
                    className="flex-1 py-3 px-4 rounded-xl bg-[#8164AD] hover:bg-[#6A4C97] text-white font-bold text-xs shadow-md shadow-[#8164AD]/25 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    {walkInLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <UserPlus className="w-4 h-4" />
                    )}
                    <span>Confirm Walk-in Booking</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWalkInModalToken(null)}
                    disabled={walkInLoading}
                    className="py-3 px-4 rounded-xl border border-slate-300 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODAL 2: PATIENT DETAILS & ACTION MODAL (UNIFIED) */}
        {/* ========================================================= */}
        {tokenModalData && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
            <div
              id="staff-patient-details-modal"
              className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 border border-[#D5C3EE] shadow-2xl space-y-4 animate-fadeIn"
            >
              {/* Modal Top Bar */}
              <div className="flex items-center justify-between pb-3 border-b border-[#E6DAF6]">
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-lg shadow-xs ${
                      tokenModalData.status === 'booked'
                        ? 'bg-[#BFDBFE] text-blue-950 border border-blue-400'
                        : tokenModalData.status === 'skipped'
                        ? 'bg-amber-400 text-amber-950 border border-amber-500'
                        : tokenModalData.status === 'completed'
                        ? 'bg-emerald-500 text-white border border-emerald-600'
                        : 'bg-rose-500 text-white border border-rose-600'
                    }`}
                  >
                    #{tokenModalData.number}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base">
                      Token #{tokenModalData.number}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Slot: {tokenModalData.slot || selectedSlot} • Status:{' '}
                      <span className="font-bold capitalize">{tokenModalData.status}</span>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setTokenModalData(null)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Patient Details Card (FIRST in modal) */}
              <div
                className="bg-[#FAF7FD] p-4 sm:p-5 rounded-2xl border border-[#D5C3EE] space-y-3.5 text-xs shadow-xs"
                id="patient-details-card"
              >
                <div className="flex items-center justify-between pb-2 border-b border-[#E6DAF6]">
                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Patient details
                    </span>
                    {tokenModalLoading && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#8164AD]" />
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* Walk-in or Online Badge */}
                    <span
                      id="token-type-badge"
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${
                        tokenModalData.walkIn
                          ? 'bg-blue-100 text-blue-800 border-blue-300'
                          : 'bg-purple-100 text-purple-800 border-purple-300'
                      }`}
                    >
                      {tokenModalData.walkIn ? 'Walk-in' : 'Online'}
                    </span>

                    {/* Status Badge */}
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${
                        tokenModalData.status === 'booked'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : tokenModalData.status === 'skipped'
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : tokenModalData.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-rose-100 text-rose-800 border-rose-300'
                      }`}
                    >
                      {tokenModalData.status}
                    </span>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <span className="text-slate-500 block text-[11px] mb-0.5 font-medium">Name:</span>
                    <span id="patient-name-val" className="font-bold text-slate-900 text-sm block">
                      {tokenModalData.patient?.name || 'Citizen'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px] mb-0.5 font-medium">Phone:</span>
                    {tokenModalData.patient?.phone ? (
                      <a
                        id="patient-phone-link"
                        href={`tel:${tokenModalData.patient.phone}`}
                        className="inline-flex items-center space-x-1.5 text-[#8164AD] hover:text-[#6A4C97] font-bold text-xs underline py-0.5"
                        title="Tap to call patient"
                      >
                        <Phone className="w-3.5 h-3.5 shrink-0 text-[#8164AD]" />
                        <span>{tokenModalData.patient.phone}</span>
                      </a>
                    ) : (
                      <span className="text-slate-400 font-medium">Not provided</span>
                    )}
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px] mb-0.5 font-medium">Age:</span>
                    <span id="patient-age-val" className="font-semibold text-slate-800">
                      {tokenModalData.patient?.age !== null && tokenModalData.patient?.age !== undefined
                        ? `${tokenModalData.patient.age} yrs`
                        : 'N/A'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px] mb-0.5 font-medium">Gender:</span>
                    <span id="patient-gender-val" className="font-semibold text-slate-800">
                      {tokenModalData.patient?.gender || 'N/A'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px] mb-0.5 font-medium">Token Number:</span>
                    <span className="font-bold text-slate-900">
                      #{tokenModalData.number}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px] mb-0.5 font-medium">Slot:</span>
                    <span className="font-semibold text-slate-800">
                      {tokenModalData.slot || selectedSlot}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px] mb-0.5 font-medium">Estimated Time:</span>
                    <span className="font-bold text-[#8164AD]">
                      {tokenModalData.estimatedTime || tokenModalData.estimatedClockTime || '~10:00 AM'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px] mb-0.5 font-medium">Booked At:</span>
                    <span className="font-medium text-slate-700">
                      {tokenModalData.bookedTime || tokenModalData.bookedAt
                        ? new Date(tokenModalData.bookedTime || tokenModalData.bookedAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Earlier'}
                    </span>
                  </div>
                </div>

                {tokenModalData.skipReason && (
                  <div className="pt-2 border-t border-[#E6DAF6] text-amber-900 text-[11px]">
                    <span className="font-bold">Skip Reason: </span>
                    <span className="italic">{tokenModalData.skipReason}</span>
                  </div>
                )}
              </div>

              {/* ACTION BUTTONS BELOW PATIENT DETAILS CARD */}
              {tokenModalData.status === 'booked' && (
                <div className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Skip Reason (Optional, e.g. Patient not present)
                    </label>
                    <input
                      type="text"
                      placeholder="Patient not present at counter"
                      value={skipReason}
                      onChange={(e) => setSkipReason(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:border-[#8164AD] text-xs text-slate-800 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={handleMarkCompleted}
                      disabled={actionLoading}
                      id="staff-modal-complete-btn"
                      className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/25 transition-all flex flex-col items-center justify-center space-y-1 disabled:opacity-50"
                    >
                      {actionLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      <span>Mark Completed</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSkipToken}
                      disabled={actionLoading}
                      id="staff-modal-skip-btn"
                      className="py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-bold text-xs shadow-md shadow-amber-500/25 transition-all flex flex-col items-center justify-center space-y-1 disabled:opacity-50"
                    >
                      {actionLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <FastForward className="w-4 h-4" />
                      )}
                      <span>Skip</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCancelToken(tokenModalData)}
                      disabled={actionLoading}
                      id="staff-modal-cancel-btn"
                      className="py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/25 transition-all flex flex-col items-center justify-center space-y-1 disabled:opacity-50"
                    >
                      {actionLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <XCircle className="w-4 h-4" />
                      )}
                      <span>Cancel</span>
                    </button>
                  </div>
                </div>
              )}

              {tokenModalData.status === 'skipped' && (
                <div className="space-y-3 pt-1">
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                    💡 This token is currently skipped. You can recall this patient back into the active queue or cancel the token.
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={handleRecallToken}
                      disabled={actionLoading}
                      id="staff-recall-token-btn"
                      className="py-3 px-4 rounded-xl bg-[#8164AD] hover:bg-[#6A4C97] text-white font-bold text-xs shadow-md shadow-[#8164AD]/25 transition-all flex items-center justify-center space-x-1.5 disabled:opacity-50"
                    >
                      {actionLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RotateCcw className="w-4 h-4" />
                      )}
                      <span>Recall to Queue</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCancelToken(tokenModalData)}
                      disabled={actionLoading}
                      id="staff-cancel-skipped-btn"
                      className="py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/25 transition-all flex items-center justify-center space-x-1.5 disabled:opacity-50"
                    >
                      {actionLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <XCircle className="w-4 h-4" />
                      )}
                      <span>Cancel Token</span>
                    </button>
                  </div>
                </div>
              )}

              {(tokenModalData.status === 'completed' || tokenModalData.status === 'cancelled') && (
                <div className="space-y-3 pt-1">
                  <div
                    className={`p-3 rounded-xl border text-xs flex items-center space-x-2 ${
                      tokenModalData.status === 'completed'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}
                  >
                    {tokenModalData.status === 'completed' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span>
                      {tokenModalData.status === 'completed'
                        ? `Consultation completed at ${
                            tokenModalData.completedAt
                              ? new Date(tokenModalData.completedAt).toLocaleTimeString()
                              : 'earlier'
                          }. (Read-only)`
                        : `This token was cancelled. (Read-only)`}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setTokenModalData(null)}
                    className="w-full py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-all"
                  >
                    Close
                  </button>
                </div>
              )}

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setTokenModalData(null)}
                  className="text-xs font-semibold text-slate-400 hover:text-slate-600"
                >
                  Close & Return to Grid
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default StaffDashboard;
