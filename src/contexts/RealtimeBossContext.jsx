import React, { createContext, useState, useContext, useEffect, useMemo } from 'react';
import { useRealtimePlan } from './RealtimePlanContext';
import { bossActionsMap, bosses } from '../data';
import { processMultiHitTankBusters } from '../utils';
// import { autoAssignTankBusterMitigations, shouldTriggerAutoAssignment } from '../utils/mitigation/autoAssignmentUtils';

// Create the context
const RealtimeBossContext = createContext();

// Create a provider component
export const RealtimeBossProvider = ({ children }) => {
  const { 
    bossId: realtimeBossId, 
    updateBossRealtime, 
    isInitialized 
  } = useRealtimePlan();
  
  const [selectedBossAction, setSelectedBossAction] = useState(null);
  const [currentBossActions, setCurrentBossActions] = useState([]);

  // Use real-time boss ID or fallback to default
  const currentBossId = realtimeBossId || 'ketuduke';

  console.log('[RealtimeBossContext] Boss data:', { realtimeBossId, currentBossId, isInitialized });

  // Update boss actions when boss changes
  useEffect(() => {
    if (!currentBossId) return;

    console.log('[RealtimeBossContext] Loading boss actions for:', currentBossId);

    // Get the raw boss actions
    const rawBossActions = bossActionsMap[currentBossId];

    if (rawBossActions) {
      // Process multi-hit tank busters
      const processedActions = processMultiHitTankBusters(rawBossActions);

      // Update the state with processed actions
      console.log('[RealtimeBossContext] currentBossId:', currentBossId, 'First action:', processedActions[0]?.name);
      setCurrentBossActions(processedActions);

      // Deselect any selected action when changing bosses
      setSelectedBossAction(null);
    }
  }, [currentBossId]);

  // Get current boss level
  const currentBossLevel = useMemo(() => {
    const boss = bosses.find(b => b.id === currentBossId);
    return boss ? boss.level : 100;
  }, [currentBossId]);

  // Sort boss actions by time
  const sortedBossActions = useMemo(() => {
    if (!currentBossActions || !Array.isArray(currentBossActions)) {
      return [];
    }
    return [...currentBossActions].sort((a, b) => a.time - b.time);
  }, [currentBossActions]);

  // Toggle boss action selection
  const toggleBossActionSelection = (action) => {
    setSelectedBossAction(prev => 
      prev && prev.id === action.id ? null : action
    );
  };

  // Clear selected boss action
  const clearSelectedBossAction = () => {
    setSelectedBossAction(null);
  };

  // Set boss ID with real-time sync
  const setCurrentBossId = (bossId) => {
    if (isInitialized && updateBossRealtime) {
      updateBossRealtime(bossId);
    }
  };

  // Create the context value
  const contextValue = {
    currentBossId,
    setCurrentBossId,
    currentBossActions,
    sortedBossActions,
    selectedBossAction,
    toggleBossActionSelection,
    clearSelectedBossAction,
    currentBossLevel
  };

  return (
    <RealtimeBossContext.Provider value={contextValue}>
      {children}
    </RealtimeBossContext.Provider>
  );
};

// Create a custom hook for using the boss context
export const useRealtimeBossContext = () => {
  const context = useContext(RealtimeBossContext);
  if (context === undefined) {
    throw new Error('useRealtimeBossContext must be used within a RealtimeBossProvider');
  }
  return context;
};

export default RealtimeBossContext;
