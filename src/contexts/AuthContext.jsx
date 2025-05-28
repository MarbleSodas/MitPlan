import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';

// Create the context
const AuthContext = createContext();

// API base URL
const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://your-production-api.com/api'
  : 'http://localhost:3002/api';

// Create a provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Clear error after a timeout
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Set error with auto-clear
  const setErrorWithTimeout = useCallback((errorMessage) => {
    setError(errorMessage);
    setTimeout(clearError, 5000); // Clear error after 5 seconds
  }, [clearError]);

  // Get stored token
  const getStoredToken = useCallback(() => {
    return localStorage.getItem('auth_token');
  }, []);

  // Store token
  const storeToken = useCallback((token) => {
    localStorage.setItem('auth_token', token);
  }, []);

  // Remove token
  const removeToken = useCallback(() => {
    localStorage.removeItem('auth_token');
  }, []);

  // API request helper with authentication
  const apiRequest = useCallback(async (endpoint, options = {}) => {
    const token = getStoredToken();
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }, [getStoredToken]);

  // Register function
  const register = useCallback(async (email, password, displayName) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
          display_name: displayName,
        }),
      });

      return {
        success: true,
        message: data.message,
        user: data.user,
        verification_required: data.verification_required,
      };
    } catch (error) {
      const errorMessage = error.message || 'Registration failed';
      setErrorWithTimeout(errorMessage);
      return {
        success: false,
        message: errorMessage,
      };
    } finally {
      setIsLoading(false);
    }
  }, [apiRequest, setErrorWithTimeout]);

  // Login function
  const login = useCallback(async (email, password) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
        }),
      });

      if (data.tokens && data.tokens.access_token) {
        storeToken(data.tokens.access_token);
        setUser(data.user);
        setIsAuthenticated(true);

        return {
          success: true,
          message: data.message,
          user: data.user,
        };
      } else {
        throw new Error('No access token received');
      }
    } catch (error) {
      const errorMessage = error.message || 'Login failed';
      setErrorWithTimeout(errorMessage);
      return {
        success: false,
        message: errorMessage,
      };
    } finally {
      setIsLoading(false);
    }
  }, [apiRequest, storeToken, setErrorWithTimeout]);

  // Logout function
  const logout = useCallback(async () => {
    setIsLoading(true);

    try {
      // Call logout endpoint to invalidate session
      await apiRequest('/auth/logout', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Logout API call failed:', error);
      // Continue with local logout even if API call fails
    }

    // Clear local state regardless of API call result
    removeToken();
    setUser(null);
    setIsAuthenticated(false);
    setError(null);
    setIsLoading(false);
  }, [apiRequest, removeToken]);

  // Get user profile
  const getUserProfile = useCallback(async () => {
    try {
      const data = await apiRequest('/user/profile');
      setUser(data.user);
      return data.user;
    } catch (error) {
      console.error('Failed to get user profile:', error);
      // If profile fetch fails, user might be logged out
      await logout();
      throw error;
    }
  }, [apiRequest, logout]);

  // Update user profile
  const updateProfile = useCallback(async (profileData) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await apiRequest('/user/profile', {
        method: 'PUT',
        body: JSON.stringify(profileData),
      });

      setUser(data.user);
      return {
        success: true,
        message: data.message,
        user: data.user,
      };
    } catch (error) {
      const errorMessage = error.message || 'Profile update failed';
      setErrorWithTimeout(errorMessage);
      return {
        success: false,
        message: errorMessage,
      };
    } finally {
      setIsLoading(false);
    }
  }, [apiRequest, setErrorWithTimeout]);

  // Change password
  const changePassword = useCallback(async (currentPassword, newPassword) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await apiRequest('/user/change-password', {
        method: 'POST',
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      return {
        success: true,
        message: data.message,
      };
    } catch (error) {
      const errorMessage = error.message || 'Password change failed';
      setErrorWithTimeout(errorMessage);
      return {
        success: false,
        message: errorMessage,
      };
    } finally {
      setIsLoading(false);
    }
  }, [apiRequest, setErrorWithTimeout]);

  // Get user preferences
  const getUserPreferences = useCallback(async () => {
    try {
      const data = await apiRequest('/user/preferences');
      return data.preferences;
    } catch (error) {
      console.error('Failed to get user preferences:', error);
      throw error;
    }
  }, [apiRequest]);

  // Update user preferences
  const updatePreferences = useCallback(async (preferences) => {
    try {
      const data = await apiRequest('/user/preferences', {
        method: 'PUT',
        body: JSON.stringify(preferences),
      });

      return {
        success: true,
        message: data.message,
        preferences: data.preferences,
      };
    } catch (error) {
      const errorMessage = error.message || 'Preferences update failed';
      setErrorWithTimeout(errorMessage);
      return {
        success: false,
        message: errorMessage,
      };
    }
  }, [apiRequest, setErrorWithTimeout]);

  // Check authentication status on mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      const token = getStoredToken();

      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const userProfile = await getUserProfile();
        setIsAuthenticated(true);
        setUser(userProfile);
      } catch (error) {
        console.error('Auth check failed:', error);
        // Token might be invalid, clear it
        removeToken();
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, [getStoredToken, getUserProfile, removeToken]);

  // Context value
  const contextValue = {
    // State
    user,
    isAuthenticated,
    isLoading,
    error,

    // Actions
    register,
    login,
    logout,
    getUserProfile,
    updateProfile,
    changePassword,
    getUserPreferences,
    updatePreferences,
    clearError,

    // API helper
    apiRequest,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook for using the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
