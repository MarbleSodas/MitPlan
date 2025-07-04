import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import sessionManager from '../services/sessionManager';

const CollaborationContext = createContext({});

export const useCollaboration = () => {
  const context = useContext(CollaborationContext);
  if (!context) {
    throw new Error('useCollaboration must be used within a CollaborationProvider');
  }
  return context;
};

// Generate a unique session ID
const generateSessionId = () => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const CollaborationProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [activePlanId, setActivePlanId] = useState(null);
  const [collaborators, setCollaborators] = useState([]);
  const [isCollaborating, setIsCollaborating] = useState(false);
  const [sessionId] = useState(() => generateSessionId());
  const [displayName, setDisplayName] = useState('');
  
  // Refs to track listeners and prevent memory leaks
  const listenersRef = useRef(new Map());
  const lastChangeOriginRef = useRef(null);
  const debounceTimersRef = useRef(new Map());
  
  // Track if we're currently updating to prevent feedback loops
  const isUpdatingRef = useRef(false);

  // Get user display name
  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || user.email || 'Anonymous User');
    } else {
      // For unauthenticated users, try to get from localStorage
      const savedDisplayName = localStorage.getItem('mitplan_display_name');
      if (savedDisplayName) {
        setDisplayName(savedDisplayName);
      }
    }
  }, [user]);

  // Cleanup function to remove all listeners
  const cleanupListeners = useCallback(() => {
    listenersRef.current.forEach((unsubscribe) => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    });
    listenersRef.current.clear();
    
    // Clear debounce timers
    debounceTimersRef.current.forEach((timer) => {
      clearTimeout(timer);
    });
    debounceTimersRef.current.clear();
  }, []);

  // Join a collaborative session for a plan
  const joinCollaborativeSession = useCallback(async (planId, userDisplayName = null) => {
    if (!planId) return;

    try {
      // Leave current session if any
      if (activePlanId && activePlanId !== planId) {
        await leaveCollaborativeSession();
      }

      setActivePlanId(planId);
      setIsCollaborating(true);

      const finalDisplayName = userDisplayName || displayName || 'Anonymous User';

      // Save display name for unauthenticated users
      if (!user && userDisplayName) {
        localStorage.setItem('mitplan_display_name', userDisplayName);
        setDisplayName(userDisplayName);
      }

      // Prepare session data
      const sessionData = {
        userId: user?.uid || 'anonymous',
        displayName: finalDisplayName,
        email: user?.email || ''
      };

      // Start session using session manager
      await sessionManager.startSession(planId, sessionId, sessionData);

      // Subscribe to collaborators using session manager
      const collaboratorsUnsubscribe = sessionManager.subscribeToSessions(planId, (collaboratorsList) => {
        setCollaborators(collaboratorsList);
      });

      listenersRef.current.set('collaborators', collaboratorsUnsubscribe);

      return true;
    } catch (error) {
      console.error('Error joining collaborative session:', error);
      setIsCollaborating(false);
      return false;
    }
  }, [activePlanId, displayName, user, sessionId]);

  // Leave collaborative session
  const leaveCollaborativeSession = useCallback(async () => {
    if (!activePlanId) return;

    try {
      // End session using session manager
      await sessionManager.endSession(sessionId);

      // Cleanup listeners
      cleanupListeners();

      setActivePlanId(null);
      setCollaborators([]);
      setIsCollaborating(false);
    } catch (error) {
      console.error('Error leaving collaborative session:', error);
    }
  }, [activePlanId, sessionId, cleanupListeners]);

  // Enhanced debounced update function with batching and priority
  const debouncedUpdate = useCallback((key, updateFn, delay = 500, priority = 'normal') => {
    // Clear existing timer for this key
    if (debounceTimersRef.current.has(key)) {
      clearTimeout(debounceTimersRef.current.get(key));
    }

    // Adjust delay based on priority
    const adjustedDelay = priority === 'high' ? Math.min(delay, 200) :
                         priority === 'low' ? Math.max(delay, 1000) : delay;

    // Set new timer
    const timer = setTimeout(async () => {
      try {
        await updateFn();
      } catch (error) {
        console.error(`Error in debounced update for ${key}:`, error);
      } finally {
        debounceTimersRef.current.delete(key);
      }
    }, adjustedDelay);

    debounceTimersRef.current.set(key, timer);
  }, []);

  // Batch multiple updates together for better performance
  const batchedUpdates = useRef(new Map());
  const batchTimer = useRef(null);

  const batchUpdate = useCallback((planId, updates, userId, sessionId) => {
    if (!batchedUpdates.current.has(planId)) {
      batchedUpdates.current.set(planId, {});
    }

    // Merge updates
    const existingUpdates = batchedUpdates.current.get(planId);
    batchedUpdates.current.set(planId, { ...existingUpdates, ...updates });

    // Clear existing batch timer
    if (batchTimer.current) {
      clearTimeout(batchTimer.current);
    }

    // Set new batch timer
    batchTimer.current = setTimeout(async () => {
      const allUpdates = batchedUpdates.current.get(planId);
      if (allUpdates && Object.keys(allUpdates).length > 0) {
        try {
          const planService = await import('../services/realtimePlanService');
          await planService.batchUpdatePlanRealtime(planId, allUpdates, userId, sessionId);
        } catch (error) {
          console.error('Error in batch update:', error);
        }
      }
      batchedUpdates.current.delete(planId);
      batchTimer.current = null;
    }, 300); // Shorter delay for batched updates
  }, []);

  // Track change origin to prevent feedback loops
  const setChangeOrigin = useCallback((origin) => {
    lastChangeOriginRef.current = origin;
    // Clear origin after a short delay
    setTimeout(() => {
      if (lastChangeOriginRef.current === origin) {
        lastChangeOriginRef.current = null;
      }
    }, 1000);
  }, []);

  // Check if a change originated from this session
  const isOwnChange = useCallback((changeOrigin) => {
    return changeOrigin === sessionId || changeOrigin === lastChangeOriginRef.current;
  }, [sessionId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      leaveCollaborativeSession();
      cleanupListeners();
    };
  }, [leaveCollaborativeSession, cleanupListeners]);

  // Performance monitoring
  const performanceMetrics = useRef({
    updateCount: 0,
    lastUpdateTime: 0,
    averageUpdateTime: 0
  });

  const trackPerformance = useCallback((operation, startTime) => {
    const endTime = Date.now();
    const duration = endTime - startTime;

    performanceMetrics.current.updateCount++;
    performanceMetrics.current.lastUpdateTime = duration;
    performanceMetrics.current.averageUpdateTime =
      (performanceMetrics.current.averageUpdateTime + duration) / 2;

    // Log performance warnings
    if (duration > 1000) {
      console.warn(`Slow ${operation} operation: ${duration}ms`);
    }
  }, []);

  const value = {
    // State
    activePlanId,
    collaborators,
    isCollaborating,
    sessionId,
    displayName,

    // Actions
    joinCollaborativeSession,
    leaveCollaborativeSession,
    setDisplayName,

    // Utilities
    debouncedUpdate,
    batchUpdate,
    setChangeOrigin,
    isOwnChange,
    trackPerformance,
    isUpdating: isUpdatingRef.current,

    // Performance metrics (for debugging)
    getPerformanceMetrics: () => performanceMetrics.current
  };

  return (
    <CollaborationContext.Provider value={value}>
      {children}
    </CollaborationContext.Provider>
  );
};
