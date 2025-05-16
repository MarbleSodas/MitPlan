import { useState, useEffect, useCallback } from 'react';
import { DndContext, closestCenter, useSensor, useSensors, PointerSensor, KeyboardSensor, DragOverlay } from '@dnd-kit/core';
import styled, { createGlobalStyle } from 'styled-components';

// Import contexts
import {
  useTheme,
  useBossContext,
  useJobContext,
  useMitigationContext,
  useFilterContext,
  useChargeCountContext,
  useTankPositionContext
} from './contexts';

// Import data from centralized data module
import { mitigationAbilities } from './data';

// Import components
import Draggable from './components/dnd/Draggable/Draggable';
import Droppable from './components/dnd/Droppable/Droppable';
import BossSelector from './features/bosses/BossSelector/BossSelector';
import JobSelector from './features/jobs/JobSelector/JobSelector';
import ImportExport from './features/plans/ImportExport/ImportExport';
import ThemeToggle from './components/common/ThemeToggle/ThemeToggle';
import KofiButton from './components/common/KofiButton/KofiButton';
import DiscordButton from './components/common/DiscordButton/DiscordButton';
import QuizButton from './components/common/QuizButton/QuizButton';
import FilterToggle from './components/common/FilterToggle/FilterToggle';
import MobileBottomSheet from './components/mobile/MobileBottomSheet/MobileBottomSheet';
import MobileMitigationSelector from './components/mobile/MobileMitigationSelector/MobileMitigationSelector';
import BossActionItem from './components/BossActionItem';
import AssignedMitigations from './components/AssignedMitigations';
import MitigationItem from './components/MitigationItem';
import TankPositionSelector from './components/TankPositionSelector';

// Import hooks
import { useDragAndDrop, useMobileInteraction, useUrlHandler } from './hooks';

// Import utility functions
import {
  filterAbilitiesByLevel,
  isMobileDevice,
  isMitigationAvailable,
  getAbilityDescriptionForLevel
} from './utils';

// Global styles
const GlobalStyle = createGlobalStyle`
  body {
    background-color: ${props => props.theme.colors.background};
    color: ${props => props.theme.colors.text};
    margin: 0;
    padding: 0;
    font-family: 'Arial', sans-serif;
    transition: background-color 0.3s ease, color 0.3s ease;
  }
`;

// Styled components
const AppContainer = styled.div`
  width: 100%;
  min-height: 100vh;
  margin: 0 auto;
  padding: ${props => props.theme.spacing.large};
  font-family: 'Arial', sans-serif;
  color: ${props => props.theme.colors.text};
  box-sizing: border-box;

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    padding: ${props => props.theme.spacing.responsive.medium};
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.small};
  }

  @media (max-width: ${props => props.theme.breakpoints.smallMobile}) {
    padding: ${props => props.theme.spacing.xsmall};
  }
`;

const Header = styled.header`
  text-align: center;
  margin-bottom: ${props => props.theme.spacing.xlarge};
  display: flex;
  flex-direction: column;
  position: relative;

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    margin-bottom: ${props => props.theme.spacing.large};
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    margin-bottom: ${props => props.theme.spacing.medium};
  }

  @media (max-width: ${props => props.theme.breakpoints.smallMobile}) {
    margin-bottom: ${props => props.theme.spacing.small};
  }

  h1 {
    font-size: ${props => props.theme.fontSizes.responsive.xxxlarge};

    @media (max-width: ${props => props.theme.breakpoints.tablet}) {
      font-size: ${props => props.theme.fontSizes.responsive.xxlarge};
      margin-bottom: ${props => props.theme.spacing.medium};
    }

    @media (max-width: ${props => props.theme.breakpoints.mobile}) {
      font-size: ${props => props.theme.fontSizes.responsive.xlarge};
      margin-bottom: ${props => props.theme.spacing.small};
    }

    @media (max-width: ${props => props.theme.breakpoints.smallMobile}) {
      font-size: ${props => props.theme.fontSizes.responsive.large};
      margin-bottom: ${props => props.theme.spacing.small};
    }
  }

  p {
    font-size: ${props => props.theme.fontSizes.responsive.medium};

    @media (max-width: ${props => props.theme.breakpoints.tablet}) {
      font-size: ${props => props.theme.fontSizes.responsive.medium};
    }

    @media (max-width: ${props => props.theme.breakpoints.mobile}) {
      font-size: ${props => props.theme.fontSizes.responsive.small};
    }

    @media (max-width: ${props => props.theme.breakpoints.smallMobile}) {
      font-size: ${props => props.theme.fontSizes.responsive.small};
      display: none; /* Hide on very small screens to save space */
    }
  }
`;

