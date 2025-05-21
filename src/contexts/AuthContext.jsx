import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

// Create context
const AuthContext = createContext();

// API URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
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
  }, []);
  
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