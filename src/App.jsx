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
import { useReadOnly } from './contexts/ReadOnlyContext';
import { useSharedPlanError } from './contexts/SharedPlanErrorContext';

// Import data from centralized data module
import { mitigationAbilities } from './data';

// Import components
import Draggable from './components/dnd/Draggable/Draggable';
import Droppable from './components/dnd/Droppable/Droppable';
import DragPreview from './components/dnd/DragPreview';
import BossSelector from './features/bosses/BossSelector/BossSelector';
import JobSelector from './features/jobs/JobSelector/JobSelector';
import EnhancedImportExport from './features/plans/ImportExport/EnhancedImportExport';
import ThemeToggle from './components/common/ThemeToggle/ThemeToggle';
import KofiButton from './components/common/KofiButton/KofiButton';
import DiscordButton from './components/common/DiscordButton/DiscordButton';
import QuizButton from './components/common/QuizButton/QuizButton';
import { AuthButton } from './components/auth';
import FilterToggle from './components/common/FilterToggle/FilterToggle';
import BossActionItem from './components/BossActionItem';
import AssignedMitigations from './components/AssignedMitigations';
import MitigationItem from './components/MitigationItem';
import TankPositionSelector from './components/TankPositionSelector';
import CollaborationIndicator from './components/collaboration/CollaborationIndicator';
import UserPresenceIndicator from './components/collaboration/UserPresenceIndicator';
import CollaborationOnboarding from './components/collaboration/CollaborationOnboarding';
import SharedPlanLoader from './components/collaboration/SharedPlanLoader';
import ReadOnlyBanner from './components/ReadOnlyBanner/ReadOnlyBanner';
import ConnectionStatus from './components/common/ConnectionStatus';
import NotificationBanner from './components/common/NotificationBanner/NotificationBanner';

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
  useDeviceDetection
} from './hooks';
import useEnhancedUrlHandler from './hooks/useEnhancedUrlHandler';
import useCollaboration from './hooks/useCollaboration';
import useAutoJoinCollaboration from './hooks/useAutoJoinCollaboration';

// Import utility functions
import {
  filterAbilitiesByLevel
} from './utils';

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
    tankPositions
  } = useTankPositionContext();

  // Error handling and loading state
  const { urlError, isLoading, hasError } = useReadOnly();
  const { retryOperation, getRetryCount } = useSharedPlanError();

  // Handlers for read-only banner actions
  const handleSignInClick = () => {
    // This will trigger the AuthButton modal
    const authButton = document.querySelector('[data-auth-button]');
    if (authButton) {
      authButton.click();
    }
  };

  const handleCreatePlanClick = () => {
    // Clear current plan and start fresh
    window.location.href = '/';
  };

  const handleJoinCollaboration = () => {
    // This will trigger the CollaborationOnboarding component
    console.log('🤝 User requested to join collaboration from banner');
  };

  // Handle retry for shared plan loading
  const handleRetryPlanLoad = async () => {
    if (!urlError) return;

    console.log('%c[APP] Retrying plan load', 'background: #2196F3; color: white; padding: 2px 5px; border-radius: 3px;', urlError);

    try {
      // Create a retry operation that reloads the page
      await retryOperation(async () => {
        // For plan loading errors, the best retry is to reload the page
        window.location.reload();
        return true;
      }, urlError.id || 'plan_load_retry');
    } catch (error) {
      console.error('%c[APP] Retry failed', 'background: #f44336; color: white; padding: 2px 5px; border-radius: 3px;', error);
    }
  };

  // Local state
  const [pendingAssignments, setPendingAssignments] = useState([]);

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

  const { handleBossActionClick } = useMobileInteraction({
    checkAbilityCooldown,
    addMitigation,
    addPendingAssignment,
    canAssignMitigationToBossAction,
    setPendingAssignments,
    sortedBossActions,
    assignments
  });

  // Handle URL parameters
  useEnhancedUrlHandler({
    importAssignments,
    setCurrentBossId,
    setSelectedJobs,
    currentBossId
  });

  // Handle real-time collaboration for shared plans
  // Removed live plan data dependency to prevent infinite re-renders
  const {
    isCollaborating,
    roomUsers,
    currentUserId
  } = useCollaboration();

  // Auto-join collaboration for shared plans
  useAutoJoinCollaboration();

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
      toggleBossActionSelection
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

  // Check if we should show the shared plan loader
  const shouldShowLoader = isLoading || hasError;
  const isSharedPlan = window.location.pathname.includes('/plan/shared/');

  return (
    <>
      <GlobalStyle />
      <ConnectionStatus />

      {/* Show shared plan loader for loading states and errors */}
      {shouldShowLoader && isSharedPlan && (
        <SharedPlanLoader
          isLoading={isLoading}
          error={urlError}
          onRetry={handleRetryPlanLoad}
          planId={urlError?.planId}
          showSkeleton={isLoading}
        />
      )}

      {/* Only show main app content if not in error/loading state */}
      {!shouldShowLoader && (
        <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={memoizedHandleDragEnd}
      >
        <AppLayout data-testid="app-container">
          <HeaderLayout
            title="FFXIV Boss Timeline & Mitigation Planner"
            description="Click on a boss action to select it (click again to deselect). Mitigation abilities can only be dragged when a boss action is selected and can only be dropped on the selected action. Abilities on cooldown will be disabled."
            topLeftContent={<QuizButton />}
            topRightContent={
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <AuthButton />
                <KofiButton />
                <DiscordButton />
                <ThemeToggle isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
              </div>
            }
          />

          {/* Read-only banner for unauthenticated users */}
          <ReadOnlyBanner
            onSignInClick={handleSignInClick}
            onCreatePlanClick={handleCreatePlanClick}
            onJoinCollaboration={handleJoinCollaboration}
          />

          {/* Collaboration onboarding for shared plans */}
          <CollaborationOnboarding />

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

          {/* Show collaboration features when in shared mode */}
          <UserPresenceIndicator
            users={roomUsers}
            currentUserId={currentUserId}
            isCollaborating={isCollaborating}
          />

          <CollaborationIndicator
            isCollaborating={isCollaborating}
            roomUsers={roomUsers}
          />

          <EnhancedImportExport
            assignments={assignments}
            bossId={currentBossId}
            selectedJobs={selectedJobs}
            onImport={(importedAssignments, importedBossId, importedSelectedJobs) => {
              // Apply changes to contexts - let each context handle its own localStorage
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
      )}

      {/* Global notification banner for errors, warnings, and success messages */}
      <NotificationBanner />
    </>
  );
}

export default App;