const HeaderTop = styled.div`
  display: flex;
  gap: 8px;
  justify-content: space-between;
  padding: ${props => props.theme.spacing.medium} 0;

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    padding: ${props => props.theme.spacing.small} 0;
    gap: 8px;
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.xsmall} 0;
    gap: 6px;
  }

  @media (max-width: ${props => props.theme.breakpoints.smallMobile}) {
    padding: ${props => props.theme.spacing.xsmall} 0;
    gap: 4px;
  }
`;

const MainContent = styled.main`
  display: flex;
  gap: ${props => props.theme.spacing.large};
  width: 100%;

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    gap: ${props => props.theme.spacing.responsive.medium};
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    flex-direction: column;
    gap: ${props => props.theme.spacing.responsive.small};
  }
`;

const TimelineContainer = styled.div`
  flex: 3;
  background-color: ${props => props.theme.colors.secondary};
  border-radius: ${props => props.theme.borderRadius.large};
  padding: ${props => props.theme.spacing.large};
  padding-bottom: ${props => props.theme.spacing.xlarge};
  box-shadow: ${props => props.theme.shadows.medium};
  overflow-y: auto;
  height: calc(100vh - 100px);
  min-height: 500px;
  display: flex;
  flex-direction: column;

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    padding: ${props => props.theme.spacing.responsive.medium};
    border-radius: ${props => props.theme.borderRadius.responsive.medium};
    height: calc(100vh - 90px);
    min-height: 450px;
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.responsive.small};
    border-radius: ${props => props.theme.borderRadius.responsive.small};
    height: calc(100vh - 80px);
    min-height: 400px;
    margin-bottom: ${props => props.theme.spacing.responsive.medium};
    flex: 1;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
    touch-action: pan-y;
  }

  @media (max-width: ${props => props.theme.breakpoints.smallMobile}) {
    padding: ${props => props.theme.spacing.xsmall};
    border-radius: ${props => props.theme.borderRadius.small};
    height: calc(100vh - 70px);
    min-height: 350px;
    margin-bottom: ${props => props.theme.spacing.small};
  }
`;

const MitigationContainer = styled.div`
  flex: 1;
  background-color: ${props => props.theme.colors.secondary};
  border-radius: ${props => props.theme.borderRadius.large};
  padding: ${props => props.theme.spacing.large};
  box-shadow: ${props => props.theme.shadows.medium};
  overflow-y: auto;
  height: calc(100vh - 100px);
  min-height: 500px;

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    padding: ${props => props.theme.spacing.responsive.medium};
    border-radius: ${props => props.theme.borderRadius.responsive.medium};
    height: calc(100vh - 90px);
    min-height: 450px;
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    display: none;
  }
`;

const BossActionsList = styled.div`
  display: flex;
  flex-direction: column;
  padding: ${props => props.theme.spacing.medium};
  position: relative;
  width: 100%;
  margin: 0;
  flex-grow: 1;

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    padding: ${props => props.theme.spacing.responsive.small};
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.small};
    overflow-y: auto;
    height: 100%;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
    touch-action: pan-y;
  }

  @media (max-width: ${props => props.theme.breakpoints.smallMobile}) {
    padding: ${props => props.theme.spacing.xsmall};
  }
`;

