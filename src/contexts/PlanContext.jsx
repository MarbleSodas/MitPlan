import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useCollaboration } from './CollaborationContext';
import * as planService from '../services/realtimePlanService';

const PlanContext = createContext({});

export const usePlan = () => {
  const context = useContext(PlanContext);
  if (!context) {
    throw new Error('usePlan must be used within a PlanProvider');
  }
  return context;
};

export const PlanProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const { sessionId, isOwnChange, setChangeOrigin } = useCollaboration();
  const [plans, setPlans] = useState([]);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Refs to track real-time listeners
  const listenersRef = useRef(new Map());
  const currentPlanListenerRef = useRef(null);

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
          // Handle permission denied errors gracefully
          if (error.message && error.message.includes('Permission denied')) {
            setError('Database rules not configured. Please deploy Firebase Realtime Database rules.');
            console.error('Firebase Realtime Database rules need to be deployed. See deploy-rules.md for instructions.');
          } else {
            setError(error.message || 'Error loading plans');
          }
          console.error('Error loading plans:', error);
          setPlans([]); // Set empty array to prevent further errors
        } else {
          setPlans(Array.isArray(userPlans) ? userPlans : []);
          setError(null);
        }
        setLoading(false);
      });

      listenersRef.current.set('userPlans', unsubscribe);
    } catch (err) {
      console.error('Error setting up plans listener:', err);
      setError(err.message);
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
      // Handle permission denied errors gracefully
      if (err.message.includes('Permission denied')) {
        setError('Database rules not configured. Please deploy Firebase Realtime Database rules.');
        console.error('Firebase Realtime Database rules need to be deployed. See deploy-rules.md for instructions.');
      } else {
        setError(err.message);
      }
      console.error('Error loading plans:', err);
      setPlans([]); // Set empty array to prevent further errors
    } finally {
      setLoading(false);
    }
  }, [user]);

  const createNewPlan = async (planData) => {
    if (!user) throw new Error('User not authenticated');
    
    setLoading(true);
    setError(null);
    
    try {
      const newPlan = await planService.createPlan(user.uid, planData);
      setPlans(prev => [newPlan, ...prev]);
      return newPlan;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateExistingPlan = async (planId, planData) => {
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
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deletePlanById = async (planId) => {
    setLoading(true);
    setError(null);
    
    try {
      await planService.deletePlan(planId);
      setPlans(prev => prev.filter(plan => plan.id !== planId));
      
      if (currentPlan?.id === planId) {
        setCurrentPlan(null);
      }
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Real-time plan loading with collaboration support
  const loadPlanRealtime = useCallback(async (planId) => {
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
            setError(error.message);
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
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, [sessionId, isOwnChange]);

  // Legacy function for backward compatibility
  const loadPlan = useCallback(async (planId) => {
    setLoading(true);
    setError(null);

    try {
      // Use access tracking when loading plans
      const plan = await planService.getPlanWithAccessTracking(planId);
      setCurrentPlan(plan);
      return plan;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const duplicatePlanById = async (planId, newName) => {
    if (!user) throw new Error('User not authenticated');
    
    setLoading(true);
    setError(null);
    
    try {
      const duplicatedPlan = await planService.duplicatePlan(user.uid, planId, newName);
      setPlans(prev => [duplicatedPlan, ...prev]);
      return duplicatedPlan;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const exportPlanById = async (planId) => {
    setLoading(true);
    setError(null);
    
    try {
      const exportData = await planService.exportPlan(planId);
      return exportData;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const importPlanData = async (importData, planName) => {
    if (!user) throw new Error('User not authenticated');
    
    setLoading(true);
    setError(null);
    
    try {
      const importedPlan = await planService.importPlan(user.uid, importData, planName);
      setPlans(prev => [importedPlan, ...prev]);
      return importedPlan;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Real-time plan updates with collaboration support
  const updatePlanRealtime = useCallback(async (planId, updates) => {
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
      setError(err.message);
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
