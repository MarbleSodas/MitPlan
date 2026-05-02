import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import sessionManager from '../services/sessionManager';
import { storeUserProfile } from '../services/userService';
import { batchUpdatePlanRealtime } from '../services/realtimePlanService';
import {
  COLLABORATION_UNAVAILABLE_MESSAGE,
  getErrorMessage,
  isPermissionDeniedError,
} from '../services/firebaseErrorUtils';
import type { CollaborationContextValue, Collaborator } from '../types/contexts';

const CollaborationContext = createContext<CollaborationContextValue | null>(null);

type CollaboratorRecord = Collaborator;

export const useCollaboration = () => {
  const context = useContext(CollaborationContext);
  if (!context) {
    throw new Error('useCollaboration must be used within a CollaborationProvider');
  }
  return context;
};

const generateSessionId = () => `session_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

const cleanDisplayName = (name: string | null | undefined) => {
  if (!name) return name;
  if ((name.startsWith('"') && name.endsWith('"')) || (name.startsWith("'") && name.endsWith("'"))) {
    return name.slice(1, -1);
  }
  return name;
};

const areCollaboratorsEqual = (
  previousCollaborators: CollaboratorRecord[],
  nextCollaborators: CollaboratorRecord[]
): boolean => {
  if (previousCollaborators.length !== nextCollaborators.length) {
    return false;
  }

  return previousCollaborators.every((collaborator, index) => {
    const otherCollaborator = nextCollaborators[index];

    return (
      collaborator.sessionId === otherCollaborator?.sessionId &&
      collaborator.userId === otherCollaborator?.userId &&
      collaborator.displayName === otherCollaborator?.displayName &&
      collaborator.email === otherCollaborator?.email &&
      collaborator.color === otherCollaborator?.color &&
      collaborator.isActive === otherCollaborator?.isActive
    );
  });
};

interface CollaborationProviderProps {
  children: ReactNode;
  enabled?: boolean;
}

export const CollaborationProvider = ({ children, enabled = true }: CollaborationProviderProps) => {
  const { user, isAuthenticated, displayName: authDisplayName } = useAuth();
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [collaborators, setCollaborators] = useState<CollaboratorRecord[]>([]);
  const [isCollaborating, setIsCollaborating] = useState(false);
  const [collaborationAvailable, setCollaborationAvailable] = useState(true);
  const [collaborationError, setCollaborationError] = useState<string | null>(null);
  const [sessionId] = useState(() => generateSessionId());
  const [displayName, setDisplayName] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);

  const activePlanIdRef = useRef(activePlanId);
  const displayNameRef = useRef(displayName);
  const listenersRef = useRef(new Map<string, () => void>());
  const lastChangeOriginRef = useRef<string | null>(null);
  const debounceTimersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const batchedUpdates = useRef(new Map<string, Record<string, unknown>>());
  const batchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionStartedRef = useRef(false);
  const joinPromiseRef = useRef<Promise<boolean> | null>(null);
  const joiningPlanIdRef = useRef<string | null>(null);
  const loggedCollaborationErrorRef = useRef<string | null>(null);
  const performanceMetrics = useRef({
    updateCount: 0,
    lastUpdateTime: 0,
    averageUpdateTime: 0
  });

  useEffect(() => {
    const resolvedDisplayName = cleanDisplayName(
      authDisplayName || user?.email?.split('@')[0] || 'User'
    );
    setDisplayName(resolvedDisplayName);
  }, [authDisplayName, user?.email]);

  useEffect(() => {
    activePlanIdRef.current = activePlanId;
  }, [activePlanId]);

  useEffect(() => {
    displayNameRef.current = displayName;
  }, [displayName]);

  const cleanupListeners = useCallback(() => {
    listenersRef.current.forEach((unsubscribe) => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    });
    listenersRef.current.clear();

    debounceTimersRef.current.forEach((timer) => {
      clearTimeout(timer);
    });
    debounceTimersRef.current.clear();

    if (batchTimer.current) {
      clearTimeout(batchTimer.current);
      batchTimer.current = null;
    }
    batchedUpdates.current.clear();
  }, []);

  const resetCollaborationHealth = useCallback(() => {
    loggedCollaborationErrorRef.current = null;
    setCollaborationAvailable(true);
    setCollaborationError(null);
  }, []);

  const markCollaborationUnavailable = useCallback((error: unknown, stage: string) => {
    const detail = `${stage}:${getErrorMessage(error)}`;

    if (loggedCollaborationErrorRef.current !== detail) {
      if (isPermissionDeniedError(error)) {
        console.warn('[CollaborationContext] Realtime collaboration disabled:', getErrorMessage(error));
      } else {
        console.error('[CollaborationContext] Collaboration error:', error);
      }
      loggedCollaborationErrorRef.current = detail;
    }

    setCollaborationAvailable(false);
    setCollaborationError(COLLABORATION_UNAVAILABLE_MESSAGE);
  }, []);

  const leaveCollaborativeSession = useCallback(async () => {
    cleanupListeners();

    if (sessionStartedRef.current) {
      try {
        await sessionManager.endSession(sessionId);
      } catch (error) {
        if (!isPermissionDeniedError(error)) {
          console.error('Error leaving collaborative session:', error);
        }
      }
    }

    sessionStartedRef.current = false;
    joinPromiseRef.current = null;
    joiningPlanIdRef.current = null;
    activePlanIdRef.current = null;
    setActivePlanId(null);
    setCollaborators([]);
    setIsCollaborating(false);
  }, [cleanupListeners, sessionId]);

  const joinCollaborativeSession = useCallback(async (planId: string, userDisplayName: string | null = null) => {
    if (!enabled || !isAuthenticated || !user?.uid || !planId) {
      return false;
    }

    if (joinPromiseRef.current) {
      if (joiningPlanIdRef.current === planId) {
        return joinPromiseRef.current;
      }

      try {
        await joinPromiseRef.current;
      } catch (error) {
        console.error('[CollaborationContext] Previous join attempt failed:', error);
      }
    }

    const finalDisplayName = cleanDisplayName(
      userDisplayName || displayNameRef.current || authDisplayName || user.email?.split('@')[0] || 'User'
    );

    resetCollaborationHealth();

    if (
      sessionStartedRef.current &&
      activePlanIdRef.current === planId &&
      listenersRef.current.has('collaborators')
    ) {
      if (finalDisplayName !== displayNameRef.current) {
        setDisplayName(finalDisplayName);
      }
      return true;
    }

    if (sessionStartedRef.current) {
      await leaveCollaborativeSession();
    }

    joiningPlanIdRef.current = planId;

    const joinPromise = (async () => {
      try {
        activePlanIdRef.current = planId;
        setActivePlanId(planId);
        setDisplayName(finalDisplayName);

        try {
          await storeUserProfile(user.uid, finalDisplayName, user.email);
        } catch (profileError) {
          console.error('[CollaborationContext] Failed to store user profile:', profileError);
        }

        await sessionManager.startSession(planId, sessionId, {
          userId: user.uid,
          displayName: finalDisplayName,
          email: user.email || ''
        });

        sessionStartedRef.current = true;
        setIsCollaborating(true);

        const collaboratorsUnsubscribe = sessionManager.subscribeToSessions(planId, (collaboratorsList) => {
          setCollaborators((currentCollaborators) => (
            areCollaboratorsEqual(currentCollaborators, collaboratorsList)
              ? currentCollaborators
              : collaboratorsList
          ));
        }, {
          onError: (error) => {
            if (isPermissionDeniedError(error)) {
              markCollaborationUnavailable(error, 'subscribing');
              void leaveCollaborativeSession();
            }
          },
        });

        listenersRef.current.set('collaborators', collaboratorsUnsubscribe);
        return true;
      } catch (error) {
        if (isPermissionDeniedError(error)) {
          markCollaborationUnavailable(error, 'joining');
        } else {
          console.error('Error joining collaborative session:', error);
        }
        sessionStartedRef.current = false;
        setActivePlanId(null);
        setCollaborators([]);
        setIsCollaborating(false);
        cleanupListeners();
        return false;
      } finally {
        if (joiningPlanIdRef.current === planId) {
          joiningPlanIdRef.current = null;
          joinPromiseRef.current = null;
        }
      }
    })();

    joinPromiseRef.current = joinPromise;
    return joinPromise;
  }, [
    enabled,
    isAuthenticated,
    user?.uid,
    user?.email,
    authDisplayName,
    leaveCollaborativeSession,
    cleanupListeners,
    markCollaborationUnavailable,
    resetCollaborationHealth,
    sessionId
  ]);

  const debouncedUpdate = useCallback<CollaborationContextValue['debouncedUpdate']>((key, updateFn, delay = 500, priority = 'normal') => {
    if (debounceTimersRef.current.has(key)) {
      clearTimeout(debounceTimersRef.current.get(key));
    }

    const adjustedDelay = priority === 'high'
      ? Math.min(delay, 200)
      : priority === 'low'
        ? Math.max(delay, 1000)
        : delay;

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

  const batchUpdate = useCallback<CollaborationContextValue['batchUpdate']>((planId, updates, userId, currentSessionId) => {
    if (!enabled) return;

    if (!batchedUpdates.current.has(planId)) {
      batchedUpdates.current.set(planId, {});
    }

    const existingUpdates = batchedUpdates.current.get(planId);
    batchedUpdates.current.set(planId, { ...existingUpdates, ...updates });

    if (batchTimer.current) {
      clearTimeout(batchTimer.current);
    }

    batchTimer.current = setTimeout(async () => {
      const allUpdates = batchedUpdates.current.get(planId);
      if (allUpdates && Object.keys(allUpdates).length > 0) {
        try {
          await batchUpdatePlanRealtime(planId, allUpdates, userId, currentSessionId);
        } catch (error) {
          console.error('Error in batch update:', error);
        }
      }
      batchedUpdates.current.delete(planId);
      batchTimer.current = null;
    }, 300);
  }, [enabled]);

  const setChangeOrigin = useCallback((origin: string) => {
    lastChangeOriginRef.current = origin;

    setTimeout(() => {
      if (lastChangeOriginRef.current === origin) {
        lastChangeOriginRef.current = null;
      }
    }, 1000);
  }, []);

  const isOwnChange = useCallback((changeOrigin: string | null) => {
    return changeOrigin === sessionId || changeOrigin === lastChangeOriginRef.current;
  }, [sessionId]);

  const trackPerformance = useCallback((operation: string, startTime: number) => {
    const duration = Date.now() - startTime;

    performanceMetrics.current.updateCount += 1;
    performanceMetrics.current.lastUpdateTime = duration;
    performanceMetrics.current.averageUpdateTime =
      (performanceMetrics.current.averageUpdateTime + duration) / 2;

    if (duration > 1000) {
      console.warn(`Slow ${operation} operation: ${duration}ms`);
    }
  }, []);

  useEffect(() => {
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (enabled) return undefined;

    resetCollaborationHealth();
    leaveCollaborativeSession().catch((error) => {
      console.error('[CollaborationContext] Error cleaning up disabled collaboration:', error);
    });

    return undefined;
  }, [enabled, leaveCollaborativeSession, resetCollaborationHealth]);

  useEffect(() => {
    return () => {
      leaveCollaborativeSession().catch((error) => {
        console.error('[CollaborationContext] Error during unmount cleanup:', error);
      });
      cleanupListeners();
    };
  }, [leaveCollaborativeSession, cleanupListeners]);

  const updateDisplayName = useCallback(async (name: string) => {
    const nextDisplayName = cleanDisplayName(name) || 'User';
    setDisplayName(nextDisplayName);

    if (user?.uid) {
      await storeUserProfile(user.uid, nextDisplayName, user.email);
    }
  }, [user?.email, user?.uid]);

  const getCollaboratorDisplayName = useCallback((userId: string) => {
    return collaborators.find((collaborator) => collaborator.userId === userId)?.displayName || 'Collaborator';
  }, [collaborators]);

  const value = useMemo<CollaborationContextValue>(() => ({
    activePlanId,
    collaborators,
    isCollaborating: enabled ? isCollaborating : false,
    collaborationAvailable: enabled ? collaborationAvailable : true,
    collaborationError: enabled ? collaborationError : null,
    sessionId,
    displayName,
    isInitialized,
    joinCollaborativeSession,
    leaveCollaborativeSession,
    updateDisplayName,
    getCollaboratorDisplayName,
    setDisplayName,
    debouncedUpdate,
    batchUpdate,
    setChangeOrigin,
    isOwnChange,
    trackPerformance,
    isUpdating: false,
    getPerformanceMetrics: () => performanceMetrics.current
  }), [
    activePlanId,
    collaborators,
    enabled,
    isCollaborating,
    collaborationAvailable,
    collaborationError,
    sessionId,
    displayName,
    isInitialized,
    joinCollaborativeSession,
    leaveCollaborativeSession,
    updateDisplayName,
    getCollaboratorDisplayName,
    debouncedUpdate,
    batchUpdate,
    setChangeOrigin,
    isOwnChange,
    trackPerformance
  ]);

  return (
    <CollaborationContext.Provider value={value}>
      {children}
    </CollaborationContext.Provider>
  );
};