const MitigationList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${props => props.theme.spacing.medium};
  flex-grow: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  touch-action: pan-y;
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
  const {
    addPendingAssignment,
    removePendingAssignment,
    canAssignMitigationToBossAction
  } = useChargeCountContext();
  const {
    filterMitigations,
    showAllMitigations
  } = useFilterContext();
  const {
    tankPositions,
    selectedTankJobs
  } = useTankPositionContext();

  // Local state
  const [pendingAssignments, setPendingAssignments] = useState([]);
  const [isMobileBottomSheetOpen, setIsMobileBottomSheetOpen] = useState(false);
  const [selectedActionForMobile, setSelectedActionForMobile] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  // Custom hooks
  const { handleDragStart, handleDragEnd } = useDragAndDrop({
    setActiveMitigation,
    checkAbilityCooldown,
    addMitigation,
    addPendingAssignment,
    canAssignMitigationToBossAction,
    setPendingAssignments,
    tankPositions
  });

  const { handleMobileAssignMitigation, handleBossActionClick } = useMobileInteraction({
    checkAbilityCooldown,
    addMitigation,
    addPendingAssignment,
    canAssignMitigationToBossAction,
    setPendingAssignments,
    sortedBossActions,
    assignments
  });

  // Handle URL parameters
  useUrlHandler({
    importAssignments,
    setCurrentBossId,
    setSelectedJobs,
    currentBossId
  });

  // Effect to clean up pending assignments
  useEffect(() => {
    if (pendingAssignments.length > 0) {
      const timeoutId = setTimeout(() => {
        setPendingAssignments([]);
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [pendingAssignments]);

  // Check for mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(isMobileDevice());
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Add keyboard handler for Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && selectedBossAction) {
        clearSelectedBossAction();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedBossAction, clearSelectedBossAction]);

  // Configure sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor)
  );

  // Memoized handler for drag end
  const memoizedHandleDragEnd = useCallback((event) => {
    handleDragEnd(event, selectedBossAction, assignments);
  }, [handleDragEnd, selectedBossAction, assignments]);

  // Memoized handler for boss action click
  const memoizedHandleBossActionClick = useCallback((action) => {
    handleBossActionClick(
      action,
      isMobile,
      toggleBossActionSelection,
      setSelectedActionForMobile,
      setIsMobileBottomSheetOpen
    );
  }, [handleBossActionClick, isMobile, toggleBossActionSelection]);

  return (
    <>
      <GlobalStyle />
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={memoizedHandleDragEnd}
      >
        <AppContainer>
          <Header>
            <HeaderTop>
              <QuizButton />
              <div style={{ display: 'flex', gap: '8px' }}>
                <KofiButton />
                <DiscordButton />
                <ThemeToggle isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
              </div>
            </HeaderTop>
            <h1>FFXIV Boss Timeline & Mitigation Planner</h1>
            <p>Click on a boss action to select it (click again to deselect). Mitigation abilities can only be dragged when a boss action is selected and can only be dropped on the selected action. Abilities on cooldown will be disabled.</p>
          </Header>

          <BossSelector
            selectedBossId={currentBossId}
            onSelectBoss={setCurrentBossId}
          />

          <JobSelector
            key={`job-selector-${JSON.stringify(selectedJobs)}`}
            onJobsChange={setSelectedJobs}
            initialJobs={selectedJobs}
          />

          {/* Only show tank position selector if at least one tank is selected */}
          {selectedJobs.tank.some(job => job.selected) && (
            <TankPositionSelector />
          )}

          <FilterToggle />

          <ImportExport
            assignments={assignments}
            bossId={currentBossId}
            selectedJobs={selectedJobs}
            onImport={(importedAssignments, importedBossId, importedSelectedJobs) => {
              if (importedAssignments) {
                importAssignments(importedAssignments);
              }
              if (importedBossId && importedBossId !== currentBossId) {
                setCurrentBossId(importedBossId);
              }
              if (importedSelectedJobs) {
                setSelectedJobs(importedSelectedJobs);
              }
            }}
          />

          <MainContent>
            <TimelineContainer>
              <BossActionsList>
                {sortedBossActions.map(action => (
                  <Droppable
                    id={action.id}
                    key={action.id}
                    data-time={action.time}
                    disableDrop={selectedBossAction && selectedBossAction.id !== action.id}
                  >
                    <BossActionItem
                      action={action}
                      isSelected={selectedBossAction && selectedBossAction.id === action.id}
                      assignments={assignments}
                      getActiveMitigations={getActiveMitigations}
                      selectedJobs={selectedJobs}
                      currentBossLevel={currentBossLevel}
                      onClick={() => memoizedHandleBossActionClick(action)}
                    >
                      <AssignedMitigations
                        action={action}
                        assignments={assignments}
                        getActiveMitigations={getActiveMitigations}
                        selectedJobs={selectedJobs}
                        currentBossLevel={currentBossLevel}
                        isMobile={isMobile}
                        onRemoveMitigation={removeMitigation}
                        removePendingAssignment={removePendingAssignment}
                      />
                    </BossActionItem>
                  </Droppable>
                ))}
              </BossActionsList>
            </TimelineContainer>

            <MitigationContainer>
              <MitigationList>
                {filterAbilitiesByLevel(mitigationAbilities, selectedJobs, currentBossLevel)
                  .filter(mitigation => showAllMitigations || !selectedBossAction || filterMitigations([mitigation], selectedBossAction).length > 0)
                  .map(mitigation => {
                    // Check if this mitigation can be assigned to the selected boss action
                    const isDisabled = !selectedBossAction || (selectedBossAction ? (() => {
                      // Check if there's a pending assignment for this mitigation
                      const hasPendingAssignment = selectedBossAction ? pendingAssignments.some(pa =>
                        pa.mitigationId === mitigation.id &&
                        pa.bossActionId === selectedBossAction.id
                      ) : false;

                      // First, check if this mitigation can be assigned to this boss action
                      const isAlreadyAssigned = assignments[selectedBossAction.id]?.some(m => m.id === mitigation.id);
                      if (isAlreadyAssigned && !canAssignMitigationToBossAction(selectedBossAction.id, mitigation.id)) {
                        return true; // Disable if already assigned and can't be assigned again
                      }

                      const cooldownResult = checkAbilityCooldown(
                        mitigation.id,
                        selectedBossAction.time,
                        // Consider both actual assignments and pending assignments
                        isAlreadyAssigned || hasPendingAssignment,
                        selectedBossAction.id
                      );

                      // For role-shared abilities, check if all instances are on cooldown
                      if (mitigation.isRoleShared && cooldownResult) {
                        return cooldownResult.availableCharges === 0;
                      }

                      // For regular abilities, check if the ability is on cooldown or has no available charges
                      return (cooldownResult && cooldownResult.isOnCooldown) ||
                             (cooldownResult && cooldownResult.availableCharges === 0);
                    })() : false);

                    // Get cooldown reason if applicable
                    const cooldownReason = selectedBossAction ? (() => {
                      // Check if there's a pending assignment for this mitigation
                      const hasPendingAssignment = selectedBossAction ? pendingAssignments.some(pa =>
                        pa.mitigationId === mitigation.id &&
                        pa.bossActionId === selectedBossAction.id
                      ) : false;

                      const cooldownResult = checkAbilityCooldown(
                        mitigation.id,
                        selectedBossAction.time,
                        // Consider both actual assignments and pending assignments
                        assignments[selectedBossAction.id]?.some(m => m.id === mitigation.id) || hasPendingAssignment,
                        selectedBossAction.id
                      );

                      // Show reason if on cooldown or if already assigned to this boss action
                      if ((!cooldownResult || !cooldownResult.isOnCooldown) &&
                          !(cooldownResult && cooldownResult.reason === 'already-assigned') &&
                          !(cooldownResult && cooldownResult.availableCharges === 0)) return null;

                      // First, check if this mitigation can be assigned to this boss action
                      const isAlreadyAssigned = assignments[selectedBossAction.id]?.some(m => m.id === mitigation.id);
                      if (isAlreadyAssigned && !canAssignMitigationToBossAction(selectedBossAction.id, mitigation.id)) {
                        return `${mitigation.name} cannot be assigned multiple times to this boss action`;
                      }

                      if (cooldownResult.reason === 'already-assigned') {
                        return `${mitigation.name} is already assigned to this boss action`;
                      }

                      // Handle role-shared abilities
                      if (mitigation.isRoleShared && cooldownResult.roleSharedCount > 1) {
                        if (cooldownResult.availableCharges === 0) {
                          return `All ${cooldownResult.roleSharedCount} instances of ${mitigation.name} are on cooldown`;
                        } else {
                          const availableInstances = cooldownResult.roleSharedCount - (cooldownResult.instancesUsed || 0);
                          return `${availableInstances}/${cooldownResult.roleSharedCount} instances of ${mitigation.name} available`;
                        }
                      }
                      // Handle abilities with multiple charges
                      else if (cooldownResult.totalCharges > 1) {
                        let chargeInfo = '';
                        if (cooldownResult.availableCharges === 0) {
                          chargeInfo = `\nAll ${cooldownResult.totalCharges} charges are on cooldown`;
                        } else {
                          chargeInfo = `\nCharges: ${cooldownResult.availableCharges}/${cooldownResult.totalCharges} available`;
                        }

                        return `${mitigation.name} would be on cooldown at ${selectedBossAction.time}s\n` +
                          `Previously used at ${cooldownResult.lastUsedTime}s ` +
                          `(${cooldownResult.lastUsedActionName})` +
                          chargeInfo +
                          `\nCooldown remaining: ${Math.ceil(cooldownResult.timeUntilReady || 0)}s`;
                      }
                      // Handle regular abilities
                      else {
                        return `${mitigation.name} would be on cooldown at ${selectedBossAction.time}s\n` +
                          `Previously used at ${cooldownResult.lastUsedTime}s ` +
                          `(${cooldownResult.lastUsedActionName})` +
                          `\nCooldown remaining: ${Math.ceil(cooldownResult.timeUntilReady || 0)}s`;
                      }
                    })() : null;

                    return (
                      <Draggable
                        id={mitigation.id}
                        key={mitigation.id}
                        isDisabled={isDisabled}
                        cooldownReason={cooldownReason}
                      >
                        <MitigationItem
                          mitigation={mitigation}
                          isDisabled={isDisabled}
                          cooldownReason={cooldownReason}
                          currentBossLevel={currentBossLevel}
                          selectedBossAction={selectedBossAction}
                          pendingAssignments={pendingAssignments}
                          checkAbilityCooldown={checkAbilityCooldown}
                          selectedJobs={selectedJobs}
                        />
                      </Draggable>
                    );
                  })}
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

      {/* Mobile Bottom Sheet for Mitigation Assignment */}
      {isMobile && (
        <MobileBottomSheet
          isOpen={isMobileBottomSheetOpen}
          onClose={() => {
            setIsMobileBottomSheetOpen(false);
            setSelectedActionForMobile(null);
          }}
          title={selectedActionForMobile ? `Assign Mitigations: ${selectedActionForMobile.name}` : 'Assign Mitigations'}
        >
          {selectedActionForMobile && (
            <MobileMitigationSelector
              mitigations={filterAbilitiesByLevel(mitigationAbilities, selectedJobs, currentBossLevel)}
              bossAction={selectedActionForMobile}
              assignments={assignments}
              pendingAssignments={pendingAssignments}
              onAssignMitigation={handleMobileAssignMitigation}
              onRemoveMitigation={removeMitigation}
              checkAbilityCooldown={checkAbilityCooldown}
              bossLevel={currentBossLevel}
              selectedJobs={selectedJobs}
            />
          )}
        </MobileBottomSheet>
      )}
    </>
  );
}

export default App;
