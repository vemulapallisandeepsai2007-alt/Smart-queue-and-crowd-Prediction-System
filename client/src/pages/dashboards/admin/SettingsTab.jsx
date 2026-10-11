import React, { useState, useEffect } from 'react';
import {
  Sliders,
  ShieldAlert,
  Save,
  Loader2,
  Sparkles,
  Flame,
  Play,
  RotateCcw,
  Building2,
  CheckCircle2,
  Code2,
} from 'lucide-react';
import api from '../../../services/api';
import toast from 'react-hot-toast';

const SettingsTab = ({ onSettingsUpdated }) => {
  const [settings, setSettings] = useState({
    crowdAlertThreshold: 75,
    lowThreshold: 25,
    mediumThreshold: 50,
    highThreshold: 75,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Demo simulation state
  const [departments, setDepartments] = useState([]);
  const [simDeptId, setSimDeptId] = useState('');
  const [simCount, setSimCount] = useState(35);
  const [simLoading, setSimLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [simModalOpen, setSimModalOpen] = useState(false);

  useEffect(() => {
    const fetchInitial = async () => {
      setLoading(true);
      try {
        const [settingsRes, sumRes] = await Promise.all([
          api.get('/admin/settings'),
          api.get('/analytics/summary'),
        ]);

        if (settingsRes.data?.success && settingsRes.data.settings) {
          setSettings(settingsRes.data.settings);
        }

        if (sumRes.data?.success && sumRes.data.departmentLoads) {
          setDepartments(sumRes.data.departmentLoads);
          if (sumRes.data.departmentLoads.length > 0) {
            setSimDeptId(sumRes.data.departmentLoads[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load settings data:', err);
        toast.error('Failed to fetch settings configuration.');
      } finally {
        setLoading(false);
      }
    };
    fetchInitial();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (
      settings.lowThreshold >= settings.mediumThreshold ||
      settings.mediumThreshold >= settings.highThreshold
    ) {
      toast.error('Thresholds must follow order: Low < Medium < High');
      return;
    }

    setSaving(true);
    try {
      const res = await api.put('/admin/settings', settings);
      if (res.data?.success) {
        toast.success(res.data.message || 'System settings updated successfully!');
        if (onSettingsUpdated) onSettingsUpdated(res.data.settings);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleRunSimulation = async (e) => {
    if (e) e.preventDefault();
    if (!simDeptId) {
      toast.error('Please select a department for simulation.');
      return;
    }
    setSimLoading(true);
    try {
      const res = await api.post('/admin/simulate', {
        departmentId: simDeptId,
        count: Number(simCount) || 35,
      });
      if (res.data?.success) {
        toast.success(res.data.message || 'Simulation started!');
        setSimModalOpen(false);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to start simulation.');
    } finally {
      setSimLoading(false);
    }
  };

  const handleResetSimulation = async () => {
    if (!window.confirm('Reset all simulated demo tokens for today back to available?')) return;
    setResetLoading(true);
    try {
      const res = await api.post('/admin/simulate/reset');
      if (res.data?.success) {
        toast.success(res.data.message || 'Demo data reset successfully.');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to reset demo data.');
    } finally {
      setResetLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-4 border-[#8164AD]/20 border-t-[#8164AD] rounded-full animate-spin"></div>
        <p className="text-sm text-slate-500">Loading system settings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn pb-12">
      {/* Header Banner */}
      <div className="bg-white/90 backdrop-blur-xl p-6 rounded-2xl border border-[#D5C3EE] space-y-2 shadow-xs">
        <div className="flex items-center space-x-2 text-[#6A4C97]">
          <Sliders className="w-5 h-5 text-[#8164AD]" />
          <h2 className="text-xl font-bold text-slate-900">
            Crowd Intelligence & Threshold Settings
          </h2>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          Configure real-time overcrowding trigger limits and traffic classification bands. When the
          waiting queue length passes the alert threshold, the system immediately triggers a real-time
          Socket.IO dispatch with automated operational recommendations.
        </p>
      </div>

      {/* Threshold Configuration Form */}
      <form
        onSubmit={handleSave}
        className="bg-white/90 backdrop-blur-xl p-6 rounded-2xl border border-[#D5C3EE] space-y-6 shadow-xs"
      >
        <div className="space-y-6">
          {/* 1. Real-time Crowd Alert Threshold */}
          <div className="p-5 rounded-xl bg-rose-50/60 border border-rose-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                <div>
                  <h4 className="text-sm font-bold text-rose-950">
                    Real-Time Overcrowding Alert Threshold
                  </h4>
                  <p className="text-[11px] text-rose-700">
                    Triggers a high-priority Socket.IO banner broadcast to the administrative console.
                  </p>
                </div>
              </div>
              <span className="font-mono text-xl font-extrabold text-rose-700 bg-white px-3 py-1 rounded-lg border border-rose-300 shadow-xs">
                {settings.crowdAlertThreshold} citizens
              </span>
            </div>

            <input
              type="range"
              min="10"
              max="150"
              step="5"
              value={settings.crowdAlertThreshold}
              onChange={(e) =>
                setSettings({ ...settings, crowdAlertThreshold: Number(e.target.value) })
              }
              className="w-full accent-rose-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-rose-600/80 font-mono">
              <span>10 (Sensitive)</span>
              <span>75 (Default)</span>
              <span>150 (High Tolerance)</span>
            </div>
          </div>

          {/* 2. Crowd Level Classification Bands */}
          <div className="space-y-4 pt-2">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#8164AD]" />
              <span>Queue Load Classification Bands (LOW / MEDIUM / HIGH)</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {/* Low Threshold */}
              <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-2">
                <span className="text-emerald-800 font-bold block uppercase tracking-wider text-[10px]">
                  Low Crowd Limit (&le;)
                </span>
                <input
                  type="number"
                  min="5"
                  max="100"
                  value={settings.lowThreshold}
                  onChange={(e) =>
                    setSettings({ ...settings, lowThreshold: Number(e.target.value) })
                  }
                  className="w-full p-2.5 rounded-lg bg-white border border-emerald-300 text-slate-900 font-mono text-sm font-bold focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[10px] text-emerald-700">
                  0 to {settings.lowThreshold} waiting: classified as{' '}
                  <span className="text-emerald-900 font-bold">LOW</span>.
                </p>
              </div>

              {/* Medium Threshold */}
              <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 space-y-2">
                <span className="text-amber-800 font-bold block uppercase tracking-wider text-[10px]">
                  Medium Crowd Limit (&le;)
                </span>
                <input
                  type="number"
                  min={settings.lowThreshold + 1}
                  max="150"
                  value={settings.mediumThreshold}
                  onChange={(e) =>
                    setSettings({ ...settings, mediumThreshold: Number(e.target.value) })
                  }
                  className="w-full p-2.5 rounded-lg bg-white border border-amber-300 text-slate-900 font-mono text-sm font-bold focus:outline-none focus:border-amber-500"
                />
                <p className="text-[10px] text-amber-700">
                  {settings.lowThreshold + 1} to {settings.mediumThreshold} waiting: classified as{' '}
                  <span className="text-amber-900 font-bold">MEDIUM</span>.
                </p>
              </div>

              {/* High Threshold */}
              <div className="p-4 rounded-xl bg-rose-50/60 border border-rose-200 space-y-2">
                <span className="text-rose-800 font-bold block uppercase tracking-wider text-[10px]">
                  High Crowd Limit (&gt;)
                </span>
                <input
                  type="number"
                  min={settings.mediumThreshold + 1}
                  max="200"
                  value={settings.highThreshold}
                  onChange={(e) =>
                    setSettings({ ...settings, highThreshold: Number(e.target.value) })
                  }
                  className="w-full p-2.5 rounded-lg bg-white border border-rose-300 text-slate-900 font-mono text-sm font-bold focus:outline-none focus:border-rose-500"
                />
                <p className="text-[10px] text-rose-700">
                  Above {settings.highThreshold} waiting: classified as{' '}
                  <span className="text-rose-900 font-bold">HIGH</span>.
                </p>
              </div>
            </div>
          </div>

          {/* 3. Visual Spectrum Preview */}
          <div className="p-4 rounded-xl bg-[#FAF7FD] border border-[#D5C3EE] space-y-2 text-xs">
            <span className="text-slate-600 font-semibold block text-[11px]">
              Visual Band Range Distribution
            </span>
            <div className="w-full h-3 rounded-full flex overflow-hidden border border-[#D5C3EE]/50">
              <div
                style={{ width: `${(settings.lowThreshold / settings.highThreshold) * 45}%` }}
                className="bg-emerald-500 h-full transition-all"
                title={`Low: 0-${settings.lowThreshold}`}
              ></div>
              <div
                style={{
                  width: `${
                    ((settings.mediumThreshold - settings.lowThreshold) /
                      settings.highThreshold) *
                    45
                  }%`,
                }}
                className="bg-amber-500 h-full transition-all"
                title={`Medium: ${settings.lowThreshold + 1}-${settings.mediumThreshold}`}
              ></div>
              <div
                className="bg-rose-500 flex-1 h-full transition-all"
                title={`High: ${settings.highThreshold}+`}
              ></div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end pt-4 border-t border-[#E6DAF6]">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-[#8164AD] hover:bg-[#6A4C97] text-white font-bold text-xs shadow-md shadow-[#8164AD]/25 transition-all flex items-center space-x-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save Threshold Configuration</span>
          </button>
        </div>
      </form>

      {/* ==================================================== */}
      {/* 4. DEVELOPER / DEMO TOOLS SECTION */}
      {/* ==================================================== */}
      <div className="bg-white/90 backdrop-blur-xl p-6 rounded-2xl border border-[#D5C3EE] space-y-6 shadow-xs">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#8164AD] to-[#B19BD6] flex items-center justify-center text-white shadow-md shadow-[#8164AD]/25">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-slate-900">Developer / Demo Tools</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#F3ECFB] text-[#6A4C97] border border-[#D5C3EE]">
                  Simulation
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Simulate rapid citizen token bookings to test queue surge handling, Socket.IO live
                broadcasts, and real-time crowd alerts.
              </p>
            </div>
          </div>
        </div>

        {/* Simulation Controls Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Surge Simulation Panel */}
          <div className="p-4 rounded-xl bg-[#FAF7FD] border border-[#D5C3EE] space-y-4">
            <div className="flex items-center space-x-2">
              <Flame className="w-4 h-4 text-amber-500" />
              <h4 className="text-xs font-bold text-slate-900">Live Crowd Surge Simulator</h4>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Target Department:
                </label>
                <select
                  value={simDeptId}
                  onChange={(e) => setSimDeptId(e.target.value)}
                  className="w-full p-2 rounded-lg bg-white border border-[#D5C3EE] text-xs font-medium text-slate-800 focus:outline-none focus:border-[#8164AD]"
                >
                  {departments.length === 0 ? (
                    <option value="">No active departments found</option>
                  ) : (
                    departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name} ({dept.placeName})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[11px] font-semibold text-slate-600">
                    Bookings Count:
                  </label>
                  <span className="text-[11px] font-bold font-mono text-[#8164AD]">
                    {simCount} citizens
                  </span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="60"
                  step="5"
                  value={simCount}
                  onChange={(e) => setSimCount(Number(e.target.value))}
                  className="w-full accent-[#8164AD] cursor-pointer"
                />
              </div>

              <button
                type="button"
                onClick={handleRunSimulation}
                disabled={simLoading || !simDeptId}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#8164AD] to-[#9B80C9] hover:from-[#6A4C97] hover:to-[#8164AD] text-white text-xs font-bold transition-all shadow-md shadow-[#8164AD]/25 flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {simLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-white" />
                )}
                <span>Run Demo Simulation</span>
              </button>
            </div>
          </div>

          {/* Reset Demo Data Panel */}
          <div className="p-4 rounded-xl bg-[#FAF7FD] border border-[#D5C3EE] space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <RotateCcw className="w-4 h-4 text-slate-600" />
                <h4 className="text-xs font-bold text-slate-900">Reset Demo State</h4>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Clears all simulated token bookings created during the demonstration session for today
                and returns queues to an optimal baseline.
              </p>
            </div>

            <div className="pt-4">
              <button
                type="button"
                onClick={handleResetSimulation}
                disabled={resetLoading}
                className="w-full py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-[#D5C3EE] transition-all flex items-center justify-center space-x-2 shadow-xs disabled:opacity-50"
              >
                {resetLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#8164AD]" />
                ) : (
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                )}
                <span>Reset Demo Data</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsTab;
