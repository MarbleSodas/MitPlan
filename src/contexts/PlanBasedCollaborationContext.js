/**
 * Plan-Based Collaboration Context
 * 
 * React context that provides plan-based collaboration functionality
 * throughout the application using the optimized collaboration system.
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import planBasedCollaborationService from '../services/PlanBasedCollaborationService';
import { useAuth } from './AuthContext';

// Initial state
const initialState = {
  activePlan: null,
  planData: null,
  isCollaborating: false,
  collaborators: [],
  lastUpdate: null,
  syncStatus: 'disconnected',
  error: null,
  stats: null
};

// Action types
const ActionTypes = {
  JOIN_PLAN: 'JOIN_PLAN',
  LEAVE_PLAN: 'LEAVE_PLAN',
  UPDATE_PLAN_DATA: 'UPDATE_PLAN_DATA',
  RECEIVE_UPDATE: 'RECEIVE_UPDATE',
  SET_SYNC_STATUS: 'SET_SYNC_STATUS',
  SET_ERROR: 'SET_ERROR',
  UPDATE_STATS: 'UPDATE_STATS',
  RESET: 'RESET'
};

// Reducer
function collaborationReducer(state, action) {
  switch (action.type) {
    case ActionTypes.JOIN_PLAN:
      return {
        ...state,
        activePlan: action.payload.planId,
        planData: action.payload.planData,
        isCollaborating: true,
        syncStatus: 'connected',
        error: null
      };

    case ActionTypes.LEAVE_PLAN:
      return {
        ...state,
        activePlan: null,
        planData: null,
        isCollaborating: false,
        collaborators: [],
        syncStatus: 'disconnected',
        error: null
      };

    case ActionTypes.UPDATE_PLAN_DATA:
      return {
        ...state,
        planData: { ...state.planData, ...action.payload.data },
        lastUpdate: {
          type: action.payload.type,
          timestamp: Date.now(),
          by: action.payload.userId
        }
      };

    case ActionTypes.RECEIVE_UPDATE:
      return {
        ...state,
        planData: action.payload.planData,
        lastUpdate: {
          type: 'external',
          timestamp: action.payload.timestamp,
          by: action.payload.updatedBy,
          version: action.payload.version
        }
      };

    case ActionTypes.SET_SYNC_STATUS:
      return {
        ...state,
        syncStatus: action.payload.status,
        error: action.payload.status === 'error' ? action.payload.error : null
      };

    case ActionTypes.SET_ERROR:
      return {
        ...state,
        error: action.payload.error,
        syncStatus: 'error'
      };

    case ActionTypes.UPDATE_STATS:
      return {
        ...state,
        stats: action.payload.stats
      };

    case ActionTypes.RESET:
      return initialState;

    default:
      return state;
  }
}

// Context
const PlanBasedCollaborationContext = createContext();

// Provider component
export function PlanBasedCollaborationProvider({ children }) {
  const [state, dispatch] = useReducer(collaborationReducer, initialState);
  const { user } = useAuth();

  // Initialize service
  useEffect(() => {
    planBasedCollaborationService.initialize();

    return () => {
      planBasedCollaborationService.cleanup();
    };
  }, []);

  // Listen for collaborative updates
  useEffect(() => {
    const handleCollaborativeUpdate = (event) => {
      const { planId, updateData, version, updatedBy, timestamp } = event.detail;

      if (planId === state.activePlan) {
        dispatch({
          type: ActionTypes.RECEIVE_UPDATE,
          payload: {
            planData: updateData,
            version,
            updatedBy,
            timestamp
          }
        });
      }
    };

    window.addEventListener('planBasedCollaborativeUpdate', handleCollaborativeUpdate);

    return () => {
      window.removeEventListener('planBasedCollaborativeUpdate', handleCollaborativeUpdate);
    };
  }, [state.activePlan]);

  // Update stats periodically
  useEffect(() => {
    if (!state.isCollaborating) return;

    const interval = setInterval(() => {
      const stats = planBasedCollaborationService.getCollaborationStats();
      dispatch({
        type: ActionTypes.UPDATE_STATS,
        payload: { stats }
      });
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [state.isCollaborating]);

  // Join a collaborative plan and apply current state
  const joinPlan = useCallback(async (planId, initialPlanData = null) => {
    try {
      dispatch({ type: ActionTypes.SET_SYNC_STATUS, payload: { status: 'connecting' } });

      const userId = user?.uid || `anon_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

      const result = await planBasedCollaborationService.joinPlan(planId, userId, initialPlanData);

      if (result.success) {
        // Use the current plan state from Firebase Realtime Database if available
        const planDataToUse = result.currentPlanState || initialPlanData;

        dispatch({
          type: ActionTypes.JOIN_PLAN,
          payload: {
            planId,
            planData: planDataToUse
          }
        });

        console.log('%c[PLAN-BASED CONTEXT] Successfully joined plan with state', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;', {
          planId,
          userId,
          hasCurrentState: !!result.currentPlanState,
          hasExistingState: result.hasExistingState,
          stateSource: result.currentPlanState ? 'firebase_realtime' : 'initial_data'
        });

        // Return the plan state for the caller to apply to the application
        return {
          success: true,
          planId,
          currentPlanState: planDataToUse,
          hasExistingState: result.hasExistingState
        };
      } else {
        dispatch({
          type: ActionTypes.SET_ERROR,
          payload: { error: result.message }
        });

        return result;
      }

      return result;
    } catch (error) {
      dispatch({
        type: ActionTypes.SET_ERROR,
        payload: { error: error.message }
      });

      return { success: false, message: error.message };
    }
  }, [user]);

  // Leave the current collaborative plan
  const leavePlan = useCallback(async () => {
    if (!state.activePlan) return;

    try {
      const userId = user?.uid || 'anonymous';
      await planBasedCollaborationService.leavePlan(state.activePlan, userId);

      dispatch({ type: ActionTypes.LEAVE_PLAN });

      console.log('%c[PLAN-BASED CONTEXT] Left plan', 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;', state.activePlan);
    } catch (error) {
      dispatch({
        type: ActionTypes.SET_ERROR,
        payload: { error: error.message }
      });
    }
  }, [state.activePlan, user]);

  // Update complete plan state
  const updatePlanState = useCallback(async (planData) => {
    if (!state.activePlan) return { success: false, message: 'No active plan' };

    try {
      const userId = user?.uid || 'anonymous';
      const result = await planBasedCollaborationService.updatePlanState(
        state.activePlan,
        planData,
        userId
      );

      if (result.success && !result.skipped) {
        dispatch({
          type: ActionTypes.UPDATE_PLAN_DATA,
          payload: {
            data: planData,
            type: 'complete',
            userId
          }
        });
      }

      return result;
    } catch (error) {
      dispatch({
        type: ActionTypes.SET_ERROR,
        payload: { error: error.message }
      });

      return { success: false, message: error.message };
    }
  }, [state.activePlan, user]);

  // Update specific plan data
  const updatePlanData = useCallback(async (dataType, data) => {
    if (!state.activePlan) return { success: false, message: 'No active plan' };

    try {
      const userId = user?.uid || 'anonymous';
      const result = await planBasedCollaborationService.updatePlanData(
        state.activePlan,
        dataType,
        data,
        userId
      );

      if (result.success && !result.skipped) {
        dispatch({
          type: ActionTypes.UPDATE_PLAN_DATA,
          payload: {
            data: { [dataType]: data },
            type: dataType,
            userId
          }
        });
      }

      return result;
    } catch (error) {
      dispatch({
        type: ActionTypes.SET_ERROR,
        payload: { error: error.message }
      });

      return { success: false, message: error.message };
    }
  }, [state.activePlan, user]);

  // Convenience methods for specific data types
  const updateAssignments = useCallback((assignments) => {
    return updatePlanData('assignments', assignments);
  }, [updatePlanData]);

  const updateSelectedJobs = useCallback((selectedJobs) => {
    return updatePlanData('selectedJobs', selectedJobs);
  }, [updatePlanData]);

  const updateBossSelection = useCallback((bossId) => {
    return updatePlanData('bossId', bossId);
  }, [updatePlanData]);

  const updateTankPositions = useCallback((tankPositions) => {
    return updatePlanData('tankPositions', tankPositions);
  }, [updatePlanData]);

  // Get collaboration statistics
  const getStats = useCallback(() => {
    return planBasedCollaborationService.getCollaborationStats();
  }, []);

  // Context value
  const value = {
    // State
    ...state,

    // Actions
    joinPlan,
    leavePlan,
    updatePlanState,
    updatePlanData,

    // Convenience methods
    updateAssignments,
    updateSelectedJobs,
    updateBossSelection,
    updateTankPositions,

    // Utilities
    getStats
  };

  return (
    <PlanBasedCollaborationContext.Provider value={value}>
      {children}
    </PlanBasedCollaborationContext.Provider>
  );
}

// Hook to use the context
export function usePlanBasedCollaboration() {
  const context = useContext(PlanBasedCollaborationContext);
  
  if (!context) {
    throw new Error('usePlanBasedCollaboration must be used within a PlanBasedCollaborationProvider');
  }
  
  return context;
}

export default PlanBasedCollaborationContext;
