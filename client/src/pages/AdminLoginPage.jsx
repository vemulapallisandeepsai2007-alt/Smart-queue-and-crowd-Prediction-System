import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { Shield, Lock, User, ArrowRight, Loader2, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';

const AdminLoginPage = () => {
  const navigate = useNavigate();
  const { user, role, loginAdmin } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && role === 'admin') {
      navigate('/admin/dashboard');
    }
  }, [user, role, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      toast.error('Username is required');
      return;
    }
    if (!password) {
      toast.error('Password is required');
      return;
    }

    setLoading(true);
    const res = await loginAdmin({
      username: username.trim().toLowerCase(),
      password,
    });
    setLoading(false);

    if (res.success) {
      navigate('/admin/dashboard');
    }
  };

  const fillAdminCredentials = () => {
    setUsername('admin');
    setPassword('Admin@12345');
    toast.success('Admin seed credentials filled!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fcfaff] via-[#f4ecfb] to-[#e9ddf6] text-slate-800 flex flex-col selection:bg-[#B19BD6] selection:text-white">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md">
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-8 border border-[#D5C3EE]/90 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#B19BD6]/15 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>

            {/* Header */}
            <div className="text-center space-y-2 mb-8">
              <div className="inline-flex p-3 rounded-2xl bg-[#F3ECFB] text-[#6A4C97] mb-1 border border-[#D5C3EE] shadow-xs">
                <Shield className="w-7 h-7" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Administrator</h1>
              <p className="text-xs text-slate-600">
                Secure root console for Smart Queue management & facility dispatch
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Administrator Username
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. admin"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full glass-input rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Security Passcode
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full glass-input rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-[#8164AD] hover:bg-[#6A4C97] text-white font-semibold text-sm shadow-md shadow-[#8164AD]/25 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Authenticate Console</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Development-Only Helper Button (Automatically stripped out in official production deployments) */}
              {import.meta.env.DEV && (
                <div className="pt-4 border-t border-[#E6DAF6] text-center">
                  <div className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-amber-50 text-amber-700 border border-amber-200 mb-2 font-medium">
                    Local Dev Only • Hidden in Official Deployment
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={fillAdminCredentials}
                      className="text-xs text-[#6A4C97] hover:text-[#53377F] font-medium transition-colors inline-flex items-center space-x-1.5"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-[#8164AD]" />
                      <span>Autofill Seed Admin Credentials (admin / Admin@12345)</span>
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminLoginPage;
