import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowRight, Clock, LogOut, Shield, User, Building2, Ticket } from 'lucide-react';

const Navbar = ({ isLight = true }) => {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getDashboardPath = () => {
    if (role === 'admin') return '/admin/dashboard';
    if (role === 'staff') return '/staff/dashboard';
    if (role === 'user') return '/user/dashboard';
    return '/';
  };

  return (
    <header
      className={`sticky top-0 z-50 w-full backdrop-blur-md transition-colors ${
        isLight
          ? 'bg-white/85 border-b border-[#D5C3EE]/80 shadow-sm shadow-[#53377F]/5'
          : 'glass-panel border-b border-[#D5C3EE]/30'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center space-x-3 group">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md transition-transform duration-200 group-hover:scale-105 ${
              isLight
                ? 'bg-gradient-to-tr from-[#8164AD] to-[#B19BD6] text-white shadow-[#8164AD]/25'
                : 'bg-gradient-to-tr from-[#987DC2] to-[#B19BD6] text-white shadow-[#B19BD6]/25'
            }`}
          >
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span
                className={`text-xl font-bold tracking-tight transition-colors ${
                  isLight
                    ? 'text-slate-900 group-hover:text-[#6A4C97]'
                    : 'text-white group-hover:text-[#D5C3EE]'
                }`}
              >
                Q-Flow
              </span>
              <span
                className={`px-1.5 py-0.5 text-[10px] uppercase tracking-wider font-semibold rounded border ${
                  isLight
                    ? 'bg-[#F3ECFB] text-[#6A4C97] border-[#D5C3EE]'
                    : 'bg-[#B19BD6]/20 text-[#D5C3EE] border-[#B19BD6]/30'
                }`}
              >
                Live
              </span>
            </div>
            <p className={`text-[11px] hidden sm:block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              Queue & Crowd Intelligence
            </p>
          </div>
        </Link>

        {/* Center / Right Nav Items */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          {/* Book Token shortcut (hidden for admin console) */}
          {role !== 'admin' && (
            <Link
              to="/book"
              id="nav-book-token"
              className={`hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                isLight
                  ? 'bg-[#8164AD] hover:bg-[#6A4C97] text-white shadow-sm shadow-[#8164AD]/20'
                  : 'bg-[#8164AD]/20 hover:bg-[#8164AD]/30 text-[#D5C3EE] border border-[#B19BD6]/30'
              }`}
            >
              <span>Book Token</span>
              <ArrowRight className="w-3 h-3 text-white" />
            </Link>
          )}

          {user ? (
            <div className="flex items-center space-x-2 sm:space-x-3">
              {role === 'user' && (
                <Link
                  to="/my-tokens"
                  id="nav-my-tokens"
                  className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    isLight
                      ? 'bg-white hover:bg-[#FAF7FD] border border-[#D5C3EE] text-slate-700 shadow-xs'
                      : 'bg-slate-850/80 hover:bg-slate-800/80 border border-[#D5C3EE]/30 text-slate-200'
                  }`}
                >
                  <Ticket className={`w-3.5 h-3.5 ${isLight ? 'text-[#8164AD]' : 'text-[#B19BD6]'}`} />
                  <span>My Tokens</span>
                </Link>
              )}

              <Link
                to={getDashboardPath()}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm transition-colors ${
                  isLight
                    ? 'bg-white hover:bg-[#FAF7FD] border border-[#D5C3EE] text-slate-800 shadow-xs'
                    : 'bg-slate-850/80 hover:bg-slate-800/80 border border-[#D5C3EE]/30 text-slate-200'
                }`}
              >
                {role === 'admin' && <Shield className={`w-4 h-4 ${isLight ? 'text-[#8164AD]' : 'text-[#B19BD6]'}`} />}
                {role === 'staff' && <Building2 className={`w-4 h-4 ${isLight ? 'text-[#987DC2]' : 'text-[#B19BD6]'}`} />}
                {role === 'user' && <User className={`w-4 h-4 ${isLight ? 'text-[#8164AD]' : 'text-[#B19BD6]'}`} />}
                <span className="font-medium truncate max-w-[100px] sm:max-w-none">
                  {user.name || user.username || 'Dashboard'}
                </span>
                <span
                  className={`text-[10px] uppercase px-1.5 py-0.5 rounded hidden sm:inline border ${
                    isLight
                      ? 'bg-[#F3ECFB] text-[#6A4C97] border-[#D5C3EE]'
                      : 'bg-slate-900 text-[#D5C3EE] border border-[#B19BD6]/30'
                  }`}
                >
                  {role}
                </span>
              </Link>

              <button
                onClick={handleLogout}
                className={`flex items-center space-x-1 px-2.5 py-1.5 text-xs rounded-lg transition-colors border ${
                  isLight
                    ? 'text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-transparent hover:border-rose-200'
                    : 'text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border-transparent hover:border-rose-500/20'
                }`}
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2 sm:space-x-3">
              {/* Small Admin entry at the top: arrow icon + text "Admin" */}
              <Link
                to="/admin/login"
                id="admin-login-link"
                className={`inline-flex items-center space-x-1 text-xs font-semibold px-2.5 py-1.5 rounded-md transition-all border ${
                  isLight
                    ? 'text-slate-600 hover:text-slate-900 hover:bg-[#F3ECFB] border-transparent hover:border-[#D5C3EE]'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60 border-transparent hover:border-[#D5C3EE]/30'
                }`}
              >
                <Shield className={`w-3.5 h-3.5 ${isLight ? 'text-[#8164AD]' : 'text-[#B19BD6]'}`} />
                <span>Admin</span>
                <ArrowRight className={`w-3 h-3 ${isLight ? 'text-slate-400' : 'text-slate-500'}`} />
              </Link>

              <Link
                to="/auth/user"
                className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${
                  isLight
                    ? 'text-slate-700 hover:text-slate-900 bg-white hover:bg-[#FAF7FD] border border-[#D5C3EE] shadow-xs'
                    : 'text-slate-300 hover:text-white bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60'
                }`}
              >
                User Login
              </Link>
              <Link
                to="/auth/staff"
                className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${
                  isLight
                    ? 'text-[#53377F] bg-[#F3ECFB] hover:bg-[#E6DAF6] border border-[#D5C3EE] font-semibold'
                    : 'text-[#D5C3EE] hover:text-white bg-[#53377F]/40 hover:bg-[#53377F]/70 border border-[#8164AD]/50'
                }`}
              >
                Staff Portal
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
