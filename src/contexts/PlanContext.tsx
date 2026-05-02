import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useCollaboration } from './CollaborationContext';
import * as planService from '../services/realtimePlanService';
import {
  getErrorMessage,
  getDashboardPlanLoadErrorMessage,
  isPermissionDeniedError,
  isPlansCollectionPermissionDeniedError,
} from '../services/firebaseErrorUtils';
import type { Plan } from '../types';
import type { PlanContextValue } from '../types/contexts';

const PlanContext = createContext<PlanContextValue | null>(null);

export const usePlan = () => {
  const context = useContext(PlanContext);
  if (!context) {
    throw new Error('usePlan must be used within a PlanProvider');
  }
  return context;
};

interface PlanProviderProps {
  children: ReactNode;
}

export const PlanProvider = ({ children }: PlanProviderProps) => {
  const { user, isAuthenticated } = useAuth();
  const { sessionId, isOwnChange, setChangeOrigin } = useCollaboration();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs to track real-time listeners
  const listenersRef = useRef(new Map<string, () => void>());
  const currentPlanListenerRef = useRef<(() => void) | null>(null);

  // Cleanup listeners function
  const cleanupListeners = useCallback(() => {
    listenersRef.current.forEach((unsubscribe) => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    });
    listenersRef.current.clear();

    if (currentPlanListenerRef.current) {
      currentPlanListenerRef.current();
      currentPlanListenerRef.current = null;
    }
  }, []);

  // Load user plans with real-time subscription
  useEffect(() => {
    if (isAuthenticated && user) {
      loadUserPlansRealtime();
    } else {
      cleanupListeners();
      setPlans([]);
      setCurrentPlan(null);
    }

    return cleanupListeners;
  }, [isAuthenticated, user, cleanupListeners]);

  // Real-time user plans loading
  const loadUserPlansRealtime = useCallback(() => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      // Set up real-time listener for user plans
      const unsubscribe = planService.subscribeToUserPlans(user.uid, (userPlans, error) => {
        if (error) {
          if (isPlansCollectionPermissionDeniedError(error)) {
            setError(getDashboardPlanLoadErrorMessage(error));
          } else if (isPermissionDeniedError(error)) {
            setError(null);
          } else {
            setError(getErrorMessage(error));
            console.error('Error loading plans:', error);
          }
          setPlans([]); // Set empty array to prevent further errors
        } else {
          setPlans(Array.isArray(userPlans) ? userPlans : []);
          setError(null);
        }
        setLoading(false);
      });

      listenersRef.current.set('userPlans', unsubscribe);
    } catch (err) {
      if (isPlansCollectionPermissionDeniedError(err)) {
        setError(getDashboardPlanLoadErrorMessage(err));
        setPlans([]);
      } else if (isPermissionDeniedError(err)) {
        setError(null);
        setPlans([]);
      } else {
        console.error('Error setting up plans listener:', err);
        setError(getErrorMessage(err));
      }
      setLoading(false);
    }
  }, [user]);

  // Legacy function for backward compatibility
  const loadUserPlans = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const userPlans = await planService.getUserPlans(user.uid);
      setPlans(Array.isArray(userPlans) ? userPlans : []);
    } catch (err) {
      if (isPlansCollectionPermissionDeniedError(err)) {
        setError(getDashboardPlanLoadErrorMessage(err));
      } else if (isPermissionDeniedError(err)) {
        setError(null);
      } else {
        setError(getErrorMessage(err));
        console.error('Error loading plans:', err);
      }
      setPlans([]); // Set empty array to prevent further errors
    } finally {
      setLoading(false);
    }
  }, [user]);

  const createNewPlan = async (planData: Partial<Plan>) => {
    if (!user) throw new Error('User not authenticated');
    
    setLoading(true);
    setError(null);
    
    try {
      const newPlan = await planService.createPlan(user.uid, planData);
      setPlans(prev => [newPlan, ...prev]);
      return newPlan;
    } catch (err) {
      setError(getErrorMessage(err));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateExistingPlan = async (planId: string, planData: Partial<Plan>) => {
    setLoading(true);
    setError(null);
    
    try {
      const updatedPlan = await planService.updatePlan(planId, planData);
      setPlans(prev => prev.map(plan => 
        plan.id === planId ? { ...plan, ...updatedPlan } : plan
      ));
      
      if (currentPlan?.id === planId) {
        setCurrentPlan(prev => ({ ...prev, ...updatedPlan }));
      }
      
      return updatedPlan;
    } catch (err) {
      setError(getErrorMessage(err));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deletePlanById = async (planId: string) => {
    setLoading(true);
    setError(null);

    // Optimistic update: Remove plan from UI immediately
    const previousPlans = plans;
    const previousCurrentPlan = currentPlan;

    setPlans(prev => prev.filter(plan => plan.id !== planId));

    if (currentPlan?.id === planId) {
      setCurrentPlan(null);
    }

    try {
      await planService.deletePlan(planId);
      console.log('[PlanContext] Plan deleted successfully (optimistic)');
    } catch (err) {
      // Rollback on error: Restore previous state
      console.error('[PlanContext] Plan deletion failed, rolling back:', err);
      setPlans(previousPlans);
      setCurrentPlan(previousCurrentPlan);
      setError(getErrorMessage(err));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Real-time plan loading with collaboration support
  const loadPlanRealtime = useCallback(async (planId: string) => {
    setLoading(true);
    setError(null);

    try {
      // Clean up existing plan listener
      if (currentPlanListenerRef.current) {
        currentPlanListenerRef.current();
        currentPlanListenerRef.current = null;
      }

      // Set up real-time listener for the specific plan
      const unsubscribe = planService.subscribeToPlanWithOrigin(
        planId,
        (plan, changeOrigin, error) => {
          if (error) {
            setError(getErrorMessage(error));
            setCurrentPlan(null);
          } else if (plan) {
            // Only update if change didn't originate from this session
            if (!changeOrigin || !isOwnChange(changeOrigin)) {
              setCurrentPlan(plan);
            }
            setError(null);
          } else {
            setCurrentPlan(null);
          }
          setLoading(false);
        },
        sessionId
      );

      currentPlanListenerRef.current = unsubscribe;

      // Also get initial plan data with access tracking
      const plan = await planService.getPlanWithAccessTracking(planId);
      setCurrentPlan(plan);
      return plan;
    } catch (err) {
      setError(getErrorMessage(err));
      setLoading(false);
      throw err;
    }
  }, [sessionId, isOwnChange]);

  // Legacy function for backward compatibility
  const loadPlan = useCallback(async (planId: string) => {
    setLoading(true);
    setError(null);

    try {
      // Use access tracking when loading plans
      const plan = await planService.getPlanWithAccessTracking(planId);
      setCurrentPlan(plan);
      return plan;
    } catch (err) {
      setError(getErrorMessage(err));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const duplicatePlanById = async (planId: string, newName: string) => {
    if (!user) throw new Error('User not authenticated');
    
    setLoading(true);
    setError(null);
    
    try {
      const duplicatedPlan = await planService.duplicatePlan(user.uid, planId, newName);
      setPlans(prev => [duplicatedPlan, ...prev]);
      return duplicatedPlan;
    } catch (err) {
      setError(getErrorMessage(err));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const exportPlanById = async (planId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const exportData = await planService.exportPlan(planId);
      return exportData;
    } catch (err) {
      setError(getErrorMessage(err));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const importPlanData = async (importData: unknown, planName: string) => {
    if (!user) throw new Error('User not authenticated');
    
    setLoading(true);
    setError(null);
    
    try {
      const importedPlan = await planService.importPlan(user.uid, importData, planName);
      setPlans(prev => [importedPlan, ...prev]);
      return importedPlan;
    } catch (err) {
      setError(getErrorMessage(err));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Real-time plan updates with collaboration support
  const updatePlanRealtime = useCallback(async (planId: string, updates: Partial<Plan>) => {
    if (!user) throw new Error('User not authenticated');

    setLoading(true);
    setError(null);

    try {
      // Mark change as originating from this session
      setChangeOrigin(sessionId);

      const updatedPlan = await planService.batchUpdatePlanRealtime(
        planId,
        updates,
        user.uid,
        sessionId
      );

      // Update local state immediately for better UX
      setPlans(prev => prev.map(plan =>
        plan.id === planId ? { ...plan, ...updates } : plan
      ));

      if (currentPlan?.id === planId) {
        setCurrentPlan(prev => ({ ...prev, ...updates }));
      }

      return updatedPlan;
    } catch (err) {
      setError(getErrorMessage(err));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user, sessionId, currentPlan, setChangeOrigin]);

  const value = {
    plans,
    currentPlan,
    loading,
    error,
    setCurrentPlan,
    loadUserPlans,
    loadUserPlansRealtime,
    createNewPlan,
    updateExistingPlan,
    updatePlanRealtime,
    deletePlanById,
    loadPlan,
    loadPlanRealtime,
    duplicatePlanById,
    exportPlanById,
    importPlanData
  };

  return (
    <PlanContext.Provider value={value}>
      {children}
    </PlanContext.Provider>
  );
};
