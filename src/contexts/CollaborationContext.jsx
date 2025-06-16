import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useDisplayName } from './DisplayNameContext';
import DisplayNameContext from './DisplayNameContext';
import RealtimeCollaborationService from '../services/RealtimeCollaborationService';
import SessionCleanupService from '../services/SessionCleanupService';
import ErrorHandlingService from '../services/ErrorHandlingService';

// Custom hook to safely use DisplayName context with fallback
const useSafeDisplayName = () => {
  const { isAuthenticated } = useAuth();

  // Check if DisplayNameContext is available
  const displayNameContext = useContext(DisplayNameContext);

  if (displayNameContext) {
    return displayNameContext;
  }

  // Fallback if DisplayNameProvider is not available
  return {
    displayName: null,
    userId: null,
    canEdit: isAuthenticated,
    updateActivity: () => {},
    needsDisplayName: !isAuthenticated,
    hasProvidedName: false,
    customDisplayName: null,
    sessionId: null,
    lastActivity: Date.now(),
    isAuthenticated,
    setDisplayName: () => {},
    clearDisplayName: () => {},
    generateAnonymousName: () => 'Anonymous User',
    sessionTimeout: 30 * 60 * 1000,
    isSessionValid: () => true
  };
};

const CollaborationContext = createContext();

export const useCollaboration = () => {
  const context = useContext(CollaborationContext);
  if (!context) {
    throw new Error('useCollaboration must be used within a CollaborationProvider');
  }
  return context;
};

