import { useState, useEffect, useMemo, useCallback } from 'react'
import { DndContext, closestCenter, useSensor, useSensors, PointerSensor, KeyboardSensor, DragOverlay } from '@dnd-kit/core'
import styled, { ThemeProvider, createGlobalStyle } from 'styled-components'
import { bossActionsMap, mitigationAbilities, ffxivJobs, bosses } from './data/sampleData'
import Draggable from './components/Draggable'
import Droppable from './components/Droppable'
import Tooltip from './components/Tooltip'
import BossSelector from './components/BossSelector'
// Import mitigation utility functions
import { calculateTotalMitigation, formatMitigation, generateMitigationBreakdown, findActiveMitigationsAtTime } from './utils/mitigationUtils'
// Import ability utility functions
import { filterAbilitiesByLevel, getAbilityDescriptionForLevel, getAbilityCooldownForLevel, getAbilityMitigationValueForLevel, getAbilityDurationForLevel } from './utils/abilityUtils'

import JobSelector from './components/JobSelector'
import ImportExport from './components/ImportExport'
import ThemeToggle from './components/ThemeToggle'

// Define light and dark themes for styled-components
const lightTheme = {
  colors: {
    primary: '#3399ff',
    secondary: '#ffffff',
    background: '#f5f5f5',
    cardBackground: '#ffffff',
    text: '#333333',
    lightText: '#666666',
    border: '#dddddd',
    critical: '#ff0000',
    high: '#ff9900',
    medium: '#ffcc00',
    low: '#99cc00'
  },
  breakpoints: {
    mobile: '768px',
    tablet: '992px',
    desktop: '1200px'
  },
  spacing: {
    small: '5px',
    medium: '10px',
    large: '20px',
    xlarge: '30px'
  },
  fontSizes: {
    small: '12px',
    medium: '14px',
    large: '16px',
    xlarge: '24px',
    xxlarge: '32px'
  },
  borderRadius: {
    small: '4px',
    medium: '6px',
    large: '8px'
  },
  shadows: {
    small: '0 1px 3px rgba(0, 0, 0, 0.1)',
    medium: '0 2px 4px rgba(0, 0, 0, 0.1)',
    large: '0 4px 8px rgba(0, 0, 0, 0.1)'
  },
  mode: 'light'
}

const darkTheme = {
  colors: {
    primary: '#3399ff',
    secondary: '#1e2a38',
    background: '#121212',
    cardBackground: '#1e1e1e',
    text: '#f5f5f5',
    lightText: '#cccccc', // Improved contrast from #aaaaaa
    border: '#444444',
    critical: '#ff6666', // Brighter for better visibility
    high: '#ffbb44', // Brighter for better visibility
    medium: '#ffee44', // Brighter for better visibility
    low: '#bbee44'  // Brighter for better visibility
  },
  breakpoints: {
    mobile: '768px',
    tablet: '992px',
    desktop: '1200px'
  },
  spacing: {
    small: '5px',
    medium: '10px',
    large: '20px',
    xlarge: '30px'
  },
  fontSizes: {
    small: '12px',
    medium: '14px',
    large: '16px',
    xlarge: '24px',
    xxlarge: '32px'
  },
  borderRadius: {
    small: '4px',
    medium: '6px',
    large: '8px'
  },
  shadows: {
    small: '0 1px 3px rgba(0, 0, 0, 0.3)',
    medium: '0 2px 4px rgba(0, 0, 0, 0.3)',
    large: '0 4px 8px rgba(0, 0, 0, 0.3)'
  },
  mode: 'dark'
}

// Global styles to apply theme to the entire app
const GlobalStyle = createGlobalStyle`
  body {
    background-color: ${props => props.theme.colors.background};
    color: ${props => props.theme.colors.text};
    margin: 0;
    padding: 0;
    transition: background-color 0.3s ease, color 0.3s ease;
  }
`

// Styled components
const AppContainer = styled.div`
  width: 100%;
  min-height: 100vh;
  margin: 0 auto;
  padding: ${props => props.theme.spacing.large};
  font-family: 'Arial', sans-serif;
  color: ${props => props.theme.colors.text};
  box-sizing: border-box;
`;

const Header = styled.header`
  text-align: center;
  margin-bottom: ${props => props.theme.spacing.xlarge};
  display: flex;
  flex-direction: column;
  position: relative;
`;

const HeaderTop = styled.div`
  display: flex;
  justify-content: flex-end;
  padding: ${props => props.theme.spacing.medium} 0;
`;

const MainContent = styled.main`
  display: flex;
  gap: ${props => props.theme.spacing.large};
  width: 100%;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    flex-direction: column;
  }
`;

const TimelineContainer = styled.div`
  flex: 3;
  background-color: ${props => props.theme.colors.secondary};
  border-radius: ${props => props.theme.borderRadius.large};
  padding: ${props => props.theme.spacing.large};
  padding-bottom: ${props => props.theme.spacing.xlarge};
  box-shadow: ${props => props.theme.shadows.medium};
  overflow-y: auto; /* Allow vertical scrolling if needed */
  height: calc(100vh - 100px); /* Set height to viewport height minus space for header and other components */
  min-height: 500px; /* Minimum height as fallback */
  display: flex;
  flex-direction: column;
`;

