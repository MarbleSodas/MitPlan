import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import { legacyLocalPlanImportService } from '../services/legacyLocalPlanImportService';
import { storeUserProfile } from '../services/userService';
import { logger } from '../utils/logger';
import type { AuthContextValue } from '../types/contexts';
import { getErrorMessage } from '../services/firebaseErrorUtils';

const AuthContext = createContext<AuthContextValue | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasPendingMigration, setHasPendingMigration] = useState(false);

  // Check for pending plan migrations when user authenticates
  const checkForPendingMigration = async (user: User | null) => {
    if (user) {
      try {
        setHasPendingMigration(legacyLocalPlanImportService.hasLegacyPlans());
      } catch (error) {
        logger.error('[AuthContext] Error checking for pending migration:', error);
        setHasPendingMigration(false);
      }
    } else {
      setHasPendingMigration(false);
    }
  };

  useEffect(() => {
    logger.debug('[AuthContext] Setting up Firebase auth listener');

    const unsubscribe = onAuthStateChanged(auth,
      async (user) => {
        logger.debug('[AuthContext] Auth state changed:', user ? 'User logged in' : 'No user');
        setUser(user);
        setLoading(false);
        setError(null);

        if (user) {
          // Store user profile for better display name resolution
          try {
            const displayName = user.displayName || user.email?.split('@')[0] || 'User';
            await storeUserProfile(user.uid, displayName, user.email);
            logger.debug('[AuthContext] User profile stored for:', user.uid, displayName);
          } catch (error) {
            logger.error('[AuthContext] Failed to store user profile:', error);
          }

          checkForPendingMigration(user).catch(error => {
            logger.error('[AuthContext] Failed to check pending migration:', error);
          });
        }
      },
      (error) => {
        logger.error('Auth state change error:', error);
        setError(getErrorMessage(error));
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
      logger.debug('[AuthContext] User logged out successfully');
    } catch (error) {
      logger.error('Logout error:', error);
      setError(getErrorMessage(error));
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

  logger.debug('[AuthContext] Context value:', { loading, isAuthenticated, user: !!user, hasPendingMigration });

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
