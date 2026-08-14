import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import {
  applyPlanOperation,
  createNormalizedPlan,
  deleteNormalizedPlan,
  listNormalizedPlans,
  loadPlanWorkspace,
} from '../services/normalizedPlanService';
import {
  getErrorMessage,
} from '../services/backendErrorUtils';
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

  // The dashboard is a durable account view. Plan-specific live updates are
  // subscribed only after opening that plan, avoiding collection-wide fanout.
  const loadUserPlansRealtime = useCallback(() => {
    if (!user) return;
    setLoading(true);
    setError(null);
    void listNormalizedPlans()
      .then((userPlans) => {
        setPlans(userPlans);
        setError(null);
      })
      .catch((err) => {
        setPlans([]);
        setError(getErrorMessage(err));
      })
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadUserPlansRealtime();
    } else {
      cleanupListeners();
      setPlans([]);
      setCurrentPlan(null);
    }

    return cleanupListeners;
  }, [cleanupListeners, isAuthenticated, loadUserPlansRealtime, user]);

  // Legacy function for backward compatibility
  const loadUserPlans = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const userPlans = await listNormalizedPlans();
      setPlans(Array.isArray(userPlans) ? userPlans : []);
    } catch (err) {
      setError(getErrorMessage(err));
      console.error('Error loading plans:', err);
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
      const workspace = await createNormalizedPlan(planData);
      const newPlan = workspace.plan;
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
      const workspace = await loadPlanWorkspace(planId);
      const updatedWorkspace = await applyPlanOperation(
        planId,
        {
          kind: 'patch_plan',
          targetType: 'plan',
          payload: {
            name: planData.name,
            description: planData.description,
            routeId: planData.routeId,
            selectedJobs: planData.selectedJobs,
            tankPositions: planData.tankPositions,
            phaseOverrides: planData.phaseOverrides,
            timelineLayout: planData.timelineLayout || undefined,
            healthSettings: planData.healthSettings,
            metadata: planData,
          },
        },
        workspace.revision
      );
      const updatedPlan = updatedWorkspace.plan;
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
      await deleteNormalizedPlan(planId);
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
      const plan = (await loadPlanWorkspace(planId)).plan;
      setCurrentPlan(plan);
      return plan;
    } catch (err) {
      setError(getErrorMessage(err));
      setLoading(false);
      throw err;
    }
  }, []);

  // Legacy function for backward compatibility
  const loadPlan = useCallback(async (planId: string) => {
    setLoading(true);
    setError(null);

    try {
      const plan = (await loadPlanWorkspace(planId)).plan;
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
      const source = (await loadPlanWorkspace(planId)).plan;
      const duplicatedPlan = (await createNormalizedPlan({
        ...source,
        id: undefined,
        name: newName,
        ownerId: user.uid,
        accessLevel: 'owner',
        revision: 0,
      })).plan;
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
      const exportData = await loadPlanWorkspace(planId);
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
      const importedPlan = (await createNormalizedPlan({
        ...((importData || {}) as Partial<Plan>),
        id: undefined,
        name: planName,
        ownerId: user.uid,
      })).plan;
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
      const workspace = await loadPlanWorkspace(planId);
      const updatedPlan = (await applyPlanOperation(
        planId,
        {
          kind: 'patch_plan',
          targetType: 'plan',
          payload: {
            name: updates.name,
            description: updates.description,
            routeId: updates.routeId,
            selectedJobs: updates.selectedJobs,
            tankPositions: updates.tankPositions,
            phaseOverrides: updates.phaseOverrides,
            timelineLayout: updates.timelineLayout || undefined,
            healthSettings: updates.healthSettings,
            metadata: updates,
          },
        },
        workspace.revision
      )).plan;

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
  }, [user, currentPlan]);

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
