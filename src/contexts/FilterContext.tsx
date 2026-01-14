import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { loadFromLocalStorage, saveToLocalStorage } from '../utils';
import { useRealtimePlan } from './RealtimePlanContext';
import { useRealtimeBossContext } from './RealtimeBossContext';
import { bosses } from '../data';
import { baseHealthValues } from '../data/bosses/bossData';

const FilterContext = createContext();

export const FilterProvider = ({ children }) => {
  const [showAllMitigations, setShowAllMitigations] = useState(() => {
    const savedValue = loadFromLocalStorage('mitPlanFilterShowAll', null);
    return savedValue !== null ? savedValue : false;
  });

  const [showPrecastOptions, setShowPrecastOptions] = useState(() => {
    const saved = loadFromLocalStorage('mitPlanShowPrecastOptions', null);
    return saved !== null ? saved : true;
  });

  const [showOnlyMyAbilities, setShowOnlyMyAbilities] = useState(() => {
    const saved = loadFromLocalStorage('mitPlanShowOnlyMyAbilities', null);
    return saved !== null ? saved : false;
  });

  const { realtimePlan } = useRealtimePlan();
  const { currentBossId, currentBossLevel } = useRealtimeBossContext();

  const toggleFilterMode = useCallback(() => {
    setShowAllMitigations(prev => {
      const newValue = !prev;
      saveToLocalStorage('mitPlanFilterShowAll', newValue);
      return newValue;
    });
  }, []);

  const togglePrecastOptions = useCallback(() => {
    setShowPrecastOptions(prev => {
      const next = !prev;
      saveToLocalStorage('mitPlanShowPrecastOptions', next);
      return next;
    });
  }, []);

  const toggleMyAbilitiesFilter = useCallback(() => {
    setShowOnlyMyAbilities(prev => {
      const next = !prev;
      saveToLocalStorage('mitPlanShowOnlyMyAbilities', next);
      return next;
    });
  }, []);

  const filterMitigations = useCallback((mitigations, bossAction, myJobId = null) => {
    if (!bossAction) {
      if (showOnlyMyAbilities && myJobId) {
        return mitigations.filter(mitigation => mitigation.jobs.includes(myJobId));
      }
      return mitigations;
    }

    const isTankBuster = bossAction.isTankBuster === true;

    let filteredMitigations = mitigations.filter(mitigation => {
      if (!isTankBuster && mitigation.target === 'single') {
        return false;
      }
      return true;
    });

    if (showOnlyMyAbilities && myJobId) {
      filteredMitigations = filteredMitigations.filter(mitigation => 
        mitigation.jobs.includes(myJobId)
      );
    }

    if (showAllMitigations) {
      return filteredMitigations;
    }

    if (!isTankBuster) {
      const partyMin = realtimePlan?.healthSettings?.partyMinHealth;
      if (partyMin && bossAction?.unmitigatedDamage) {
        const dmg = parseInt(String(bossAction.unmitigatedDamage).replace(/[^0-9]/g, ''), 10) || 0;
        const currentBoss = bosses.find(b => b.id === currentBossId) || null;
        const basePartyHp = (currentBoss?.baseHealth?.party)
          ?? (baseHealthValues[currentBossLevel] && baseHealthValues[currentBossLevel].party)
          ?? baseHealthValues[100].party;
        if ((basePartyHp - dmg) >= partyMin) {
          return [];
        }
      }
    }

    return filteredMitigations.filter(mitigation => {
      if (isTankBuster) {
        return mitigation.forTankBusters === true;
      } else {
        return mitigation.forRaidWide === true;
      }
    });
  }, [showAllMitigations, showOnlyMyAbilities, realtimePlan, currentBossLevel]);

  const contextValue = useMemo(() => ({
    showAllMitigations,
    toggleFilterMode,
    filterMitigations,
    showPrecastOptions,
    togglePrecastOptions,
    showOnlyMyAbilities,
    toggleMyAbilitiesFilter,
  }), [showAllMitigations, toggleFilterMode, filterMitigations, showPrecastOptions, togglePrecastOptions, showOnlyMyAbilities, toggleMyAbilitiesFilter]);

  return (
    <FilterContext.Provider value={contextValue}>
      {children}
    </FilterContext.Provider>
  );
};

export const useFilterContext = () => {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error('useFilterContext must be used within a FilterProvider');
  }
  return context;
};

export default FilterContext;
