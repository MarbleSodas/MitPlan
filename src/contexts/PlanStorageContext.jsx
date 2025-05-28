import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import PlanStorageService, { STORAGE_STATES } from '../services/PlanStorageService';
import { useAuth } from './AuthContext';

// Create the context
const PlanStorageContext = createContext();

// Create a provider component
export const PlanStorageProvider = ({ children }) => {
  const { isAuthenticated, apiRequest } = useAuth();
  const [storageService, setStorageService] = useState(null);
  const [storageState, setStorageState] = useState(STORAGE_STATES.OFFLINE);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [syncStatus, setSyncStatus] = useState({
    isSyncing: false,
    pendingCount: 0,
    lastSync: null,
    hasConflicts: false
  });
  const [migrationNeeded, setMigrationNeeded] = useState(false);
  const serviceRef = useRef(null);

  // Initialize storage service
  useEffect(() => {
    const initializeService = async () => {
      if (!apiRequest) {
        console.log('PlanStorageProvider: apiRequest not available yet');
        return;
      }

      try {
        console.log('PlanStorageProvider: Initializing storage service');
        const service = new PlanStorageService({ isAuthenticated }, apiRequest);
        serviceRef.current = service;
        setStorageService(service);

        // Update storage state
        await service.updateStorageState();
        setStorageState(service.getStorageState());
        updateSyncStatus(service);

        // Check for migration needs
        if (isAuthenticated) {
          await checkMigrationNeeded(service);
        }

        setIsInitialized(true);
        console.log('PlanStorageProvider: Service initialized successfully');
      } catch (error) {
        console.error('PlanStorageProvider: Failed to initialize service:', error);
        setError(error.message);
      }
    };

    initializeService();
  }, [isAuthenticated, apiRequest]);

  // Update sync status
  const updateSyncStatus = useCallback((service) => {
    if (!service) return;

    setSyncStatus({
      isSyncing: false,
      pendingCount: service.hasPendingSync() ? service.pendingOperations.length : 0,
      lastSync: null,
      hasConflicts: false
    });
  }, []);

  // Check if migration is needed
  const checkMigrationNeeded = useCallback(async (service) => {
    if (!service || !isAuthenticated) return;

    try {
      const localPlans = service.loadPlansFromLocalStorage();
      if (localPlans.length > 0) {
        // Check if these plans already exist in database
        const dbPlans = await service.loadAllPlans();
        const localPlanIds = localPlans.map(p => p.id);
        const dbPlanIds = dbPlans.map(p => p.id);

        // If there are local plans not in database, migration is needed
        const unmigrated = localPlanIds.filter(id => !dbPlanIds.includes(id));
        setMigrationNeeded(unmigrated.length > 0);
      }
    } catch (error) {
      console.error('Error checking migration needs:', error);
    }
  }, [isAuthenticated]);

  // Save plan
  const savePlan = useCallback(async (planData, isUpdate = false) => {
    if (!isInitialized || !storageService) {
      throw new Error('Storage service not initialized. Please wait for initialization to complete.');
    }

    setIsLoading(true);
    setError(null);

    try {
      const savedPlan = await storageService.savePlan(planData, isUpdate);
      updateSyncStatus(storageService);
      return savedPlan;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [storageService, isInitialized, updateSyncStatus]);

  // Load plan
  const loadPlan = useCallback(async (planId) => {
    if (!isInitialized || !storageService) {
      throw new Error('Storage service not initialized. Please wait for initialization to complete.');
    }

    setIsLoading(true);
    setError(null);

    try {
      const plan = await storageService.loadPlan(planId);
      return plan;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [storageService, isInitialized]);

  // Load all plans
  const loadAllPlans = useCallback(async () => {
    if (!isInitialized || !storageService) {
      throw new Error('Storage service not initialized. Please wait for initialization to complete.');
    }

    setIsLoading(true);
    setError(null);

    try {
      const plans = await storageService.loadAllPlans();
      return plans;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [storageService, isInitialized]);

  // Delete plan
  const deletePlan = useCallback(async (planId) => {
    if (!isInitialized || !storageService) {
      throw new Error('Storage service not initialized. Please wait for initialization to complete.');
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await storageService.deletePlan(planId);
      updateSyncStatus(storageService);
      return result;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [storageService, isInitialized, updateSyncStatus]);

  // Manual sync trigger
  const syncPlans = useCallback(async () => {
    if (!storageService || !storageService.isOnline()) return;

    setSyncStatus(prev => ({ ...prev, isSyncing: true }));

    try {
      await storageService.attemptSync();
      updateSyncStatus(storageService);
      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        lastSync: new Date().toISOString()
      }));
    } catch (error) {
      setError(error.message);
      setSyncStatus(prev => ({ ...prev, isSyncing: false }));
    }
  }, [storageService, updateSyncStatus]);

  // Get local plans for migration
  const getLocalPlans = useCallback(() => {
    if (!isInitialized || !storageService) return [];
    return storageService.loadPlansFromLocalStorage();
  }, [storageService, isInitialized]);

  // Migrate plans from localStorage to database
  const migratePlans = useCallback(async (plansToMigrate, options = {}) => {
    if (!isInitialized || !storageService || !isAuthenticated) {
      throw new Error('Cannot migrate: not authenticated or service unavailable');
    }

    setIsLoading(true);
    setError(null);

    try {
      const results = {
        successful: [],
        failed: [],
        conflicts: []
      };

      for (const plan of plansToMigrate) {
        try {
          // Check if plan already exists in database
          const existingPlan = await storageService.loadPlan(plan.id);

          if (existingPlan && existingPlan.source === 'database') {
            // Conflict detected
            results.conflicts.push({
              local: plan,
              remote: existingPlan
            });
          } else {
            // Safe to migrate
            const migratedPlan = await storageService.createPlanInDatabase(plan);
            results.successful.push(migratedPlan);

            // Remove from localStorage if requested
            if (options.clearLocal) {
              storageService.deletePlanFromLocalStorage(plan.id);
            }
          }
        } catch (error) {
          results.failed.push({ plan, error: error.message });
        }
      }

      setMigrationNeeded(false);
      updateSyncStatus(storageService);

      return results;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [storageService, isAuthenticated, updateSyncStatus]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Get storage info
  const getStorageInfo = useCallback(() => {
    if (!storageService) return null;

    return {
      state: storageState,
      isOnline: storageService.isOnline(),
      hasPendingSync: storageService.hasPendingSync(),
      pendingCount: storageService.pendingOperations?.length || 0
    };
  }, [storageService, storageState]);

  // Context value
  const contextValue = {
    // State
    storageState,
    isLoading,
    error,
    syncStatus,
    migrationNeeded,
    isInitialized,

    // Plan operations
    savePlan,
    loadPlan,
    loadAllPlans,
    deletePlan,

    // Sync operations
    syncPlans,

    // Migration operations
    getLocalPlans,
    migratePlans,

    // Utility
    clearError,
    getStorageInfo,

    // Service reference (for advanced usage)
    storageService
  };

  return (
    <PlanStorageContext.Provider value={contextValue}>
      {children}
    </PlanStorageContext.Provider>
  );
};

// Custom hook to use the plan storage context
export const usePlanStorage = () => {
  const context = useContext(PlanStorageContext);
  if (!context) {
    throw new Error('usePlanStorage must be used within a PlanStorageProvider');
  }
  return context;
};

export default PlanStorageContext;
