import React, { createContext, useState, useContext, useEffect, useMemo } from 'react';
import { useRealtimePlan } from './RealtimePlanContext';
import { bossActionsMap, bosses, baseHealthValues } from '../data';
import { processMultiHitTankBusters } from '../utils';
import { getTimeline } from '../services/timelineService';
import { normalizeTimelineRecord } from '../utils/timeline/adaptiveTimelineUtils';
import { getPlanTimelineLayout } from '../utils/timeline/planTimelineLayoutUtils';
import { resolvePhaseAwareTimeline } from '../utils/timeline/phaseOverrideResolver';

// import { autoAssignTankBusterMitigations, shouldTriggerAutoAssignment } from '../utils/mitigation/autoAssignmentUtils';

// Create the context
const RealtimeBossContext = createContext();

// Create a provider component
export const RealtimeBossProvider = ({ children }) => {
  const {
    bossId: realtimeBossId,
    updateBossRealtime,
    isInitialized,
    realtimePlan
  } = useRealtimePlan();

  const [selectedBossAction, setSelectedBossAction] = useState(null);
  const [currentBossActions, setCurrentBossActions] = useState([]);
  const [bossMetadata, setBossMetadata] = useState(null);
  const [sourceTimeline, setSourceTimeline] = useState(null);
  const [timelinePhases, setTimelinePhases] = useState([]);
  const [timelinePhaseSummaries, setTimelinePhaseSummaries] = useState([]);
  const [skippedBossActions, setSkippedBossActions] = useState([]);
  const [hasPhaseOverrideSupport, setHasPhaseOverrideSupport] = useState(false);

  // Use real-time boss ID or fallback to default
  const currentBossId = realtimeBossId || 'ketuduke';

  console.log('[RealtimeBossContext] Boss data:', { realtimeBossId, currentBossId, isInitialized });

  // Update boss actions when plan timeline or boss changes
  useEffect(() => {
    const planTimelineLayout = getPlanTimelineLayout(realtimePlan);
    const timelineId = realtimePlan?.sourceTimelineId;
    let isCancelled = false;

    const loadActions = async () => {
      if (planTimelineLayout) {
        const timeline = normalizeTimelineRecord(planTimelineLayout);

        if (!isCancelled) {
          setSourceTimeline(timeline);
          setBossMetadata(timeline.bossMetadata || null);
        }

        if (!isCancelled && !(timeline.actions || []).length) {
          setCurrentBossActions([]);
          setSelectedBossAction(null);
        }

        return;
      }

      // Prefer actions from the plan's source timeline when available
      if (timelineId) {
        try {
          console.log('[RealtimeBossContext] Loading actions from timeline:', timelineId);
          const timeline = normalizeTimelineRecord(await getTimeline(timelineId));
          const rawActions = Array.isArray(timeline?.actions) ? timeline.actions : [];

          if (!isCancelled) {
            setSourceTimeline(timeline);
          }

          // Load boss metadata from timeline if available
          if (!isCancelled && timeline?.bossMetadata) {
            console.log('[RealtimeBossContext] Loading boss metadata from timeline:', timeline.bossMetadata);
            setBossMetadata(timeline.bossMetadata);
          } else {
            // Clear metadata if timeline doesn't have it
            setBossMetadata(null);
          }

          if (!isCancelled && !rawActions.length) {
            setCurrentBossActions([]);
            setSelectedBossAction(null);
          }

          return; // Done
        } catch (e) {
          console.warn('[RealtimeBossContext] Failed to load timeline actions, falling back to boss library:', e);
          setBossMetadata(null);
          setSourceTimeline(null);
        }
      } else {
        // No timeline, clear metadata
        setBossMetadata(null);
        setSourceTimeline(null);
      }

      // Fallback to boss library using bossId
      if (!currentBossId) {
        console.log('[RealtimeBossContext] No boss selected, using empty actions');
        setCurrentBossActions([]);
        setTimelinePhases([]);
        setTimelinePhaseSummaries([]);
        setSkippedBossActions([]);
        setHasPhaseOverrideSupport(false);
        setSelectedBossAction(null);
        return;
      }

      console.log('[RealtimeBossContext] Loading boss actions for:', currentBossId);
      const rawBossActions = bossActionsMap[currentBossId];
      if (rawBossActions) {
        const processedActions = processMultiHitTankBusters(rawBossActions);
        setCurrentBossActions(processedActions);
        setTimelinePhases([]);
        setTimelinePhaseSummaries([]);
        setSkippedBossActions([]);
        setHasPhaseOverrideSupport(false);
        setSelectedBossAction(null);
      } else {
        console.warn('[RealtimeBossContext] No actions found for boss:', currentBossId);
        setCurrentBossActions([]);
        setTimelinePhases([]);
        setTimelinePhaseSummaries([]);
        setSkippedBossActions([]);
        setHasPhaseOverrideSupport(false);
      }
    };

    loadActions();
    return () => { isCancelled = true; };
  }, [realtimePlan?.timelineLayout, realtimePlan?.sourceTimelineId, currentBossId]);

  useEffect(() => {
    if (!sourceTimeline) {
      return;
    }

    const resolvedTimeline = resolvePhaseAwareTimeline(
      sourceTimeline,
      realtimePlan?.phaseOverrides || {}
    );
    const processedActions = processMultiHitTankBusters(resolvedTimeline.actions);

    setCurrentBossActions(processedActions);
    setTimelinePhases(resolvedTimeline.phases);
    setTimelinePhaseSummaries(resolvedTimeline.phaseSummaries);
    setSkippedBossActions(resolvedTimeline.skippedActions);
    setHasPhaseOverrideSupport(resolvedTimeline.hasOverrideSupport);
    setSelectedBossAction((previousSelection) => {
      if (!previousSelection) {
        return null;
      }

      const nextSelection = processedActions.find((action) => action.id === previousSelection.id);
      return nextSelection || null;
    });
  }, [sourceTimeline, realtimePlan?.phaseOverrides]);

  // Get current boss level - prefer timeline metadata, fallback to hardcoded boss data
  const currentBossLevel = useMemo(() => {
    // First, check if we have boss metadata from the timeline
    if (bossMetadata && typeof bossMetadata.level === 'number') {
      console.log('[RealtimeBossContext] Using boss level from timeline metadata:', bossMetadata.level);
      return bossMetadata.level;
    }

    // Fallback to hardcoded boss data
    const boss = bosses.find(b => b.id === currentBossId);
    const level = boss ? boss.level : 100;
    console.log('[RealtimeBossContext] Using boss level from hardcoded data:', level);
    return level;
  }, [currentBossId, bossMetadata]);

  // Get base health values - prefer timeline metadata, fallback to level-based lookup
  const currentBaseHealth = useMemo(() => {
    const planTimelineLayout = getPlanTimelineLayout(realtimePlan);
    if (planTimelineLayout?.healthConfig) {
      return {
        party: planTimelineLayout.healthConfig.party,
        tank: planTimelineLayout.healthConfig.defaultTank,
      };
    }

    // First, check if we have base health from timeline metadata
    if (bossMetadata?.baseHealth) {
      console.log('[RealtimeBossContext] Using base health from timeline metadata:', bossMetadata.baseHealth);
      return bossMetadata.baseHealth;
    }

    // Fallback to level-based lookup
    // Try to find exact level match first
    if (baseHealthValues[currentBossLevel]) {
      console.log('[RealtimeBossContext] Using base health for level', currentBossLevel, ':', baseHealthValues[currentBossLevel]);
      return baseHealthValues[currentBossLevel];
    }

    // If no exact match, find the closest lower level
    const availableLevels = Object.keys(baseHealthValues).map(Number).sort((a, b) => b - a);
    const closestLevel = availableLevels.find(level => level <= currentBossLevel) || availableLevels[availableLevels.length - 1];

    console.log('[RealtimeBossContext] No exact health match for level', currentBossLevel, ', using closest level', closestLevel);
    return baseHealthValues[closestLevel] || { party: 143000, tank: 225000 }; // Default to level 100 values
  }, [currentBossLevel, bossMetadata, realtimePlan]);

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
    currentBossLevel,
    currentBaseHealth, // Expose base health values
    bossMetadata, // Expose boss metadata from timeline
    timelinePhases,
    timelinePhaseSummaries,
    skippedBossActions,
    hasPhaseOverrideSupport,
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
