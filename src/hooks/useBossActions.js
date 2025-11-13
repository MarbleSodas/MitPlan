import { useState, useEffect, useMemo } from 'react';
import { bossActionsMap } from '../data';
import useLocalStorage from './useLocalStorage';

/**
 * Custom hook for managing boss actions
 *
 * @returns {Object} - Boss actions state and functions
 */
function useBossActions() {
  // Get boss ID from localStorage or use default
  const [currentBossId, setCurrentBossId] = useLocalStorage('currentBossId', 'ketuduke');

  // Get boss actions for the current boss
  const [currentBossActions, setCurrentBossActions] = useState(bossActionsMap[currentBossId]);

  // Track selected boss action
  const [selectedBossAction, setSelectedBossAction] = useState(null);

  // Update boss actions when boss changes
  useEffect(() => {
    setCurrentBossActions(bossActionsMap[currentBossId]);
    // Deselect any selected action when changing bosses
    setSelectedBossAction(null);
  }, [currentBossId]);

  // Sort boss actions by time
  const sortedBossActions = useMemo(() => {
    return [...currentBossActions].sort((a, b) => a.time - b.time);
  }, [currentBossActions]);

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

  return {
    currentBossId,
    setCurrentBossId,
    currentBossActions,
    sortedBossActions,
    selectedBossAction,
    toggleBossActionSelection,
    clearSelectedBossAction
  };
}

export default useBossActions;
