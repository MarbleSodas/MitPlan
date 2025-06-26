import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useDisplayName } from './DisplayNameContext';
import OptimizedPlanSyncService from '../services/OptimizedPlanSyncService';
import SessionCleanupService from '../services/SessionCleanupService';
import ErrorHandlingService from '../services/ErrorHandlingService';

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
  const { displayName, userId: displayNameUserId, updateActivity } = useDisplayName();

  // Core collaboration state
  const [isConnected, setIsConnected] = useState(false);
  const [isCollaborating, setIsCollaborating] = useState(false);
  const [currentPlanId, setCurrentPlanId] = useState(null);
  const [roomUsers, setRoomUsers] = useState([]);
  const [connectionError, setConnectionError] = useState(null);

  // Session management state
  const [currentSession, setCurrentSession] = useState(null);
  const [sessionParticipants, setSessionParticipants] = useState([]);
  const [isSessionOwner, setIsSessionOwner] = useState(false);
  const [sessionStatus, setSessionStatus] = useState('inactive');
  const [sessionHealth, setSessionHealth] = useState({ healthy: false });
  const [cleanupStatus, setCleanupStatus] = useState({ active: false });

  // Refs for callbacks
  const onPlanUpdateRef = useRef(null);
  const onUserJoinedRef = useRef(null);
  const onUserLeftRef = useRef(null);
  const unsubscribersRef = useRef([]);

  // Effective user ID (authenticated user ID or display name user ID)
  const effectiveUserId = user?.uid || displayNameUserId;

  // Initialize connection
  useEffect(() => {
    setIsConnected(true);
    setConnectionError(null);
  }, []);

  // Join collaboration plan
  const joinPlan = async (planId, planData = null) => {
    try {
      console.log('🚀 Joining collaboration plan:', planId);
      
      setCurrentPlanId(planId);
      setIsCollaborating(true);
      setConnectionError(null);

      // Initialize plan state if provided
      if (planData) {
        await OptimizedPlanSyncService.initializePlanState(planId, planData, effectiveUserId);
      }

      return { success: true, message: 'Successfully joined collaboration' };
    } catch (error) {
      console.error('❌ Error joining plan:', error);
      setConnectionError(error.message);
      return { success: false, message: error.message };
    }
  };

  // Leave collaboration plan
  const leavePlan = async () => {
    try {
      console.log('👋 Leaving collaboration plan:', currentPlanId);
      
      // Cleanup optimized sync service
      if (currentPlanId) {
        await OptimizedPlanSyncService.cleanup(currentPlanId);
      }

      setCurrentPlanId(null);
      setIsCollaborating(false);
      setRoomUsers([]);
      setCurrentSession(null);
      setSessionParticipants([]);
      setIsSessionOwner(false);
      setSessionStatus('inactive');

      return { success: true, message: 'Successfully left collaboration' };
    } catch (error) {
      console.error('❌ Error leaving plan:', error);
      return { success: false, message: error.message };
    }
  };

  // Broadcast plan update
  const broadcastPlanUpdate = async (updateData) => {
    if (!currentPlanId || !isCollaborating) {
      return { success: false, message: 'Not in collaboration mode' };
    }

    try {
      updateActivity?.();
      // The OptimizedPlanSyncService handles broadcasting through its sync methods
      return { success: true, message: 'Update broadcasted' };
    } catch (error) {
      console.error('❌ Error broadcasting update:', error);
      return { success: false, message: error.message };
    }
  };

  // Sync methods using OptimizedPlanSyncService
  const syncMitigationAssignments = async (assignments) => {
    if (!currentPlanId || !isCollaborating) {
      return { success: false, message: 'Not in collaboration mode' };
    }

    try {
      updateActivity?.();
      return await OptimizedPlanSyncService.syncMitigationAssignments(
        currentPlanId, 
        assignments, 
        effectiveUserId
      );
    } catch (error) {
      console.error('❌ Error syncing mitigation assignments:', error);
      return { success: false, message: error.message };
    }
  };

  const syncJobSelections = async (selectedJobs) => {
    if (!currentPlanId || !isCollaborating) {
      return { success: false, message: 'Not in collaboration mode' };
    }

    try {
      updateActivity?.();
      return await OptimizedPlanSyncService.syncJobSelections(
        currentPlanId, 
        selectedJobs, 
        effectiveUserId
      );
    } catch (error) {
      console.error('❌ Error syncing job selections:', error);
      return { success: false, message: error.message };
    }
  };

  const syncBossSelection = async (bossId) => {
    if (!currentPlanId || !isCollaborating) {
      return { success: false, message: 'Not in collaboration mode' };
    }

    try {
      updateActivity?.();
      return await OptimizedPlanSyncService.syncBossSelection(
        currentPlanId, 
        bossId, 
        effectiveUserId
      );
    } catch (error) {
      console.error('❌ Error syncing boss selection:', error);
      return { success: false, message: error.message };
    }
  };

  const syncTankPositions = async (tankPositions) => {
    if (!currentPlanId || !isCollaborating) {
      return { success: false, message: 'Not in collaboration mode' };
    }

    try {
      updateActivity?.();
      return await OptimizedPlanSyncService.syncTankPositions(
        currentPlanId, 
        tankPositions, 
        effectiveUserId
      );
    } catch (error) {
      console.error('❌ Error syncing tank positions:', error);
      return { success: false, message: error.message };
    }
  };

  // Simplified session management
  const startCollaborationSession = async (planData) => {
    setSessionStatus('active');
    setIsSessionOwner(true);
    return { success: true, message: 'Session started' };
  };

  const endCollaborationSession = async (finalPlanData) => {
    setSessionStatus('ended');
    setCurrentSession(null);
    setSessionParticipants([]);
    setIsSessionOwner(false);
    return { success: true, message: 'Session ended' };
  };

  const pauseCollaborationSession = async () => {
    setSessionStatus('paused');
    return { success: true, message: 'Session paused' };
  };

  const resumeCollaborationSession = async () => {
    setSessionStatus('active');
    return { success: true, message: 'Session resumed' };
  };

  // Health monitoring
  const checkSessionHealth = async () => {
    const health = { healthy: isConnected, message: isConnected ? 'Healthy' : 'Disconnected' };
    setSessionHealth(health);
    return health;
  };

  const getCleanupStatus = async () => {
    return { active: false, message: 'No cleanup needed' };
  };

  const triggerManualCleanup = async () => {
    return { success: true, message: 'Cleanup completed' };
  };

  const checkConnectionHealth = async () => {
    return { healthy: isConnected, message: isConnected ? 'Connected' : 'Disconnected' };
  };

  // Callback setters
  const onPlanUpdate = (callback) => {
    onPlanUpdateRef.current = callback;
  };

  const onUserJoined = (callback) => {
    onUserJoinedRef.current = callback;
  };

  const onUserLeft = (callback) => {
    onUserLeftRef.current = callback;
  };

  const value = {
    isConnected,
    isCollaborating,
    currentPlanId,
    roomUsers,
    connectionError,
    userId: effectiveUserId,
    displayName,
    canEdit: true,
    joinPlan,
    leavePlan,
    broadcastPlanUpdate,
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
    checkConnectionHealth,

    // Enhanced sync methods
    syncMitigationAssignments,
    syncJobSelections,
    syncBossSelection,
    syncTankPositions
  };

  return (
    <CollaborationContext.Provider value={value}>
      {children}
    </CollaborationContext.Provider>
  );
};

export default CollaborationContext;
