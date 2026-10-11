import React from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import { useAuth } from '../../context/AuthContext';
import {
  User,
  Phone,
  Calendar,
  Clock,
  Hospital,
  Landmark,
  Ticket,
  ChevronRight,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

const UserDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fcfaff] via-[#f4ecfb] to-[#e9ddf6] text-slate-800 flex flex-col selection:bg-[#B19BD6] selection:text-white">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
        {/* Welcome Banner */}
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-6 sm:p-8 border border-[#D5C3EE] shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#B19BD6]/15 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#8164AD] to-[#B19BD6] flex items-center justify-center text-white shadow-lg shadow-[#8164AD]/25">
                <User className="w-8 h-8" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                    Welcome, {user?.name || 'Citizen'}!
                  </h1>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#F3ECFB] text-[#6A4C97] border border-[#D5C3EE]">
                    User Role
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 mt-1">
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    +91 {user?.phone}
                  </span>
                  <span>&bull;</span>
                  <span>Gender: {user?.gender || 'N/A'}</span>
                  {user?.dob && (
                    <>
                      <span>&bull;</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        DOB: {new Date(user.dob).toLocaleDateString()}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="px-4 py-2 rounded-xl bg-[#FAF7FD] border border-[#D5C3EE] text-xs text-[#6A4C97] flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-[#8164AD]" />
              <span>JWT Session Verified</span>
            </div>
          </div>
        </div>

        {/* Phase Notice Card */}
        <div className="bg-white/85 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-[#D5C3EE] flex items-start space-x-3.5 shadow-xs">
          <div className="p-2 rounded-xl bg-[#F3ECFB] text-[#8164AD] shrink-0 border border-[#D5C3EE]">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="text-xs space-y-1">
            <h2 className="font-semibold text-slate-900 text-sm">
              Live Queue & Smart Dispatch Operational
            </h2>
            <p className="text-slate-600 leading-relaxed">
              You are authenticated with role <strong className="text-[#6A4C97]">"user"</strong>.
              All data models, rate limiting, and Guntur hospital/bank facilities are active.
              Reserve instant appointment tokens and observe real-time crowd telemetry.
            </p>
          </div>
        </div>

        {/* Quick Actions Bar */}
        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={() => navigate('/book')}
            id="dashboard-book-btn"
            className="flex-1 sm:flex-none inline-flex items-center justify-center space-x-2 px-6 py-3 rounded-xl bg-[#8164AD] hover:bg-[#6A4C97] text-white font-semibold text-xs sm:text-sm shadow-md shadow-[#8164AD]/25 transition-all"
          >
            <Ticket className="w-4 h-4" />
            <span>Book a New Token</span>
          </button>
          <button
            onClick={() => navigate('/my-tokens')}
            id="dashboard-my-tokens-btn"
            className="flex-1 sm:flex-none inline-flex items-center justify-center space-x-2 px-6 py-3 rounded-xl bg-white hover:bg-[#FAF7FD] text-slate-700 font-semibold text-xs sm:text-sm border border-[#D5C3EE] transition-all shadow-xs"
          >
            <span>My Booked Tokens</span>
          </button>
        </div>

        {/* Categories Explorer Preview */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <span>Explore Facilities in Guntur, Andhra Pradesh</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Hospitals Card */}
            <div
              onClick={() => navigate('/book/places?category=Hospital')}
              className="bg-white/90 backdrop-blur-xl rounded-2xl p-6 border border-[#D5C3EE] hover:border-[#B19BD6] shadow-sm hover:shadow-md transition-all group cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-xl bg-[#F3ECFB] border border-[#D5C3EE] flex items-center justify-center text-[#8164AD] group-hover:scale-105 transition-transform">
                  <Hospital className="w-6 h-6" />
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#F3ECFB] text-[#6A4C97] border border-[#D5C3EE]">
                  Hospitals & OPD
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mt-4">Hospitals & Doctor OPDs</h3>
              <p className="text-xs text-slate-600 mt-1">
                Ramesh Hospitals, GGH Guntur, NRI Hospital, Manipal Tadepalli, and St. Joseph with verified specialist rosters.
              </p>
              <div className="mt-5 pt-4 border-t border-[#E6DAF6] flex items-center justify-between text-xs text-[#8164AD] font-medium">
                <span>View Hospital OPD Queues</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Banks Card */}
            <div
              onClick={() => navigate('/book/places?category=Bank')}
              className="bg-white/90 backdrop-blur-xl rounded-2xl p-6 border border-[#D5C3EE] hover:border-[#B19BD6] shadow-sm hover:shadow-md transition-all group cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-xl bg-[#F3ECFB] border border-[#D5C3EE] flex items-center justify-center text-[#6A4C97] group-hover:scale-105 transition-transform">
                  <Landmark className="w-6 h-6" />
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#F3ECFB] text-[#6A4C97] border border-[#D5C3EE]">
                  Banking Branches
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mt-4">Banking Service Desks</h3>
              <p className="text-xs text-slate-600 mt-1">
                State Bank of India (Arundalpet), HDFC Bank (Brodipet), and ICICI Bank (Lakshmipuram) teller counters.
              </p>
              <div className="mt-5 pt-4 border-t border-[#E6DAF6] flex items-center justify-between text-xs text-[#6A4C97] font-medium">
                <span>View Bank Counters & Wait-Times</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </div>

        {/* Live Queue Demo Token Simulation */}
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-6 border border-[#D5C3EE] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Ticket className="w-5 h-5 text-[#8164AD]" />
              <h2 className="text-base font-bold text-slate-900">Active Queue Preview Widget</h2>
            </div>
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-[#8164AD] animate-spin" />
              Real-time sync active
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-[#FAF7FD] border border-[#D5C3EE]">
              <p className="text-xs text-slate-500">Current Serving Token</p>
              <p className="text-2xl font-black text-[#8164AD] mt-1">#A-042</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Counter 01 &bull; Cash Desk</p>
            </div>
            <div className="p-4 rounded-xl bg-[#FAF7FD] border border-[#D5C3EE]">
              <p className="text-xs text-slate-500">Your Reserved Slot</p>
              <p className="text-2xl font-black text-[#6A4C97] mt-1">#A-048</p>
              <p className="text-[11px] text-slate-500 mt-0.5">6 tokens ahead in line</p>
            </div>
            <div className="p-4 rounded-xl bg-[#FAF7FD] border border-[#D5C3EE]">
              <p className="text-xs text-slate-500">Predicted Wait Duration</p>
              <p className="text-2xl font-black text-amber-700 mt-1">~ 18 mins</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Calculated from avg speed</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default UserDashboard;
