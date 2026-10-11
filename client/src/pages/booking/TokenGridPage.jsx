import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Breadcrumbs from '../../components/Breadcrumbs';
import ConfirmModal from '../../components/ConfirmModal';
import LiveTime from '../../components/LiveTime';
import useLiveEstimate from '../../hooks/useLiveEstimate';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { getSocket } from '../../services/socket';
import {
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Star,
  RefreshCw,
  Building2,
  Stethoscope,
  Volume2,
  Play,
  Pause,
  Megaphone,
  ShieldAlert,
  Coffee,
  Sun,
  Sunset,
  Moon,
  ChevronRight,
  Info,
  Loader2,
  Check,
} from 'lucide-react';
import toast from 'react-hot-toast';

const TokenGridPage = () => {
  const { deptId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, role } = useAuth();

  const placeName = searchParams.get('placeName') || 'Medical Facility';
  const deptName = searchParams.get('deptName') || 'Department';

  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);

  // Department and Slot States
  const [department, setDepartment] = useState(null);
  const [allTokens, setAllTokens] = useState([]);
  const [slotSummaries, setSlotSummaries] = useState([]);
  const [breaks, setBreaks] = useState([]);
  const [currentBreak, setCurrentBreak] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState('Morning'); // 'Morning' | 'Afternoon' | 'Evening'
  const [serverNow, setServerNow] = useState(null);

  // Queue state
  const [nowServing, setNowServing] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // User Token States
  const [userHasActiveToken, setUserHasActiveToken] = useState(false);
  const [userActiveTokenNumber, setUserActiveTokenNumber] = useState(null);
  const approachingToastShownRef = useRef(false);
  const nextToastShownRef = useRef(false);

  // Booking Modal State
  const [selectedTokenForBooking, setSelectedTokenForBooking] = useState(null);
  const [bookingLoading, setBookingLoading] = useState(false);

  // 1. Fetch Tokens and Slot Summaries via HTTP
  const fetchTokens = useCallback(
    async (showSilentRefresh = false) => {
      if (!showSilentRefresh) setLoading(true);
      else setRefreshing(true);

      try {
        const res = await api.get(`/departments/${deptId}/tokens`, {
          params: { date: selectedDate },
        });

        if (res.data?.success) {
          setDepartment(res.data.department);
          const rawTokens = res.data.allTokens || res.data.tokens || [];
          setAllTokens(rawTokens);
          setSlotSummaries(res.data.slotSummaries || []);
          setBreaks(res.data.breaks || []);
          setCurrentBreak(res.data.currentBreak || null);
          setNowServing(res.data.nowServingToken || null);
          setIsPaused(Boolean(res.data.isPaused));
          setUserHasActiveToken(res.data.userHasActiveToken);
          setUserActiveTokenNumber(res.data.userActiveTokenNumber);
          if (res.data.serverNow) setServerNow(res.data.serverNow);
        }
      } catch (err) {
        console.error('Failed to load department tokens:', err);
        toast.error('Could not load tokens for this date.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [deptId, selectedDate]
  );

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  // Tab Visibility change: pause ticking and re-fetch when tab becomes visible again
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchTokens(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [fetchTokens]);

  // 2. Real-time Socket.IO Connection & Events
  useEffect(() => {
    const socket = getSocket();

    socket.emit('join:department', { departmentId: deptId, date: selectedDate });

    // Handle single token update
    const handleTokenUpdated = ({ departmentId, date, token, serverNow: sNow }) => {
      if (departmentId?.toString() === deptId?.toString() && date === selectedDate) {
        if (sNow || token?.serverNow) setServerNow(sNow || token.serverNow);
        setAllTokens((prev) =>
          prev.map((t) => (t._id === token._id ? { ...t, ...token } : t))
        );

        // Check if user's own token was skipped
        const myId = user?.id || user?._id;
        const tokenUserId = token.user?._id || token.user;
        if (myId && tokenUserId && myId.toString() === tokenUserId.toString()) {
          if (token.status === 'skipped') {
            toast.error('⚠️ Your token was skipped. Please contact the counter.', {
              duration: 10000,
              icon: '⚠️',
              style: {
                background: '#78350f',
                color: '#fef3c7',
                border: '2px solid #d97706',
                fontWeight: 'bold',
              },
            });
          }
        }
      }
    };

    // Handle token skipped specifically
    const handleTokenSkipped = ({ departmentId, date, token }) => {
      if (departmentId?.toString() === deptId?.toString() && date === selectedDate) {
        const myId = user?.id || user?._id;
        const tokenUserId = token?.user?._id || token?.user;
        if (myId && tokenUserId && myId.toString() === tokenUserId.toString()) {
          toast.error('⚠️ Your token was skipped. Please contact the counter.', {
            duration: 10000,
            icon: '⚠️',
            style: {
              background: '#78350f',
              color: '#fef3c7',
              border: '2px solid #d97706',
              fontWeight: 'bold',
            },
          });
        }
      }
    };

    // Handle batch queue synchronization
    const handleBatchTokens = ({ departmentId, date, tokens: updatedTokens, nowServingToken: serverNowServing, isPaused: serverPaused, serverNow: sNow }) => {
      if (departmentId?.toString() === deptId?.toString() && date === selectedDate) {
        setAllTokens(updatedTokens);
        if (sNow) setServerNow(sNow);
        if (serverNowServing !== undefined) setNowServing(serverNowServing);
        if (serverPaused !== undefined) setIsPaused(Boolean(serverPaused));
      }
    };

    // Handle "queue:nowServing"
    const handleNowServing = ({ departmentId, date, tokenNumber }) => {
      if (departmentId?.toString() === deptId?.toString() && date === selectedDate) {
        setNowServing(tokenNumber);
        toast(`📢 Now Serving Token #${tokenNumber}!`, {
          icon: '🛎️',
          duration: 5000,
          style: { background: '#1e1b4b', color: '#c7d2fe', border: '1px solid #4338ca' },
        });
      }
    };

    // Handle "counter:paused"
    const handleCounterPaused = ({ departmentId, isPaused: pausedState }) => {
      if (departmentId?.toString() === deptId?.toString()) {
        setIsPaused(pausedState);
        if (pausedState) {
          toast('⏸️ Counter operations temporarily paused', { icon: 'ℹ️' });
        } else {
          toast.success('▶️ Counter operations resumed!');
        }
      }
    };

    socket.on('token:updated', handleTokenUpdated);
    socket.on('token:skipped', handleTokenSkipped);
    socket.on('tokens:batch', handleBatchTokens);
    socket.on('queue:nowServing', handleNowServing);
    socket.on('counter:paused', handleCounterPaused);

    return () => {
      socket.emit('leave:department', { departmentId: deptId, date: selectedDate });
      socket.off('token:updated', handleTokenUpdated);
      socket.off('token:skipped', handleTokenSkipped);
      socket.off('tokens:batch', handleBatchTokens);
      socket.off('queue:nowServing', handleNowServing);
      socket.off('counter:paused', handleCounterPaused);
    };
  }, [deptId, selectedDate, user]);

  // 3. Approaching & Next Token Toasts
  useEffect(() => {
    if (userHasActiveToken && userActiveTokenNumber && nowServing) {
      const positionsDiff = userActiveTokenNumber - nowServing;
      if (positionsDiff > 0 && positionsDiff <= 3 && !approachingToastShownRef.current) {
        approachingToastShownRef.current = true;
        toast(
          `🔔 Your token (#${userActiveTokenNumber}) is approaching! You are ${positionsDiff} position(s) away from the counter.`,
          {
            icon: '⚡',
            duration: 8000,
            style: {
              background: '#042f2e',
              color: '#5eead4',
              border: '1px solid #0f766e',
              fontWeight: '600',
            },
          }
        );
      } else if (positionsDiff === 0 && !nextToastShownRef.current) {
        nextToastShownRef.current = true;
        toast(
          `🛎️ Your token (#${userActiveTokenNumber}) is NEXT! Please proceed to the counter.`,
          {
            icon: '🛎️',
            duration: 10000,
            style: {
              background: '#1e1b4b',
              color: '#c7d2fe',
              border: '2px solid #6366f1',
              fontWeight: 'bold',
            },
          }
        );
      }
    }
  }, [nowServing, userHasActiveToken, userActiveTokenNumber]);

  // Click on tile handler
  const handleTileClick = (token) => {
    if (role === 'staff') {
      toast('Please use the Staff Dashboard to manage and dispatch tokens.', { icon: '🔒' });
      return;
    }

    if (!user) {
      toast('Please sign in as a Citizen to reserve a token', { icon: '🔐' });
      navigate('/auth/user?mode=signin');
      return;
    }

    if (token.status === 'booked') {
      if (token.isMyToken) {
        toast.success(`This is your booked Token #${token.number}! View details in My Tokens.`);
      } else {
        toast('This token is already booked by another citizen.', { icon: '🔒' });
      }
      return;
    }

    if (token.status === 'completed') {
      toast('This consultation token has already been completed.', { icon: '✅' });
      return;
    }

    if (token.status === 'cancelled') {
      toast('This slot was cancelled and cannot be reserved today.', { icon: '🚫' });
      return;
    }

    if (token.status === 'skipped') {
      toast(`Token #${token.number} was skipped by counter staff. Skipped tokens cannot be reassigned.`, { icon: '⚠️' });
      return;
    }

    if (token.status === 'available') {
      // Check if slot has already ended for today
      const currentSlotSummary = slotSummaries.find((s) => s.name === token.slot);
      if (selectedDate === todayStr && currentSlotSummary?.isEnded) {
        toast.error(`The ${token.slot} slot has already ended. Users cannot book tokens in an ended slot.`);
        return;
      }

      if (userHasActiveToken) {
        toast.error(
          `You already hold active Token #${userActiveTokenNumber} for this department today. You can only hold 1 active token per department per day.`
        );
        return;
      }

      setSelectedTokenForBooking(token);
    }
  };

  // Confirm citizen booking
  const handleConfirmBooking = async () => {
    if (!selectedTokenForBooking) return;

    setBookingLoading(true);
    try {
      const res = await api.post(`/tokens/${selectedTokenForBooking._id}/book`);

      if (res.data?.success) {
        toast.success(res.data.message || `Token #${selectedTokenForBooking.number} booked successfully!`);
        setSelectedTokenForBooking(null);
        await fetchTokens(true);
      }
    } catch (error) {
      if (error.status === 409 || error.message?.includes('already') || error.message?.includes('Conflict')) {
        toast.error('Conflict: This token was just taken by another user! Refreshing available slots...');
      } else {
        toast.error(error.message || 'Failed to book token.');
      }
      setSelectedTokenForBooking(null);
      fetchTokens(true);
    } finally {
      setBookingLoading(false);
    }
  };

  // Filter tokens for the currently selected slot (25 tokens)
  const currentSlotTokens = allTokens.filter((t) => {
    if (t.slot) return t.slot === selectedSlot;
    if (selectedSlot === 'Morning') return t.number <= 25;
    if (selectedSlot === 'Afternoon') return t.number >= 26 && t.number <= 50;
    return t.number >= 51 && t.number <= 75;
  });

  // Date options
  const dateOptions = Array.from({ length: 5 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dateVal = d.toISOString().split('T')[0];
    const label =
      i === 0
        ? 'Today'
        : i === 1
        ? 'Tomorrow'
        : d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    return { val: dateVal, label };
  });

  // Slot definitions with icons and fallback values
  const defaultSlotDefs = [
    { name: 'Morning', icon: Sun, defaultTime: '09:00 AM - 12:30 PM', tokens: '1 - 25' },
    { name: 'Afternoon', icon: Sunset, defaultTime: '02:00 PM - 05:00 PM', tokens: '26 - 50' },
    { name: 'Evening', icon: Moon, defaultTime: '05:30 PM - 08:30 PM', tokens: '51 - 75' },
  ];

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fcfaff] via-[#f4ecfb] to-[#e9ddf6] text-slate-800 flex flex-col selection:bg-[#B19BD6] selection:text-white">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
        {/* Breadcrumbs */}
        <Breadcrumbs
          items={[
            { label: 'Category', path: '/book' },
            { label: 'Facilities', path: '/book/places' },
            {
              label: placeName,
              path: department?.place?._id ? `/book/places/${department.place._id}` : '/book/places',
            },
            { label: `${deptName} Token Slots` },
          ]}
          onBack={() => navigate(-1)}
        />

        {/* 1. DOCTOR ON BREAK LIVE BANNER */}
        {currentBreak?.onBreak && (
          <div className="bg-amber-500 text-white rounded-3xl p-5 shadow-lg border border-amber-600 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fadeIn">
            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white/20 text-white flex items-center justify-center shrink-0 border border-white/30">
                <Coffee className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-100 block">
                  Staff Intermission • {currentBreak.label || 'Doctor Break'}
                </span>
                <h3 className="text-lg font-black tracking-tight">
                  Doctor on break until {currentBreak.endTime ? currentBreak.endTime : 'intermission ends'}
                </h3>
                <p className="text-xs text-amber-100">
                  Counter calling is paused. You can still reserve upcoming slot tokens below!
                </p>
              </div>
            </div>

            <div className="px-4 py-2 rounded-2xl bg-white/15 border border-white/25 text-xs font-semibold text-white">
              Counter Auto-Resumes at Break End
            </div>
          </div>
        )}

        {/* 2. PROMINENT LIVE "NOW SERVING" BANNER */}
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-5 border border-[#D5C3EE] flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center space-x-4 w-full sm:w-auto">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#8164AD] to-[#B19BD6] flex items-center justify-center text-white shadow-lg shadow-[#8164AD]/25 shrink-0">
              <Megaphone className="w-6 h-6" />
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Live Queue Broadcast
              </span>
              <div className="flex items-center space-x-3 mt-0.5">
                <span className="text-xl sm:text-2xl font-black text-slate-900">
                  Now Serving:
                </span>
                {nowServing ? (
                  <span className="px-3.5 py-1 rounded-xl bg-[#22C55E] text-white font-black text-lg sm:text-xl shadow-lg shadow-green-500/30 animate-pulse">
                    TOKEN #{nowServing}
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-xl bg-[#FAF7FD] border border-[#D5C3EE] text-slate-500 font-semibold text-sm">
                    Waiting for Counter
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Counter Status & Live Socket Badge */}
          <div className="flex items-center space-x-3 self-end sm:self-center">
            {isPaused ? (
              <span className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold">
                <Pause className="w-3.5 h-3.5" />
                <span>Counter Paused</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#F3ECFB] text-[#6A4C97] border border-[#D5C3EE] text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-[#8164AD] animate-ping"></span>
                <span>Counter Active</span>
              </span>
            )}

            <button
              onClick={() => fetchTokens(true)}
              disabled={refreshing}
              className="p-2 rounded-xl bg-white hover:bg-[#FAF7FD] text-slate-600 hover:text-slate-900 border border-[#D5C3EE] transition-colors shadow-xs"
              title="Refresh Queue"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#8164AD]' : ''}`} />
            </button>
          </div>
        </div>

        {/* Date Selector Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs text-slate-600 font-medium mr-2 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-[#8164AD]" />
            <span>Select Date:</span>
          </span>
          {dateOptions.map((opt) => (
            <button
              key={opt.val}
              onClick={() => setSelectedDate(opt.val)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                selectedDate === opt.val
                  ? 'bg-[#8164AD] text-white shadow-md shadow-[#8164AD]/25 ring-2 ring-[#B19BD6]'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-[#D5C3EE]'
              }`}
            >
              {opt.label} ({opt.val})
            </button>
          ))}
        </div>

        {/* User Active Token Alert */}
        {userHasActiveToken && (
          <div className="bg-amber-50/90 rounded-2xl p-4 border border-amber-300 flex items-start space-x-3 shadow-xs">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-700 shrink-0">
              <Star className="w-5 h-5 fill-amber-400" />
            </div>
            <div className="text-xs space-y-1">
              <h2 className="font-semibold text-amber-900 text-sm">
                You hold active Token #{userActiveTokenNumber} for this department today
              </h2>
              <p className="text-slate-700 leading-relaxed">
                Highlighted with gold border in the grid. You can track status or cancel from{' '}
                <button
                  onClick={() => navigate('/my-tokens')}
                  className="text-amber-700 underline font-semibold hover:text-amber-900"
                >
                  My Tokens page
                </button>
                .
              </p>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 3. 3-SLOT CARDS AND DOCTOR BREAK ROWS (CORE FEATURE) */}
        {/* ========================================================= */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8164AD]">
                Three 25-Token Shifts
              </span>
              <h2 className="text-xl font-extrabold text-slate-900">
                Select Consultation Slot
              </h2>
            </div>
            <span className="text-xs font-medium text-slate-500">
              Click a slot to view its 25 tokens
            </span>
          </div>

          <div className="space-y-3">
            {/* Slot 1: MORNING CARD */}
            {(() => {
              const summary = slotSummaries.find((s) => s.name === 'Morning') || {
                available: 25,
                status: 'Open',
                startTime: '09:00',
                endTime: '12:30',
              };
              const isSelected = selectedSlot === 'Morning';
              const isEnded = summary.status === 'Ended';
              const isFull = summary.status === 'Full';

              return (
                <div
                  onClick={() => setSelectedSlot('Morning')}
                  className={`p-5 rounded-3xl border-2 transition-all cursor-pointer bg-white/95 backdrop-blur-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm hover:shadow-md ${
                    isSelected
                      ? 'border-[#8164AD] ring-4 ring-[#D5C3EE]/50 shadow-md'
                      : 'border-[#E6DAF6] hover:border-[#B19BD6]'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shadow-xs ${
                        isSelected ? 'bg-[#8164AD] text-white' : 'bg-[#F3ECFB] text-[#8164AD]'
                      }`}
                    >
                      <Sun className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-black text-slate-900">Morning Slot</h3>
                        <span className="text-xs font-mono text-slate-500">Tokens 1 - 25</span>
                      </div>
                      <p className="text-xs font-semibold text-[#8164AD] mt-0.5 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>
                          {summary.startTime || '09:00'} - {summary.endTime || '12:30'}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="text-right">
                      <div className="text-sm font-extrabold text-slate-900">
                        {summary.available} / 25 left
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium">Available for booking</div>
                    </div>

                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold border ${
                        isEnded
                          ? 'bg-slate-100 text-slate-600 border-slate-300'
                          : isFull
                          ? 'bg-rose-100 text-rose-800 border-rose-300'
                          : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      }`}
                    >
                      {summary.status || 'Open'}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* BREAK ROW 1: DOCTOR LUNCH BREAK */}
            <div className="bg-[#FAF7FD] border border-dashed border-[#D5C3EE] rounded-2xl py-2 px-4 flex items-center justify-between text-xs text-[#6A4C97] font-semibold">
              <div className="flex items-center space-x-2">
                <Coffee className="w-4 h-4 text-[#8164AD]" />
                <span>
                  Doctor break: {lunchBreak.startTime} - {lunchBreak.endTime} ({lunchBreak.label || 'Lunch'})
                </span>
              </div>
              <span className="text-[11px] text-slate-400">Consultation Counter Paused</span>
            </div>

            {/* Slot 2: AFTERNOON CARD */}
            {(() => {
              const summary = slotSummaries.find((s) => s.name === 'Afternoon') || {
                available: 25,
                status: 'Open',
                startTime: '14:00',
                endTime: '17:00',
              };
              const isSelected = selectedSlot === 'Afternoon';
              const isEnded = summary.status === 'Ended';
              const isFull = summary.status === 'Full';

              return (
                <div
                  onClick={() => setSelectedSlot('Afternoon')}
                  className={`p-5 rounded-3xl border-2 transition-all cursor-pointer bg-white/95 backdrop-blur-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm hover:shadow-md ${
                    isSelected
                      ? 'border-[#8164AD] ring-4 ring-[#D5C3EE]/50 shadow-md'
                      : 'border-[#E6DAF6] hover:border-[#B19BD6]'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shadow-xs ${
                        isSelected ? 'bg-[#8164AD] text-white' : 'bg-[#F3ECFB] text-[#8164AD]'
                      }`}
                    >
                      <Sunset className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-black text-slate-900">Afternoon Slot</h3>
                        <span className="text-xs font-mono text-slate-500">Tokens 26 - 50</span>
                      </div>
                      <p className="text-xs font-semibold text-[#8164AD] mt-0.5 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>
                          {summary.startTime || '14:00'} - {summary.endTime || '17:00'}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="text-right">
                      <div className="text-sm font-extrabold text-slate-900">
                        {summary.available} / 25 left
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium">Available for booking</div>
                    </div>

                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold border ${
                        isEnded
                          ? 'bg-slate-100 text-slate-600 border-slate-300'
                          : isFull
                          ? 'bg-rose-100 text-rose-800 border-rose-300'
                          : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      }`}
                    >
                      {summary.status || 'Open'}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* BREAK ROW 2: DOCTOR TEA BREAK */}
            <div className="bg-[#FAF7FD] border border-dashed border-[#D5C3EE] rounded-2xl py-2 px-4 flex items-center justify-between text-xs text-[#6A4C97] font-semibold">
              <div className="flex items-center space-x-2">
                <Coffee className="w-4 h-4 text-[#8164AD]" />
                <span>
                  Doctor break: {teaBreak.startTime} - {teaBreak.endTime} ({teaBreak.label || 'Tea'})
                </span>
              </div>
              <span className="text-[11px] text-slate-400">Consultation Counter Paused</span>
            </div>

            {/* Slot 3: EVENING CARD */}
            {(() => {
              const summary = slotSummaries.find((s) => s.name === 'Evening') || {
                available: 25,
                status: 'Open',
                startTime: '17:30',
                endTime: '20:30',
              };
              const isSelected = selectedSlot === 'Evening';
              const isEnded = summary.status === 'Ended';
              const isFull = summary.status === 'Full';

              return (
                <div
                  onClick={() => setSelectedSlot('Evening')}
                  className={`p-5 rounded-3xl border-2 transition-all cursor-pointer bg-white/95 backdrop-blur-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm hover:shadow-md ${
                    isSelected
                      ? 'border-[#8164AD] ring-4 ring-[#D5C3EE]/50 shadow-md'
                      : 'border-[#E6DAF6] hover:border-[#B19BD6]'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shadow-xs ${
                        isSelected ? 'bg-[#8164AD] text-white' : 'bg-[#F3ECFB] text-[#8164AD]'
                      }`}
                    >
                      <Moon className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-black text-slate-900">Evening Slot</h3>
                        <span className="text-xs font-mono text-slate-500">Tokens 51 - 75</span>
                      </div>
                      <p className="text-xs font-semibold text-[#8164AD] mt-0.5 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>
                          {summary.startTime || '17:30'} - {summary.endTime || '20:30'}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="text-right">
                      <div className="text-sm font-extrabold text-slate-900">
                        {summary.available} / 25 left
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium">Available for booking</div>
                    </div>

                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold border ${
                        isEnded
                          ? 'bg-slate-100 text-slate-600 border-slate-300'
                          : isFull
                          ? 'bg-rose-100 text-rose-800 border-rose-300'
                          : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      }`}
                    >
                      {summary.status || 'Open'}
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* COLOR LEGEND - EXACT SPECIFICATION INCLUDING AMBER SKIPPED */}
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-4 sm:p-5 border border-[#D5C3EE] shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Colour Legend:
            </span>

            <div className="flex flex-wrap items-center gap-3 sm:gap-5 text-xs font-semibold">
              <div className="flex items-center space-x-1.5">
                <div className="w-4 h-4 rounded-md bg-white border-2 border-slate-300 shadow-sm"></div>
                <span className="text-slate-700">White = Available</span>
              </div>

              <div className="flex items-center space-x-1.5">
                <div className="w-4 h-4 rounded-md bg-[#BFDBFE] border-2 border-blue-400 shadow-sm"></div>
                <span className="text-blue-900">Light Blue = Booked</span>
              </div>

              <div className="flex items-center space-x-1.5">
                <div className="w-4 h-4 rounded-md bg-emerald-500 border-2 border-emerald-600 shadow-sm"></div>
                <span className="text-emerald-700">Green = Completed</span>
              </div>

              <div className="flex items-center space-x-1.5">
                <div className="w-4 h-4 rounded-md bg-rose-500 border-2 border-rose-600 shadow-sm"></div>
                <span className="text-rose-700">Red = Cancelled</span>
              </div>

              <div className="flex items-center space-x-1.5">
                <div className="w-4 h-4 rounded-md bg-amber-400 border-2 border-amber-500 shadow-sm"></div>
                <span className="text-amber-800">Amber = Skipped</span>
              </div>

              <div className="flex items-center space-x-1.5">
                <div className="w-4 h-4 rounded-md bg-[#BFDBFE] ring-2 ring-amber-400 border-2 border-amber-500 shadow-sm flex items-center justify-center">
                  <Star className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
                </div>
                <span className="text-amber-700">Your Token</span>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 4. 25-TOKEN GRID FOR SELECTED SLOT */}
        {/* ========================================================= */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>{selectedSlot} Slot Grid</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-[#F3ECFB] text-[#6A4C97] border border-[#D5C3EE]">
                25 Tokens
              </span>
            </h3>
            <span className="text-xs text-slate-500">
              {currentSlotTokens.filter((t) => t.status === 'available').length} tokens remaining in {selectedSlot}
            </span>
          </div>

          {loading ? (
            <div className="grid grid-cols-5 md:grid-cols-5 gap-3">
              {Array.from({ length: 25 }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-24 rounded-2xl bg-[#F3ECFB] border border-[#D5C3EE] animate-pulse"
                ></div>
              ))}
            </div>
          ) : currentSlotTokens.length === 0 ? (
            <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-10 border border-[#D5C3EE] text-center max-w-lg mx-auto space-y-3 shadow-md">
              <AlertCircle className="w-8 h-8 text-[#8164AD] mx-auto" />
              <h4 className="text-base font-bold text-slate-900">No tokens found for this slot</h4>
              <p className="text-xs text-slate-500">
                Please refresh or select another slot.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3" id="token-grid-container">
              {currentSlotTokens.map((token) => {
                let tileClass = '';

                if (token.status === 'available') {
                  tileClass =
                    'bg-white text-slate-900 border-2 border-slate-300 hover:border-[#8164AD] hover:shadow-lg hover:scale-105 cursor-pointer';
                } else if (token.status === 'booked') {
                  tileClass =
                    'bg-[#BFDBFE] text-blue-950 border-2 border-blue-400 cursor-not-allowed opacity-95 shadow-xs';
                } else if (token.status === 'completed') {
                  tileClass =
                    'bg-emerald-500 text-white border-2 border-emerald-600 cursor-not-allowed';
                } else if (token.status === 'cancelled') {
                  tileClass =
                    'bg-rose-500 text-white border-2 border-rose-600 cursor-not-allowed';
                } else if (token.status === 'skipped') {
                  tileClass =
                    'bg-amber-400 text-amber-950 border-2 border-amber-500 cursor-not-allowed font-bold';
                }

                const isMine = token.isMyToken;
                if (isMine) {
                  tileClass += ' ring-4 ring-amber-400 border-amber-500 shadow-lg shadow-amber-500/30 scale-105 z-10';
                }

                const isServingNow = nowServing === token.number;
                if (isServingNow) {
                  tileClass += ' ring-4 ring-emerald-400 animate-pulse';
                }

                return (
                  <button
                    key={token._id}
                    onClick={() => handleTileClick(token)}
                    tabIndex={0}
                    aria-label={`Token #${token.number}, status: ${token.status}`}
                    id={`token-tile-${token.number}`}
                    className={`h-24 rounded-2xl p-2.5 flex flex-col justify-between items-center text-center transition-all relative select-none focus:outline-none ${tileClass}`}
                  >
                    {isMine && (
                      <span className="absolute -top-2 -right-1 px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[8px] font-black uppercase tracking-wider shadow">
                        YOU
                      </span>
                    )}

                    {isServingNow && (
                      <span className="absolute -top-2 -left-1 px-1.5 py-0.5 rounded-full bg-emerald-500 text-white text-[8px] font-black uppercase tracking-wider shadow">
                        NOW
                      </span>
                    )}

                    {token.walkIn && (
                      <span className="absolute top-1 left-1 px-1 py-0.2 rounded bg-blue-700 text-white text-[7px] font-bold uppercase">
                        Walk-in
                      </span>
                    )}

                    {/* Bold Token Number */}
                    <span className="text-lg font-black tracking-tight leading-none mt-1">
                      #{token.number}
                    </span>

                    {/* Small Clock Time */}
                    <div className="text-[10px] font-bold leading-tight truncate max-w-full">
                      {token.estimatedClockTime}
                    </div>

                    {/* Queue Position and Overflow Indicator */}
                    <div className="text-[9px] font-medium leading-none opacity-90 flex items-center gap-1">
                      {token.mayOverflow ? (
                        <span className="text-[8px] font-bold text-amber-900 bg-amber-200/80 px-1 py-0.2 rounded">
                          May overflow
                        </span>
                      ) : (
                        <span>{token.peopleAhead} ahead</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <p className="text-center text-xs text-slate-500 pt-3">
            Viewing 25 tokens for {selectedSlot} on {selectedDate}. Synchronized live with counter counter.
          </p>
        </div>

        {/* 5. USER CONFIRM BOOKING MODAL */}
        <ConfirmModal
          isOpen={Boolean(selectedTokenForBooking)}
          title={`Confirm Token Reservation`}
          message={`Are you sure you want to reserve Token #${selectedTokenForBooking?.number}? This slot will be registered under your verified user profile.`}
          note="Your name, phone, age and gender will be shared with the hospital staff for this visit."
          confirmText="Yes, Book Token"
          cancelText="Cancel"
          loading={bookingLoading}
          details={[
            { label: 'Facility', value: placeName },
            { label: 'Department', value: deptName },
            { label: 'Slot', value: selectedTokenForBooking?.slot || selectedSlot },
            { label: 'Token Number', value: `#${selectedTokenForBooking?.number}` },
            { label: 'Date', value: selectedDate },
            {
              label: 'Estimated Clock Time',
              value: selectedTokenForBooking?.estimatedClockTime || '~10:00 AM',
            },
            {
              label: 'Queue Ahead (This Slot)',
              value: `${selectedTokenForBooking?.peopleAhead || 0} citizen(s) ahead`,
            },
          ]}
          onConfirm={handleConfirmBooking}
          onCancel={() => setSelectedTokenForBooking(null)}
        />
      </main>
    </div>
  );
};

export default TokenGridPage;
