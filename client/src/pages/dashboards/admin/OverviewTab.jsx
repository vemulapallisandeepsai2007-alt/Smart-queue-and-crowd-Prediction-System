import React, { useState, useMemo } from 'react';
import {
  Users,
  Clock,
  Play,
  CheckCircle2,
  XCircle,
  Timer,
  AlertTriangle,
  TrendingUp,
  Building2,
  Hospital,
  Landmark,
  ShieldAlert,
  Search,
  Filter,
  Flame,
  Award,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';

const OverviewTab = ({
  summary,
  departmentLoads = [],
  activeAlert,
  onDismissAlert,
  onRefresh,
  loading = false,
}) => {
  const [filterCategory, setFilterCategory] = useState('all'); // 'all', 'Hospital', 'Bank'
  const [searchQuery, setSearchQuery] = useState('');

  // Filter department loads by selected category
  const categoryFilteredDepts = useMemo(() => {
    return (departmentLoads || []).filter((dept) => {
      if (filterCategory === 'all') return true;
      return dept.placeCategory === filterCategory;
    });
  }, [departmentLoads, filterCategory]);

  // Compute category-filtered summary stats if a specific category is chosen
  const activeStats = useMemo(() => {
    if (filterCategory === 'all' && summary) {
      return {
        total: summary.totalTokensToday ?? 0,
        waiting: summary.waitingCount ?? 0,
        serving: summary.servingCount ?? 0,
        completed: summary.completedCount ?? 0,
        cancelled: summary.cancelledCount ?? 0,
        avgWait: summary.averageWaitMinutes ?? 0,
        crowdLevel: summary.crowdLevel || 'LOW',
      };
    }

    // Roll up stats from the filtered departments
    const waiting = categoryFilteredDepts.reduce((acc, d) => acc + (d.waitingCount || 0), 0);
    const serving = categoryFilteredDepts.reduce((acc, d) => acc + (d.isPaused ? 0 : (d.nowServing ? 1 : 0)), 0);
    const total = categoryFilteredDepts.reduce((acc, d) => acc + (d.totalToday || d.waitingCount || 0), 0);
    const completed = categoryFilteredDepts.reduce((acc, d) => acc + (d.completedCount || 0), 0);
    const cancelled = categoryFilteredDepts.reduce((acc, d) => acc + (d.cancelledCount || 0), 0);
    const avgWait = waiting > 0 ? Math.round((waiting * 8) / Math.max(1, serving || 1)) : 0;

    let crowdLevel = 'LOW';
    if (waiting > 45) crowdLevel = 'HIGH';
    else if (waiting > 20) crowdLevel = 'MEDIUM';

    return {
      total,
      waiting,
      serving,
      completed,
      cancelled,
      avgWait,
      crowdLevel,
    };
  }, [summary, categoryFilteredDepts, filterCategory]);

  // Top 3 Busiest Departments
  const top3Busiest = useMemo(() => {
    return [...categoryFilteredDepts]
      .sort((a, b) => (b.waitingCount || 0) - (a.waitingCount || 0))
      .slice(0, 3);
  }, [categoryFilteredDepts]);

  // Search filtered departments for the grid view
  const searchFilteredDepts = useMemo(() => {
    return categoryFilteredDepts.filter((dept) => {
      const q = searchQuery.toLowerCase();
      return (
        dept.name.toLowerCase().includes(q) ||
        (dept.placeName && dept.placeName.toLowerCase().includes(q))
      );
    });
  }, [categoryFilteredDepts, searchQuery]);

  const getCrowdLevelBadge = (level) => {
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

  const getLoadBadgeColor = (status) => {
    switch (status) {
      case 'red':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'yellow':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'green':
      default:
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-white/60 rounded-xl w-64 border border-[#D5C3EE]/50"></div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-28 bg-white/80 rounded-2xl border border-[#D5C3EE]/60 p-4 space-y-3">
              <div className="h-3 bg-[#E6DAF6] rounded w-2/3"></div>
              <div className="h-7 bg-[#D5C3EE] rounded w-1/2"></div>
              <div className="h-2 bg-[#E6DAF6] rounded w-3/4"></div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-44 bg-white/80 rounded-2xl border border-[#D5C3EE]/60"></div>
          <div className="md:col-span-2 h-44 bg-white/80 rounded-2xl border border-[#D5C3EE]/60"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-10">
      {/* ==================================================== */}
      {/* 1. ACTIVE CROWD ALERT PANEL (Shown ONLY when activeAlert is truthy) */}
      {/* ==================================================== */}
      {activeAlert && (
        <div
          id="overview-active-alert-panel"
          className="p-5 rounded-2xl bg-gradient-to-r from-rose-50 via-rose-100/90 to-red-50 border-2 border-rose-400 shadow-lg shadow-rose-900/5 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-bounce-short"
        >
          <div className="flex items-start space-x-4 z-10">
            <div className="p-3 rounded-xl bg-rose-500 text-white shadow-md shadow-rose-500/30 shrink-0 animate-pulse">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-rose-600 text-white shadow-xs">
                  Active Crowd Alert
                </span>
                <span className="text-xs text-rose-800 font-semibold">
                  Threshold exceeded: {activeAlert.threshold || 75} citizens
                </span>
              </div>
              <h3 className="text-base font-extrabold text-rose-950">
                Overcrowding Detected: {activeAlert.departmentName} ({activeAlert.placeName})
              </h3>
              <p className="text-xs text-rose-900 font-medium flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="font-bold text-rose-950 underline decoration-rose-400">
                  {activeAlert.waitingCount} citizens waiting.
                </span>
                <span className="bg-white/80 px-2 py-0.5 rounded-md border border-rose-300 text-rose-900 font-semibold">
                  💡 Recommendation: {activeAlert.recommendation || `Open another counter at ${activeAlert.departmentName}`}
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={onDismissAlert}
            className="px-4 py-2 rounded-xl bg-white hover:bg-rose-50 text-xs font-bold text-rose-700 border border-rose-300 hover:border-rose-400 transition-all shadow-xs shrink-0 z-10"
          >
            Dismiss Alert
          </button>
        </div>
      )}

      {/* ==================================================== */}
      {/* 2. TOP FILTER BAR: CATEGORY SELECTOR */}
      {/* ==================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/90 backdrop-blur-xl p-3.5 rounded-2xl border border-[#D5C3EE] shadow-xs">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-[#8164AD]" />
          <span className="text-xs font-bold text-slate-700">Filter Overview Category:</span>
        </div>

        <div className="flex items-center space-x-1.5 p-1 bg-[#F5EEFA] rounded-xl border border-[#D5C3EE]/60 text-xs font-semibold">
          <button
            id="overview-filter-all"
            onClick={() => setFilterCategory('all')}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              filterCategory === 'all'
                ? 'bg-[#8164AD] text-white font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            All Facilities
          </button>
          <button
            id="overview-filter-hospital"
            onClick={() => setFilterCategory('Hospital')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 ${
              filterCategory === 'Hospital'
                ? 'bg-[#8164AD] text-white font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Hospital className="w-3.5 h-3.5" />
            <span>Hospitals</span>
          </button>
          <button
            id="overview-filter-bank"
            onClick={() => setFilterCategory('Bank')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 ${
              filterCategory === 'Bank'
                ? 'bg-[#8164AD] text-white font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Landmark className="w-3.5 h-3.5" />
            <span>Banks</span>
          </button>
        </div>
      </div>

      {/* ==================================================== */}
      {/* 3. SIX CORE STAT CARDS (FIXED: Dark readable text!) */}
      {/* ==================================================== */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Today */}
        <div className="bg-white/95 backdrop-blur-xl p-4 rounded-2xl border border-[#D5C3EE] space-y-2 shadow-xs hover:border-[#8164AD] hover:shadow-md transition-all group">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Total Today</span>
            <div className="w-7 h-7 rounded-lg bg-[#F5EEFA] flex items-center justify-center text-[#8164AD] group-hover:bg-[#8164AD] group-hover:text-white transition-colors">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          {/* CRITICAL FIX: text-slate-900 ensures number is clearly visible */}
          <p id="stat-total-today" className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {activeStats.total}
          </p>
          <p className="text-[11px] text-slate-500 font-medium">Booked & active today</p>
        </div>

        {/* Waiting In Queue */}
        <div className="bg-white/95 backdrop-blur-xl p-4 rounded-2xl border border-amber-200 space-y-2 shadow-xs hover:border-amber-400 hover:shadow-md transition-all group">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-900">Waiting</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-colors">
              <Users className="w-3.5 h-3.5 animate-pulse" />
            </div>
          </div>
          <p id="stat-waiting-count" className="text-3xl font-extrabold text-amber-700 tracking-tight">
            {activeStats.waiting}
          </p>
          <p className="text-[11px] text-amber-700/80 font-medium">In line right now</p>
        </div>

        {/* Serving Now */}
        <div className="bg-white/95 backdrop-blur-xl p-4 rounded-2xl border border-emerald-200 space-y-2 shadow-xs hover:border-emerald-400 hover:shadow-md transition-all group">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">Serving</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
              <Play className="w-3.5 h-3.5 fill-current" />
            </div>
          </div>
          <p id="stat-serving-count" className="text-3xl font-extrabold text-emerald-700 tracking-tight">
            {activeStats.serving}
          </p>
          <p className="text-[11px] text-emerald-700/80 font-medium">At service counters</p>
        </div>

        {/* Completed */}
        <div className="bg-white/95 backdrop-blur-xl p-4 rounded-2xl border border-[#D5C3EE] space-y-2 shadow-xs hover:border-[#8164AD] hover:shadow-md transition-all group">
          <div className="flex items-center justify-between text-[#6A4C97]">
            <span className="text-xs font-bold uppercase tracking-wider text-[#53377F]">Completed</span>
            <div className="w-7 h-7 rounded-lg bg-[#F5EEFA] flex items-center justify-center text-[#8164AD] group-hover:bg-[#8164AD] group-hover:text-white transition-colors">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <p id="stat-completed-count" className="text-3xl font-extrabold text-[#6A4C97] tracking-tight">
            {activeStats.completed}
          </p>
          <p className="text-[11px] text-purple-700/80 font-medium">Consultations finished</p>
        </div>

        {/* Cancelled */}
        <div className="bg-white/95 backdrop-blur-xl p-4 rounded-2xl border border-rose-200 space-y-2 shadow-xs hover:border-rose-400 hover:shadow-md transition-all group">
          <div className="flex items-center justify-between text-rose-700">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-900">Cancelled</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600 group-hover:bg-rose-500 group-hover:text-white transition-colors">
              <XCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <p id="stat-cancelled-count" className="text-3xl font-extrabold text-rose-700 tracking-tight">
            {activeStats.cancelled}
          </p>
          <p className="text-[11px] text-rose-700/80 font-medium">Tokens forfeited</p>
        </div>

        {/* Estimated Avg Wait */}
        <div className="bg-white/95 backdrop-blur-xl p-4 rounded-2xl border border-sky-200 space-y-2 shadow-xs hover:border-sky-400 hover:shadow-md transition-all group">
          <div className="flex items-center justify-between text-sky-700">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-900">Avg Wait</span>
            <div className="w-7 h-7 rounded-lg bg-sky-50 flex items-center justify-center text-sky-600 group-hover:bg-sky-500 group-hover:text-white transition-colors">
              <Timer className="w-3.5 h-3.5" />
            </div>
          </div>
          <p id="stat-avg-wait" className="text-3xl font-extrabold text-sky-700 tracking-tight">
            {activeStats.avgWait}m
          </p>
          <p className="text-[11px] text-sky-700/80 font-medium">Est. per citizen</p>
        </div>
      </div>

      {/* ==================================================== */}
      {/* 4. CROWD LEVEL BADGE & TOP 3 BUSIEST DEPARTMENTS */}
      {/* ==================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Crowd Level Badge Card */}
        <div className="bg-white/90 backdrop-blur-xl p-6 rounded-2xl border border-[#D5C3EE] flex flex-col justify-between space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Crowd Status Badge
            </span>
            <span
              id="crowd-level-badge"
              className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ring-2 ${getCrowdLevelBadge(
                activeStats.crowdLevel
              )}`}
            >
              {activeStats.crowdLevel}
            </span>
          </div>

          <div className="space-y-1.5">
            <h4 className="text-lg font-bold text-slate-900">
              {activeStats.crowdLevel === 'HIGH'
                ? 'High Queue Demand'
                : activeStats.crowdLevel === 'MEDIUM'
                ? 'Moderate Footfall'
                : 'Optimal Queue Velocity'}
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Calculated across {activeStats.waiting} waiting citizens in{' '}
              {filterCategory === 'all' ? 'all facilities' : `${filterCategory} facilities`}.
            </p>
          </div>

          {/* Three-band spectrum */}
          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between text-[10px] font-semibold text-slate-500 uppercase">
              <span className="text-emerald-700">Low (0-25)</span>
              <span className="text-amber-700">Med (26-50)</span>
              <span className="text-rose-700">High (51+)</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden flex border border-[#D5C3EE]/40">
              <div
                className={`h-full transition-all duration-300 ${
                  activeStats.crowdLevel === 'LOW' ? 'bg-emerald-500 w-1/3' : 'bg-emerald-300 w-1/3'
                }`}
                title="Low"
              />
              <div
                className={`h-full transition-all duration-300 ${
                  activeStats.crowdLevel === 'MEDIUM' ? 'bg-amber-500 w-1/3' : 'bg-amber-300 w-1/3'
                }`}
                title="Medium"
              />
              <div
                className={`h-full transition-all duration-300 ${
                  activeStats.crowdLevel === 'HIGH' ? 'bg-rose-500 w-1/3' : 'bg-rose-300 w-1/3'
                }`}
                title="High"
              />
            </div>
          </div>
        </div>

        {/* TOP 3 BUSIEST DEPARTMENTS */}
        <div className="lg:col-span-2 bg-white/90 backdrop-blur-xl p-6 rounded-2xl border border-[#D5C3EE] space-y-4 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-[#E6DAF6]">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-200">
                <Flame className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Top 3 Busiest Departments</h3>
            </div>
            <span className="text-xs text-slate-500">
              Ranked by active waiting queue
            </span>
          </div>

          {top3Busiest.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No active departments found for the selected category.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {top3Busiest.map((dept, index) => {
                const rankColor =
                  index === 0
                    ? 'bg-rose-500 text-white'
                    : index === 1
                    ? 'bg-amber-500 text-white'
                    : 'bg-[#8164AD] text-white';

                return (
                  <div
                    key={dept.id || index}
                    className="p-3.5 rounded-xl bg-[#FAF7FD] border border-[#D5C3EE] space-y-2.5 flex flex-col justify-between hover:shadow-xs transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${rankColor}`}>
                        #{index + 1}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getLoadBadgeColor(
                          dept.loadStatus
                        )}`}
                      >
                        {dept.waitingCount} waiting
                      </span>
                    </div>

                    <div>
                      <h5 className="text-xs font-bold text-slate-900 truncate" title={dept.name}>
                        {dept.name}
                      </h5>
                      <p className="text-[11px] text-slate-500 truncate" title={dept.placeName}>
                        {dept.placeName}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-[#E6DAF6] flex items-center justify-between text-[10px] text-slate-600">
                      <span>Serving:</span>
                      <span className="font-bold text-slate-900 font-mono">
                        {dept.nowServing ? `#${dept.nowServing}` : 'Idle'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ==================================================== */}
      {/* 5. PER-DEPARTMENT COUNTER LOAD MONITOR */}
      {/* ==================================================== */}
      <div className="bg-white/90 backdrop-blur-xl p-6 rounded-2xl border border-[#D5C3EE] space-y-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E6DAF6]">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#8164AD]" />
              <span>Department Counter Load Monitor</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Live indicators: <span className="text-emerald-700 font-bold">Green (&lt;5)</span>,{' '}
              <span className="text-amber-700 font-bold">Yellow (5-14)</span>,{' '}
              <span className="text-rose-700 font-bold">Red (&ge;15)</span>.
            </p>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search department or place..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-xl bg-white border border-[#D5C3EE] text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#8164AD] w-64 shadow-2xs"
            />
          </div>
        </div>

        {/* Department Tiles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {searchFilteredDepts.map((dept) => (
            <div
              key={dept.id}
              className="p-4 rounded-xl bg-[#FAF7FD] border border-[#D5C3EE] hover:border-[#8164AD] hover:shadow-xs transition-all space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 pr-2">
                  <h4 className="text-xs font-bold text-slate-900 truncate" title={dept.name}>
                    {dept.name}
                  </h4>
                  <p className="text-[11px] text-slate-500 truncate" title={dept.placeName}>
                    {dept.placeName}
                  </p>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${getLoadBadgeColor(
                    dept.loadStatus
                  )}`}
                >
                  {dept.waitingCount} waiting
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E6DAF6] text-xs text-slate-600">
                <div>
                  <span className="text-[10px] uppercase text-slate-400 block font-semibold">Now Serving</span>
                  <span className="font-bold text-slate-900 font-mono text-xs">
                    {dept.nowServing ? `Token #${dept.nowServing}` : 'Standby'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 block font-semibold">Status</span>
                  <span
                    className={`font-semibold text-xs ${
                      dept.isPaused ? 'text-amber-700' : 'text-emerald-700'
                    }`}
                  >
                    {dept.isPaused ? '⏸️ Paused' : '▶️ Operational'}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {searchFilteredDepts.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-500 text-xs">
              No departments match the criteria.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;
