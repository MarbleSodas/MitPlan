import React, { createContext, useState, useContext, useEffect, useMemo } from 'react';
import { mitigationAbilities } from '../data';
import { useJobContext } from './JobContext';
import { useBossContext } from './BossContext';
import { useMitigationContext } from './MitigationContext';

// Create the context
const AetherflowContext = createContext();

/**
 * Provider component for managing Scholar's Aetherflow stacks
 */
export const AetherflowProvider = ({ children }) => {
  // Get state from other contexts
  const { selectedJobs } = useJobContext();
  const { currentBossActions, selectedBossAction } = useBossContext();
  const { assignments, setAetherflowContext } = useMitigationContext();

  // State for Aetherflow stacks
  const [aetherflowStacks, setAetherflowStacks] = useState(3); // Start with full stacks
  const [lastAetherflowTime, setLastAetherflowTime] = useState(0); // Time when Aetherflow was last used

  // Check if Scholar is selected
  const isScholarSelected = useMemo(() => {
    return selectedJobs.healer.some(job => job.id === 'SCH' && job.selected);
  }, [selectedJobs]);

  // Get all Aetherflow abilities
  const aetherflowAbilities = useMemo(() => {
    return mitigationAbilities.filter(ability =>
      ability.consumesAetherflow || ability.isAetherflowProvider
    );
  }, []);

  // Get the Aetherflow ability
  const aetherflowAbility = useMemo(() => {
    return mitigationAbilities.find(ability => ability.isAetherflowProvider);
  }, []);

  // Calculate available Aetherflow stacks at a given time
  const calculateAetherflowStacksAtTime = (time) => {
    if (!isScholarSelected) return 0;

    // Start with 3 stacks
    let stacks = 3;
    let lastRefreshTime = 0;

    // Sort boss actions by time
    const sortedActions = [...currentBossActions].sort((a, b) => a.time - b.time);

    // Process each boss action up to the target time
    for (const action of sortedActions) {
      // Skip if this action occurs after the target time
      if (action.time > time) break;

      // Check if Aetherflow was used at this action
      const actionAssignments = assignments[action.id] || [];
      const aetherflowUsed = actionAssignments.some(
        assignment => assignment.isAetherflowProvider
      );

      if (aetherflowUsed) {
        // Refresh stacks to 3
        stacks = 3;
        lastRefreshTime = action.time;
      }

      // Check for abilities that consume Aetherflow
      const consumingAbilities = actionAssignments.filter(
        assignment => assignment.consumesAetherflow
      );

      // Reduce stacks for each consuming ability
      stacks = Math.max(0, stacks - consumingAbilities.length);
    }

    // Check if Aetherflow would be off cooldown by this time
    const aetherflowCooldown = aetherflowAbility ? aetherflowAbility.cooldown : 60;
    const timeSinceLastRefresh = time - lastRefreshTime;
    const refreshesAvailable = Math.floor(timeSinceLastRefresh / aetherflowCooldown);

    // If Aetherflow would be available and we have less than 3 stacks, use it
    if (refreshesAvailable > 0 && stacks < 3) {
      stacks = 3;
    }

    return stacks;
  };

  // Update stacks when selected boss action changes
  useEffect(() => {
    if (selectedBossAction && isScholarSelected) {
      const stacksAtTime = calculateAetherflowStacksAtTime(selectedBossAction.time);
      setAetherflowStacks(stacksAtTime);
    }
  }, [selectedBossAction, isScholarSelected, assignments]);

  // Check if an ability can be used based on available Aetherflow stacks
  const canUseAbility = (abilityId) => {
    const ability = mitigationAbilities.find(a => a.id === abilityId);

    // If not an Aetherflow ability, always allow
    if (!ability || !ability.consumesAetherflow) return true;

    // If Scholar is not selected, don't allow
    if (!isScholarSelected) return false;

    // Check if we have enough stacks
    return aetherflowStacks > 0;
  };

  // Use an Aetherflow stack
  const useAetherflowStack = () => {
    if (aetherflowStacks > 0) {
      setAetherflowStacks(prev => prev - 1);
      return true;
    }
    return false;
  };

  // Refresh Aetherflow stacks
  const refreshAetherflowStacks = (time) => {
    setAetherflowStacks(3);
    setLastAetherflowTime(time);
    return true;
  };

  // Create the context value
  const contextValue = {
    aetherflowStacks,
    lastAetherflowTime,
    isScholarSelected,
    canUseAbility,
    useAetherflowStack,
    refreshAetherflowStacks,
    calculateAetherflowStacksAtTime,
    aetherflowAbilities,
    aetherflowAbility
  };

  // Provide the AetherflowContext to the MitigationContext
  useEffect(() => {
    if (setAetherflowContext) {
      setAetherflowContext(contextValue);
    }
  }, [contextValue, setAetherflowContext]);

  return (
    <AetherflowContext.Provider value={contextValue}>
      {children}
    </AetherflowContext.Provider>
  );
};

// Custom hook for using the Aetherflow context
export const useAetherflowContext = () => {
  const context = useContext(AetherflowContext);
  if (context === undefined) {
    throw new Error('useAetherflowContext must be used within an AetherflowProvider');
  }
  return context;
};

export default AetherflowContext;
