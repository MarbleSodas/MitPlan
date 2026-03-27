import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import { legacyLocalPlanImportService } from '../services/legacyLocalPlanImportService';
import { storeUserProfile } from '../services/userService';

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
  const [hasPendingMigration, setHasPendingMigration] = useState(false);

  // Check for pending plan migrations when user authenticates
  const checkForPendingMigration = async (user) => {
    if (user) {
      try {
        setHasPendingMigration(legacyLocalPlanImportService.hasLegacyPlans());
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

        if (user) {
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
      console.log('[AuthContext] User logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      setError(error.message);
    }
  };

  // Check if user is authenticated (not anonymous)
  const isAuthenticated = !!user;

  const value = {
    user,
    loading,
    error,
    logout,
    isAuthenticated,
    hasPendingMigration,
    setHasPendingMigration,
    checkForPendingMigration: () => checkForPendingMigration(user),
    currentUser: user,
    displayName: user?.displayName || user?.email?.split('@')[0] || null,
    userId: user?.uid || null
  };

  console.log('[AuthContext] Context value:', { loading, isAuthenticated, user: !!user, hasPendingMigration });

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
