import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import anonymousUserService from '../services/anonymousUserService';
import { storeUserProfile } from '../services/userService';
// import { planMigrationService } from '../services/planMigrationService';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [anonymousUser, setAnonymousUser] = useState(null);
  const [isAnonymousMode, setIsAnonymousMode] = useState(false);
  const [hasPendingMigration, setHasPendingMigration] = useState(false);

  // Initialize anonymous user service
  useEffect(() => {
    const anonUser = anonymousUserService.initialize();
    setAnonymousUser(anonUser);
    console.log('[AuthContext] Anonymous user initialized:', anonUser);
  }, []);

  // Check for pending plan migrations when user authenticates
  const checkForPendingMigration = async (user) => {
    if (user) {
      try {
        // Only check for migration if there's an anonymous user session
        const existingAnonymousUser = localStorage.getItem('anonymousUser');
        if (existingAnonymousUser) {
          // const hasPlans = await planMigrationService.hasPlansToMigrate();
          // setHasPendingMigration(hasPlans);
          // console.log('[AuthContext] Pending migration check:', hasPlans);
          setHasPendingMigration(false); // Temporarily disabled
        } else {
          setHasPendingMigration(false);
        }
      } catch (error) {
        console.error('[AuthContext] Error checking for pending migration:', error);
        setHasPendingMigration(false);
      }
    } else {
      setHasPendingMigration(false);
    }
  };

  useEffect(() => {
    console.log('[AuthContext] Setting up Firebase auth listener');

    const unsubscribe = onAuthStateChanged(auth,
      async (user) => {
        console.log('[AuthContext] Auth state changed:', user ? 'User logged in' : 'No user');
        setUser(user);
        setLoading(false);
        setError(null);

        // If user logs in, disable anonymous mode and check for migrations
        if (user) {
          setIsAnonymousMode(false);

          // Store user profile for better display name resolution
          try {
            const displayName = user.displayName || user.email?.split('@')[0] || 'User';
            await storeUserProfile(user.uid, displayName, user.email);
            console.log('[AuthContext] User profile stored for:', user.uid, displayName);
          } catch (error) {
            console.error('[AuthContext] Failed to store user profile:', error);
          }

          checkForPendingMigration(user).catch(error => {
            console.error('[AuthContext] Failed to check pending migration:', error);
          });
        }
      },
      (error) => {
        console.error('Auth state change error:', error);
        setError(error.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
      // After logout, user can continue in anonymous mode
      setIsAnonymousMode(true);
      console.log('[AuthContext] User logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      setError(error.message);
    }
  };

  // Enable anonymous mode
  const enableAnonymousMode = () => {
    setIsAnonymousMode(true);
  };

  // Disable anonymous mode (when user logs in)
  const disableAnonymousMode = () => {
    setIsAnonymousMode(false);
  };

  // Set anonymous user display name
  const setAnonymousDisplayName = (name) => {
    if (anonymousUser) {
      anonymousUser.setDisplayName(name);
      setAnonymousUser({ ...anonymousUser }); // Trigger re-render
    }
  };

  // Initialize anonymous user with auto-generated display name
  const initializeAnonymousUser = async (displayName = null) => {
    try {
      console.log('[AuthContext] Initializing anonymous user');

      // Create new anonymous user if needed
      let anonUser = anonymousUser;
      if (!anonUser) {
        anonUser = anonymousUserService.initialize();
      }

      // Set display name if provided, otherwise use auto-generated one
      if (displayName) {
        anonUser.setDisplayName(displayName);
      }
      // If no display name provided, the service will auto-generate one

      // Update state
      setAnonymousUser(anonUser);
      setIsAnonymousMode(true);

      console.log('[AuthContext] Anonymous user initialized successfully with display name:', anonUser.displayName);
      return anonUser;
    } catch (error) {
      console.error('[AuthContext] Error initializing anonymous user:', error);
      throw error;
    }
  };

  // Get current effective user (authenticated or anonymous)
  const getCurrentUser = () => {
    if (user) return user;
    if (isAnonymousMode && anonymousUser) return anonymousUser;
    return null;
  };

  // Check if user is authenticated (not anonymous)
  const isAuthenticated = !!user;

  // Check if user is in any mode (authenticated or anonymous)
  const hasUser = isAuthenticated || (isAnonymousMode && !!anonymousUser);

  const value = {
    // Authenticated user
    user,
    loading,
    error,
    logout,
    isAuthenticated,

    // Anonymous user
    anonymousUser,
    isAnonymousMode,
    enableAnonymousMode,
    disableAnonymousMode,
    setAnonymousDisplayName,
    initializeAnonymousUser,

    // Combined user state
    getCurrentUser,
    hasUser,

    // Plan migration
    hasPendingMigration,
    setHasPendingMigration,
    checkForPendingMigration: () => checkForPendingMigration(user),

    // Convenience properties
    currentUser: getCurrentUser(),
    displayName: user?.displayName || anonymousUser?.displayName || null,
    userId: user?.uid || anonymousUser?.id || null
  };

  console.log('[AuthContext] Context value:', { loading, isAuthenticated, hasUser, user: !!user, anonymousUser: !!anonymousUser });

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
