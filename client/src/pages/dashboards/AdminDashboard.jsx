import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { getSocket } from '../../services/socket';
import {
  LayoutDashboard,
  Building2,
  UserCheck,
  Sliders,
  Shield,
  ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';

import OverviewTab from './admin/OverviewTab';
import HospitalsAndBanksTab from './admin/HospitalsAndBanksTab';
import StaffManagementTab from './admin/StaffManagementTab';
import SettingsTab from './admin/SettingsTab';

const AdminDashboard = ({ initialTab }) => {
  const { user } = useAuth();
  const location = useLocation();
  const { id: placeIdParam } = useParams();

  // Determine initial tab from props or route
  const defaultTab = placeIdParam || location.pathname.includes('/places') ? 'places' : (initialTab || 'overview');
  const [activeTab, setActiveTab] = useState(defaultTab);

  // Synchronize tab if route changes
  useEffect(() => {
    if (placeIdParam || location.pathname.includes('/places')) {
      setActiveTab('places');
    }
  }, [placeIdParam, location.pathname]);

  // Admin Data State
  const [summary, setSummary] = useState(null);
  const [departmentLoads, setDepartmentLoads] = useState([]);
  const [pendingStaff, setPendingStaff] = useState([]);
  const [allStaff, setAllStaff] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);

  // Live Crowd Alert Banner
  const [activeAlert, setActiveAlert] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);

  // Fetch summary & core admin data
  const loadAdminData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);

    try {
      const [sumRes, pendingRes, allStaffRes, facRes] = await Promise.all([
        api.get('/analytics/summary'),
        api.get('/admin/staff?status=pending'),
        api.get('/admin/staff'),
        api.get('/admin/facilities'),
      ]);

      if (sumRes.data?.success) {
        setSummary(sumRes.data.summary);
        setDepartmentLoads(sumRes.data.departmentLoads || []);
      }
      if (pendingRes.data?.success) setPendingStaff(pendingRes.data.staff || []);
      if (allStaffRes.data?.success) setAllStaff(allStaffRes.data.staff || []);
      if (facRes.data?.success) setFacilities(facRes.data.places || []);
    } catch (err) {
      console.error('Failed to load admin data:', err);
      toast.error('Could not load administrative console data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  // Socket.IO Real-time Synchronization
  useEffect(() => {
    const socket = getSocket();
    setSocketConnected(socket.connected);

    const onConnect = () => {
      setSocketConnected(true);
      socket.emit('join:admin');
    };

    const onDisconnect = () => {
      setSocketConnected(false);
    };

    // Live Overcrowding Alert from Backend
    const handleCrowdAlert = (alertData) => {
      setActiveAlert(alertData);
      toast(
        `🚨 CROWD ALERT: Overcrowding at ${alertData.departmentName} (${alertData.waitingCount} waiting)! ${alertData.recommendation}`,
        {
          duration: 9000,
          icon: '⚠️',
          style: {
            background: '#4c0519',
            color: '#fecdd3',
            border: '2px solid #e11d48',
            fontWeight: 'bold',
          },
        }
      );
      loadAdminData(true);
    };

    const handleStatsUpdated = () => {
      loadAdminData(true);
    };

    const handleTokenUpdated = () => {
      loadAdminData(true);
    };

    const handleNowServing = () => {
      loadAdminData(true);
    };

    const handleCounterPaused = () => {
      loadAdminData(true);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('crowd:alert', handleCrowdAlert);
    socket.on('admin:statsUpdated', handleStatsUpdated);
    socket.on('token:updated', handleTokenUpdated);
    socket.on('queue:nowServing', handleNowServing);
    socket.on('counter:paused', handleCounterPaused);

    // Initial join if already connected
    if (socket.connected) {
      socket.emit('join:admin');
    }

    return () => {
      socket.emit('leave:admin');
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('crowd:alert', handleCrowdAlert);
      socket.off('admin:statsUpdated', handleStatsUpdated);
      socket.off('token:updated', handleTokenUpdated);
      socket.off('queue:nowServing', handleNowServing);
      socket.off('counter:paused', handleCounterPaused);
    };
  }, [loadAdminData]);

  // TAB DEFINITIONS (Overview, Hospitals & Banks, Staff, Settings)
  const navTabs = [
    {
      id: 'overview',
      name: 'Overview',
      icon: LayoutDashboard,
      desc: 'Live Queue & Crowd Status',
    },
    {
      id: 'places',
      name: 'Hospitals & Banks',
      icon: Building2,
      desc: 'Locations, Rosters & Live Tokens',
    },
    {
      id: 'staff',
      name: 'Staff',
      icon: UserCheck,
      desc: 'Authorizations & Rosters',
      badge: pendingStaff?.length || null,
    },
    {
      id: 'settings',
      name: 'Settings',
      icon: Sliders,
      desc: 'Crowd Thresholds & Demo Tools',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fcfaff] via-[#f4ecfb] to-[#e9ddf6] text-slate-800 flex flex-col selection:bg-[#B19BD6] selection:text-white">
      <Navbar />

      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex flex-col md:flex-row gap-6">
        {/* ==================================================== */}
        {/* SIDEBAR NAVIGATION */}
        {/* ==================================================== */}
        <aside className="w-full md:w-64 shrink-0 space-y-4">
          {/* Admin Profile Mini Card */}
          <div className="bg-white/90 backdrop-blur-xl p-4 rounded-2xl border border-[#D5C3EE] space-y-3 shadow-xs">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#8164AD] to-[#B19BD6] flex items-center justify-center text-white shadow-md shadow-[#8164AD]/25">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 leading-tight">
                  {user?.username || 'Super Admin'}
                </h2>
                <span className="text-[10px] uppercase tracking-wider font-semibold text-[#8164AD]">
                  Central Administration
                </span>
              </div>
            </div>

            {/* Socket Live Beacon: Replaced text with small green "Live" dot */}
            <div className="flex items-center justify-between pt-2 border-t border-[#E6DAF6] text-xs">
              <span className="text-slate-500 font-medium">Status</span>
              <div className="flex items-center gap-1.5 font-bold">
                <span
                  className={`w-2 h-2 rounded-full ${
                    socketConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                  }`}
                />
                <span className={socketConnected ? 'text-emerald-700 font-semibold' : 'text-rose-600'}>
                  {socketConnected ? 'Live' : 'Connecting'}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="bg-white/90 backdrop-blur-xl p-2 rounded-2xl border border-[#D5C3EE] space-y-1 shadow-xs">
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`admin-tab-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl transition-all text-left ${
                    isActive
                      ? 'bg-[#8164AD] text-white font-bold shadow-md shadow-[#8164AD]/25'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-[#FAF7FD]'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <div className="truncate">
                      <div className="text-xs font-semibold leading-tight">{tab.name}</div>
                      <div className={`text-[10px] truncate ${isActive ? 'text-purple-100' : 'text-slate-400'}`}>
                        {tab.desc}
                      </div>
                    </div>
                  </div>

                  {tab.badge ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-400 text-slate-900 shrink-0">
                      {tab.badge}
                    </span>
                  ) : (
                    isActive && <ChevronRight className="w-3.5 h-3.5 shrink-0 text-white" />
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* ==================================================== */}
        {/* MAIN CONTENT AREA */}
        {/* ==================================================== */}
        <main className="flex-1 min-w-0 space-y-6">
          {/* Top Bar Header (Sync button removed) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#D5C3EE]">
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#F3ECFB] text-[#6A4C97] border border-[#D5C3EE]">
                  Admin Control Portal
                </span>
                <span className="text-xs text-slate-500">
                  {new Date().toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
                {navTabs.find((t) => t.id === activeTab)?.name || 'Admin Console'}
              </h1>
            </div>
          </div>

          {/* TAB CONTENT SWITCHER */}
          {activeTab === 'overview' && (
            <OverviewTab
              summary={summary}
              departmentLoads={departmentLoads}
              activeAlert={activeAlert}
              onDismissAlert={() => setActiveAlert(null)}
              onRefresh={() => loadAdminData(true)}
              loading={loading}
            />
          )}

          {activeTab === 'places' && (
            <HospitalsAndBanksTab
              selectedPlaceIdProp={placeIdParam}
              onSelectPlaceProp={(placeId) => {
                if (!placeId) {
                  // return to list
                }
              }}
            />
          )}

          {activeTab === 'staff' && (
            <StaffManagementTab
              pendingStaff={pendingStaff}
              allStaff={allStaff}
              facilities={facilities}
              onRefresh={() => loadAdminData(true)}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsTab
              onSettingsUpdated={(newSettings) => {
                setSummary((prev) =>
                  prev ? { ...prev, thresholds: newSettings } : prev
                );
                loadAdminData(true);
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
