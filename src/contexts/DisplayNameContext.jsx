import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { generateUserId } from '../utils/collaborationUtils';

const DisplayNameContext = createContext();

export const useDisplayName = () => {
  const context = useContext(DisplayNameContext);
  if (!context) {
    throw new Error('useDisplayName must be used within a DisplayNameProvider');
  }
  return context;
};

export const DisplayNameProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [customDisplayName, setCustomDisplayName] = useState(null);
  const [hasProvidedName, setHasProvidedName] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [lastActivity, setLastActivity] = useState(Date.now());

  // Session storage keys
  const STORAGE_KEYS = {
    DISPLAY_NAME: 'mitplan_display_name',
    SESSION_ID: 'mitplan_session_id',
    LAST_ACTIVITY: 'mitplan_last_activity',
    HAS_PROVIDED_NAME: 'mitplan_has_provided_name'
  };

  // Session timeout (30 minutes of inactivity)
  const SESSION_TIMEOUT = 30 * 60 * 1000;

  // Initialize from session storage and localStorage
  useEffect(() => {
    try {
      const storedName = sessionStorage.getItem(STORAGE_KEYS.DISPLAY_NAME);
      const storedSessionId = sessionStorage.getItem(STORAGE_KEYS.SESSION_ID);
      const storedActivity = sessionStorage.getItem(STORAGE_KEYS.LAST_ACTIVITY);
      const storedHasProvided = sessionStorage.getItem(STORAGE_KEYS.HAS_PROVIDED_NAME);

      // Also check localStorage for persistent display name
      const persistentName = localStorage.getItem('mitplan_display_name');

      const now = Date.now();
      const lastActivityTime = storedActivity ? parseInt(storedActivity, 10) : 0;

      // Check if session is still valid
      if (storedName && storedSessionId && (now - lastActivityTime) < SESSION_TIMEOUT) {
        setCustomDisplayName(storedName);
        setSessionId(storedSessionId);
        setLastActivity(lastActivityTime);
        setHasProvidedName(storedHasProvided === 'true');
        console.log('🎭 Restored display name session:', storedName);
      } else if (persistentName) {
        // For shared plans, don't auto-restore from localStorage to ensure proper prompting
        const isSharedPlan = window.location.pathname.includes('/plan/shared/');

        if (!isSharedPlan) {
          // Use persistent name from localStorage if session expired (non-shared plans only)
          setCustomDisplayName(persistentName);
          setHasProvidedName(true);
          console.log('🎭 Restored display name from localStorage:', persistentName);

          // Create new session
          const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          setSessionId(newSessionId);
          updateActivity();

          try {
            sessionStorage.setItem(STORAGE_KEYS.SESSION_ID, newSessionId);
            sessionStorage.setItem(STORAGE_KEYS.DISPLAY_NAME, persistentName);
            sessionStorage.setItem(STORAGE_KEYS.HAS_PROVIDED_NAME, 'true');
          } catch (error) {
            console.warn('Failed to create new session:', error);
          }
        } else {
          console.log('🎭 Shared plan detected - skipping localStorage restore to ensure proper prompting');
        }
      } else if (storedName || storedSessionId) {
        // Clear expired session
        clearSession();
        console.log('🕐 Display name session expired, cleared');
      }
    } catch (error) {
      console.warn('Failed to restore display name session:', error);
    }
  }, []);

  // Update activity timestamp
  const updateActivity = () => {
    const now = Date.now();
    setLastActivity(now);
    try {
      sessionStorage.setItem(STORAGE_KEYS.LAST_ACTIVITY, now.toString());
    } catch (error) {
      console.warn('Failed to update activity timestamp:', error);
    }
  };

  // Set up activity tracking
  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    const handleActivity = () => {
      updateActivity();
    };

    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
    };
  }, []);

  // Clear session storage
  const clearSession = () => {
    try {
      Object.values(STORAGE_KEYS).forEach(key => {
        sessionStorage.removeItem(key);
      });
    } catch (error) {
      console.warn('Failed to clear session storage:', error);
    }
  };

  // Set custom display name
  const setDisplayName = (name, generateSessionId = true) => {
    const trimmedName = name ? name.trim() : '';

    setCustomDisplayName(trimmedName);
    setHasProvidedName(true);
    updateActivity();

    if (generateSessionId) {
      const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setSessionId(newSessionId);

      try {
        sessionStorage.setItem(STORAGE_KEYS.SESSION_ID, newSessionId);
      } catch (error) {
        console.warn('Failed to store session ID:', error);
      }
    }

    try {
      if (trimmedName) {
        sessionStorage.setItem(STORAGE_KEYS.DISPLAY_NAME, trimmedName);
        // Also store in localStorage for persistence across sessions
        localStorage.setItem('mitplan_display_name', trimmedName);
      } else {
        sessionStorage.removeItem(STORAGE_KEYS.DISPLAY_NAME);
        localStorage.removeItem('mitplan_display_name');
      }
      sessionStorage.setItem(STORAGE_KEYS.HAS_PROVIDED_NAME, 'true');
    } catch (error) {
      console.warn('Failed to store display name:', error);
    }

    console.log('🎭 Set display name:', trimmedName || 'Anonymous');

    // Emit event for other components to listen to
    window.dispatchEvent(new CustomEvent('displayNameChanged', {
      detail: { displayName: trimmedName, userId: getUserId() }
    }));
  };

  // Clear display name
  const clearDisplayName = () => {
    setCustomDisplayName(null);
    setHasProvidedName(false);
    setSessionId(null);
    clearSession();
    console.log('🎭 Cleared display name session');
  };

  // Get effective display name
  const getDisplayName = () => {
    if (isAuthenticated && user) {
      return user.displayName || user.email || 'Authenticated User';
    }
    
    if (customDisplayName) {
      return customDisplayName;
    }
    
    return null; // No display name set
  };

  // Get user identifier for collaboration
  const getUserId = () => {
    if (isAuthenticated && user) {
      return user.uid;
    }

    if (sessionId) {
      // Generate Firebase-compatible anonymous user ID
      // Remove 'session_' prefix and ensure it matches pattern: anon_[a-zA-Z0-9_-]+
      const cleanSessionId = sessionId.replace(/^session_/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
      return `anon_${cleanSessionId}`;
    }

    return null;
  };

  // Check if user needs to provide display name
  const needsDisplayName = () => {
    // Authenticated users don't need to provide display name
    if (isAuthenticated) {
      return false;
    }
    
    // Check if user has provided a name in this session
    return !hasProvidedName;
  };

  // Check if user can edit (has provided name or is authenticated)
  const canEdit = () => {
    return isAuthenticated || hasProvidedName;
  };

  // Handle authentication transition
  useEffect(() => {
    if (isAuthenticated && customDisplayName) {
      // User signed in while having a custom display name
      // Keep the session but clear custom name since auth takes precedence
      console.log('🔄 Transitioning from anonymous to authenticated user');
      
      // Don't clear immediately - let the collaboration context handle the transition
      // The custom display name will be replaced by the authenticated user's name
    }
  }, [isAuthenticated, customDisplayName]);

  // Generate anonymous display name
  const generateAnonymousName = () => {
    const adjectives = ['Quick', 'Brave', 'Swift', 'Bold', 'Clever', 'Wise', 'Strong', 'Agile'];
    const nouns = ['Warrior', 'Scholar', 'Healer', 'Guardian', 'Mage', 'Ranger', 'Paladin', 'Monk'];
    
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const number = Math.floor(Math.random() * 999) + 1;
    
    return `${adjective} ${noun} ${number}`;
  };

  const contextValue = {
    // State
    customDisplayName,
    hasProvidedName,
    sessionId,
    lastActivity,
    
    // Computed values
    displayName: getDisplayName(),
    userId: getUserId(),
    needsDisplayName: needsDisplayName(),
    canEdit: canEdit(),
    isAuthenticated,
    
    // Actions
    setDisplayName,
    clearDisplayName,
    updateActivity,
    generateAnonymousName,
    
    // Session management
    sessionTimeout: SESSION_TIMEOUT,
    isSessionValid: () => (Date.now() - lastActivity) < SESSION_TIMEOUT
  };

  return (
    <DisplayNameContext.Provider value={contextValue}>
      {children}
    </DisplayNameContext.Provider>
  );
};

export default DisplayNameContext;
