import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { loadFromLocalStorage, saveToLocalStorage } from '../utils';
import { useJobContext } from './JobContext';

// Create the context
const TankPositionContext = createContext();

/**
 * Provider component for managing tank positions
 */
export const TankPositionProvider = ({ children }) => {
  const { selectedJobs } = useJobContext();

  // Initialize tank positions from localStorage or default
  const [tankPositions, setTankPositions] = useState(() => {
    // Try to load from localStorage
    const savedPositions = loadFromLocalStorage('tankPositions', null);
    if (savedPositions) {
      return savedPositions;
    }

    // Default to empty positions
    return {
      mainTank: null, // Will store the job ID of the main tank (e.g., 'PLD')
      offTank: null   // Will store the job ID of the off tank (e.g., 'WAR')
    };
  });

  // Get the currently selected tank jobs - memoize this to prevent unnecessary rerenders
  const selectedTankJobs = selectedJobs?.tank?.filter(job => job.selected) || [];
  
  // Get the IDs of selected tanks - we'll use this in multiple places
  const selectedTankIds = selectedTankJobs.map(job => job.id);

  // Save tank positions to localStorage whenever they change
  useEffect(() => {
    saveToLocalStorage('tankPositions', tankPositions);
  }, [tankPositions]);

  // Ensure tank positions are valid when selected jobs change
  // This effect should only run when selectedTankIds changes, not on every render
  useEffect(() => {

    // Use the latest tankPositions inside the setter function to avoid dependency issues
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

        return newPositions;
      }

      // Return unchanged if no updates needed
      return prev;
    });
    // Using a string representation of selectedTankIds as a dependency to avoid object reference issues
    // This ensures the effect only runs when the actual IDs change
  }, [selectedTankIds.join(',')]);

  // Assign a tank to a position
  const assignTankPosition = useCallback((tankJobId, position) => {
    if (!tankJobId || !position || !['mainTank', 'offTank'].includes(position)) {
      return false;
    }

    // Check if the tank is selected
    const isTankSelected = selectedTankJobs.some(job => job.id === tankJobId);
    if (!isTankSelected) {
      return false;
    }

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

      return newPositions;
    });

    return true;
  }, [selectedTankJobs]);

  // Clear a tank position
  const clearTankPosition = useCallback((position) => {
    if (!position || !['mainTank', 'offTank'].includes(position)) {
      return false;
    }

    setTankPositions(prev => ({
      ...prev,
      [position]: null
    }));

    return true;
  }, []);

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
      selectedTankJobs
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
