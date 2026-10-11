import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Breadcrumbs from '../../components/Breadcrumbs';
import ConfirmModal from '../../components/ConfirmModal';
import api from '../../services/api';
import {
  Ticket,
  Calendar,
  Clock,
  Users,
  MapPin,
  XCircle,
  ArrowRight,
  RefreshCw,
  PlusCircle,
  UserCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';

const MyTokensPage = () => {
  const navigate = useNavigate();
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Cancel Modal State
  const [tokenToCancel, setTokenToCancel] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  const fetchMyTokens = useCallback(async (showSilent = false) => {
    if (!showSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await api.get('/my/tokens');
      if (res.data?.success) {
        setTokens(res.data.tokens || []);
      }
    } catch (err) {
      console.error('Failed to load user tokens:', err);
      toast.error('Could not load your tokens.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMyTokens();
  }, [fetchMyTokens]);

  const handleConfirmCancel = async () => {
    if (!tokenToCancel) return;

    setCancelLoading(true);
    try {
      const res = await api.post(`/tokens/${tokenToCancel._id}/cancel`);

      if (res.data?.success) {
        toast.success(res.data.message || `Token #${tokenToCancel.number} cancelled.`);
        setTokenToCancel(null);
        await fetchMyTokens(true);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to cancel token.');
      setTokenToCancel(null);
    } finally {
      setCancelLoading(false);
    }
  };

  const activeTokens = tokens.filter((t) => t.status === 'booked');
  const pastTokens = tokens.filter((t) => t.status !== 'booked');

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fcfaff] via-[#f4ecfb] to-[#e9ddf6] text-slate-800 flex flex-col selection:bg-[#B19BD6] selection:text-white">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
        {/* Breadcrumbs */}
        <Breadcrumbs items={[{ label: 'My Booked Tokens' }]} onBack={() => navigate('/')} />

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              My Queue Tokens & Reservations
            </h1>
            <p className="text-xs text-slate-600 mt-1">
              Track live queue progress, estimated consultation times, and manage your booked slots
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => fetchMyTokens(true)}
              disabled={refreshing}
              className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-white hover:bg-[#FAF7FD] text-slate-700 border border-[#D5C3EE] text-xs font-semibold transition-all disabled:opacity-50 shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#8164AD]' : ''}`} />
              <span>{refreshing ? 'Refreshing...' : 'Refresh Status'}</span>
            </button>

            <Link
              to="/book"
              id="book-new-token-btn"
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-[#8164AD] hover:bg-[#6A4C97] text-white text-xs font-semibold shadow-md shadow-[#8164AD]/25 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Book New Token</span>
            </Link>
          </div>
        </div>

        {loading ? (
          /* Skeletons */
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white/80 rounded-2xl p-6 border border-[#E6DAF6] animate-pulse space-y-4">
                <div className="w-1/3 h-6 bg-[#F3ECFB] rounded"></div>
                <div className="w-1/2 h-4 bg-[#F3ECFB] rounded"></div>
              </div>
            ))}
          </div>
        ) : tokens.length === 0 ? (
          /* Empty State */
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-12 border border-[#D5C3EE] text-center max-w-lg mx-auto space-y-4 my-12 shadow-lg">
            <div className="w-16 h-16 rounded-2xl bg-[#F3ECFB] border border-[#D5C3EE] flex items-center justify-center text-[#8164AD] mx-auto">
              <Ticket className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">No tokens reserved yet</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              You haven't reserved any queue tokens. Explore hospitals or banks across Guntur to book your first slot!
            </p>
            <div className="pt-2">
              <Link
                to="/book"
                className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-[#8164AD] hover:bg-[#6A4C97] text-white text-xs font-semibold shadow-md shadow-[#8164AD]/25 transition-all"
              >
                <span>Reserve a Token Now</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Active Booked Tokens Section */}
            {activeTokens.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#8164AD] animate-pulse"></span>
                  <h2 className="text-base font-bold text-slate-900">Active Queue Tokens</h2>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#F3ECFB] text-[#6A4C97] border border-[#D5C3EE]">
                    {activeTokens.length} Active
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {activeTokens.map((token) => (
                    <div
                      key={token._id}
                      className="bg-white/95 backdrop-blur-xl rounded-2xl p-6 border-2 border-[#D5C3EE] hover:border-[#B19BD6] shadow-md shadow-[#53377F]/5 relative overflow-hidden flex flex-col justify-between"
                    >
                      <div className="space-y-4">
                        {/* Token Header */}
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#F3ECFB] text-[#6A4C97] border border-[#D5C3EE]">
                                Status: Booked
                              </span>
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                                Slot: {token.slot || (token.number <= 25 ? 'Morning' : token.number <= 50 ? 'Afternoon' : 'Evening')}
                              </span>
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mt-1.5">
                              {token.department?.place?.name || 'Medical Facility'}
                            </h3>
                            <p className="text-xs text-slate-500">
                              Department: {token.department?.name || 'General OPD'}
                            </p>
                          </div>

                          {/* Prominent Token Number Box */}
                          <div className="px-4 py-2.5 rounded-2xl bg-[#BFDBFE] text-blue-950 border-2 border-blue-400 text-center shadow-md">
                            <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75">
                              TOKEN
                            </span>
                            <span className="text-2xl font-black leading-none">#{token.number}</span>
                          </div>
                        </div>

                        {/* Live Telemetry Info */}
                        <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-[#FAF7FD] border border-[#D5C3EE] text-xs">
                          <div className="space-y-0.5">
                            <span className="text-[11px] text-slate-500 flex items-center gap-1">
                              <Users className="w-3.5 h-3.5 text-[#8164AD]" />
                              <span>Queue Ahead</span>
                            </span>
                            <p className="font-bold text-slate-900 text-sm">
                              {token.peopleAhead !== undefined ? `${token.peopleAhead} ahead` : '0 ahead'}
                            </p>
                          </div>

                          <div className="space-y-0.5">
                            <span className="text-[11px] text-slate-500 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-[#8164AD]" />
                              <span>Estimated Time</span>
                            </span>
                            <p className="font-bold text-[#8164AD] text-sm">
                              {token.estimatedClockTime || '~10:30 AM'}
                            </p>
                          </div>
                        </div>

                        {/* Date & Address */}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>Date: {token.date}</span>
                          </span>
                          <span>&bull;</span>
                          <span className="flex items-center gap-1 truncate max-w-[220px]">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{token.department?.place?.address || 'Guntur, Andhra Pradesh'}</span>
                          </span>
                        </div>

                        {/* User's Own Booking Details */}
                        {token.patient && (token.patient.name || token.patient.phone || token.patient.age !== undefined) && (
                          <div className="p-3.5 rounded-xl bg-[#FAF7FD] border border-[#D5C3EE] space-y-2 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6A4C97] flex items-center gap-1.5">
                                <UserCheck className="w-3.5 h-3.5 text-[#8164AD]" />
                                <span>Your Booking Details</span>
                              </span>
                              <span className="text-[10px] text-slate-500">Shared with staff for visit</span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-0.5 text-slate-700">
                              <div>
                                <span className="text-[10px] text-slate-400 block font-medium">Patient Name</span>
                                <span className="font-semibold text-slate-900 truncate block">{token.patient.name || '—'}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-400 block font-medium">Contact Phone</span>
                                <span className="font-semibold text-slate-900 block">{token.patient.phone || '—'}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-400 block font-medium">Age</span>
                                <span className="font-semibold text-slate-900 block">
                                  {token.patient.age !== undefined && token.patient.age !== null ? `${token.patient.age} yrs` : '—'}
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-400 block font-medium">Gender</span>
                                <span className="font-semibold text-slate-900 capitalize block">{token.patient.gender || '—'}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Cancel Button */}
                      <div className="mt-6 pt-4 border-t border-[#E6DAF6] flex items-center justify-between">
                        <span className="text-[11px] text-slate-500">
                          Booked on: {new Date(token.bookedAt || token.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>

                        <button
                          onClick={() => setTokenToCancel(token)}
                          id={`cancel-token-btn-${token.number}`}
                          className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 border border-rose-200 text-xs font-semibold transition-all flex items-center space-x-1.5"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Cancel Token</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Past Tokens Section (Completed / Cancelled) */}
            {pastTokens.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-[#D5C3EE]">
                <h2 className="text-base font-bold text-slate-800">Past Token History</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pastTokens.map((token) => (
                    <div
                      key={token._id}
                      className="bg-white/80 backdrop-blur-md rounded-2xl p-5 border border-[#D5C3EE] opacity-85 hover:opacity-100 transition-opacity space-y-3 shadow-xs"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <span
                              className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                                token.status === 'completed'
                                  ? 'bg-green-100 text-green-800 border border-green-300'
                                  : 'bg-red-100 text-red-800 border border-red-300'
                              }`}
                            >
                              {token.status}
                            </span>
                            <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                              {token.slot || (token.number <= 25 ? 'Morning' : token.number <= 50 ? 'Afternoon' : 'Evening')}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-slate-900 mt-1">
                            {token.department?.place?.name || 'Facility'}
                          </h4>
                          <p className="text-[11px] text-slate-500">{token.department?.name}</p>
                        </div>

                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                            token.status === 'completed'
                              ? 'bg-[#22C55E] text-white'
                              : 'bg-[#EF4444] text-white'
                          }`}
                        >
                          #{token.number}
                        </div>
                      </div>

                      {token.patient && (token.patient.name || token.patient.age !== undefined) && (
                        <div className="text-[11px] bg-[#FAF7FD] rounded-xl p-2.5 border border-[#E6DAF6] text-slate-700 flex flex-wrap items-center justify-between gap-1">
                          <div>
                            <span className="text-[10px] text-slate-400 block font-medium">Patient</span>
                            <span className="font-semibold text-slate-900">{token.patient.name}</span>
                            {token.patient.age !== undefined && token.patient.age !== null && (
                              <span className="text-slate-600"> • {token.patient.age} yrs</span>
                            )}
                            {token.patient.gender && (
                              <span className="text-slate-600 capitalize"> • {token.patient.gender}</span>
                            )}
                          </div>
                          {token.patient.phone && (
                            <span className="text-[10px] text-slate-500 font-mono">{token.patient.phone}</span>
                          )}
                        </div>
                      )}

                      <div className="text-[11px] text-slate-500 pt-2 border-t border-[#E6DAF6] flex justify-between">
                        <span>Date: {token.date}</span>
                        <span>{token.status === 'completed' ? 'Served' : 'Cancelled by user'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* CONFIRM CANCEL MODAL */}
        <ConfirmModal
          isOpen={Boolean(tokenToCancel)}
          title={`Cancel Token #${tokenToCancel?.number}?`}
          message={`Are you sure you want to cancel this booking? This token will be marked as cancelled and cannot be rebooked for this department today.`}
          confirmText="Yes, Cancel Token"
          cancelText="Keep Token"
          confirmVariant="danger"
          loading={cancelLoading}
          details={[
            {
              label: 'Facility',
              value: tokenToCancel?.department?.place?.name || 'Medical Facility',
            },
            { label: 'Department', value: tokenToCancel?.department?.name || 'OPD' },
            { label: 'Token Number', value: `#${tokenToCancel?.number}` },
            { label: 'Date', value: tokenToCancel?.date },
          ]}
          onConfirm={handleConfirmCancel}
          onCancel={() => setTokenToCancel(null)}
        />
      </main>
    </div>
  );
};

export default MyTokensPage;
