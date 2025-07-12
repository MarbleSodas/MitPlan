import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { useRealtimeJobContext } from './RealtimeJobContext';
import { useRealtimePlan } from './RealtimePlanContext';

// Create the context
const TankPositionContext = createContext();

/**
 * Provider component for managing tank positions
 */
export const TankPositionProvider = ({ children }) => {
  const { selectedJobs } = useRealtimeJobContext();
  const {
    tankPositions: realtimeTankPositions,
    updateTankPositionsRealtime,
    isInitialized
  } = useRealtimePlan();

  // Store tank position change handlers that can be registered from outside
  const tankPositionChangeHandlers = useRef([]);

  // Track initial mount to prevent sync during initial render
  const isInitialMount = useRef(true);

  // Local state for tank positions, synced with Realtime Database
  const [tankPositions, setTankPositions] = useState(() => {
    // Default to empty positions
    return {
      mainTank: null, // Will store the job ID of the main tank (e.g., 'PLD')
      offTank: null   // Will store the job ID of the off tank (e.g., 'WAR')
    };
  });

  // Sync real-time tank positions to local state
  useEffect(() => {
    if (isInitialized && realtimeTankPositions) {
      console.log('[TankPositionContext] Syncing tank positions from Realtime DB:', realtimeTankPositions);
      setTankPositions(realtimeTankPositions);
    }
  }, [realtimeTankPositions, isInitialized]);

  // Helper function to sync tank positions to Firebase
  const syncTankPositions = useCallback((newPositions) => {
    if (isInitialized && updateTankPositionsRealtime) {
      console.log('[TankPositionContext] Syncing tank positions to Firebase:', newPositions);
      updateTankPositionsRealtime(newPositions);
    }
  }, [isInitialized, updateTankPositionsRealtime]);

  // Get the currently selected tank jobs - memoize this to prevent unnecessary rerenders
  const selectedTankJobs = selectedJobs?.tank?.filter(job => job.selected) || [];

  // Get the IDs of selected tanks - we'll use this in multiple places
  const selectedTankIds = selectedTankJobs.map(job => job.id);

  // Ensure tank positions are valid when selected jobs change
  // This effect should only run when selectedTankIds changes, not on every render
  useEffect(() => {
    // Skip sync on initial mount to prevent setState during render
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Use the latest tankPositions inside the setter function to avoid dependency issues
    let newPositionsToSync = null;

    setTankPositions(prev => {
      // Check if current tank positions are still valid
      const isMainTankValid = prev.mainTank && selectedTankIds.includes(prev.mainTank);
      const isOffTankValid = prev.offTank && selectedTankIds.includes(prev.offTank);

      // Only update if something is invalid
      if (!isMainTankValid || !isOffTankValid) {
        const newPositions = { ...prev };

        // Clear main tank if invalid
        if (!isMainTankValid) {
          newPositions.mainTank = null;
        }

        // Clear off tank if invalid
        if (!isOffTankValid) {
          newPositions.offTank = null;
        }

        // Auto-assign positions if we have exactly one or two tanks selected
        if (selectedTankIds.length === 1 && !newPositions.mainTank && !newPositions.offTank) {
          // If only one tank is selected, assign it as main tank
          newPositions.mainTank = selectedTankIds[0];
        } else if (selectedTankIds.length === 2) {
          // If two tanks are selected and one position is empty, assign the unassigned tank
          if (!newPositions.mainTank && !newPositions.offTank) {
            // If both positions are empty, assign the first as MT and second as OT
            newPositions.mainTank = selectedTankIds[0];
            newPositions.offTank = selectedTankIds[1];
          } else if (!newPositions.mainTank) {
            // If main tank is empty, assign the tank that's not the off tank
            newPositions.mainTank = selectedTankIds.find(id => id !== newPositions.offTank);
          } else if (!newPositions.offTank) {
            // If off tank is empty, assign the tank that's not the main tank
            newPositions.offTank = selectedTankIds.find(id => id !== newPositions.mainTank);
          }
        }

        // Store positions to sync after state update
        newPositionsToSync = newPositions;
        return newPositions;
      }

      // Return unchanged if no updates needed
      return prev;
    });

    // Sync the updated positions to Firebase after state update (outside of setState)
    if (newPositionsToSync) {
      syncTankPositions(newPositionsToSync);
    }
    // Using a string representation of selectedTankIds as a dependency to avoid object reference issues
    // This ensures the effect only runs when the actual IDs change
  }, [selectedTankIds.join(','), syncTankPositions]);

  // Register a handler for tank position changes
  const registerTankPositionChangeHandler = useCallback((handler) => {
    tankPositionChangeHandlers.current.push(handler);

    // Return an unregister function
    return () => {
      const index = tankPositionChangeHandlers.current.indexOf(handler);
      if (index > -1) {
        tankPositionChangeHandlers.current.splice(index, 1);
      }
    };
  }, []);

  // Call all registered tank position change handlers
  const notifyTankPositionChange = useCallback((oldPositions, newPositions) => {
    tankPositionChangeHandlers.current.forEach(handler => {
      try {
        handler(oldPositions, newPositions);
      } catch (error) {
        console.error('[TankPositionContext] Error in tank position change handler:', error);
      }
    });
  }, []);

  // Assign a tank to a position
  const assignTankPosition = useCallback(async (tankJobId, position) => {
    if (!tankJobId || !position || !['mainTank', 'offTank'].includes(position)) {
      return false;
    }

    // Check if the tank is selected
    const isTankSelected = selectedTankJobs.some(job => job.id === tankJobId);
    if (!isTankSelected) {
      return false;
    }

    // Store the old positions for comparison
    const oldPositions = { ...tankPositions };

    setTankPositions(prev => {
      const newPositions = { ...prev };

      // If this tank is already assigned to the other position, swap positions
      if (position === 'mainTank' && prev.offTank === tankJobId) {
        newPositions.offTank = prev.mainTank;
      } else if (position === 'offTank' && prev.mainTank === tankJobId) {
        newPositions.mainTank = prev.offTank;
      }

      // Assign the tank to the requested position
      newPositions[position] = tankJobId;

      // Check if positions actually changed
      const positionsChanged =
        oldPositions.mainTank !== newPositions.mainTank ||
        oldPositions.offTank !== newPositions.offTank;

      if (positionsChanged) {
        console.log('[TankPositionContext] Tank positions changed:', {
          oldPositions,
          newPositions,
          trigger: 'assignTankPosition'
        });

        // Notify all registered handlers about the tank position change
        // Use setTimeout to ensure state update completes first
        setTimeout(() => {
          notifyTankPositionChange(oldPositions, newPositions);
        }, 0);
      }

      // Sync the updated positions to Firebase
      syncTankPositions(newPositions);

      return newPositions;
    });

    return true;
  }, [selectedTankJobs, syncTankPositions, tankPositions, notifyTankPositionChange]);

  // Clear a tank position
  const clearTankPosition = useCallback(async (position) => {
    if (!position || !['mainTank', 'offTank'].includes(position)) {
      return false;
    }

    // Store the old positions for comparison
    const oldPositions = { ...tankPositions };

    setTankPositions(prev => {
      const newPositions = {
        ...prev,
        [position]: null
      };

      // Check if positions actually changed
      const positionsChanged = oldPositions[position] !== null;

      if (positionsChanged) {
        console.log('[TankPositionContext] Tank position cleared:', {
          oldPositions,
          newPositions,
          clearedPosition: position,
          trigger: 'clearTankPosition'
        });

        // Notify all registered handlers about the tank position change
        // Use setTimeout to ensure state update completes first
        setTimeout(() => {
          notifyTankPositionChange(oldPositions, newPositions);
        }, 0);
      }

      // Sync the updated positions to Firebase
      syncTankPositions(newPositions);

      return newPositions;
    });

    return true;
  }, [syncTankPositions, tankPositions, notifyTankPositionChange]);

  // Get the tank job object for a position
  const getTankForPosition = useCallback((position) => {
    if (!position || !['mainTank', 'offTank'].includes(position)) {
      return null;
    }

    const tankJobId = tankPositions[position];
    if (!tankJobId) {
      return null;
    }

    return selectedTankJobs.find(job => job.id === tankJobId) || null;
  }, [tankPositions, selectedTankJobs]);

  // Check if a tank job is assigned to any position
  const isTankAssigned = useCallback((tankJobId) => {
    return tankPositions.mainTank === tankJobId || tankPositions.offTank === tankJobId;
  }, [tankPositions]);

  // Get the position for a tank job
  const getPositionForTank = useCallback((tankJobId) => {
    if (tankPositions.mainTank === tankJobId) {
      return 'mainTank';
    }
    if (tankPositions.offTank === tankJobId) {
      return 'offTank';
    }
    return null;
  }, [tankPositions]);



  return (
    <TankPositionContext.Provider value={{
      tankPositions,
      assignTankPosition,
      clearTankPosition,
      getTankForPosition,
      isTankAssigned,
      getPositionForTank,
      selectedTankJobs,
      registerTankPositionChangeHandler
    }}>
      {children}
    </TankPositionContext.Provider>
  );
};

// Custom hook for using the tank position context
export const useTankPositionContext = () => {
  const context = useContext(TankPositionContext);
  if (!context) {
    throw new Error('useTankPositionContext must be used within a TankPositionProvider');
  }
  return context;
};

export default TankPositionContext;