const MitigationContainer = styled.div`
  flex: 1;
  background-color: ${props => props.theme.colors.secondary};
  border-radius: ${props => props.theme.borderRadius.large};
  padding: ${props => props.theme.spacing.large};
  box-shadow: ${props => props.theme.shadows.medium};
  overflow-y: auto; /* Allow vertical scrolling */
  height: calc(100vh - 100px); /* Match the height of TimelineContainer */
  min-height: 500px; /* Minimum height as fallback */
`;

const TimelineHeader = styled.h2`
  position: fixed;
  margin-top: 0;
  border-bottom: 2px solid ${props => props.theme.colors.border};
  padding-bottom: ${props => props.theme.spacing.medium};
`;

const BossActionsList = styled.div`
  display: flex;
  flex-direction: column;
  padding: ${props => props.theme.spacing.medium};
  position: relative;
  width: 100%;
  margin: 0;
  flex-grow: 1; /* Allow list to fill available space */
`;

const BossAction = styled.div`
  background-color: ${props => {
    if (props.isSelected) {
      return props.theme.mode === 'dark' ? 'rgba(51, 153, 255, 0.2)' : 'rgba(51, 153, 255, 0.1)';
    }
    return props.theme.colors.cardBackground;
  }};
  border-radius: ${props => props.theme.borderRadius.medium};
  padding: ${props => props.theme.spacing.medium};
  padding-top: 40px; /* Fixed padding at top for time indicator */
  padding-right: ${props => props.hasAssignments ? '160px' : props.theme.spacing.medium}; /* Extra space on right for mitigations */
  box-shadow: ${props => props.theme.shadows.small};
  position: relative;
  border-left: 4px solid ${props => {
    switch(props.importance) {
      case 'critical': return props.theme.colors.critical;
      case 'high': return props.theme.colors.high;
      case 'medium': return props.theme.colors.medium;
      default: return props.theme.colors.low;
    }
  }};
  transition: background-color 0.3s ease;
  color: ${props => props.theme.colors.text};
  border: ${props => props.isSelected ? `2px solid ${props.theme.colors.primary}` : '1px solid ${props.theme.colors.border}'};
  cursor: pointer;
  width: 100%; /* Full width */
  min-height: 140px; /* Minimum height for all boss action cards */
  height: auto; /* Allow height to grow based on content */
  display: flex;
  flex-direction: column;
  margin-bottom: ${props => props.theme.spacing.medium};

  &:hover {
    box-shadow: ${props => props.theme.shadows.medium};
  }
`;

const ActionTime = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: 8px;
  font-size: 16px;
  font-weight: bold;
  color: ${props => props.theme.colors.text};
  background-color: ${props => props.theme.mode === 'dark' ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.1)'};
  border-bottom: 1px solid ${props => props.theme.colors.border};
  border-top-left-radius: ${props => props.theme.borderRadius.medium};
  border-top-right-radius: ${props => props.theme.borderRadius.medium};
  text-align: center;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;

  &::before {
    content: '⏱️';
    margin-right: 5px;
  }
`;

const ActionIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  margin-right: 12px;
  flex-shrink: 0;
`;

const ActionName = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: bold;
  flex-grow: 1;
`;

const ActionDescription = styled.p`
  margin: 0;
  color: ${props => props.theme.colors.lightText};
  font-size: ${props => props.theme.fontSizes.medium};
  font-weight: ${props => props.theme.mode === 'dark' ? '500' : 'normal'};
  min-height: 40px; /* Ensure all descriptions have at least this height */
  flex-grow: 0; /* Don't allow description to grow too much */
  line-height: 1.4; /* Improve readability */
  padding-left: 2px; /* Slight indent */
  margin-bottom: ${props => props.theme.spacing.medium}; /* Add space before mitigations */
`;

const MitigationPercentage = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background-color: ${props => props.theme.mode === 'dark' ? 'rgba(51, 153, 255, 0.2)' : 'rgba(51, 153, 255, 0.1)'};
  color: ${props => props.theme.colors.text};
  font-weight: bold;
  font-size: ${props => props.theme.fontSizes.medium};
  padding: 4px 8px;
  border-radius: ${props => props.theme.borderRadius.small};
  margin-top: 5px;
  margin-bottom: 10px;
  border: 1px solid ${props => props.theme.mode === 'dark' ? 'rgba(51, 153, 255, 0.3)' : 'rgba(51, 153, 255, 0.2)'};

  &::before {
    content: '🛡️';
    margin-right: 5px;
  }
`;

const MitigationList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${props => props.theme.spacing.medium};
  flex-grow: 1; /* Allow list to fill available space */
  overflow-y: auto; /* Enable scrolling if needed */
`;

const MitigationItem = styled.div`
  background-color: ${props => props.theme.colors.cardBackground};
  border-radius: ${props => props.theme.borderRadius.medium};
  padding: ${props => props.theme.spacing.medium};
  box-shadow: ${props => props.theme.shadows.small};
  cursor: grab;
  border-left: 4px solid ${props => props.theme.colors.primary};
  transition: all 0.2s ease;
  width: 100%;

  &:hover {
    background-color: ${props => props.theme.colors.background};
    transform: translateY(-2px);
    box-shadow: ${props => props.theme.shadows.medium};
  }

  &:active {
    cursor: grabbing;
  }
`;

const MitigationIcon = styled.span`
  margin-right: ${props => props.theme.spacing.small};
  vertical-align: middle;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
`;

const MitigationName = styled.h4`
  margin: 0 0 5px 0;
  display: inline-block;
