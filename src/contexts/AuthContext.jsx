import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

// Create context
const AuthContext = createContext();

// API URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Token refresh interval (15 minutes)
const REFRESH_INTERVAL = 15 * 60 * 1000;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshTimer, setRefreshTimer] = useState(null);

  // Set up axios interceptor for handling token expiration
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      response => response,
      async error => {
        const originalRequest = error.config;

        // If error is 401 and has TOKEN_EXPIRED code and not already retrying
        if (
          error.response?.status === 401 &&
          error.response?.data?.code === 'TOKEN_EXPIRED' &&
          !originalRequest._retry
        ) {
          originalRequest._retry = true;

          try {
            // Refresh token
            const response = await axios.post(`${API_URL}/auth/refresh-token`);

            // Update token
            localStorage.setItem('token', response.data.token);
            axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;

            // Update user
            setUser(response.data.user);

            // Retry original request with new token
            originalRequest.headers['Authorization'] = `Bearer ${response.data.token}`;
            return axios(originalRequest);
          } catch (refreshError) {
            // If refresh fails, logout
            logout();
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );

    return () => {
      // Remove interceptor on cleanup
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  // Set up token refresh timer
  const setupRefreshTimer = useCallback(() => {
    // Clear existing timer
    if (refreshTimer) {
      clearInterval(refreshTimer);
    }

    // Set up new timer
    const timer = setInterval(async () => {
      if (user) {
        try {
          // Refresh token
          const response = await axios.post(`${API_URL}/auth/refresh-token`);

          // Update token
          localStorage.setItem('token', response.data.token);
          axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;

          // Update user
          setUser(response.data.user);
        } catch (error) {
          console.error('Token refresh error:', error);

          // If refresh fails, logout
          logout();
        }
      }
    }, REFRESH_INTERVAL);

    setRefreshTimer(timer);

    return () => {
      clearInterval(timer);
    };
  }, [user, refreshTimer]);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = localStorage.getItem('token');

        if (token) {
          // Check if token is expired
          const decodedToken = jwtDecode(token);
          const currentTime = Date.now() / 1000;

          if (decodedToken.exp < currentTime) {
            // Token is expired, remove it
            localStorage.removeItem('token');
            setUser(null);
            setLoading(false);
            return;
          }

          // Set auth header
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

          // Get user data
          const response = await axios.get(`${API_URL}/auth/me`);
          setUser(response.data.user);

          // Set up token refresh timer
          setupRefreshTimer();
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        localStorage.removeItem('token');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Clean up refresh timer on unmount
    return () => {
      if (refreshTimer) {
        clearInterval(refreshTimer);
      }
    };
  }, [setupRefreshTimer]);

  /**
   * Register a new user
   * @param {Object} userData - User data
   * @returns {Promise} Registration result
   */
  const register = async (userData) => {
    try {
      setError(null);
      const response = await axios.post(`${API_URL}/auth/register`, userData);
      return response.data;
    } catch (error) {
      setError(error.response?.data?.message || 'Registration failed');
      throw error;
    }
  };

  /**
   * Verify email
   * @param {string} token - Verification token
   * @returns {Promise} Verification result
   */
  const verifyEmail = async (token) => {
    try {
      setError(null);
      const response = await axios.post(`${API_URL}/auth/verify-email`, { token });
      return response.data;
    } catch (error) {
      setError(error.response?.data?.message || 'Email verification failed');
      throw error;
    }
  };

  /**
   * Resend verification email
   * @param {string} email - User email
   * @returns {Promise} Resend result
   */
  const resendVerificationEmail = async (email) => {
    try {
      setError(null);
      const response = await axios.post(`${API_URL}/auth/resend-verification`, { email });
      return response.data;
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to resend verification email');
      throw error;
    }
  };

  /**
   * Login user
   * @param {Object} credentials - User credentials
   * @returns {Promise} Login result
   */
  const login = async (credentials) => {
    try {
      setError(null);
      const response = await axios.post(`${API_URL}/auth/login`, credentials);

      // Save token to localStorage
      localStorage.setItem('token', response.data.token);

      // Set auth header
      axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;

      // Set user
      setUser(response.data.user);

      // Set up token refresh timer
      setupRefreshTimer();

      return response.data;
    } catch (error) {
      setError(error.response?.data?.message || 'Login failed');
      throw error;
    }
  };

  /**
   * Logout user
   */
  const logout = async () => {
    try {
      await axios.post(`${API_URL}/auth/logout`);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Remove token from localStorage
      localStorage.removeItem('token');

      // Remove auth header
      delete axios.defaults.headers.common['Authorization'];

      // Clear user
      setUser(null);

      // Clear refresh timer
      if (refreshTimer) {
        clearInterval(refreshTimer);
        setRefreshTimer(null);
      }
    }
  };

  /**
   * Request password reset
   * @param {string} email - User email
   * @returns {Promise} Reset request result
   */
  const requestPasswordReset = async (email) => {
    try {
      setError(null);
      const response = await axios.post(`${API_URL}/auth/forgot-password`, { email });
      return response.data;
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to request password reset');
      throw error;
    }
  };

  /**
   * Reset password
   * @param {Object} resetData - Reset data
   * @returns {Promise} Reset result
   */
  const resetPassword = async (resetData) => {
    try {
      setError(null);
      const response = await axios.post(`${API_URL}/auth/reset-password`, resetData);
      return response.data;
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to reset password');
      throw error;
    }
  };

  /**
   * Update user profile
   * @param {Object} profileData - Profile data
   * @returns {Promise} Update result
   */
  const updateProfile = async (profileData) => {
    try {
      setError(null);
      const response = await axios.put(`${API_URL}/auth/profile`, profileData);
      setUser(response.data.user);
      return response.data;
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to update profile');
      throw error;
    }
  };

  /**
   * Update user preferences
   * @param {Object} preferences - User preferences
   * @returns {Promise} Update result
   */
  const updatePreferences = async (preferences) => {
    try {
      setError(null);
      const response = await axios.put(`${API_URL}/auth/preferences`, { preferences });
      setUser({
        ...user,
        preferences: response.data.preferences
      });
      return response.data;
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to update preferences');
      throw error;
    }
  };

  /**
   * Change password
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise} Change result
   */
  const changePassword = async (currentPassword, newPassword) => {
    try {
      setError(null);
      const response = await axios.post(`${API_URL}/auth/change-password`, {
        currentPassword,
        newPassword
      });
      return response.data;
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to change password');
      throw error;
    }
  };

  // Context value
  const value = {
    user,
    loading,
    error,
    register,
    verifyEmail,
    resendVerificationEmail,
    login,
    logout,
    requestPasswordReset,
    resetPassword,
    updateProfile,
    updatePreferences,
    changePassword,
    isAuthenticated: !!user,
    isVerified: user?.isVerified || false
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;