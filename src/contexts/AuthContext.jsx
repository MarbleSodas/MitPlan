import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import FirebaseAuthService from '../services/FirebaseAuthService';
import { normalizeUserFromFirestore } from '../utils/firebaseHelpers';

// Create the context
const AuthContext = createContext();

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

  // Register function
  const register = useCallback(async (email, password, displayName) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await FirebaseAuthService.register(email, password, displayName);

      if (result.success) {
        // Don't automatically log in after registration - user needs to verify email
        return {
          success: true,
          message: result.message,
          user: result.user,
          verification_required: true,
        };
      } else {
        setErrorWithTimeout(result.message);
        return result;
      }
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
  }, [setErrorWithTimeout]);

  // Login function
  const login = useCallback(async (email, password) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await FirebaseAuthService.login(email, password);

      if (result.success) {
        // User state will be updated by the auth state listener
        return result;
      } else {
        setErrorWithTimeout(result.message);
        return result;
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
  }, [setErrorWithTimeout]);

  // Logout function
  const logout = useCallback(async () => {
    setIsLoading(true);

    try {
      const result = await FirebaseAuthService.logout();

      // Clear local state
      setUser(null);
      setIsAuthenticated(false);
      setError(null);

      return result;
    } catch (error) {
      console.error('Logout failed:', error);
      // Clear local state even if logout fails
      setUser(null);
      setIsAuthenticated(false);
      setError(null);

      return {
        success: false,
        message: error.message || 'Logout failed'
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get user profile
  const getUserProfile = useCallback(async () => {
    try {
      const result = await FirebaseAuthService.getUserProfile();

      if (result.success) {
        const normalizedUser = normalizeUserFromFirestore(result.user);
        setUser(normalizedUser);
        return normalizedUser;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Failed to get user profile:', error);
      // If profile fetch fails, user might be logged out
      await logout();
      throw error;
    }
  }, [logout]);

  // Update user profile
  const updateProfile = useCallback(async (profileData) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await FirebaseAuthService.updateProfile(profileData);

      if (result.success) {
        // Refresh user profile to get updated data
        const updatedUser = await getUserProfile();
        return {
          success: true,
          message: result.message,
          user: updatedUser,
        };
      } else {
        setErrorWithTimeout(result.message);
        return result;
      }
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
  }, [setErrorWithTimeout, getUserProfile]);

  // Update user profile picture
  const updateProfilePicture = useCallback(async (imageUrl, imagePath) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await FirebaseAuthService.updateProfilePicture(imageUrl, imagePath);

      if (result.success) {
        // Refresh user profile to get updated data
        const updatedUser = await getUserProfile();
        return {
          success: true,
          message: result.message,
          user: updatedUser,
          imageUrl: result.imageUrl
        };
      } else {
        setErrorWithTimeout(result.message);
        return result;
      }
    } catch (error) {
      const errorMessage = error.message || 'Profile picture update failed';
      setErrorWithTimeout(errorMessage);
      return {
        success: false,
        message: errorMessage,
      };
    } finally {
      setIsLoading(false);
    }
  }, [setErrorWithTimeout, getUserProfile]);

  // Remove user profile picture
  const removeProfilePicture = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await FirebaseAuthService.removeProfilePicture();

      if (result.success) {
        // Refresh user profile to get updated data
        const updatedUser = await getUserProfile();
        return {
          success: true,
          message: result.message,
          user: updatedUser,
        };
      } else {
        setErrorWithTimeout(result.message);
        return result;
      }
    } catch (error) {
      const errorMessage = error.message || 'Profile picture removal failed';
      setErrorWithTimeout(errorMessage);
      return {
        success: false,
        message: errorMessage,
      };
    } finally {
      setIsLoading(false);
    }
  }, [setErrorWithTimeout, getUserProfile]);

  // Change password
  const changePassword = useCallback(async (currentPassword, newPassword) => {
    setIsLoading(true);
    setError(null);

    try {
      // Firebase Auth doesn't need current password for password change
      // It uses re-authentication if needed
      const result = await FirebaseAuthService.changePassword(newPassword);

      if (result.success) {
        return result;
      } else {
        setErrorWithTimeout(result.message);
        return result;
      }
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
  }, [setErrorWithTimeout]);

  // Get user preferences
  const getUserPreferences = useCallback(async () => {
    try {
      const result = await FirebaseAuthService.getUserProfile();

      if (result.success) {
        return result.user.preferences || {
          theme: 'dark',
          defaultBoss: 'ketuduke',
          notifications: true
        };
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Failed to get user preferences:', error);
      throw error;
    }
  }, []);

  // Update user preferences
  const updatePreferences = useCallback(async (preferences) => {
    try {
      const result = await FirebaseAuthService.updateProfile({ preferences });

      if (result.success) {
        // Refresh user profile to get updated preferences
        await getUserProfile();
        return {
          success: true,
          message: result.message,
          preferences: preferences,
        };
      } else {
        setErrorWithTimeout(result.message);
        return result;
      }
    } catch (error) {
      const errorMessage = error.message || 'Preferences update failed';
      setErrorWithTimeout(errorMessage);
      return {
        success: false,
        message: errorMessage,
      };
    }
  }, [setErrorWithTimeout, getUserProfile]);

  // Password reset function
  const resetPassword = useCallback(async (email) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await FirebaseAuthService.resetPassword(email);

      if (result.success) {
        return result;
      } else {
        setErrorWithTimeout(result.message);
        return result;
      }
    } catch (error) {
      const errorMessage = error.message || 'Password reset failed';
      setErrorWithTimeout(errorMessage);
      return {
        success: false,
        message: errorMessage,
      };
    } finally {
      setIsLoading(false);
    }
  }, [setErrorWithTimeout]);

  // Google sign-in function
  const signInWithGoogle = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await FirebaseAuthService.signInWithGoogle();

      if (result.success) {
        // User state will be updated by the auth state listener
        return result;
      } else {
        setErrorWithTimeout(result.message);
        return result;
      }
    } catch (error) {
      const errorMessage = error.message || 'Google sign-in failed';
      setErrorWithTimeout(errorMessage);
      return {
        success: false,
        message: errorMessage,
      };
    } finally {
      setIsLoading(false);
    }
  }, [setErrorWithTimeout]);

  // Set up Firebase Auth state listener
  useEffect(() => {
    const unsubscribe = FirebaseAuthService.onAuthStateChanged(async (firebaseUser) => {
      setIsLoading(true);

      if (firebaseUser) {
        try {
          // Get user profile from Firestore
          const result = await FirebaseAuthService.getUserProfile(firebaseUser.uid);

          if (result.success) {
            const normalizedUser = normalizeUserFromFirestore(result.user);
            setUser(normalizedUser);
            setIsAuthenticated(true);
          } else {
            // If no profile exists, create one (this can happen if Firestore document creation failed during registration)
            console.warn('User profile not found in Firestore, creating missing profile...');

            try {
              // Create the missing user profile in Firestore
              await FirebaseAuthService.createUserProfile(firebaseUser.uid, {
                email: firebaseUser.email,
                displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
                emailVerified: firebaseUser.emailVerified
              });

              // Now try to get the profile again
              const retryResult = await FirebaseAuthService.getUserProfile(firebaseUser.uid);
              if (retryResult.success) {
                const normalizedUser = normalizeUserFromFirestore(retryResult.user);
                setUser(normalizedUser);
                setIsAuthenticated(true);
              } else {
                throw new Error('Failed to create user profile');
              }
            } catch (createError) {
              console.error('Failed to create missing user profile:', createError);
              // Fallback to temporary user object
              setUser({
                id: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
                emailVerified: firebaseUser.emailVerified,
                preferences: {
                  theme: 'dark',
                  defaultBoss: 'ketuduke',
                  notifications: true
                }
              });
              setIsAuthenticated(true);
            }
          }
        } catch (error) {
          console.error('Error loading user profile:', error);
          setUser(null);
          setIsAuthenticated(false);
        }
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }

      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

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
    updateProfilePicture,
    removeProfilePicture,
    changePassword,
    getUserPreferences,
    updatePreferences,
    resetPassword,
    signInWithGoogle,
    clearError,
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
