import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('qflow_token'));
  const [loading, setLoading] = useState(true);

  // Load user profile on startup if token exists
  const checkAuth = useCallback(async () => {
    const storedToken = localStorage.getItem('qflow_token');
    const storedRole = localStorage.getItem('qflow_role');

    if (!storedToken) {
      setLoading(false);
      return;
    }

    try {
      const response = await api.get('/auth/me');
      if (response.data?.success) {
        setUser(response.data.user);
        setRole(response.data.role);
        setToken(storedToken);
      } else {
        logout();
      }
    } catch (err) {
      console.warn('Auth validation failed, clearing session:', err.message);
      logout();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Persist session
  const saveAuthSession = (authToken, userProfile, userRole) => {
    localStorage.setItem('qflow_token', authToken);
    localStorage.setItem('qflow_role', userRole);
    setToken(authToken);
    setUser(userProfile);
    setRole(userRole);
  };

  // User Signup
  const signupUser = async (formData) => {
    try {
      const response = await api.post('/auth/user/signup', formData);
      if (response.data?.token) {
        saveAuthSession(response.data.token, response.data.user, 'user');
        toast.success(response.data.message || 'Account registered successfully!');
        return { success: true, user: response.data.user };
      }
      return { success: true };
    } catch (error) {
      toast.error(error.message);
      return { success: false, error: error.message };
    }
  };

  // User Login
  const loginUser = async ({ phone, password }) => {
    try {
      const response = await api.post('/auth/user/login', { phone, password });
      if (response.data?.token) {
        saveAuthSession(response.data.token, response.data.user, 'user');
        toast.success(response.data.message || 'Welcome back!');
        return { success: true, user: response.data.user };
      }
      return { success: false, error: 'Login failed' };
    } catch (error) {
      toast.error(error.message);
      return { success: false, error: error.message };
    }
  };

  // Staff Signup
  const signupStaff = async (formData) => {
    try {
      const response = await api.post('/auth/staff/signup', formData);
      toast.success(
        response.data?.message ||
        'Staff registration submitted. Your account is waiting for admin approval.'
      );
      return { success: true, data: response.data };
    } catch (error) {
      toast.error(error.message);
      return { success: false, error: error.message };
    }
  };

  // Staff Login
  const loginStaff = async ({ staffId, password }) => {
    try {
      const response = await api.post('/auth/staff/login', { staffId, password });
      if (response.data?.token) {
        saveAuthSession(response.data.token, response.data.staff, 'staff');
        toast.success(response.data.message || 'Staff authenticated successfully!');
        return { success: true, staff: response.data.staff };
      }
      return { success: false, error: 'Login failed' };
    } catch (error) {
      toast.error(error.message);
      return { success: false, error: error.message };
    }
  };

  // Admin Login
  const loginAdmin = async ({ username, password }) => {
    try {
      const response = await api.post('/auth/admin/login', { username, password });
      if (response.data?.token) {
        saveAuthSession(response.data.token, response.data.admin, 'admin');
        toast.success('Admin authenticated successfully!');
        return { success: true, admin: response.data.admin };
      }
      return { success: false, error: 'Admin login failed' };
    } catch (error) {
      toast.error(error.message);
      return { success: false, error: error.message };
    }
  };

  // Logout
  const logout = () => {
    localStorage.removeItem('qflow_token');
    localStorage.removeItem('qflow_role');
    setToken(null);
    setUser(null);
    setRole(null);
    toast.success('Signed out successfully');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        token,
        loading,
        signupUser,
        loginUser,
        signupStaff,
        loginStaff,
        loginAdmin,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