export const CollaborationProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const { displayName, userId, canEdit, updateActivity } = useSafeDisplayName();

  // Remove ReadOnly context dependency to avoid circular dependency
  // Auto-join logic will be handled in App.jsx where all contexts are available

  const [isConnected, setIsConnected] = useState(false);
  const [currentPlanId, setCurrentPlanId] = useState(null);
  const [roomUsers, setRoomUsers] = useState([]);
  const [isCollaborating, setIsCollaborating] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [userSelections, setUserSelections] = useState({});

  // Session management state
  const [currentSession, setCurrentSession] = useState(null);
  const [sessionParticipants, setSessionParticipants] = useState([]);
  const [isSessionOwner, setIsSessionOwner] = useState(false);
  const [sessionStatus, setSessionStatus] = useState(null); // 'active', 'paused', 'ended', null

  // Session cleanup and health monitoring
  const [sessionHealth, setSessionHealth] = useState(null);
  const [cleanupStatus, setCleanupStatus] = useState(null);

  // Refs for callbacks to avoid stale closures
  const onPlanUpdateRef = useRef(null);
  const onUserJoinedRef = useRef(null);
  const onUserLeftRef = useRef(null);
  const unsubscribersRef = useRef([]);

  // Initialize Firebase connection state
  useEffect(() => {
    console.log('%c[COLLABORATION CONTEXT] Initializing Firebase Realtime Database connection', 'background: #2196F3; color: white; padding: 2px 5px; border-radius: 3px;', {
      timestamp: new Date().toISOString(),
      realtimeDbAvailable: !!RealtimeCollaborationService.realtimeDb,
      authState: isAuthenticated ? 'authenticated' : 'unauthenticated'
    });
    setIsConnected(true);
    setConnectionError(null);
  }, [isAuthenticated]);

  // Auto-join logic moved to App.jsx to avoid circular dependency issues

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('%c[COLLABORATION CONTEXT] Component unmounting - cleaning up collaboration resources', 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;', {
        currentPlanId,
        activeListeners: unsubscribersRef.current.length,
        isCollaborating,
        timestamp: new Date().toISOString()
      });

      unsubscribersRef.current.forEach(unsubscribe => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      });
      unsubscribersRef.current = [];

      // Clean up session monitoring
      if (currentPlanId) {
        console.log('%c[COLLABORATION CONTEXT] Stopping session monitoring for plan', 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;', currentPlanId);
        SessionCleanupService.stopMonitoring(currentPlanId, 'component_unmount')
          .catch(error => console.warn('Failed to stop session monitoring on unmount:', error));
      }
    };
  }, [currentPlanId, isCollaborating]);

  // Join a plan room for collaboration
  const joinPlan = async (planId, planData = null) => {
    if (!isConnected) {
      console.warn('⚠️ Cannot join plan: not connected');
      setConnectionError('Connection not available');
      return false;
    }

    // Prevent joining if already collaborating on the same plan
    if (isCollaborating && currentPlanId === planId) {
      console.log('%c[COLLABORATION CONTEXT] Already collaborating on this plan', 'background: #9E9E9E; color: white; padding: 2px 5px; border-radius: 3px;', {
        planId,
        currentPlanId,
        isCollaborating
      });
      return true; // Return true since we're already joined
    }

    // Allow unauthenticated users to join as viewers even without display name
    // They can provide a display name later to enable editing
    if (!canEdit && !isAuthenticated) {
      console.log('ℹ️ Unauthenticated user joining as viewer (can provide display name later for editing)');
    }

    try {
      console.log(`%c[COLLABORATION CONTEXT] Joining plan room`, 'background: #2196F3; color: white; padding: 2px 5px; border-radius: 3px;', {
        planId,
        displayName,
        userId,
        hasPlanData: !!planData,
        planDataFields: planData ? Object.keys(planData) : []
      });

      // Update activity when joining
      updateActivity();

      // Prepare user info for both authenticated and unauthenticated users
      const userInfo = {
        displayName: displayName || (isAuthenticated ? 'Authenticated User' : 'Anonymous Viewer'),
        userId: userId || `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` // Generate fallback ID if needed
      };

      // Join the collaboration room - let the service handle plan data fetching if needed
      const result = await RealtimeCollaborationService.joinPlan(planId, userInfo);

      if (result.success) {
        setCurrentPlanId(planId);
        setIsCollaborating(true);
        setConnectionError(null);

        // Set up real-time listeners
        setupCollaborationListeners(planId);

        // Set up session listeners
        setupSessionListeners(planId);

        console.log(`%c[COLLABORATION CONTEXT] Successfully joined plan collaboration`, 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;', {
          planId,
          sessionActive: result.sessionActive,
          isSessionOwner: result.isSessionOwner
        });
        return true;
      } else {
        console.error(`%c[COLLABORATION CONTEXT] Failed to join plan collaboration`, 'background: #f44336; color: white; padding: 2px 5px; border-radius: 3px;', result.message);
        setConnectionError(result.message);
        ErrorHandlingService.handleCollaborationError(new Error(result.message), planId, 'collaboration_context');
        return false;
      }
    } catch (error) {
      console.error(`%c[COLLABORATION CONTEXT] Error joining plan collaboration`, 'background: #f44336; color: white; padding: 2px 5px; border-radius: 3px;', error);
      setConnectionError(error.message);
      ErrorHandlingService.handleCollaborationError(error, planId, 'collaboration_context');
      return false;
    }
  };

  // Leave current plan room
  const leavePlan = async () => {
    if (!currentPlanId) {
      console.log('%c[COLLABORATION CONTEXT] Skipping leave - no current plan', 'background: #9E9E9E; color: white; padding: 2px 5px; border-radius: 3px;');
      return;
    }

    try {
      console.log('%c[COLLABORATION CONTEXT] Leaving plan room', 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;', {
        planId: currentPlanId,
        userId,
        displayName,
        roomUserCount: roomUsers.length,
        isCollaborating,
        timestamp: new Date().toISOString()
      });

      // Leave the collaboration room
      await RealtimeCollaborationService.leavePlan(currentPlanId, userId);

      // Clean up listeners
      cleanupCollaborationListeners();

      setCurrentPlanId(null);
      setIsCollaborating(false);
      setRoomUsers([]);
      setUserSelections({});

      console.log('%c[COLLABORATION CONTEXT] Successfully left plan collaboration', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;', {
        userId,
        displayName
      });
    } catch (error) {
      console.error('%c[COLLABORATION CONTEXT] Error leaving plan collaboration', 'background: #f44336; color: white; padding: 2px 5px; border-radius: 3px;', {
        planId: currentPlanId,
        userId,
        error: error.message
      });
    }
  };

  // Set up Firebase real-time listeners for collaboration
  const setupCollaborationListeners = (planId) => {
    // Clean up any existing listeners first
    cleanupCollaborationListeners();

    // Listen to active users
    const unsubscribeUsers = RealtimeCollaborationService.subscribeToActiveUsers(planId, (users) => {
      console.log('%c[COLLABORATION CONTEXT] Active users updated', 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 3px;', {
        planId,
        userCount: users.length,
        users: users.map(u => ({ id: u.id, name: u.name, isAuthenticated: u.isAuthenticated })),
        timestamp: new Date().toISOString()
      });
      setRoomUsers(users);

      if (onUserJoinedRef.current || onUserLeftRef.current) {
        // Trigger callbacks for user changes
        users.forEach(user => {
          if (onUserJoinedRef.current) {
            onUserJoinedRef.current(user);
          }
        });
      }
    });

    // Listen to user selections
    const unsubscribeSelections = RealtimeCollaborationService.subscribeToSelections(planId, (selections) => {
      console.log('🎯 User selections updated:', selections);
      setUserSelections(selections);
    });

    // Listen to plan updates
    const unsubscribeUpdates = RealtimeCollaborationService.subscribeToPlanUpdates(planId, (updates) => {
      console.log('📡 Plan updates received:', updates);

      if (onPlanUpdateRef.current && updates.length > 0) {
        // Get the most recent update
        const latestUpdate = updates[0];
        onPlanUpdateRef.current(latestUpdate);
      }
    });

    // Store unsubscribe functions
    unsubscribersRef.current = [unsubscribeUsers, unsubscribeSelections, unsubscribeUpdates];
  };

  // Set up session listeners
  const setupSessionListeners = (planId) => {
    console.log('🎯 Setting up session listeners for plan:', planId);

    // Listen to session changes
    const sessionUnsubscribe = RealtimeCollaborationService.subscribeToSession(planId, (session) => {
      console.log('📊 Session updated:', session);
      setCurrentSession(session);

      if (session) {
        setSessionStatus(session.status);
        // Check ownership using display name context user ID
        setIsSessionOwner(userId === session.ownerId);
      } else {
        setSessionStatus(null);
        setIsSessionOwner(false);
      }
    });

    // Listen to session participants
    const participantsUnsubscribe = RealtimeCollaborationService.subscribeToSessionParticipants(planId, (participants) => {
      console.log('👥 Session participants updated:', participants);
      setSessionParticipants(participants);
    });

    // Add session unsubscribers to the main list
    unsubscribersRef.current.push(sessionUnsubscribe, participantsUnsubscribe);
  };

  // Clean up Firebase listeners
  const cleanupCollaborationListeners = () => {
    unsubscribersRef.current.forEach(unsubscribe => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    });
    unsubscribersRef.current = [];
  };

  // Broadcast plan update to other users
  const broadcastPlanUpdate = async (updateData) => {
    if (!currentPlanId || !isCollaborating) {
      console.log('%c[COLLABORATION CONTEXT] Skipping broadcast - not collaborating', 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;', {
        currentPlanId,
        isCollaborating,
        updateType: updateData?.type
      });
      return;
    }

    try {
      console.log('%c[COLLABORATION CONTEXT] Broadcasting plan update', 'background: #2196F3; color: white; padding: 2px 5px; border-radius: 3px;', {
        planId: currentPlanId,
        updateType: updateData?.type,
        userId,
        displayName,
        timestamp: new Date().toISOString()
      });

      // Update activity when broadcasting changes
      updateActivity();

      await RealtimeCollaborationService.broadcastPlanUpdate(
        currentPlanId,
        updateData,
        userId,
        displayName
      );

      console.log('%c[COLLABORATION CONTEXT] Plan update broadcast successful', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;', {
        planId: currentPlanId,
        updateType: updateData?.type
      });
    } catch (error) {
      console.error('%c[COLLABORATION CONTEXT] Error broadcasting plan update', 'background: #f44336; color: white; padding: 2px 5px; border-radius: 3px;', {
        planId: currentPlanId,
        updateType: updateData?.type,
        error: error.message
      });
    }
  };

  // Update user selection
  const updateSelection = async (elementId, selectionData = {}) => {
    if (!currentPlanId || !isCollaborating) {
      return;
    }

    try {
      // Update activity when making selections
      updateActivity();

      await RealtimeCollaborationService.updateSelection(
        currentPlanId,
        elementId,
        selectionData,
        userId
      );
    } catch (error) {
      console.error('❌ Error updating selection:', error);
    }
  };

  // Clear user selection
  const clearSelection = async () => {
    if (!currentPlanId || !isCollaborating) {
      return;
    }

    try {
      await RealtimeCollaborationService.clearSelection(currentPlanId, userId);
    } catch (error) {
      console.error('❌ Error clearing selection:', error);
    }
  };

  // Set callback for plan updates
  const onPlanUpdate = (callback) => {
    onPlanUpdateRef.current = callback;
  };

  // Set callback for user joined
  const onUserJoined = (callback) => {
    onUserJoinedRef.current = callback;
  };

  // Set callback for user left
  const onUserLeft = (callback) => {
    onUserLeftRef.current = callback;
  };

  // Session management methods
  const startCollaborationSession = async (planData) => {
    if (!currentPlanId || !isAuthenticated) {
      return { success: false, message: 'No plan loaded or user not authenticated' };
    }

    try {
      const result = await RealtimeCollaborationService.startCollaborationSession(currentPlanId, planData);

      if (result.success) {
        setSessionStatus('active');
        setIsSessionOwner(true);
      }

      return result;
    } catch (error) {
      console.error('❌ Error starting collaboration session:', error);
      return { success: false, message: error.message };
    }
  };

  const endCollaborationSession = async (finalPlanData) => {
    if (!currentPlanId || !isSessionOwner) {
      return { success: false, message: 'Not authorized to end session' };
    }

    try {
      const result = await RealtimeCollaborationService.endCollaborationSession(currentPlanId, finalPlanData);

      if (result.success) {
        setSessionStatus('ended');
        setCurrentSession(null);
        setSessionParticipants([]);
        setIsSessionOwner(false);
      }

      return result;
    } catch (error) {
      console.error('❌ Error ending collaboration session:', error);
      return { success: false, message: error.message };
    }
  };

  const pauseCollaborationSession = async () => {
    if (!currentPlanId || !isSessionOwner) {
      return { success: false, message: 'Not authorized to pause session' };
    }

    try {
      const result = await RealtimeCollaborationService.pauseCollaborationSession(currentPlanId);

      if (result.success) {
        setSessionStatus('paused');
      }

      return result;
    } catch (error) {
      console.error('❌ Error pausing collaboration session:', error);
      return { success: false, message: error.message };
    }
  };

  const resumeCollaborationSession = async () => {
    if (!currentPlanId || !isSessionOwner) {
      return { success: false, message: 'Not authorized to resume session' };
    }

    try {
      const result = await RealtimeCollaborationService.resumeCollaborationSession(currentPlanId);

      if (result.success) {
        setSessionStatus('active');
      }

      return result;
    } catch (error) {
      console.error('❌ Error resuming collaboration session:', error);
      return { success: false, message: error.message };
    }
  };

  // Session health monitoring
  const checkSessionHealth = async () => {
    if (!currentPlanId) {
      return { healthy: false, message: 'No active plan' };
    }

    try {
      const health = await RealtimeCollaborationService.getCollaborationStatus(currentPlanId);
      setSessionHealth(health);
      return health;
    } catch (error) {
      console.error('❌ Error checking session health:', error);
      const errorHealth = { healthy: false, message: error.message };
      setSessionHealth(errorHealth);
      return errorHealth;
    }
  };

  // Get cleanup monitoring status
  const getCleanupStatus = () => {
    const status = SessionCleanupService.getMonitoringStatus();
    setCleanupStatus(status);
    return status;
  };

  // Manual session cleanup trigger
  const triggerManualCleanup = async () => {
    if (!currentPlanId) {
      return { success: false, message: 'No active plan' };
    }

    try {
      const result = await SessionCleanupService.manualCleanup(currentPlanId);

      if (result.success) {
        // Update local state after successful cleanup
        setCurrentSession(null);
        setSessionStatus('ended');
        setIsSessionOwner(false);
        setSessionParticipants([]);
        setIsCollaborating(false);
        setCurrentPlanId(null);
      }

      return result;
    } catch (error) {
      console.error('❌ Error triggering manual cleanup:', error);
      return { success: false, message: error.message };
    }
  };

  // Connection health check
  const checkConnectionHealth = async () => {
    console.log('%c[COLLABORATION CONTEXT] Checking connection health', 'background: #2196F3; color: white; padding: 2px 5px; border-radius: 3px;', {
      currentPlanId,
      isCollaborating,
      isConnected,
      timestamp: new Date().toISOString()
    });

    if (!currentPlanId) {
      console.warn('%c[COLLABORATION CONTEXT] No active plan for health check', 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;');
      return { healthy: false, message: 'No active plan' };
    }

    try {
      const healthResult = await RealtimeCollaborationService.checkConnectionHealth(currentPlanId);

      console.log('%c[COLLABORATION CONTEXT] Connection health check result', 'background: healthResult.healthy ? "#4CAF50" : "#f44336"; color: white; padding: 2px 5px; border-radius: 3px;', {
        planId: currentPlanId,
        healthy: healthResult.healthy,
        message: healthResult.message,
        timestamp: new Date().toISOString()
      });

      return healthResult;
    } catch (error) {
      console.error('%c[COLLABORATION CONTEXT] Error checking connection health', 'background: #f44336; color: white; padding: 2px 5px; border-radius: 3px;', {
        planId: currentPlanId,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      return { healthy: false, message: error.message };
    }
  };

  const value = {
    isConnected,
    isCollaborating,
    currentPlanId,
    roomUsers,
    userSelections,
    connectionError,
    userId,
    displayName,
    canEdit,
    joinPlan,
    leavePlan,
    broadcastPlanUpdate,
    updateSelection,
    clearSelection,
    onPlanUpdate,
    onUserJoined,
    onUserLeft,

    // Session management
    currentSession,
    sessionParticipants,
    isSessionOwner,
    sessionStatus,
    startCollaborationSession,
    endCollaborationSession,
    pauseCollaborationSession,
    resumeCollaborationSession,

    // Health monitoring and cleanup
    sessionHealth,
    cleanupStatus,
    checkSessionHealth,
    getCleanupStatus,
    triggerManualCleanup,
    checkConnectionHealth
  };

  return (
    <CollaborationContext.Provider value={value}>
      {children}
    </CollaborationContext.Provider>
  );
};

export default CollaborationContext;
