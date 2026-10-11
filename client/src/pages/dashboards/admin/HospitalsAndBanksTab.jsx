import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Building2,
  Hospital,
  Landmark,
  Users,
  Layers,
  Search,
  ArrowLeft,
  Calendar,
  Clock,
  UserCheck,
  UserX,
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Sparkles,
  RefreshCw,
  Loader2,
  Eye,
  Stethoscope,
  Phone,
  Hash,
  ChevronRight,
  Shield,
  Zap,
} from 'lucide-react';
import api from '../../../services/api';
import { getSocket } from '../../../services/socket';
import toast from 'react-hot-toast';

const HospitalsAndBanksTab = ({ selectedPlaceIdProp, onSelectPlaceProp }) => {
  const navigate = useNavigate();
  const { id: routePlaceId } = useParams();

  // Active Place ID: either from route param, prop, or internal state
  const [currentPlaceId, setCurrentPlaceId] = useState(
    routePlaceId || selectedPlaceIdProp || null
  );

  useEffect(() => {
    if (routePlaceId) {
      setCurrentPlaceId(routePlaceId);
    } else if (selectedPlaceIdProp) {
      setCurrentPlaceId(selectedPlaceIdProp);
    }
  }, [routePlaceId, selectedPlaceIdProp]);

  // ==========================================================
  // LIST VIEW STATE
  // ==========================================================
  const [places, setPlaces] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const fetchPlacesOverview = useCallback(async () => {
    setListLoading(true);
    try {
      const res = await api.get('/admin/places/overview');
      if (res.data?.success) {
        setPlaces(res.data.places || []);
      }
    } catch (err) {
      console.error('Failed to load places overview:', err);
      toast.error('Could not load facilities list.');
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!currentPlaceId) {
      fetchPlacesOverview();
    }
  }, [currentPlaceId, fetchPlacesOverview]);

  // ==========================================================
  // DETAIL VIEW STATE
  // ==========================================================
  const [detailLoading, setDetailLoading] = useState(false);
  const [placeDetails, setPlaceDetails] = useState(null);
  const [activityLogs, setActivityLogs] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState('departments'); // 'departments', 'staff', 'tokens', 'activity'
  const [selectedDeptId, setSelectedDeptId] = useState(null);
  const [deactivatingId, setDeactivatingId] = useState(null);

  // Department Slots & Breaks Edit State
  const [editDeptModal, setEditDeptModal] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    avgServiceMinutes: 10,
    slots: [
      { name: 'Morning', startTime: '09:00', endTime: '12:30', tokenFrom: 1, tokenTo: 25 },
      { name: 'Afternoon', startTime: '14:00', endTime: '17:00', tokenFrom: 26, tokenTo: 50 },
      { name: 'Evening', startTime: '17:30', endTime: '20:30', tokenFrom: 51, tokenTo: 75 },
    ],
    breaks: [
      { label: 'Lunch', startTime: '12:30', endTime: '14:00' },
      { label: 'Tea', startTime: '17:00', endTime: '17:30' },
    ],
  });
  const [editSaving, setEditSaving] = useState(false);
  const [liveSlotFilter, setLiveSlotFilter] = useState('All');

  const handleOpenEditDept = (dept) => {
    setEditDeptModal(dept);
    setEditFormData({
      name: dept.name || '',
      avgServiceMinutes: dept.avgServiceMinutes || 10,
      slots:
        dept.slots && dept.slots.length === 3
          ? dept.slots
          : [
              { name: 'Morning', startTime: '09:00', endTime: '12:30', tokenFrom: 1, tokenTo: 25 },
              { name: 'Afternoon', startTime: '14:00', endTime: '17:00', tokenFrom: 26, tokenTo: 50 },
              { name: 'Evening', startTime: '17:30', endTime: '20:30', tokenFrom: 51, tokenTo: 75 },
            ],
      breaks:
        dept.breaks && dept.breaks.length > 0
          ? dept.breaks
          : [
              { label: 'Lunch', startTime: '12:30', endTime: '14:00' },
              { label: 'Tea', startTime: '17:00', endTime: '17:30' },
            ],
    });
  };

  const handleSaveDeptSlots = async (e) => {
    e.preventDefault();
    if (!editDeptModal) return;

    const slots = editFormData.slots;
    for (const s of slots) {
      const tokenCount = Number(s.tokenTo) - Number(s.tokenFrom) + 1;
      if (tokenCount !== 25) {
        toast.error(`Slot '${s.name}' must contain exactly 25 tokens.`);
        return;
      }
      if (s.startTime >= s.endTime) {
        toast.error(`Slot '${s.name}' start time must be before end time.`);
        return;
      }
    }

    if (slots[0].endTime > slots[1].startTime) {
      toast.error('Morning and Afternoon slots overlap. Slot timings must not overlap.');
      return;
    }
    if (slots[1].endTime > slots[2].startTime) {
      toast.error('Afternoon and Evening slots overlap. Slot timings must not overlap.');
      return;
    }

    setEditSaving(true);
    try {
      const deptId = editDeptModal.id || editDeptModal._id;
      const res = await api.put(`/admin/departments/${deptId}`, {
        name: editFormData.name,
        avgServiceMinutes: Number(editFormData.avgServiceMinutes),
        slots: editFormData.slots,
        breaks: editFormData.breaks,
      });

      if (res.data?.success) {
        toast.success('Department slots and breaks updated successfully!');
        setEditDeptModal(null);
        fetchPlaceDetails(currentPlaceId);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update department.');
    } finally {
      setEditSaving(false);
    }
  };

  const fetchPlaceDetails = useCallback(async (placeId) => {
    if (!placeId) return;
    setDetailLoading(true);
    try {
      const res = await api.get(`/admin/places/${placeId}/details`);
      if (res.data?.success) {
        setPlaceDetails(res.data);
        if (res.data.departments?.length > 0) {
          setSelectedDeptId((prev) => {
            const exists = res.data.departments.some((d) => d.id === prev);
            return exists ? prev : res.data.departments[0].id;
          });
        }
      }
    } catch (err) {
      console.error('Failed to fetch place details:', err);
      toast.error('Could not load facility details.');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const fetchPlaceActivity = useCallback(async (placeId) => {
    if (!placeId) return;
    setActivityLoading(true);
    try {
      const res = await api.get(`/admin/places/${placeId}/activity`);
      if (res.data?.success) {
        setActivityLogs(res.data.logs || []);
      }
    } catch (err) {
      console.error('Failed to load activity logs:', err);
    } finally {
      setActivityLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentPlaceId) {
      fetchPlaceDetails(currentPlaceId);
      fetchPlaceActivity(currentPlaceId);
    }
  }, [currentPlaceId, fetchPlaceDetails, fetchPlaceActivity]);

  // ==========================================================
  // SOCKET.IO LIVE TOKENS LISTENER (For Live Tokens Grid)
  // ==========================================================
  useEffect(() => {
    if (!currentPlaceId) return;
    const socket = getSocket();

    const handleTokenUpdated = (data) => {
      // Refresh current details silently to update token grid and stats
      api.get(`/admin/places/${currentPlaceId}/details`).then((res) => {
        if (res.data?.success) {
          setPlaceDetails(res.data);
        }
      }).catch(() => {});
      // Also fetch activity updates
      api.get(`/admin/places/${currentPlaceId}/activity`).then((res) => {
        if (res.data?.success) setActivityLogs(res.data.logs || []);
      }).catch(() => {});
    };

    socket.on('token:updated', handleTokenUpdated);
    socket.on('tokens:batch', handleTokenUpdated);
    socket.on('queue:nowServing', handleTokenUpdated);
    socket.on('counter:paused', handleTokenUpdated);

    return () => {
      socket.off('token:updated', handleTokenUpdated);
      socket.off('tokens:batch', handleTokenUpdated);
      socket.off('queue:nowServing', handleTokenUpdated);
      socket.off('counter:paused', handleTokenUpdated);
    };
  }, [currentPlaceId]);

  // Navigate to Detail View
  const handleOpenPlace = (placeId) => {
    setCurrentPlaceId(placeId);
    if (onSelectPlaceProp) onSelectPlaceProp(placeId);
    // Push browser route gracefully if desired
    window.history.pushState(null, '', `/admin/places/${placeId}`);
  };

  // Back to List View
  const handleBackToList = () => {
    setCurrentPlaceId(null);
    if (onSelectPlaceProp) onSelectPlaceProp(null);
    window.history.pushState(null, '', '/admin/dashboard');
    fetchPlacesOverview();
  };

  // Staff Deactivation
  const handleDeactivateStaff = async (staffId, staffName) => {
    if (!window.confirm(`Are you sure you want to deactivate staff member "${staffName}"?`)) return;
    setDeactivatingId(staffId);
    try {
      const res = await api.patch(`/admin/staff/${staffId}/deactivate`);
      if (res.data?.success) {
        toast.success(res.data.message || 'Staff member deactivated.');
        fetchPlaceDetails(currentPlaceId);
        fetchPlaceActivity(currentPlaceId);
      }
    } catch (err) {
      console.error('Failed to deactivate staff:', err);
      toast.error(err.response?.data?.message || 'Could not deactivate staff.');
    } finally {
      setDeactivatingId(null);
    }
  };

  // Filtered Places for List View
  const filteredPlaces = useMemo(() => {
    return places.filter((p) => {
      const matchesCat = categoryFilter === 'all' || p.category === categoryFilter;
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        p.name.toLowerCase().includes(q) ||
        (p.city && p.city.toLowerCase().includes(q)) ||
        (p.address && p.address.toLowerCase().includes(q));
      return matchesCat && matchesSearch;
    });
  }, [places, categoryFilter, searchQuery]);

  const getCrowdBadgeStyle = (level) => {
    switch (level) {
      case 'HIGH':
        return 'bg-rose-100 text-rose-700 border-rose-300 ring-rose-200';
      case 'MEDIUM':
        return 'bg-amber-100 text-amber-800 border-amber-300 ring-amber-200';
      case 'LOW':
      default:
        return 'bg-emerald-100 text-emerald-800 border-emerald-300 ring-emerald-200';
    }
  };

  // Active department for Live Tokens tab
  const activeDepartment = useMemo(() => {
    if (!placeDetails?.departments) return null;
    return (
      placeDetails.departments.find((d) => d.id === selectedDeptId) ||
      placeDetails.departments[0] ||
      null
    );
  }, [placeDetails, selectedDeptId]);

  // ==========================================================
  // RENDER: DETAIL VIEW
  // ==========================================================
  if (currentPlaceId) {
    if (detailLoading && !placeDetails) {
      return (
        <div className="py-24 flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 border-4 border-[#8164AD]/20 border-t-[#8164AD] rounded-full animate-spin"></div>
          <p className="text-xs text-slate-500">Loading facility details...</p>
        </div>
      );
    }

    const { place, departments = [], approvedStaff = [], hourlyBookings = [], predictedCrowd } =
      placeDetails || {};

    const maxHourly = Math.max(...hourlyBookings.map((h) => h.count || 0), 1);

    return (
      <div className="space-y-6 animate-fadeIn pb-12">
        {/* Navigation back button */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleBackToList}
            className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-white hover:bg-[#FAF7FD] text-slate-700 text-xs font-semibold border border-[#D5C3EE] shadow-2xs transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#8164AD]" />
            <span>Back to Hospitals & Banks</span>
          </button>

          <button
            onClick={() => {
              fetchPlaceDetails(currentPlaceId);
              fetchPlaceActivity(currentPlaceId);
            }}
            className="p-1.5 rounded-xl bg-white hover:bg-[#FAF7FD] text-slate-600 border border-[#D5C3EE] text-xs transition-all shadow-2xs"
            title="Refresh details"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#8164AD]" />
          </button>
        </div>

        {/* Place Header Summary Card */}
        <div className="bg-white/90 backdrop-blur-xl p-6 rounded-2xl border border-[#D5C3EE] space-y-6 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#F3ECFB] text-[#6A4C97] border border-[#D5C3EE]">
                  {place?.category || 'Facility'}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  {place?.city || 'Location'}
                </span>
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                {place?.name || 'Facility Name'}
              </h2>
              <p className="text-xs text-slate-600 max-w-xl">
                {place?.address || 'Address details'}
              </p>
            </div>

            {/* Predicted Crowd Badge & Factor */}
            <div className="p-4 rounded-xl bg-[#FAF7FD] border border-[#D5C3EE] min-w-[220px] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#8164AD]" />
                  <span>Predicted Crowd</span>
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ring-1 ${getCrowdBadgeStyle(
                    predictedCrowd?.level
                  )}`}
                >
                  {predictedCrowd?.level || 'LOW'}
                </span>
              </div>
              <div className="text-xs text-slate-700">
                <div className="font-semibold text-slate-900">
                  Peak: {predictedCrowd?.peakWindow || '10:00 AM - 1:00 PM'}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Confidence: {predictedCrowd?.confidence || 85}% • {predictedCrowd?.factor || 'Historical baseline'}
                </div>
              </div>
            </div>
          </div>

          {/* Mini Hourly Bookings Chart */}
          <div className="pt-4 border-t border-[#E6DAF6] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#8164AD]" />
                <span>Today's Hourly Bookings Distribution</span>
              </span>
              <span className="text-[11px] text-slate-500">8:00 AM – 6:00 PM</span>
            </div>

            <div className="h-20 flex items-end gap-1.5 sm:gap-2 pt-2 px-1">
              {hourlyBookings.map((h, i) => {
                const heightPercent = Math.max(8, Math.round((h.count / maxHourly) * 100));
                return (
                  <div
                    key={i}
                    className="flex-1 flex flex-col items-center gap-1 group relative h-full justify-end"
                  >
                    {/* Tooltip */}
                    <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] px-1.5 py-0.5 rounded pointer-events-none whitespace-nowrap z-20">
                      {h.label}: {h.count} tokens
                    </div>
                    {/* Bar */}
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full rounded-t-md transition-all duration-300 ${
                        h.count > 0
                          ? 'bg-gradient-to-t from-[#8164AD] to-[#B19BD6] group-hover:from-[#6A4C97] group-hover:to-[#9B80C9]'
                          : 'bg-[#E6DAF6]/60'
                      }`}
                    />
                    <span className="text-[9px] text-slate-500 font-mono scale-90 sm:scale-100">
                      {h.label.replace(' ', '')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 4 Detail Tabs Navigation */}
        <div className="flex items-center space-x-1.5 p-1 bg-white/90 backdrop-blur-xl rounded-2xl border border-[#D5C3EE] shadow-2xs">
          {[
            { id: 'departments', label: 'Departments', icon: Layers, count: departments.length },
            { id: 'staff', label: 'Staff', icon: UserCheck, count: approvedStaff.length },
            { id: 'tokens', label: 'Live Tokens', icon: Zap, highlight: true },
            { id: 'activity', label: 'Activity', icon: Activity, count: activityLogs.length },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeDetailTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveDetailTab(tab.id)}
                className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-[#8164AD] text-white shadow-sm shadow-[#8164AD]/25'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-[#FAF7FD]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {typeof tab.count === 'number' && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-white/25 text-white' : 'bg-[#F3ECFB] text-[#6A4C97]'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ==================================================== */}
        {/* TAB 1: DEPARTMENTS TABLE */}
        {/* ==================================================== */}
        {activeDetailTab === 'departments' && (
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl border border-[#D5C3EE] overflow-hidden shadow-xs">
            <div className="p-4 border-b border-[#E6DAF6] flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Departments & Counter Rosters
              </h3>
              <span className="text-xs text-slate-500">{departments.length} registered</span>
            </div>

            {departments.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                No departments configured for this facility.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF7FD] text-slate-600 font-bold uppercase text-[10px] border-b border-[#E6DAF6]">
                    <tr>
                      <th className="py-3 px-4">Department / Doctor</th>
                      <th className="py-3 px-4">Experience</th>
                      <th className="py-3 px-4">Designation</th>
                      <th className="py-3 px-4">Assigned Staff</th>
                      <th className="py-3 px-4">Tokens Booked</th>
                      <th className="py-3 px-4">Avg Wait</th>
                      <th className="py-3 px-4 text-right">Counter Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6DAF6] text-slate-700">
                    {departments.map((dept) => (
                      <tr key={dept.id} className="hover:bg-[#FAF7FD]/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{dept.name}</div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Stethoscope className="w-3 h-3 text-[#8164AD]" />
                            <span>{dept.doctorName || 'Assigned Officer'}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-600">
                          {dept.doctorExperience || '—'}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-600">
                          {dept.designation || 'Consultant'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F3ECFB] text-[#6A4C97] font-bold text-[10px]">
                            <Users className="w-2.5 h-2.5" />
                            {dept.assignedStaffCount} Staff
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono">
                          <div className="font-extrabold text-slate-900">
                            {dept.tokensBookedCount}
                            <span className="text-slate-400 font-normal"> / 75</span>
                          </div>
                          {dept.slotBreakdown && (
                            <div className="text-[10px] text-slate-500 font-sans mt-0.5 space-x-1 flex items-center">
                              <span>M: <strong>{dept.slotBreakdown[0]?.booked || 0}</strong></span>
                              <span>•</span>
                              <span>A: <strong>{dept.slotBreakdown[1]?.booked || 0}</strong></span>
                              <span>•</span>
                              <span>E: <strong>{dept.slotBreakdown[2]?.booked || 0}</strong></span>
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-600">
                          ~{dept.averageWaitMinutes}m
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-2">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              dept.counterStatus === 'active'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : 'bg-amber-100 text-amber-800 border-amber-300'
                            }`}
                          >
                            {dept.counterStatus === 'active' ? '● Active' : '⏸ Paused'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenEditDept(dept)}
                            className="px-2.5 py-1 rounded-lg bg-[#F3ECFB] hover:bg-[#E6DAF6] text-[#6A4C97] font-bold text-[10px] border border-[#D5C3EE] transition-all"
                          >
                            Edit Slots & Breaks
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 2: APPROVED STAFF TABLE */}
        {/* ==================================================== */}
        {activeDetailTab === 'staff' && (
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl border border-[#D5C3EE] overflow-hidden shadow-xs">
            <div className="p-4 border-b border-[#E6DAF6] flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Approved Staff Roster
              </h3>
              <span className="text-xs text-slate-500">{approvedStaff.length} active staff</span>
            </div>

            {approvedStaff.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                No approved staff found for this facility.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF7FD] text-slate-600 font-bold uppercase text-[10px] border-b border-[#E6DAF6]">
                    <tr>
                      <th className="py-3 px-4">Staff Member</th>
                      <th className="py-3 px-4">Staff ID</th>
                      <th className="py-3 px-4">Phone</th>
                      <th className="py-3 px-4">Department</th>
                      <th className="py-3 px-4">Approval Date</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6DAF6] text-slate-700">
                    {approvedStaff.map((staff) => (
                      <tr key={staff.id} className="hover:bg-[#FAF7FD]/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{staff.name}</div>
                          <div className="text-[10px] text-slate-400">Authorized Operator</div>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-[#8164AD]">
                          {staff.staffId}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-600">
                          {staff.phone || '—'}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-800">
                          {staff.departmentName || 'General Desk'}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                          {staff.approvedAt
                            ? new Date(staff.approvedAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })
                            : '—'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleDeactivateStaff(staff.id, staff.name)}
                            disabled={deactivatingId === staff.id}
                            className="px-3 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold border border-rose-200 transition-all inline-flex items-center space-x-1 disabled:opacity-50"
                          >
                            {deactivatingId === staff.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <UserX className="w-3 h-3" />
                            )}
                            <span>Deactivate</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 3: LIVE TOKENS READ-ONLY GRID */}
        {/* ==================================================== */}
        {activeDetailTab === 'tokens' && (
          <div className="bg-white/90 backdrop-blur-xl p-6 rounded-2xl border border-[#D5C3EE] space-y-6 shadow-xs">
            {/* Header & Department Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E6DAF6]">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-bold text-slate-900">
                    Live Token Stream (75 Tokens)
                  </h3>
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Socket.IO Live</span>
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Read-only view updated in real time. White = Available, Light Blue = Booked / In
                  Queue, Amber = Skipped, Green = Completed, Red = Cancelled.
                </p>
              </div>

              {/* Department Dropdown Selector */}
              {departments.length > 0 && (
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-slate-600">Department:</span>
                  <select
                    value={selectedDeptId || ''}
                    onChange={(e) => setSelectedDeptId(e.target.value)}
                    className="p-1.5 rounded-xl bg-white border border-[#D5C3EE] text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#8164AD]"
                  >
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name} ({dept.tokensBookedCount}/75 booked)
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Slot Filter & Legend Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Segmented Slot Filter */}
              <div className="flex items-center space-x-1.5 p-1 bg-[#FAF7FD] rounded-xl border border-[#D5C3EE] text-xs font-semibold">
                {['All', 'Morning', 'Afternoon', 'Evening'].map((slotKey) => (
                  <button
                    key={slotKey}
                    type="button"
                    onClick={() => setLiveSlotFilter(slotKey)}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      liveSlotFilter === slotKey
                        ? 'bg-[#8164AD] text-white font-bold shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {slotKey === 'All'
                      ? 'All (75)'
                      : slotKey === 'Morning'
                      ? 'Morning (1-25)'
                      : slotKey === 'Afternoon'
                      ? 'Afternoon (26-50)'
                      : 'Evening (51-75)'}
                  </button>
                ))}
              </div>

              {/* Token Legend */}
              <div className="flex flex-wrap items-center gap-3 text-xs font-semibold p-2.5 rounded-xl bg-[#FAF7FD] border border-[#D5C3EE]">
                <div className="flex items-center space-x-1.5">
                  <div className="w-3.5 h-3.5 rounded bg-white border border-slate-300 shadow-2xs"></div>
                  <span className="text-slate-600 text-[11px]">Available</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <div className="w-3.5 h-3.5 rounded bg-sky-100 border border-sky-400"></div>
                  <span className="text-sky-800 text-[11px]">Booked</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <div className="w-3.5 h-3.5 rounded bg-amber-100 border border-amber-400"></div>
                  <span className="text-amber-800 text-[11px]">Skipped</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <div className="w-3.5 h-3.5 rounded bg-emerald-100 border border-emerald-400"></div>
                  <span className="text-emerald-800 text-[11px]">Completed</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <div className="w-3.5 h-3.5 rounded bg-rose-100 border border-rose-400"></div>
                  <span className="text-rose-800 text-[11px]">Cancelled</span>
                </div>
              </div>
            </div>

            {/* Tokens Grid */}
            {!activeDepartment ? (
              <div className="py-12 text-center text-xs text-slate-500">
                No department selected.
              </div>
            ) : (
              <div className="grid grid-cols-5 sm:grid-cols-10 md:grid-cols-15 gap-2">
                {(activeDepartment.tokens || [])
                  .filter((t) => {
                    if (liveSlotFilter === 'Morning') return t.tokenNumber <= 25;
                    if (liveSlotFilter === 'Afternoon') return t.tokenNumber >= 26 && t.tokenNumber <= 50;
                    if (liveSlotFilter === 'Evening') return t.tokenNumber >= 51;
                    return true;
                  })
                  .map((token) => {
                    let tileStyle =
                      'bg-white text-slate-600 border border-slate-200 hover:border-slate-300';
                    if (
                      token.status === 'booked' ||
                      token.status === 'in_progress' ||
                      token.status === 'serving'
                    ) {
                      tileStyle =
                        'bg-sky-100 text-sky-800 border-sky-300 font-bold shadow-2xs';
                    } else if (token.status === 'skipped') {
                      tileStyle =
                        'bg-amber-100 text-amber-800 border-amber-400 font-bold';
                    } else if (token.status === 'completed') {
                      tileStyle =
                        'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold';
                    } else if (token.status === 'cancelled') {
                      tileStyle =
                        'bg-rose-100 text-rose-800 border-rose-300 font-bold';
                    }

                    return (
                      <div
                        key={token.tokenNumber}
                        title={`Token #${token.tokenNumber} (${token.slot || 'Slot'}) • Status: ${token.status}${
                          token.walkIn ? ' [Walk-in]' : ''
                        }`}
                        className={`h-11 rounded-xl flex flex-col items-center justify-center text-xs transition-transform hover:scale-105 cursor-default select-none border ${tileStyle}`}
                      >
                        <span className="font-mono text-[11px]">#{token.tokenNumber}</span>
                        <div className="flex items-center gap-0.5">
                          <span className="text-[8px] uppercase tracking-tighter opacity-80 scale-90">
                            {token.status === 'in_progress' ? 'serving' : token.status}
                          </span>
                          {token.walkIn && (
                            <span className="text-[7px] font-bold text-sky-700 bg-sky-200/80 px-1 rounded">
                              W
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 4: ACTIVITY LOG */}
        {/* ==================================================== */}
        {activeDetailTab === 'activity' && (
          <div className="bg-white/90 backdrop-blur-xl p-6 rounded-2xl border border-[#D5C3EE] space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6DAF6]">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Facility Activity Timeline
              </h3>
              <span className="text-xs text-slate-500">{activityLogs.length} events logged</span>
            </div>

            {activityLoading ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-[#8164AD]" />
              </div>
            ) : activityLogs.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                No recorded activity events for this facility today.
              </div>
            ) : (
              <div className="space-y-3">
                {activityLogs.map((log) => {
                  let badge = 'bg-purple-100 text-purple-800 border-purple-200';
                  let icon = Activity;
                  if (log.type === 'booked') {
                    badge = 'bg-sky-100 text-sky-800 border-sky-300';
                    icon = Clock;
                  } else if (log.type === 'completed') {
                    badge = 'bg-emerald-100 text-emerald-800 border-emerald-300';
                    icon = CheckCircle2;
                  } else if (log.type === 'cancelled') {
                    badge = 'bg-rose-100 text-rose-800 border-rose-300';
                    icon = XCircle;
                  } else if (log.type === 'staff_approved') {
                    badge = 'bg-amber-100 text-amber-800 border-amber-300';
                    icon = UserCheck;
                  } else if (log.type === 'staff_deactivated') {
                    badge = 'bg-red-100 text-red-800 border-red-300';
                    icon = UserX;
                  }

                  const IconComp = icon;

                  return (
                    <div
                      key={log.id}
                      className="p-3.5 rounded-xl bg-[#FAF7FD] border border-[#D5C3EE] flex items-start space-x-3 text-xs"
                    >
                      <div className={`p-2 rounded-lg border ${badge} shrink-0 mt-0.5`}>
                        <IconComp className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 capitalize">
                            {log.type.replace('_', ' ')}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : '—'}
                          </span>
                        </div>
                        <p className="text-slate-600 text-xs">{log.description}</p>
                        {log.departmentName && (
                          <div className="text-[10px] text-[#8164AD] font-semibold">
                            Department: {log.departmentName}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* MODAL: EDIT SLOTS & BREAKS */}
        {/* ==================================================== */}
        {editDeptModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
            <div className="bg-white rounded-2xl border border-[#D5C3EE] shadow-2xl max-w-lg w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-[#E6DAF6]">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Edit Slots & Breaks
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {editDeptModal.name} — Configure 3 slots (25 tokens each) and break intervals.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditDeptModal(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveDeptSlots} className="space-y-4">
                {/* Department Basic Info */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Department Name
                    </label>
                    <input
                      type="text"
                      required
                      value={editFormData.name}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, name: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-[#FAF7FD] border border-[#D5C3EE] text-xs font-medium text-slate-800 focus:outline-none focus:border-[#8164AD]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Avg Service (min)
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={60}
                      value={editFormData.avgServiceMinutes}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          avgServiceMinutes: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-[#FAF7FD] border border-[#D5C3EE] text-xs font-medium text-slate-800 focus:outline-none focus:border-[#8164AD]"
                    />
                  </div>
                </div>

                {/* 3 Slots */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#8164AD]">
                    Token Slots (25 Tokens Each)
                  </h4>
                  {editFormData.slots.map((slot, idx) => (
                    <div
                      key={slot.name}
                      className="p-3 rounded-xl bg-[#FAF7FD] border border-[#D5C3EE] space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between font-bold text-slate-800">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#8164AD]" />
                          {slot.name} Slot
                        </span>
                        <span className="font-mono text-[11px] text-slate-500">
                          Tokens #{slot.tokenFrom} – #{slot.tokenTo} (25 total)
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                            Start Time
                          </label>
                          <input
                            type="time"
                            required
                            value={slot.startTime}
                            onChange={(e) => {
                              const newSlots = [...editFormData.slots];
                              newSlots[idx].startTime = e.target.value;
                              setEditFormData({ ...editFormData, slots: newSlots });
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[#D5C3EE] text-xs text-slate-800 font-mono focus:outline-none focus:border-[#8164AD]"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                            End Time
                          </label>
                          <input
                            type="time"
                            required
                            value={slot.endTime}
                            onChange={(e) => {
                              const newSlots = [...editFormData.slots];
                              newSlots[idx].endTime = e.target.value;
                              setEditFormData({ ...editFormData, slots: newSlots });
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[#D5C3EE] text-xs text-slate-800 font-mono focus:outline-none focus:border-[#8164AD]"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Breaks */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#8164AD]">
                    Doctor Breaks
                  </h4>
                  {editFormData.breaks.map((brk, idx) => (
                    <div
                      key={brk.label || idx}
                      className="p-3 rounded-xl bg-[#FAF7FD] border border-[#D5C3EE] space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between font-bold text-slate-800">
                        <span className="flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-amber-600" />
                          {brk.label} Break
                        </span>
                        <input
                          type="text"
                          value={brk.label}
                          onChange={(e) => {
                            const newBreaks = [...editFormData.breaks];
                            newBreaks[idx].label = e.target.value;
                            setEditFormData({ ...editFormData, breaks: newBreaks });
                          }}
                          className="w-24 px-2 py-0.5 rounded bg-white border border-[#D5C3EE] text-[11px] text-slate-700 text-right"
                          placeholder="Break Label"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                            Start Time
                          </label>
                          <input
                            type="time"
                            required
                            value={brk.startTime}
                            onChange={(e) => {
                              const newBreaks = [...editFormData.breaks];
                              newBreaks[idx].startTime = e.target.value;
                              setEditFormData({ ...editFormData, breaks: newBreaks });
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[#D5C3EE] text-xs text-slate-800 font-mono focus:outline-none focus:border-[#8164AD]"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                            End Time
                          </label>
                          <input
                            type="time"
                            required
                            value={brk.endTime}
                            onChange={(e) => {
                              const newBreaks = [...editFormData.breaks];
                              newBreaks[idx].endTime = e.target.value;
                              setEditFormData({ ...editFormData, breaks: newBreaks });
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[#D5C3EE] text-xs text-slate-800 font-mono focus:outline-none focus:border-[#8164AD]"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#E6DAF6]">
                  <button
                    type="button"
                    onClick={() => setEditDeptModal(null)}
                    className="px-4 py-2 rounded-xl border border-[#D5C3EE] text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editSaving}
                    className="px-5 py-2 rounded-xl bg-[#8164AD] hover:bg-[#6A4C97] text-white text-xs font-bold shadow-xs transition-all flex items-center space-x-1.5 disabled:opacity-50"
                  >
                    {editSaving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>Save Changes</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================================
  // RENDER: LIST VIEW
  // ==========================================================
  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Search & Category Filter Bar */}
      <div className="bg-white/90 backdrop-blur-xl p-4 rounded-2xl border border-[#D5C3EE] flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
        {/* Search Box */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search facility name, city, address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#FAF7FD] border border-[#D5C3EE] text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#8164AD]"
          />
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center space-x-1.5 p-1 bg-[#FAF7FD] rounded-xl border border-[#D5C3EE] text-xs font-semibold self-stretch sm:self-auto justify-center">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              categoryFilter === 'all'
                ? 'bg-[#8164AD] text-white font-bold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Facilities ({places.length})
          </button>
          <button
            onClick={() => setCategoryFilter('Hospital')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1 ${
              categoryFilter === 'Hospital'
                ? 'bg-[#8164AD] text-white font-bold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Hospital className="w-3.5 h-3.5" />
            <span>Hospitals</span>
          </button>
          <button
            onClick={() => setCategoryFilter('Bank')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1 ${
              categoryFilter === 'Bank'
                ? 'bg-[#8164AD] text-white font-bold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Landmark className="w-3.5 h-3.5" />
            <span>Banks</span>
          </button>
        </div>
      </div>

      {/* SKELETON LOADER */}
      {listLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-pulse">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-56 bg-white/80 rounded-2xl border border-[#D5C3EE]/60 p-5 space-y-4"
            >
              <div className="h-4 bg-[#E6DAF6] rounded w-2/3"></div>
              <div className="h-3 bg-[#E6DAF6]/60 rounded w-1/3"></div>
              <div className="h-16 bg-[#F5EEFA] rounded-xl"></div>
              <div className="h-8 bg-[#E6DAF6]/40 rounded-xl"></div>
            </div>
          ))}
        </div>
      ) : filteredPlaces.length === 0 ? (
        /* EMPTY STATE */
        <div className="py-24 text-center bg-white/70 backdrop-blur-xl rounded-2xl border border-[#D5C3EE] space-y-3 p-6">
          <Building2 className="w-10 h-10 text-slate-400 mx-auto" />
          <h4 className="text-sm font-bold text-slate-800">No facilities found</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No hospitals or banks match your active search filters or have registered approved staff /
            departments.
          </p>
        </div>
      ) : (
        /* PLACES GRID */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPlaces.map((place) => (
            <div
              key={place.id}
              onClick={() => handleOpenPlace(place.id)}
              className="bg-white/95 backdrop-blur-xl p-5 rounded-2xl border border-[#D5C3EE] hover:border-[#8164AD] hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-4 group"
            >
              {/* Header */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#F3ECFB] text-[#6A4C97] border border-[#D5C3EE]">
                    {place.category}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ring-1 ${getCrowdBadgeStyle(
                      place.crowdLevel
                    )}`}
                  >
                    {place.crowdLevel}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 group-hover:text-[#8164AD] transition-colors pt-1">
                  {place.name}
                </h3>
                <p className="text-xs text-slate-500 truncate">{place.city || place.address}</p>
              </div>

              {/* Counts Badge Row */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-[#FAF7FD] border border-[#D5C3EE] flex items-center space-x-2">
                  <UserCheck className="w-3.5 h-3.5 text-[#8164AD]" />
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 block font-semibold">Staff</span>
                    <span className="font-bold text-slate-900">{place.approvedStaffCount} Approved</span>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-[#FAF7FD] border border-[#D5C3EE] flex items-center space-x-2">
                  <Layers className="w-3.5 h-3.5 text-[#8164AD]" />
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 block font-semibold">Depts</span>
                    <span className="font-bold text-slate-900">{place.departmentCount} Counters</span>
                  </div>
                </div>
              </div>

              {/* Today's Queue Metric Stats */}
              <div className="p-3 rounded-xl bg-[#F5EEFA]/60 border border-[#D5C3EE]/70 grid grid-cols-3 text-center text-xs">
                <div>
                  <span className="text-[10px] uppercase text-amber-800 font-bold block">Waiting</span>
                  <span className="font-extrabold text-amber-700 text-sm font-mono">
                    {place.stats?.waiting ?? 0}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-purple-800 font-bold block">Done</span>
                  <span className="font-extrabold text-[#6A4C97] text-sm font-mono">
                    {place.stats?.completed ?? 0}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-rose-800 font-bold block">Cancelled</span>
                  <span className="font-extrabold text-rose-700 text-sm font-mono">
                    {place.stats?.cancelled ?? 0}
                  </span>
                </div>
              </div>

              {/* Action Link Footer */}
              <div className="pt-2 border-t border-[#E6DAF6] flex items-center justify-between text-xs text-[#8164AD] font-bold group-hover:text-[#6A4C97]">
                <span>View Live Operations</span>
                <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HospitalsAndBanksTab;
