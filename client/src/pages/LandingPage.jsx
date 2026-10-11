import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import {
  Users,
  Building2,
  ArrowRight,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fcfaff] via-[#f4ecfb] to-[#e9ddf6] text-slate-800 flex flex-col relative overflow-hidden selection:bg-[#B19BD6] selection:text-white">
      {/* Ambient decorative soft lavender glow blobs */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#D5C3EE]/45 rounded-full blur-3xl pointer-events-none -z-0" />
      <div className="absolute top-1/2 -right-32 w-80 h-80 bg-[#B19BD6]/35 rounded-full blur-3xl pointer-events-none -z-0" />
      <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-[#E6DAF6]/60 rounded-full blur-3xl pointer-events-none -z-0" />

      <Navbar isLight={true} />

      <main className="relative z-10 flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16 w-full flex flex-col justify-center">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-[#F3ECFB] border border-[#D5C3EE] text-[#6A4C97] text-xs font-semibold uppercase tracking-wider shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-[#8164AD]" />
            <span>Next-Gen Smart Token & Crowd Dispatch</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-tight">
            Smart Queue & <br />
            <span className="bg-gradient-to-r from-[#53377F] via-[#8164AD] to-[#B19BD6] bg-clip-text text-transparent">
              Crowd Prediction System
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-700 max-w-2xl mx-auto leading-relaxed">
            Eliminate chaotic queues in hospitals and banks. Experience digital token reservation,
            real-time crowd telemetry, and synchronized counter operations across Guntur.
          </p>
        </div>

        {/* The Two Main Role Cards */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto w-full">
          {/* Card 1: I'm a User */}
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-8 border border-[#D5C3EE]/90 hover:border-[#B19BD6] transition-all duration-300 flex flex-col justify-between group shadow-lg shadow-[#53377F]/5 hover:shadow-xl hover:-translate-y-1">
            <div className="space-y-5">
              <div className="w-14 h-14 rounded-2xl bg-[#F3ECFB] border border-[#D5C3EE] flex items-center justify-center text-[#8164AD] group-hover:scale-110 transition-transform">
                <Users className="w-7 h-7" />
              </div>

              <div>
                <span className="text-xs uppercase font-bold text-[#8164AD] tracking-wider">
                  For Citizens & Visitors
                </span>
                <h2 className="text-2xl font-bold text-slate-900 mt-1">I'm a User</h2>
                <p className="text-slate-600 text-sm mt-2 leading-relaxed">
                  Book appointment tokens, track your place in the live queue from your phone,
                  and arrive right when your doctor or bank counter is ready.
                </p>
              </div>

              <div className="space-y-2.5 pt-2">
                <div className="flex items-center space-x-2 text-xs text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-[#8164AD] shrink-0" />
                  <span>Real-time queue tracking and ETA countdown</span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-[#8164AD] shrink-0" />
                  <span>Browse Guntur hospitals & bank branches</span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-[#8164AD] shrink-0" />
                  <span>SMS & digital token notifications</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-[#E6DAF6] flex flex-col sm:flex-row gap-3">
              <Link
                to="/auth/user?mode=signin"
                id="user-signin-btn"
                className="flex-1 inline-flex items-center justify-center space-x-2 px-5 py-3 rounded-xl bg-[#8164AD] hover:bg-[#6A4C97] text-white font-semibold text-sm shadow-md shadow-[#8164AD]/25 transition-all"
              >
                <span>Sign In as User</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/auth/user?mode=signup"
                id="user-signup-btn"
                className="inline-flex items-center justify-center px-4 py-3 rounded-xl bg-[#FAF7FD] hover:bg-[#F3ECFB] text-[#6A4C97] font-semibold text-sm border border-[#D5C3EE] transition-colors"
              >
                <span>Sign Up</span>
              </Link>
            </div>
          </div>

          {/* Card 2: I'm Staff / Counter */}
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-8 border border-[#D5C3EE]/90 hover:border-[#B19BD6] transition-all duration-300 flex flex-col justify-between group shadow-lg shadow-[#53377F]/5 hover:shadow-xl hover:-translate-y-1">
            <div className="space-y-5">
              <div className="w-14 h-14 rounded-2xl bg-[#F3ECFB] border border-[#D5C3EE] flex items-center justify-center text-[#6A4C97] group-hover:scale-110 transition-transform">
                <Building2 className="w-7 h-7" />
              </div>

              <div>
                <span className="text-xs uppercase font-bold text-[#6A4C97] tracking-wider">
                  For Hospital & Bank Staff
                </span>
                <h2 className="text-2xl font-bold text-slate-900 mt-1">I'm Staff / Counter</h2>
                <p className="text-slate-600 text-sm mt-2 leading-relaxed">
                  Call next patient tokens, monitor waiting hall density, adjust consultation time,
                  and keep counters moving efficiently without crowding.
                </p>
              </div>

              <div className="space-y-2.5 pt-2">
                <div className="flex items-center space-x-2 text-xs text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-[#8164AD] shrink-0" />
                  <span>One-click token calling and status update</span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-[#8164AD] shrink-0" />
                  <span>Category support for Hospitals and Banks</span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-[#8164AD] shrink-0" />
                  <span>Secure staff onboarding with Admin approval</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-[#E6DAF6] flex flex-col sm:flex-row gap-3">
              <Link
                to="/auth/staff?mode=signin"
                id="staff-signin-btn"
                className="flex-1 inline-flex items-center justify-center space-x-2 px-5 py-3 rounded-xl bg-[#6A4C97] hover:bg-[#53377F] text-white font-semibold text-sm shadow-md shadow-[#6A4C97]/25 transition-all"
              >
                <span>Staff Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/auth/staff?mode=signup"
                id="staff-signup-btn"
                className="inline-flex items-center justify-center px-4 py-3 rounded-xl bg-[#FAF7FD] hover:bg-[#F3ECFB] text-[#6A4C97] font-semibold text-sm border border-[#D5C3EE] transition-colors"
              >
                <span>Sign Up</span>
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[#D5C3EE]/80 py-6 text-center text-xs text-slate-600">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Q-Flow &bull; Smart Queue & Crowd Prediction System &copy; 2025</span>
          <span className="text-[#6A4C97] font-mono text-[11px] font-medium">Guntur, Andhra Pradesh Pilot Project</span>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