`;

const MitigationDescription = styled.p`
  margin: 0;
  font-size: ${props => props.theme.fontSizes.medium};
  color: ${props => props.theme.colors.lightText};
  font-weight: ${props => props.theme.mode === 'dark' ? '500' : 'normal'};
`;

const AssignedMitigations = styled.div`
  position: absolute;
  top: 35px; /* Align with content below the time indicator */
  right: 0;
  width: 250px;
  display: flex;
  flex-direction: column;
  gap: ${props => props.theme.spacing.small};
  border-left: 1px solid ${props => props.theme.colors.border};
  padding: ${props => props.theme.spacing.small};
  padding-left: ${props => props.theme.spacing.medium};
  height: calc(100% - 40px); /* Full height minus time indicator */
  overflow-y: auto; /* Allow scrolling if many mitigations */
  background-color: transparent;
  border-bottom-right-radius: ${props => props.theme.borderRadius.medium};
`;

const AssignedMitigation = styled.div`
  background-color: transparent;
  border-radius: ${props => props.theme.borderRadius.small};
  padding: 3px 6px;
  font-size: ${props => props.theme.fontSizes.small};
  display: flex;
  align-items: center;
  border-left: 2px solid ${props => props.theme.colors.primary};
  color: ${props => props.theme.colors.text};
  font-weight: ${props => props.theme.mode === 'dark' ? '500' : 'normal'};
  margin-bottom: 2px;
  width: 100%;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: ${props => props.theme.mode === 'dark' ? 'rgba(51, 153, 255, 0.1)' : 'rgba(51, 153, 255, 0.05)'};
  }
`;

const InheritedMitigations = styled.div`
  margin-top: 10px;
  border-top: 1px dashed ${props => props.theme.colors.border};
  padding-top: 5px;
  display: flex;
  flex-direction: column;
  gap: ${props => props.theme.spacing.small};
`;

const InheritedMitigation = styled.div`
  background-color: transparent;
  border-radius: ${props => props.theme.borderRadius.small};
  padding: 3px 6px;
  font-size: ${props => props.theme.fontSizes.small};
  display: flex;
  align-items: center;
  border-left: 2px solid ${props => props.theme.colors.lightText};
  color: ${props => props.theme.colors.lightText};
  font-weight: ${props => props.theme.mode === 'dark' ? '500' : 'normal'};
  margin-bottom: 2px;
  width: 100%;
  opacity: 0.8;
  font-style: italic;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: ${props => props.theme.mode === 'dark' ? 'rgba(51, 153, 255, 0.05)' : 'rgba(51, 153, 255, 0.02)'};
  }
`;

const StatusMessage = styled.div`
  background-color: ${props => props.theme.colors.warning};
  color: ${props => props.theme.colors.text};
  padding: 10px 15px;
  margin: 10px 0;
  border-radius: 4px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  position: relative;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.theme.colors.text};
  font-size: 18px;
  cursor: pointer;
  padding: 0 0 0 10px;
  margin-left: 10px;
`;

const DragPreview = styled.div`
  background-color: ${props => props.theme.colors.cardBackground};
  border-radius: ${props => props.theme.borderRadius.medium};
  padding: ${props => props.theme.spacing.medium};
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
  border-left: 4px solid ${props => props.theme.colors.primary};
  max-width: 300px;
  pointer-events: none;
  display: flex;
  align-items: center;
  gap: 10px;
  transform: scale(0.9);
  opacity: 0.9;
  z-index: 9999;
`;

const DragPreviewIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
`;

const DragPreviewContent = styled.div`
  display: flex;
  flex-direction: column;
`;

const DragPreviewName = styled.div`
  font-weight: bold;
  font-size: 14px;
  margin-bottom: 2px;
`;

const DragPreviewDescription = styled.div`
  font-size: 12px;
  color: ${props => props.theme.colors.lightText};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
`;


