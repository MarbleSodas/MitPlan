import React, { createContext, useState, useContext, useEffect, useMemo } from 'react';
import { bossActionsMap, bosses } from '../data';
import { loadFromLocalStorage, saveToLocalStorage, processMultiHitTankBusters } from '../utils';

// Create the context
const BossContext = createContext();

// Create a provider component
export const BossProvider = ({ children }) => {
  // Initialize boss ID from localStorage or default
  const [currentBossId, setCurrentBossId] = useState(() => {
    // Try to load from localStorage
    const autosavedPlan = loadFromLocalStorage('mitPlanAutosave', null);
    if (autosavedPlan && autosavedPlan.bossId) {
      return autosavedPlan.bossId;
    }
    return 'ketuduke'; // Default boss ID
  });

  // Get boss actions for the current boss
  const [currentBossActions, setCurrentBossActions] = useState(bossActionsMap[currentBossId]);

  // Track selected boss action
  const [selectedBossAction, setSelectedBossAction] = useState(null);

  // Update boss actions when boss changes
  useEffect(() => {
    // Boss is now optional - if no boss selected, use empty actions
    if (!currentBossId) {
      console.log('[BossContext] No boss selected, using empty actions');
      setCurrentBossActions([]);
      setSelectedBossAction(null);
      return;
    }

    // Get the raw boss actions
    const rawBossActions = bossActionsMap[currentBossId];

    if (rawBossActions) {
      // Process multi-hit tank busters
      const processedActions = processMultiHitTankBusters(rawBossActions);

      // Update the state with processed actions
      // DEBUG: Log boss action selection
      console.log('[BossContext] currentBossId:', currentBossId, 'First action:', processedActions[0]?.name);
      setCurrentBossActions(processedActions);

      // Deselect any selected action when changing bosses
      setSelectedBossAction(null);
    } else {
      // Boss ID provided but no actions found
      console.warn('[BossContext] No actions found for boss:', currentBossId);
      setCurrentBossActions([]);
    }

    // Update localStorage
    const autosavedPlan = loadFromLocalStorage('mitPlanAutosave', {});
    saveToLocalStorage('mitPlanAutosave', {
      ...autosavedPlan,
      bossId: currentBossId
    });
  }, [currentBossId]);

  // Sort boss actions by time
  const sortedBossActions = useMemo(() => {
    return [...currentBossActions].sort((a, b) => a.time - b.time);
  }, [currentBossActions]);

  // Get the current boss level
  const currentBossLevel = useMemo(() => {
    const currentBoss = bosses.find(boss => boss.id === currentBossId);
    return currentBoss ? currentBoss.level : 90; // Default to level 90 if boss not found
  }, [currentBossId]);

  // Toggle selection of a boss action
  const toggleBossActionSelection = (action) => {
    if (selectedBossAction && selectedBossAction.id === action.id) {
      // If clicking the already selected action, deselect it
      setSelectedBossAction(null);
    } else {
      // Otherwise select this action
      setSelectedBossAction(action);
    }
  };

  // Clear selected boss action
  const clearSelectedBossAction = () => {
    setSelectedBossAction(null);
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
    <BossContext.Provider value={contextValue}>
      {children}
    </BossContext.Provider>
  );
};

// Create a custom hook for using the boss context
export const useBossContext = () => {
  const context = useContext(BossContext);
  if (context === undefined) {
    throw new Error('useBossContext must be used within a BossProvider');
  }
  return context;
};

export default BossContext;
