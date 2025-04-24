import { useCallback, useState, useEffect } from 'react'
import { DndContext, closestCenter, useSensor, useSensors, PointerSensor, KeyboardSensor, DragOverlay } from '@dnd-kit/core'
import styled, { createGlobalStyle } from 'styled-components'

// Import contexts
import { useTheme, useBossContext, useJobContext, useMitigationContext } from './contexts'

// Import data from centralized data module
import { mitigationAbilities } from './data'

// Import components from new structure
import Draggable from './components/dnd/Draggable/Draggable'
import Droppable from './components/dnd/Droppable/Droppable'
import Tooltip from './components/common/Tooltip/Tooltip'
import BossSelector from './features/bosses/BossSelector/BossSelector'
import JobSelector from './features/jobs/JobSelector/JobSelector'
import ImportExport from './features/plans/ImportExport/ImportExport'
import ThemeToggle from './components/common/ThemeToggle/ThemeToggle'
import KofiButton from './components/common/KofiButton/KofiButton'

// Import utility functions from centralized utils module
import {
  calculateTotalMitigation,
  formatMitigation,
  generateMitigationBreakdown,
  filterAbilitiesByLevel,
  getAbilityDescriptionForLevel,
  getAbilityCooldownForLevel,
  getAbilityMitigationValueForLevel,
  getAbilityDurationForLevel
} from './utils'

// Global styles to apply theme to the entire app
const GlobalStyle = createGlobalStyle`
  body {
    background-color: ${props => props.theme.colors.background};
    color: ${props => props.theme.colors.text};
    margin: 0;
    padding: 0;
    font-family: 'Arial', sans-serif;
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
  gap: 4px;
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
    if (props.$isSelected) {
      return props.theme.mode === 'dark' ? 'rgba(51, 153, 255, 0.2)' : 'rgba(51, 153, 255, 0.1)';
    }
    return props.theme.colors.cardBackground;
  }};
  border-radius: ${props => props.theme.borderRadius.medium};
  padding: ${props => props.theme.spacing.medium};
  padding-top: 40px; /* Fixed padding at top for time indicator */
  padding-right: ${props => props.$hasAssignments ? '160px' : props.theme.spacing.medium}; /* Extra space on right for mitigations */
  box-shadow: ${props => props.theme.shadows.small};
  position: relative;
  border-left: 4px solid ${props => {
    switch(props.$importance) {
      case 'critical': return props.theme.colors.critical;
      case 'high': return props.theme.colors.high;
      case 'medium': return props.theme.colors.medium;
      default: return props.theme.colors.low;
    }
  }};
  transition: all 0.2s ease;
  color: ${props => props.theme.colors.text};
  border: ${props => props.$isSelected ? `2px solid ${props.theme.colors.primary}` : '1px solid ${props.theme.colors.border}'};
  cursor: pointer;
  width: 100%; /* Full width */
  min-height: 140px; /* Minimum height for all boss action cards */
  height: auto; /* Allow height to grow based on content */
  display: flex;
  flex-direction: column;
  margin-bottom: ${props => props.theme.spacing.medium};

  &:hover {
    box-shadow: ${props => props.theme.shadows.medium};
    transform: translateY(-2px);
    border-color: ${props => props.theme.colors.primary};
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
  // Get state from contexts
  const { isDarkMode, toggleTheme } = useTheme();
  const {
    currentBossId,
    setCurrentBossId,
    currentBossActions,
    sortedBossActions,
    selectedBossAction,
    toggleBossActionSelection,
    clearSelectedBossAction,
    currentBossLevel
  } = useBossContext();
  const {
    selectedJobs,
    setSelectedJobs
  } = useJobContext();
  const {
    assignments,
    activeMitigation,
    setActiveMitigation,
    checkAbilityCooldown,
    addMitigation,
    removeMitigation,
    getActiveMitigations,
    importAssignments
  } = useMitigationContext();

  // Local state
  const [statusMessage, setStatusMessage] = useState(''); // Status message for user feedback
  const [activeId, setActiveId] = useState(null); // For drag and drop operations

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

  // Handle drag end - memoized with useCallback
  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;

    // If no drop target or no selected boss action, do nothing
    if (!over || !selectedBossAction) {
      setActiveId(null);
      setActiveMitigation(null);
      return;
    }

    // Find the mitigation ability being dragged
    const mitigation = mitigationAbilities.find(m => m.id === active.id);
    if (!mitigation) {
      setActiveId(null);
      setActiveMitigation(null);
      return;
    }

    // Check if the drop target is the selected boss action
    if (over.id === selectedBossAction.id) {
      // Check if the ability would be on cooldown
      const cooldownResult = checkAbilityCooldown(mitigation.id, selectedBossAction.time);

      if (cooldownResult && cooldownResult.isOnCooldown) {
        // Ability is on cooldown, show error message
        setStatusMessage(`Cannot assign ${mitigation.name} to ${selectedBossAction.name} because it would be on cooldown. Previously used at ${cooldownResult.lastUsedTime}s (${cooldownResult.lastUsedActionName}). Cooldown remaining: ${Math.ceil(cooldownResult.timeUntilReady)}s`);
      } else {
        // Add the mitigation to the boss action
        const result = addMitigation(selectedBossAction.id, mitigation);

        if (result && result.conflicts && result.conflicts.removedCount > 0) {
          // Show message about removed future assignments
          setStatusMessage(`Added ${mitigation.name} to ${selectedBossAction.name}. Removed ${result.conflicts.removedCount} future assignments that would be on cooldown.`);
        } else {
          // Show success message
          setStatusMessage(`Added ${mitigation.name} to ${selectedBossAction.name}`);
        }
      }
    }

    setActiveId(null);
    setActiveMitigation(null);
  }, [selectedBossAction, mitigationAbilities, checkAbilityCooldown, addMitigation]);

  // Add a keyboard handler to deselect boss action when Escape key is pressed
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && selectedBossAction) {
        clearSelectedBossAction();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedBossAction, clearSelectedBossAction]);

  return (
    <>
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
            <KofiButton />
            <ThemeToggle isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
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
              // Update assignments using the context
              if (importedAssignments) {
                // Use the hook's import function from context
                importAssignments(importedAssignments);
              }

              // Update boss if different
              if (importedBossId && importedBossId !== currentBossId) {
                setCurrentBossId(importedBossId);
              }

              // Update selected jobs if they were included in the import
              if (importedSelectedJobs) {
                setSelectedJobs(importedSelectedJobs);
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
                    $time={action.time}
                    $importance={action.importance}
                    $isSelected={selectedBossAction && selectedBossAction.id === action.id}
                    $hasAssignments={assignments[action.id] && assignments[action.id].length > 0}
                    onClick={() => toggleBossActionSelection(action)}
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
                      const inheritedMitigations = getActiveMitigations(action.id, action.time)
                        .map(m => {
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
                          const activeMitigations = getActiveMitigations(action.id, action.time);

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
      </>
  );
}

export default App
