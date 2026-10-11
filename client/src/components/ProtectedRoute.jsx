import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = ({ children, allowedRole }) => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-4 border-brand-500/20 border-t-brand-500 animate-spin"></div>
          <Loader2 className="w-6 h-6 text-brand-400 absolute inset-0 m-auto animate-pulse" />
        </div>
        <p className="text-slate-400 text-sm tracking-wide">Validating session credentials...</p>
      </div>
    );
  }

  if (!user || !role) {
    // If not authenticated, redirect to appropriate login or landing
    if (allowedRole === 'admin') return <Navigate to="/admin/login" replace />;
    if (allowedRole === 'staff') return <Navigate to="/auth/staff" replace />;
    if (allowedRole === 'user') return <Navigate to="/auth/user" replace />;
    return <Navigate to="/" replace />;
  }

  // Check role match
  if (allowedRole && role !== allowedRole) {
    // Redirect to their own dashboard if mismatch
    if (role === 'admin') return <Navigate to="/admin/dashboard" replace />;
    if (role === 'staff') return <Navigate to="/staff/dashboard" replace />;
    if (role === 'user') return <Navigate to="/user/dashboard" replace />;
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
