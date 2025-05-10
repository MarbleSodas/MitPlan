import React, { createContext, useContext, useState, useCallback } from 'react';
import { loadFromLocalStorage, saveToLocalStorage } from '../utils';

// Create a context for the filter state
const FilterContext = createContext();

/**
 * Provider component for the filter context
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @returns {React.ReactElement} - Provider component
 */
export const FilterProvider = ({ children }) => {
  // Initialize filter state from localStorage or default to false (filter mitigations by action type)
  const [showAllMitigations, setShowAllMitigations] = useState(() => {
    const savedValue = loadFromLocalStorage('mitPlanFilterShowAll', null);
    return savedValue !== null ? savedValue : false;
  });

  // Toggle the filter state
  const toggleFilterMode = useCallback(() => {
    setShowAllMitigations(prev => {
      const newValue = !prev;
      saveToLocalStorage('mitPlanFilterShowAll', newValue);
      return newValue;
    });
  }, []);

  // Filter mitigations based on boss action and current filter mode
  const filterMitigations = useCallback((mitigations, bossAction) => {
    // If showing all mitigations or if no boss action is selected, return the full list
    if (showAllMitigations || !bossAction) {
      return mitigations;
    }

    // Check if the boss action is a tank buster
    const isTankBuster = bossAction.isTankBuster === true;

    // Filter mitigations based on boss action type
    return mitigations.filter(mitigation => {
      if (isTankBuster) {
        // For tank busters, show tank-specific and party-wide mitigations that affect tanks
        return mitigation.forTankBusters === true;
      } else {
        // For raid-wide damage, show only party-wide mitigations
        return mitigation.forRaidWide === true;
      }
    });
  }, [showAllMitigations]);

  // Create the context value
  const contextValue = {
    showAllMitigations,
    toggleFilterMode,
    filterMitigations
  };

  return (
    <FilterContext.Provider value={contextValue}>
      {children}
    </FilterContext.Provider>
  );
};

/**
 * Custom hook for using the filter context
 *
 * @returns {Object} - Filter context value
 */
export const useFilterContext = () => {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error('useFilterContext must be used within a FilterProvider');
  }
  return context;
};

export default FilterContext;
