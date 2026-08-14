import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../config/supabase';
import { legacyLocalPlanImportService } from '../services/legacyLocalPlanImportService';
import { storeUserProfile } from '../services/userService';
import { logger } from '../utils/logger';
import type { AuthContextValue } from '../types/contexts';
import { getErrorMessage } from '../services/backendErrorUtils';
import { toAppUser, type AppUser } from '../types/auth';

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
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasPendingMigration, setHasPendingMigration] = useState(false);

  // Check for pending plan migrations when user authenticates
  const checkForPendingMigration = async (user: User | AppUser | null) => {
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
    logger.debug('[AuthContext] Setting up Supabase auth listener');
    let active = true;

    const applyUser = async (nextUser: User | null) => {
      if (!active) return;
      const appUser = toAppUser(nextUser);
      logger.debug('[AuthContext] Auth state changed:', appUser ? 'User logged in' : 'No user');
      setUser(appUser);
      setLoading(false);
      setError(null);

      if (appUser) {
        try {
          const displayName = appUser.displayName || appUser.email?.split('@')[0] || 'User';
          await storeUserProfile(appUser.uid, displayName, appUser.email);
          logger.debug('[AuthContext] User profile stored for:', appUser.uid, displayName);
        } catch (profileError) {
          logger.error('[AuthContext] Failed to store user profile:', profileError);
        }

        checkForPendingMigration(appUser).catch((migrationError) => {
          logger.error('[AuthContext] Failed to check pending migration:', migrationError);
        });
      } else {
        setHasPendingMigration(false);
      }
    };

    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (sessionError) {
        setError(getErrorMessage(sessionError));
        setLoading(false);
        return;
      }
      void applyUser(data.session?.user || null);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      void applyUser(session?.user || null);
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
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
