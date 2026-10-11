import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  Clock,
  Calendar,
  Sparkles,
  AlertCircle,
  HelpCircle,
  Activity,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import api from '../../../services/api';
import toast from 'react-hot-toast';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-3 rounded-xl bg-slate-900/95 border border-slate-700 shadow-xl text-xs space-y-1">
        <p className="font-bold text-white">{label}</p>
        {payload.map((item, idx) => (
          <p key={idx} style={{ color: item.color }} className="font-semibold flex items-center gap-1.5">
            <span>{item.name}:</span>
            <span className="font-mono text-white">{item.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const AnalyticsTab = () => {
  const [peakHoursData, setPeakHoursData] = useState([]);
  const [dailyVisitorsData, setDailyVisitorsData] = useState([]);
  const [predictionData, setPredictionData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const [peakRes, dailyRes, predRes] = await Promise.all([
          api.get('/analytics/peak-hours'),
          api.get('/analytics/daily-visitors?days=14'),
          api.get('/analytics/crowd-prediction'),
        ]);

        if (peakRes.data?.success) setPeakHoursData(peakRes.data.peakHours || []);
        if (dailyRes.data?.success) setDailyVisitorsData(dailyRes.data.dailyVisitors || []);
        if (predRes.data?.success) setPredictionData(predRes.data);
      } catch (err) {
        console.error('Failed to load analytics data:', err);
        toast.error('Could not load analytics charts.');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  const getPredictionBarColor = (level) => {
    switch (level) {
      case 'HIGH':
        return '#f43f5e'; // rose-500
      case 'MEDIUM':
        return '#f59e0b'; // amber-500
      case 'LOW':
      default:
        return '#b19bd6'; // Pantone 15-3817 TCX Lavender
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
        <p className="text-sm text-slate-400">Loading analytics & crowd predictions...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* 1. Crowd Prediction Highlight Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-950/60 via-slate-900 to-slate-900 border border-indigo-500/30 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 z-10 relative">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-indigo-400" />
                Crowd Prediction AI
              </span>
              <span className="text-xs text-slate-400">
                Confidence: <span className="font-bold uppercase text-indigo-300">{predictionData?.confidence || 'High'}</span>
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              {predictionData?.peakSummary || 'Expected crowd at 11:00 AM: HIGH'}
            </h2>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              {predictionData?.confidenceNote ||
                'Regression based on same-weekday queue analytics across the past 8 weeks. Predicts surge hours to proactively allocate counter resources.'}
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0 bg-slate-950/80 p-4 rounded-xl border border-slate-800">
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Peak Window</span>
              <span className="text-lg font-bold text-white">
                {predictionData?.peakHour?.hour || '11:00 AM'}
              </span>
            </div>
            <div className="w-px h-8 bg-slate-800"></div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Projected Level</span>
              <span
                className={`text-sm font-extrabold uppercase px-2 py-0.5 rounded ${
                  predictionData?.peakHour?.level === 'HIGH'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}
              >
                {predictionData?.peakHour?.level || 'HIGH'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Hourly Crowd Prediction Chart (Recharts) */}
      <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-400" />
              <span>Hourly Crowd Prediction for Today</span>
            </h3>
            <p className="text-xs text-slate-400">
              Expected token bookings by operating hour. Lavender = LOW, Yellow = MEDIUM, Rose = HIGH.
            </p>
          </div>

          <div className="flex items-center space-x-4 text-xs">
            <span className="flex items-center gap-1.5 text-[#8164AD] font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-[#B19BD6]"></span> LOW
            </span>
            <span className="flex items-center gap-1.5 text-amber-400 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> MEDIUM
            </span>
            <span className="flex items-center gap-1.5 text-rose-400 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> HIGH
            </span>
          </div>
        </div>

        <div className="h-72 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={predictionData?.hourlyPredictions || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="hour" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload;
                    return (
                      <div className="p-3 rounded-xl bg-slate-900/95 border border-slate-700 text-xs shadow-xl space-y-1">
                        <p className="font-bold text-white">{label}</p>
                        <p className="text-slate-300">
                          Expected bookings: <span className="font-mono font-bold text-white">{item.expectedBookings}</span>
                        </p>
                        <p className="text-xs font-semibold" style={{ color: getPredictionBarColor(item.level) }}>
                          Crowd Status: {item.level}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="expectedBookings" radius={[6, 6, 0, 0]}>
                {(predictionData?.hourlyPredictions || []).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getPredictionBarColor(entry.level)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. Dual Charts Grid: Peak Hours (Bar) & Daily Visitors (Area) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Peak Hours (Last 30 Days) */}
        <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-400" />
              <span>Peak Hours (Last 30 Days)</span>
            </h3>
            <p className="text-xs text-slate-400">
              Aggregated historical citizen bookings grouped by hour of the day.
            </p>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={peakHoursData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="hour" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="bookings" name="Bookings" fill="#8164AD" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Daily Visitors (Last 14 Days) */}
        <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#8164AD]" />
              <span>Daily Visitors (Last 14 Days)</span>
            </h3>
            <p className="text-xs text-slate-400">
              Total footfall vs completed appointments trend over time.
            </p>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyVisitorsData}>
                <defs>
                  <linearGradient id="visitorGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#b19bd6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#b19bd6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="label" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="visitors"
                  name="Total Visitors"
                  stroke="#b19bd6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#visitorGradient)"
                />
                <Area
                  type="monotone"
                  dataKey="completed"
                  name="Completed"
                  stroke="#8164ad"
                  strokeWidth={2}
                  fillOpacity={0}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsTab;
