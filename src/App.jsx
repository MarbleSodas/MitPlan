import { useState, useEffect, useCallback, useMemo } from 'react';
import { DndContext, closestCenter, useSensor, useSensors, PointerSensor, KeyboardSensor, DragOverlay } from '@dnd-kit/core';

// Import contexts
import {
  useTheme,
  useBossContext,
  useJobContext,
  useMitigationContext,
  useFilterContext,
  useChargeCountContext,
  useTankPositionContext,
  useTankSelectionModalContext
} from './contexts';
import { TankSelectionModalProvider } from './contexts/TankSelectionModalContext';

// Import data from centralized data module
import { mitigationAbilities } from './data';

// Import components
import Draggable from './components/dnd/Draggable/Draggable';
import Droppable from './components/dnd/Droppable/Droppable';
import DragPreview from './components/dnd/DragPreview';
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
import DataMigrationBanner from './components/common/DataMigrationBanner';

// Import layout components
import { AppLayout, HeaderLayout } from './components/layout';
import { 
  GlobalStyle, 
  TimelineContainer, 
  MitigationContainer, 
  MainContent, 
  BossActionsList, 
  MitigationList 
} from './components/styled';

// Import hooks
import { 
  useDragAndDrop, 
  useMobileInteraction, 
  useUrlHandler, 
  useDeviceDetection 
} from './hooks';

// Import utility functions
import {
  filterAbilitiesByLevel,
  isMitigationAvailable,
  getAbilityDescriptionForLevel
} from './utils';

function App() {
  // State for tracking banner visibility
  const [isBannerVisible, setIsBannerVisible] = useState(false);

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
  
  // Use custom hook for device detection
  const isMobile = useDeviceDetection();

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

  // Effect to clean up pending assignments - optimized with dependency on length
  useEffect(() => {
    if (pendingAssignments.length === 0) return;
    
    const timeoutId = setTimeout(() => {
      setPendingAssignments([]);
    }, 1000);
    
    return () => clearTimeout(timeoutId);
  }, [pendingAssignments.length]);

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

  // Memoize filtered abilities to prevent unnecessary recalculations
  const filteredAbilities = useMemo(() => {
    return filterAbilitiesByLevel(mitigationAbilities, selectedJobs, currentBossLevel)
      .filter(mitigation => 
        showAllMitigations || 
        !selectedBossAction || 
        filterMitigations([mitigation], selectedBossAction).length > 0
      );
  }, [mitigationAbilities, selectedJobs, currentBossLevel, showAllMitigations, selectedBossAction, filterMitigations]);

  // Memoize the boss actions list to prevent unnecessary re-renders
  const bossActionsList = useMemo(() => (
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
  ), [
    sortedBossActions, 
    selectedBossAction, 
    assignments, 
    getActiveMitigations, 
    selectedJobs, 
    currentBossLevel, 
    memoizedHandleBossActionClick, 
    isMobile, 
    removeMitigation, 
    removePendingAssignment
  ]);

  // Memoize the mitigation list to prevent unnecessary re-renders
  const mitigationsList = useMemo(() => (
    <MitigationList>
      {filteredAbilities.map(mitigation => {
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
  ), [
    filteredAbilities,
    selectedBossAction,
    pendingAssignments,
    assignments,
    canAssignMitigationToBossAction,
    checkAbilityCooldown,
    currentBossLevel,
    selectedJobs
  ]);

  // Handle export click from migration banner
  const handleExportFromBanner = useCallback(() => {
    // Scroll to the ImportExport section
    const importExportSection = document.querySelector('[data-export-section]');
    if (importExportSection) {
      importExportSection.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  // Handle banner visibility change
  const handleBannerVisibilityChange = useCallback((isVisible) => {
    setIsBannerVisible(isVisible);
  }, []);

  return (
    <>
      <GlobalStyle />
      <DataMigrationBanner
        onExportClick={handleExportFromBanner}
        onVisibilityChange={handleBannerVisibilityChange}
      />
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={memoizedHandleDragEnd}
      >
        <AppLayout hasBanner={isBannerVisible}>
          <HeaderLayout
            title="FFXIV Boss Timeline & Mitigation Planner"
            description="Click on a boss action to select it (click again to deselect). Mitigation abilities can only be dragged when a boss action is selected and can only be dropped on the selected action. Abilities on cooldown will be disabled."
            topLeftContent={<QuizButton />}
            topRightContent={
              <div style={{ display: 'flex', gap: '8px' }}>
                <KofiButton />
                <DiscordButton />
                <ThemeToggle isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
              </div>
            }
          />

          <BossSelector
            selectedBossId={currentBossId}
            onSelectBoss={setCurrentBossId}
          />

          <JobSelector
            key={`job-selector-${JSON.stringify(selectedJobs)}`}
            onJobsChange={setSelectedJobs}
            initialJobs={selectedJobs}
          />

          {/* Only show tank position selector if exactly 2 tanks are selected */}
          <TankPositionSelector />

          <FilterToggle />

          <div data-export-section>
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
          </div>

          <MainContent>
            <TimelineContainer>
              {bossActionsList}
            </TimelineContainer>

            <MitigationContainer>
              {mitigationsList}
            </MitigationContainer>
          </MainContent>
        </AppLayout>

        {/* Custom drag overlay for better visual feedback */}
        <DragOverlay>
          {activeMitigation && (
            <DragPreview 
              item={activeMitigation} 
              currentBossLevel={currentBossLevel} 
            />
          )}
        </DragOverlay>
      </DndContext>
    </>
  );
}

export default App;