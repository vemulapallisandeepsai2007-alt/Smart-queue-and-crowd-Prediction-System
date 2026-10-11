import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import LandingPage from './pages/LandingPage';
import UserAuthPage from './pages/UserAuthPage';
import StaffAuthPage from './pages/StaffAuthPage';
import AdminLoginPage from './pages/AdminLoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import UserDashboard from './pages/dashboards/UserDashboard';
import StaffDashboard from './pages/dashboards/StaffDashboard';
import AdminDashboard from './pages/dashboards/AdminDashboard';
import CategoryPage from './pages/booking/CategoryPage';
import PlacesPage from './pages/booking/PlacesPage';
import PlaceDepartmentsPage from './pages/booking/PlaceDepartmentsPage';
import TokenGridPage from './pages/booking/TokenGridPage';
import MyTokensPage from './pages/booking/MyTokensPage';

import ErrorBoundary from './components/ErrorBoundary';
import NotFoundPage from './pages/NotFoundPage';

function App() {
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-b from-[#fcfaff] via-[#f4ecfb] to-[#e9ddf6] text-slate-800 selection:bg-[#b19bd6] selection:text-white">
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#ffffff',
            color: '#1e1b4b',
            border: '1px solid #d5c3ee',
            fontSize: '13px',
            borderRadius: '12px',
            boxShadow: '0 10px 25px -5px rgba(106, 76, 151, 0.12)',
          },
          success: {
            iconTheme: {
              primary: '#8164ad',
              secondary: '#ffffff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#ffffff',
            },
          },
        }}
      />

      <Routes>
        {/* Public & Booking Flow Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth/user" element={<UserAuthPage />} />
        <Route path="/auth/staff" element={<StaffAuthPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />

        {/* User Flow (Category -> Location/Places -> Place/Departments -> Token Grid) */}
        <Route path="/book" element={<CategoryPage />} />
        <Route path="/book/places" element={<PlacesPage />} />
        <Route path="/book/places/:placeId" element={<PlaceDepartmentsPage />} />
        <Route path="/book/departments/:deptId" element={<TokenGridPage />} />

        {/* My Tokens (User Protected) */}
        <Route
          path="/my-tokens"
          element={
            <ProtectedRoute allowedRole="user">
              <MyTokensPage />
            </ProtectedRoute>
          }
        />

        {/* Protected Dashboards by Role */}
        <Route
          path="/user/dashboard"
          element={
            <ProtectedRoute allowedRole="user">
              <UserDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/staff/dashboard"
          element={
            <ProtectedRoute allowedRole="staff">
              <StaffDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/places/:id"
          element={
            <ProtectedRoute allowedRole="admin">
              <AdminDashboard initialTab="places" />
            </ProtectedRoute>
          }
        />
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

        {/* 404 Catch-all */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      </div>
    </ErrorBoundary>
  );
}

export default App;