function App() {
  const [assignments, setAssignments] = useState(() => {
    // Try to load from localStorage
    const autosavedPlan = localStorage.getItem('mitPlanAutosave');
    if (autosavedPlan) {
      try {
        const parsedPlan = JSON.parse(autosavedPlan);
        if (parsedPlan.assignments) {
          // We need to reconstruct the full objects from the IDs
          const reconstructedAssignments = {};

          // Reconstruct assignments
          Object.entries(parsedPlan.assignments).forEach(([bossActionId, mitigationIds]) => {
            reconstructedAssignments[bossActionId] = mitigationIds.map(id => {
              // Find the full mitigation object by ID
              const mitigation = mitigationAbilities.find(m => m.id === id);
              return mitigation || { id, name: 'Unknown Ability', description: 'Ability not found', duration: 0, cooldown: 0, jobs: [], icon: '', type: 'unknown' };
            });
          });
          return reconstructedAssignments;
        }
      } catch (err) {
        console.error('Error loading autosaved plan:', err);
      }
    }
    return {};
  });
  // We need activeId state for drag and drop operations
  const [activeId, setActiveId] = useState(null);
  const [activeMitigation, setActiveMitigation] = useState(null);
  const [currentBossId, setCurrentBossId] = useState(() => {
    // Try to load from localStorage
    const autosavedPlan = localStorage.getItem('mitPlanAutosave');
    if (autosavedPlan) {
      try {
        const parsedPlan = JSON.parse(autosavedPlan);
        if (parsedPlan.bossId) {
          return parsedPlan.bossId;
        }
      } catch (err) {
        console.error('Error loading autosaved boss ID:', err);
      }
    }
    return 'ketuduke'; // Default boss ID
  });
  const [currentBossActions, setCurrentBossActions] = useState(bossActionsMap[currentBossId]);
  // We no longer need currentTime since we removed the CooldownTracker component
  const [selectedBossAction, setSelectedBossAction] = useState(null); // Track selected boss action
  const [statusMessage, setStatusMessage] = useState(''); // Status message for user feedback
  const [selectedJobs, setSelectedJobs] = useState(() => {
    // Try to load from localStorage
    const savedJobs = localStorage.getItem('selectedJobs');
    return savedJobs ? JSON.parse(savedJobs) : ffxivJobs;
  });
  // Removed zoom level state as we're using a list view now
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check if user has a preference stored in localStorage
    const savedPreference = localStorage.getItem('darkMode');
    if (savedPreference !== null) {
      return savedPreference === 'true';
    }
    // Otherwise check for system preference
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Autosave is always enabled

  // Configure sensors for better drag and drop experience
  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Require a distance of 8px to be dragged before activating
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  // Update boss actions when boss changes
  useEffect(() => {
    setCurrentBossActions(bossActionsMap[currentBossId]);
  }, [currentBossId]);

  // Autosave effect - save the current plan whenever relevant state changes
  useEffect(() => {
    // Create optimized assignments object with only the necessary data
    const optimizedAssignments = {};

    Object.entries(assignments).forEach(([bossActionId, mitigations]) => {
      // Store only the mitigation IDs instead of the full objects
      optimizedAssignments[bossActionId] = mitigations.map(mitigation => mitigation.id);
    });

    // Create optimized selectedJobs object with only the selected job IDs
    const optimizedSelectedJobs = {};

    Object.entries(selectedJobs).forEach(([roleKey, jobs]) => {
      // Filter to only include selected jobs and store only their IDs
      const selectedJobIds = jobs
        .filter(job => job.selected)
        .map(job => job.id);

      // Only include the role if it has selected jobs
      if (selectedJobIds.length > 0) {
        optimizedSelectedJobs[roleKey] = selectedJobIds;
      }
    });

    // Create the autosave data
    const autosaveData = {
      version: '1.2',
      bossId: currentBossId,
      assignments: optimizedAssignments,
      selectedJobs: optimizedSelectedJobs,
      lastSaved: new Date().toISOString()
    };

    // Save to localStorage
    localStorage.setItem('mitPlanAutosave', JSON.stringify(autosaveData));
    console.log('Autosaved plan at', new Date().toLocaleTimeString());
  }, [assignments, currentBossId, selectedJobs]);



  // Handle drag start - memoized with useCallback
  const handleDragStart = useCallback((event) => {
    const id = event.active.id;
    setActiveId(id);

    // Find the mitigation ability being dragged
    const mitigation = mitigationAbilities.find(m => m.id === id);
    if (mitigation) {
      setActiveMitigation(mitigation);
    }
  }, [mitigationAbilities]);

  // Check if an ability would be on cooldown at a specific time based on its previous uses
  const checkAbilityCooldown = (abilityId, targetTime) => {
    // Find the ability in mitigationAbilities to get its cooldown duration
    const ability = mitigationAbilities.find(m => m.id === abilityId);
    if (!ability) {
      console.log(`Ability ${abilityId} not found in mitigationAbilities`);
      return false;
    }

    // Get the level-specific cooldown duration
    const cooldownDuration = getAbilityCooldownForLevel(ability, currentBossLevel);
    console.log(`Checking cooldown for ${ability.name} (ID: ${abilityId}) at time ${targetTime}s. Cooldown duration: ${cooldownDuration}s at level ${currentBossLevel}`);

    // Find all boss actions with this ability assigned, sorted by time
    const actionsWithAbility = Object.entries(assignments)
      .filter(([, mitigations]) => mitigations && mitigations.some(m => m.id === abilityId))
      .map(([actionId]) => {
        const action = currentBossActions.find(a => a.id === actionId);
        if (!action) return null;
        return {
          id: actionId,
          time: action.time,
          name: action.name
        };
      })
      .filter(action => action !== null)
      .sort((a, b) => a.time - b.time);

    console.log(`Found ${actionsWithAbility.length} actions with ${ability.name} assigned:`, actionsWithAbility);

    // If no previous uses, ability is not on cooldown
    if (actionsWithAbility.length === 0) {
      console.log(`No previous uses of ${ability.name} found`);
      return false;
    }

    // Find the most recent use before the target time
    const previousUses = actionsWithAbility.filter(action => action.time < targetTime);
    console.log(`Found ${previousUses.length} previous uses of ${ability.name} before ${targetTime}s:`, previousUses);

    if (previousUses.length === 0) {
      console.log(`No previous uses of ${ability.name} before ${targetTime}s`);
      return false;
    }

    const mostRecentUse = previousUses[previousUses.length - 1];
    const timeSinceLastUse = targetTime - mostRecentUse.time;

    console.log(`Most recent use of ${ability.name} was at ${mostRecentUse.time}s (${mostRecentUse.name}). ` +
               `Time since last use: ${timeSinceLastUse}s. Cooldown duration: ${cooldownDuration}s`);

    // Check if the ability is still on cooldown at the target time
    const isOnCooldown = timeSinceLastUse < cooldownDuration;

    if (isOnCooldown) {
      console.log(`${ability.name} is on cooldown at ${targetTime}s. ` +
                 `Time until ready: ${cooldownDuration - timeSinceLastUse}s`);

      return {
        isOnCooldown: true,
        lastUsedActionId: mostRecentUse.id,
        timeUntilReady: cooldownDuration - timeSinceLastUse,
        lastUsedTime: mostRecentUse.time,
        lastUsedActionName: mostRecentUse.name
      };
    }

    console.log(`${ability.name} is NOT on cooldown at ${targetTime}s`);
    return false;
  };

  // Check if adding a mitigation to a boss action would cause future uses to be on cooldown
  // If so, remove those future uses and return information about the removals
  const checkAndRemoveFutureConflicts = useCallback((mitigationId, bossActionId, bossActionTime) => {
    // Find the mitigation ability to get its cooldown duration
    const mitigation = mitigationAbilities.find(m => m.id === mitigationId);
    if (!mitigation) {
      console.log(`Mitigation ${mitigationId} not found in mitigationAbilities`);
      return { removedCount: 0, removedActions: [] };
    }

    // Get the level-specific cooldown duration
    const cooldownDuration = getAbilityCooldownForLevel(mitigation, currentBossLevel);
    console.log(`Checking future conflicts for ${mitigation.name} after ${bossActionTime}s. Cooldown duration: ${cooldownDuration}s at level ${currentBossLevel}`);

    // Find all boss actions with this mitigation assigned, sorted by time
    const actionsWithAbility = Object.entries(assignments)
      .filter(([actionId, mitigations]) =>
        // Only include actions that are not the current one and have this mitigation
        actionId !== bossActionId &&
        mitigations &&
        mitigations.some(m => m.id === mitigationId)
      )
      .map(([actionId]) => {
        const action = currentBossActions.find(a => a.id === actionId);
        if (!action) return null;
        return {
          id: actionId,
          time: action.time,
          name: action.name
        };
      })
      .filter(action => action !== null)
      .sort((a, b) => a.time - b.time);

    // Find future actions that would be on cooldown
    const cooldownEndTime = bossActionTime + cooldownDuration;
    const conflictingActions = actionsWithAbility.filter(action =>
      action.time > bossActionTime && action.time < cooldownEndTime
    );

    if (conflictingActions.length === 0) {
      console.log(`No future conflicts found for ${mitigation.name} after ${bossActionTime}s`);
      return { removedCount: 0, removedActions: [] };
    }

    console.log(`Found ${conflictingActions.length} future conflicts for ${mitigation.name}:`, conflictingActions);

    // Remove the mitigation from conflicting actions
    const removedActions = [];

    setAssignments(prev => {
      const newAssignments = { ...prev };

      conflictingActions.forEach(action => {
        if (newAssignments[action.id]) {
          // Store information about the removal for user feedback
          removedActions.push({
            actionId: action.id,
            actionName: action.name,
            actionTime: action.time,
            mitigationId: mitigationId,
            mitigationName: mitigation.name
          });

          // Remove the mitigation from this action
          newAssignments[action.id] = newAssignments[action.id].filter(m => m.id !== mitigationId);

          // If no mitigations left, remove the action from assignments
          if (newAssignments[action.id].length === 0) {
            delete newAssignments[action.id];
          }

          console.log(`Removed ${mitigation.name} from ${action.name} at ${action.time}s due to cooldown conflict`);
        }
      });

      return newAssignments;
    });

    return {
      removedCount: conflictingActions.length,
      removedActions: removedActions
    };
  }, [assignments, currentBossActions, mitigationAbilities]);

  // Handle drag end - memoized with useCallback
  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    console.log('Drag end event:', { active, over });

    // Case 1: Dragging to a droppable boss action
    if (over && active.id !== over.id) {
      // Find the mitigation ability
      const mitigation = mitigationAbilities.find(m => m.id === active.id);
      if (!mitigation) {
        console.error(`Mitigation ability with ID ${active.id} not found`);
        setActiveId(null);
        return;
      }

      // Find the boss action
      const bossActionId = over.id;
      const bossAction = currentBossActions.find(action => action.id === bossActionId);
      if (!bossAction) {
        console.error(`Boss action with ID ${bossActionId} not found`);
        setActiveId(null);
        return;
      }

      console.log(`Attempting to assign ${mitigation.name} to ${bossAction.name} at ${bossAction.time}s`);

      // Check if the ability would be on cooldown at this time
      const cooldownResult = checkAbilityCooldown(mitigation.id, bossAction.time);
      if (cooldownResult && cooldownResult.isOnCooldown) {
        // Don't allow dropping if the ability would be on cooldown
        const errorMessage = `Cannot assign ${mitigation.name} to ${bossAction.name} because it would be on cooldown. ` +
                   `Previously used at ${cooldownResult.lastUsedTime}s (${cooldownResult.lastUsedActionName})`;
        console.error(errorMessage);
        setStatusMessage(errorMessage);
        setActiveId(null);
        return;
      }

      // Update assignments
      setAssignments(prev => {
        const newAssignments = { ...prev };

        if (!newAssignments[bossActionId]) {
          newAssignments[bossActionId] = [];
        }

        // Check if this mitigation is already assigned to this boss action
        if (!newAssignments[bossActionId].some(m => m.id === mitigation.id)) {
          newAssignments[bossActionId] = [...newAssignments[bossActionId], mitigation];
          console.log(`Successfully assigned ${mitigation.name} to ${bossAction.name} at ${bossAction.time}s`);

          // After assignment, check for future conflicts
          setTimeout(() => {
            const { removedCount, removedActions } = checkAndRemoveFutureConflicts(mitigation.id, bossActionId, bossAction.time);

            // If any mitigations were removed, show a status message
            if (removedCount > 0) {
              const actionNames = removedActions.map(a => `${a.actionName} (${a.actionTime}s)`).join(', ');
              const statusMsg = `Removed ${mitigation.name} from ${removedCount} future boss action(s) due to cooldown: ${actionNames}`;
              console.log(statusMsg);
              setStatusMessage(statusMsg);
            }
          }, 0);
        } else {
          console.log(`${mitigation.name} is already assigned to ${bossAction.name}`);
        }

        return newAssignments;
      });
    }
    // Case 2: Dragging to the selected boss action (when no droppable is detected)
    else if (selectedBossAction && !over) {
      const mitigation = mitigationAbilities.find(m => m.id === active.id);
      if (!mitigation) {
        console.error(`Mitigation ability with ID ${active.id} not found`);
        setActiveId(null);
        return;
      }

      console.log(`Attempting to assign ${mitigation.name} to ${selectedBossAction.name} at ${selectedBossAction.time}s (via selection)`);

      // Check if the ability would be on cooldown at this time
      const cooldownResult = checkAbilityCooldown(mitigation.id, selectedBossAction.time);
      if (cooldownResult && cooldownResult.isOnCooldown) {
        // Don't allow dropping if the ability would be on cooldown
        const errorMessage = `Cannot assign ${mitigation.name} to ${selectedBossAction.name} because it would be on cooldown. ` +
                   `Previously used at ${cooldownResult.lastUsedTime}s (${cooldownResult.lastUsedActionName})`;
        console.error(errorMessage);
        setStatusMessage(errorMessage);
        setActiveId(null);
        return;
      }

      setAssignments(prev => {
        const newAssignments = { ...prev };
        const bossActionId = selectedBossAction.id;

        if (!newAssignments[bossActionId]) {
          newAssignments[bossActionId] = [];
        }

        // Check if this mitigation is already assigned to this boss action
        if (!newAssignments[bossActionId].some(m => m.id === mitigation.id)) {
          newAssignments[bossActionId] = [...newAssignments[bossActionId], mitigation];
          console.log(`Successfully assigned ${mitigation.name} to ${selectedBossAction.name} at ${selectedBossAction.time}s (via selection)`);

          // After assignment, check for future conflicts
          setTimeout(() => {
            const { removedCount, removedActions } = checkAndRemoveFutureConflicts(mitigation.id, bossActionId, selectedBossAction.time);

            // If any mitigations were removed, show a status message
            if (removedCount > 0) {
              const actionNames = removedActions.map(a => `${a.actionName} (${a.actionTime}s)`).join(', ');
              const statusMsg = `Removed ${mitigation.name} from ${removedCount} future boss action(s) due to cooldown: ${actionNames}`;
              console.log(statusMsg);
              setStatusMessage(statusMsg);
            }
          }, 0);
        } else {
          console.log(`${mitigation.name} is already assigned to ${selectedBossAction.name}`);
        }

        return newAssignments;
      });
    } else {
      console.log('No valid drop target');
    }

    setActiveId(null);
    setActiveMitigation(null);
  }, [selectedBossAction, currentBossActions, assignments, mitigationAbilities, checkAndRemoveFutureConflicts]);

  // Add a keyboard handler to deselect boss action when Escape key is pressed
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && selectedBossAction) {
        setSelectedBossAction(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedBossAction]);



  // Remove a mitigation from a boss action - memoized with useCallback
  const removeMitigation = useCallback((bossActionId, mitigationId) => {
    setAssignments(prev => {
      const newAssignments = { ...prev };

      if (newAssignments[bossActionId]) {
        newAssignments[bossActionId] = newAssignments[bossActionId].filter(
          m => m.id !== mitigationId
        );

        if (newAssignments[bossActionId].length === 0) {
          delete newAssignments[bossActionId];
        }
      }

      return newAssignments;
    });
  }, []);

  // Sort boss actions by time - memoized for performance
  const sortedBossActions = useMemo(() => {
    return [...currentBossActions].sort((a, b) => a.time - b.time);
  }, [currentBossActions]);

  // Get the current boss level - memoized for performance
  const currentBossLevel = useMemo(() => {
    const currentBoss = bosses.find(boss => boss.id === currentBossId);
    return currentBoss ? currentBoss.level : 90; // Default to level 90 if boss not found
  }, [currentBossId]);

  // Toggle dark mode function
  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('darkMode', newMode.toString());
    document.documentElement.setAttribute('data-theme', newMode ? 'dark' : 'light');
  };

  return (
    <ThemeProvider theme={isDarkMode ? darkTheme : lightTheme}>
      <GlobalStyle />
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
      <AppContainer>
        <Header>
          <HeaderTop>
            <ThemeToggle isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />
          </HeaderTop>
          <h1>FFXIV Boss Timeline & Mitigation Planner</h1>
          <p>Click on a boss action to select it (click again to deselect). Mitigation abilities can only be dragged when a boss action is selected and can only be dropped on the selected action. Abilities on cooldown will be disabled.</p>
          {statusMessage && (
            <StatusMessage>
              {statusMessage}
              <CloseButton onClick={() => setStatusMessage('')}>×</CloseButton>
            </StatusMessage>
          )}
        </Header>

          <BossSelector
            selectedBossId={currentBossId}
            onSelectBoss={setCurrentBossId}
          />

          {/* Cooldown tracking is now handled directly in the App component */}

          <JobSelector
            onJobsChange={setSelectedJobs}
          />





          <ImportExport
            assignments={assignments}
            bossId={currentBossId}
            selectedJobs={selectedJobs}
            onImport={(importedAssignments, importedBossId, importedSelectedJobs) => {
              // Update assignments
              setAssignments(importedAssignments);

              // Update boss if different
              if (importedBossId && importedBossId !== currentBossId) {
                setCurrentBossId(importedBossId);
              }

              // Update selected jobs if they were included in the import
              if (importedSelectedJobs) {
                setSelectedJobs(importedSelectedJobs);
                // Also update localStorage to persist the imported job selections
                localStorage.setItem('selectedJobs', JSON.stringify(importedSelectedJobs));
              }
            }}
          />

          <MainContent>
            <TimelineContainer>
              <TimelineHeader>Boss Timeline</TimelineHeader>
              <BossActionsList>
                {sortedBossActions.map(action => (
                <Droppable
                  id={action.id}
                  key={action.id}
                  data-time={action.time}
                  disableDrop={selectedBossAction && selectedBossAction.id !== action.id}
                >
                  <BossAction
                    time={action.time}
                    importance={action.importance}
                    isSelected={selectedBossAction && selectedBossAction.id === action.id}
                    hasAssignments={assignments[action.id] && assignments[action.id].length > 0}
                    onClick={() => {
                      if (selectedBossAction && selectedBossAction.id === action.id) {
                        // If clicking the already selected action, deselect it
                        setSelectedBossAction(null);
                      } else {
                        // Otherwise select this action
                        setSelectedBossAction(action);
                      }
                    }}
                  >

                    <ActionTime>{action.time} seconds</ActionTime>
                    <div style={{ display: 'flex', alignItems: 'center', margin: '10px 0' }}>
                      <ActionIcon>
                        {action.icon}
                      </ActionIcon>
                      <ActionName>{action.name}</ActionName>
                    </div>
                    <ActionDescription>{action.description}</ActionDescription>

                    {/* Calculate and display total mitigation including inherited mitigations */}
                    {(() => {
                      // Get directly assigned mitigations
                      const directMitigations = assignments[action.id] || [];

                      // Get inherited mitigations from previous actions
                      const inheritedMitigations = findActiveMitigationsAtTime(
                        assignments,
                        currentBossActions,
                        mitigationAbilities,
                        action.id,
                        action.time,
                        currentBossLevel
                      ).map(m => {
                        // Find the full mitigation data
                        return mitigationAbilities.find(full => full.id === m.id);
                      }).filter(Boolean);

                      // Combine both types of mitigations
                      const allMitigations = [...directMitigations, ...inheritedMitigations];

                      // Only show if there are any mitigations
                      return allMitigations.length > 0 ? (
                        <Tooltip
                          content={generateMitigationBreakdown(allMitigations, action.damageType, currentBossLevel)}
                        >
                          <MitigationPercentage>
                            Damage Mitigated: {formatMitigation(calculateTotalMitigation(allMitigations, action.damageType, currentBossLevel))}
                          </MitigationPercentage>
                        </Tooltip>
                      ) : null;
                    })()}

                    {/* Render directly assigned mitigations */}
                    {assignments[action.id] && assignments[action.id].length > 0 && (
                      <AssignedMitigations>
                        {assignments[action.id].map(mitigation => (
                          <Tooltip
                            key={mitigation.id}
                            content={`${mitigation.name}: ${getAbilityDescriptionForLevel(mitigation, currentBossLevel)} (Duration: ${getAbilityDurationForLevel(mitigation, currentBossLevel)}s, Cooldown: ${getAbilityCooldownForLevel(mitigation, currentBossLevel)}s)${mitigation.mitigationValue ? `\nMitigation: ${typeof getAbilityMitigationValueForLevel(mitigation, currentBossLevel) === 'object' ? `${getAbilityMitigationValueForLevel(mitigation, currentBossLevel).physical * 100}% physical, ${getAbilityMitigationValueForLevel(mitigation, currentBossLevel).magical * 100}% magical` : `${getAbilityMitigationValueForLevel(mitigation, currentBossLevel) * 100}%`}` : ''}`}
                          >
                            <AssignedMitigation>
                              <MitigationIcon>
                                {typeof mitigation.icon === 'string' && mitigation.icon.startsWith('/') ?
                                  <img src={mitigation.icon} alt={mitigation.name} style={{ maxHeight: '18px', maxWidth: '18px' }} /> :
                                  mitigation.icon
                                }
                              </MitigationIcon>
                              <span style={{ flex: 1 }}>{mitigation.name}</span>
                              <span
                                style={{
                                  opacity: 0.6,
                                  cursor: 'pointer',
                                  fontSize: '10px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: '16px',
                                  height: '16px',
                                  borderRadius: '50%',
                                  transition: 'opacity 0.2s ease, background-color 0.2s ease'
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeMitigation(action.id, mitigation.id);
                                }}
                                onMouseOver={(e) => e.currentTarget.style.opacity = '1'}
                                onMouseOut={(e) => e.currentTarget.style.opacity = '0.6'}
                              >
                                ×
                              </span>
                            </AssignedMitigation>
                          </Tooltip>
                        ))}

                        {/* Render inherited mitigations from previous boss actions */}
                        {(() => {
                          // Find active mitigations at this action's time
                          const activeMitigations = findActiveMitigationsAtTime(
                            assignments,
                            currentBossActions,
                            mitigationAbilities,
                            action.id,
                            action.time,
                            currentBossLevel
                          );

                          // If there are active mitigations, render them
                          return activeMitigations.length > 0 ? (
                            <InheritedMitigations>
                              {activeMitigations.map(mitigation => {
                                // Find the full mitigation data
                                const fullMitigation = mitigationAbilities.find(m => m.id === mitigation.id);
                                if (!fullMitigation) return null;

                                return (
                                  <Tooltip
                                    key={`inherited-${mitigation.id}-${mitigation.sourceActionId}`}
                                    content={`${fullMitigation.name}: Applied at ${mitigation.sourceActionTime}s (${mitigation.sourceActionName})\nRemaining duration: ${mitigation.remainingDuration.toFixed(1)}s\n${fullMitigation.mitigationValue ? `Mitigation: ${typeof getAbilityMitigationValueForLevel(fullMitigation, currentBossLevel) === 'object' ? `${getAbilityMitigationValueForLevel(fullMitigation, currentBossLevel).physical * 100}% physical, ${getAbilityMitigationValueForLevel(fullMitigation, currentBossLevel).magical * 100}% magical` : `${getAbilityMitigationValueForLevel(fullMitigation, currentBossLevel) * 100}%`}` : ''}`}
                                  >
                                    <InheritedMitigation>
                                      <MitigationIcon>
                                        {typeof fullMitigation.icon === 'string' && fullMitigation.icon.startsWith('/') ?
                                          <img src={fullMitigation.icon} alt={fullMitigation.name} style={{ maxHeight: '18px', maxWidth: '18px', opacity: 0.7 }} /> :
                                          fullMitigation.icon
                                        }
                                      </MitigationIcon>
                                      <span style={{ flex: 1 }}>{fullMitigation.name}</span>
                                      <small style={{ fontSize: '9px', opacity: 0.8 }}>{mitigation.remainingDuration.toFixed(1)}s</small>
                                    </InheritedMitigation>
                                  </Tooltip>
                                );
                              })}
                            </InheritedMitigations>
                          ) : null;
                        })()}
                      </AssignedMitigations>
                    )}
                  </BossAction>
                </Droppable>
              ))}
              </BossActionsList>
            </TimelineContainer>

            <MitigationContainer>
              <TimelineHeader>Mitigation Abilities</TimelineHeader>
              <MitigationList>
                {filterAbilitiesByLevel(mitigationAbilities, selectedJobs, currentBossLevel)
                  .map(mitigation => (
                    <Draggable
                      id={mitigation.id}
                      key={mitigation.id}
                      isDisabled={!selectedBossAction || (selectedBossAction ?
                        (() => {
                          const cooldownResult = checkAbilityCooldown(mitigation.id, selectedBossAction.time);
                          return cooldownResult && cooldownResult.isOnCooldown;
                        })() : false)}
                      cooldownReason={selectedBossAction ?
                        (() => {
                          const cooldownResult = checkAbilityCooldown(mitigation.id, selectedBossAction.time);
                          if (!cooldownResult || !cooldownResult.isOnCooldown) return null;

                          return `${mitigation.name} would be on cooldown at ${selectedBossAction.time}s\n` +
                            `Previously used at ${cooldownResult.lastUsedTime}s ` +
                            `(${cooldownResult.lastUsedActionName})\n` +
                            `Cooldown remaining: ${Math.ceil(cooldownResult.timeUntilReady || 0)}s`;
                        })() : null}
                    >
                      <MitigationItem>
                        <MitigationIcon>
                          {typeof mitigation.icon === 'string' && mitigation.icon.startsWith('/') ?
                            <img src={mitigation.icon} alt={mitigation.name} style={{ maxHeight: '24px', maxWidth: '24px' }} /> :
                            mitigation.icon
                          }
                        </MitigationIcon>
                        <MitigationName>{mitigation.name}</MitigationName>
                        <MitigationDescription>
                          {getAbilityDescriptionForLevel(mitigation, currentBossLevel)}<br />
                          <small>Duration: {getAbilityDurationForLevel(mitigation, currentBossLevel)}s | Cooldown: {getAbilityCooldownForLevel(mitigation, currentBossLevel)}s</small>
                        </MitigationDescription>
                      </MitigationItem>
                    </Draggable>
                  ))}
              </MitigationList>
            </MitigationContainer>
          </MainContent>
        </AppContainer>

          {/* Custom drag overlay for better visual feedback */}
          <DragOverlay>
            {activeMitigation && (
              <DragPreview>
                <DragPreviewIcon>
                  {typeof activeMitigation.icon === 'string' && activeMitigation.icon.startsWith('/') ?
                    <img src={activeMitigation.icon} alt={activeMitigation.name} style={{ maxHeight: '24px', maxWidth: '24px' }} /> :
                    activeMitigation.icon
                  }
                </DragPreviewIcon>
                <DragPreviewContent>
                  <DragPreviewName>{activeMitigation.name}</DragPreviewName>
                  <DragPreviewDescription>
                    {(() => {
                      const description = getAbilityDescriptionForLevel(activeMitigation, currentBossLevel);
                      return description.length > 50 ?
                        `${description.substring(0, 50)}...` :
                        description;
                    })()}
                  </DragPreviewDescription>
                </DragPreviewContent>
              </DragPreview>
            )}
          </DragOverlay>
        </DndContext>
      </ThemeProvider>
  );
}

export default App
