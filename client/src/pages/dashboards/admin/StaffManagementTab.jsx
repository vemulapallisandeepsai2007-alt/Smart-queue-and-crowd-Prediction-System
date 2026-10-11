import React, { useState } from 'react';
import {
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
  Check,
  X,
  UserX,
  Filter,
  Search,
  Loader2,
  ShieldAlert,
  MapPin,
} from 'lucide-react';
import api from '../../../services/api';
import toast from 'react-hot-toast';

const StaffManagementTab = ({
  pendingStaff,
  allStaff,
  facilities,
  onRefresh,
}) => {
  const [staffFilter, setStaffFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Approve Dialog State (simple confirm dialog)
  const [staffToApprove, setStaffToApprove] = useState(null);
  const [approveLoading, setApproveLoading] = useState(false);

  // Action Loading states
  const [rejectingId, setRejectingId] = useState(null);
  const [deactivatingId, setDeactivatingId] = useState(null);

  // Open Simple Approve Dialog
  const handleOpenApproveModal = (staff) => {
    setStaffToApprove(staff);
  };

  // Submit Approval directly using staff member's pre-selected place
  const handleConfirmApproval = async () => {
    if (!staffToApprove) return;

    setApproveLoading(true);
    try {
      const res = await api.patch(`/admin/staff/${staffToApprove._id}/approve`);

      if (res.data?.success) {
        toast.success(res.data.message || 'Staff approved and authorized successfully!');
        setStaffToApprove(null);
        onRefresh();
      }
    } catch (err) {
      console.error('Approve error:', err);
      toast.error(err.message || 'Failed to approve staff member.');
    } finally {
      setApproveLoading(false);
    }
  };

  // Reject Staff
  const handleRejectStaff = async (staffId, staffName) => {
    if (!window.confirm(`Are you sure you want to reject registration for ${staffName}?`)) {
      return;
    }

    setRejectingId(staffId);
    try {
      const res = await api.patch(`/admin/staff/${staffId}/reject`);
      if (res.data?.success) {
        toast.success(res.data.message || `${staffName} registration has been rejected.`);
        onRefresh();
      }
    } catch (err) {
      console.error('Reject error:', err);
      toast.error(err.message || 'Failed to reject staff member.');
    } finally {
      setRejectingId(null);
    }
  };

  // Deactivate Staff
  const handleDeactivateStaff = async (staffId, staffName) => {
    if (
      !window.confirm(
        `Are you sure you want to deactivate ${staffName}? They will no longer be able to log in or manage tokens.`
      )
    ) {
      return;
    }

    setDeactivatingId(staffId);
    try {
      const res = await api.patch(`/admin/staff/${staffId}/deactivate`);
      if (res.data?.success) {
        toast.success(res.data.message || `${staffName} deactivated successfully.`);
        onRefresh();
      }
    } catch (err) {
      console.error('Deactivate error:', err);
      toast.error(err.message || 'Failed to deactivate staff member.');
    } finally {
      setDeactivatingId(null);
    }
  };

  // Filtered staff list
  const filteredStaff = (allStaff || []).filter((s) => {
    const matchesStatus = staffFilter === 'all' || s.status === staffFilter;
    const matchesQuery =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.staffId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.place?.name && s.place.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesQuery;
  });

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* 1. Pending Approvals Section */}
      <div className="glass-card rounded-2xl border border-slate-800 p-6 space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
              <h3 className="text-lg font-bold text-white">Pending Staff Approval Requests</h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Review staff accounts with their chosen hospital/bank. Confirm to approve counter access.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            {pendingStaff?.length || 0} Pending
          </span>
        </div>

        {pendingStaff?.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            ✨ No pending staff approval requests. All operators are processed.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="uppercase tracking-wider text-[11px] bg-slate-900/80 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Staff ID</th>
                  <th className="py-3 px-4">Chosen Facility / Place</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Requested On</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {pendingStaff.map((staff) => (
                  <tr key={staff._id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-4 font-semibold text-white">{staff.name}</td>
                    <td className="py-3 px-4 font-mono text-emerald-400 font-bold">{staff.staffId}</td>
                    <td className="py-3 px-4">
                      {staff.place ? (
                        <div>
                          <div className="font-semibold text-white flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            <span>{staff.place.name}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                            <span className="truncate max-w-xs">{staff.place.address}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-amber-400 italic">No facility selected</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                        {staff.category || staff.place?.category || 'Hospital'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      <div>{staff.email}</div>
                      <div className="text-[10px] font-mono">{staff.phone}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {new Date(staff.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenApproveModal(staff)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-all inline-flex items-center space-x-1 shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>
                      <button
                        onClick={() => handleRejectStaff(staff._id, staff.name)}
                        disabled={rejectingId === staff._id}
                        className="px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 font-semibold transition-all inline-flex items-center space-x-1"
                      >
                        {rejectingId === staff._id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <X className="w-3.5 h-3.5" />
                        )}
                        <span>Reject</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 2. All Staff Directory Table */}
      <div className="glass-card rounded-2xl border border-slate-800 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-400" />
              <span>Staff Operator Directory</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Complete roster of approved, pending, rejected, and deactivated staff accounts.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search staff..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-48"
              />
            </div>

            <div className="flex rounded-xl bg-slate-900 p-1 border border-slate-700 text-xs">
              {['all', 'approved', 'pending', 'rejected', 'deactivated'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStaffFilter(st)}
                  className={`px-2.5 py-1 rounded-lg capitalize transition-all ${
                    staffFilter === st
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="uppercase tracking-wider text-[11px] bg-slate-900/80 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Operator</th>
                <th className="py-3 px-4">Staff ID</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Hospital / Bank</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredStaff.map((staff) => (
                <tr key={staff._id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-white">{staff.name}</div>
                    <div className="text-[10px] text-slate-400">{staff.email}</div>
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-slate-200">{staff.staffId}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        staff.status === 'approved'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : staff.status === 'pending'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : staff.status === 'deactivated'
                          ? 'bg-slate-700 text-slate-300 border border-slate-600'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {staff.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-300">
                    {staff.place?.name ? (
                      <div>
                        <div className="font-medium text-slate-200">{staff.place.name}</div>
                        <div className="text-[10px] text-slate-400">{staff.place.address}</div>
                      </div>
                    ) : (
                      <span className="text-slate-500 italic">Unlinked</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {staff.status === 'approved' && (
                      <button
                        onClick={() => handleDeactivateStaff(staff._id, staff.name)}
                        disabled={deactivatingId === staff._id}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-500/30 text-xs transition-all inline-flex items-center space-x-1"
                        title="Deactivate staff permissions"
                      >
                        {deactivatingId === staff._id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <UserX className="w-3 h-3 text-rose-400" />
                        )}
                        <span>Deactivate</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Simple Confirm Approval Modal (No place/department dropdowns) */}
      {staffToApprove && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-6 rounded-2xl border border-indigo-500/40 shadow-2xl space-y-5 animate-fadeIn">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Approve Staff Member</h3>
                <p className="text-xs text-slate-400">Confirm access authorization for this staff operator.</p>
              </div>
            </div>

            <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-800 space-y-2.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Staff Name:</span>
                <span className="font-bold text-white">{staffToApprove.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Staff ID:</span>
                <span className="font-mono text-emerald-400 font-bold">{staffToApprove.staffId}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Category:</span>
                <span className="text-slate-200 font-semibold">{staffToApprove.category}</span>
              </div>
              <div className="border-t border-slate-800 pt-2.5">
                <span className="text-slate-400 block mb-1">Chosen Hospital / Bank:</span>
                <div className="font-bold text-indigo-300 text-sm">{staffToApprove.place?.name || 'Selected Facility'}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{staffToApprove.place?.address || 'Address'}</div>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Upon approval, this staff member will be authorized to log in and manage live token queues for all departments at <strong className="text-slate-200">{staffToApprove.place?.name}</strong>.
            </p>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setStaffToApprove(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmApproval}
                disabled={approveLoading}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center space-x-1.5 shadow-md shadow-emerald-900/30"
              >
                {approveLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm & Approve</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffManagementTab;
