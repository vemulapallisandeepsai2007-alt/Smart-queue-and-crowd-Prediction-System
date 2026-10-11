import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { Compass, Home, ArrowLeft } from 'lucide-react';

const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fcfaff] via-[#f4ecfb] to-[#e9ddf6] text-slate-800 flex flex-col selection:bg-[#B19BD6] selection:text-white">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white/90 backdrop-blur-xl p-8 rounded-3xl border border-[#D5C3EE]/90 text-center space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#B19BD6]/20 rounded-full blur-3xl pointer-events-none"></div>

          <div className="w-20 h-20 mx-auto rounded-3xl bg-[#F3ECFB] text-[#8164AD] border border-[#D5C3EE] flex items-center justify-center shadow-md">
            <Compass className="w-10 h-10 animate-spin" style={{ animationDuration: '20s' }} />
          </div>

          <div className="space-y-2">
            <span className="text-4xl font-black text-[#8164AD] font-mono tracking-tight">404</span>
            <h1 className="text-xl font-bold text-slate-900">Destination Page Not Found</h1>
            <p className="text-xs text-slate-600 leading-relaxed">
              The queue route or link you followed does not exist or may have been relocated.
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 rounded-xl bg-white hover:bg-[#FAF7FD] text-slate-700 font-semibold text-xs border border-[#D5C3EE] transition-all flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Go Back</span>
            </button>
            <Link
              to="/"
              className="px-4 py-2 rounded-xl bg-[#8164AD] hover:bg-[#6A4C97] text-white font-semibold text-xs transition-all flex items-center gap-1.5 shadow-md shadow-[#8164AD]/25"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Back to Home</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default NotFoundPage;
