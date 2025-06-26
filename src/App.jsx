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
import { useAuth } from './contexts/AuthContext';

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

import SharedPlanLoader from './components/collaboration/SharedPlanLoader';
import ReadOnlyBanner from './components/ReadOnlyBanner/ReadOnlyBanner';

import NotificationBanner from './components/common/NotificationBanner/NotificationBanner';
import CollaborationToolbar from './components/collaboration/CollaborationToolbar';
import DisplayNameCollector from './components/collaboration/DisplayNameCollector';
import CollaborationErrorBoundary from './components/collaboration/CollaborationErrorBoundary';
import MitigationSyncConnector from './components/collaboration/MitigationSyncConnector';
import ComprehensiveSyncConnector from './components/collaboration/ComprehensiveSyncConnector';
import SyncTestPanel from './components/debug/SyncTestPanel';

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
import useOptimizedRealTimeSync from './hooks/useOptimizedRealTimeSync';
import { useEnhancedRealTimeCollaboration } from './hooks/useRealTimeStateBridge';

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
    setSelectedJobs,
    importJobs
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
    assignTankPosition,
    clearTankPosition
  } = useTankPositionContext();

  // Authentication state
  const { user } = useAuth();

  // Error handling and loading state
  const { urlError, isLoading, hasError, canEdit, canSelectBossActions, isReadOnly } = useReadOnly();
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
    // This will trigger the DisplayNameCollector component
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
  const [shouldSyncAssignments, setShouldSyncAssignments] = useState(false);
  const [showSyncTestPanel, setShowSyncTestPanel] = useState(false);

  // Use custom hook for device detection
  const isMobile = useDeviceDetection();

  // Collaboration hooks
  const planId = (() => {
    // Support both UUID format (36 chars) and Firestore ID format (20 chars)
    const pathMatch = window.location.pathname.match(/^\/plan\/(?:shared\/)?([a-zA-Z0-9-_]{20,36})$/i);
    return pathMatch ? pathMatch[1] : null;
  })();

  const isSharedPlan = window.location.pathname.includes('/plan/shared/');

  // Comprehensive real-time sync for shared plans
  const comprehensiveSync = useComprehensiveRealtimeSync(planId, {
    autoConnect: isSharedPlan,
    enableDebugLogging: process.env.NODE_ENV === 'development',
    onPlanUpdate: (updateData) => {
      console.log('%c[APP] Received plan update from comprehensive sync', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;', updateData);

      // Apply updates to local state based on changed fields
      if (updateData.changedFields.includes('bossId') && updateData.planData.bossId !== currentBossId) {
        setCurrentBossId(updateData.planData.bossId);
      }

      if (updateData.changedFields.includes('selectedJobs') && JSON.stringify(updateData.planData.selectedJobs) !== JSON.stringify(selectedJobs)) {
        setSelectedJobs(updateData.planData.selectedJobs);
      }

      if (updateData.changedFields.includes('tankPositions')) {
        enhancedSetTankPositions(updateData.planData.tankPositions);
      }

      if (updateData.changedFields.includes('assignments') && JSON.stringify(updateData.planData.assignments) !== JSON.stringify(assignments)) {
        importAssignments(updateData.planData.assignments);
      }
    },
    onSyncError: (error) => {
      console.error('%c[APP] Comprehensive sync error', 'background: #f44336; color: white; padding: 2px 5px; border-radius: 3px;', error);
    }
  });

  // Optimized real-time sync for all collaboration features
  const {
    syncMitigationAssignments: immediateSyncMitigationAssignments,
    syncJobSelections: immediateSyncJobSelections,
    syncBossSelection: immediateSyncBossSelection,
    syncTankPositions: immediateSyncTankPositions,
    syncFilterSettings,
    isActive: isSyncActive
  } = useOptimizedRealTimeSync(planId, isSharedPlan);

  // Enhanced real-time collaboration with state bridge
  const enhancedCollaboration = useEnhancedRealTimeCollaboration(planId, {
    autoSetupListeners: isSharedPlan,
    enableStateBridge: isSharedPlan
  });

  // Enhanced setters with comprehensive real-time sync
  const enhancedSetCurrentBossId = useCallback(async (bossId) => {
    setCurrentBossId(bossId);

    // Sync with comprehensive sync service for shared plans
    if (comprehensiveSync.shouldSync && bossId) {
      try {
        await comprehensiveSync.syncBossSelection(bossId);
      } catch (error) {
        console.error('Failed to sync boss selection:', error);

        // Fallback to legacy sync if comprehensive sync fails
        if (isSyncActive) {
          try {
            await immediateSyncBossSelection(bossId);
          } catch (fallbackError) {
            console.error('Fallback sync also failed:', fallbackError);
          }
        }
      }
    }
  }, [setCurrentBossId, comprehensiveSync, isSyncActive, immediateSyncBossSelection]);

  const enhancedSetSelectedJobs = useCallback(async (jobs) => {
    setSelectedJobs(jobs);

    // Sync with comprehensive sync service for shared plans
    if (comprehensiveSync.shouldSync && jobs) {
      try {
        await comprehensiveSync.syncJobSelections(jobs);
      } catch (error) {
        console.error('Failed to sync job selections:', error);

        // Fallback to legacy sync if comprehensive sync fails
        if (isSyncActive) {
          try {
            await immediateSyncJobSelections(jobs);
          } catch (fallbackError) {
            console.error('Fallback sync also failed:', fallbackError);
          }
        }
      }
    }
  }, [setSelectedJobs, comprehensiveSync, isSyncActive, immediateSyncJobSelections]);

  // Enhanced tank position setter for Plan State Application Service
  const enhancedSetTankPositions = useCallback(async (tankPositionsData) => {
    console.log('%c[APP] Setting tank positions from collaborative state', 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 3px;', tankPositionsData);

    try {
      // Clear existing positions first
      clearTankPosition('mainTank');
      clearTankPosition('offTank');

      // Apply new positions if provided
      if (tankPositionsData) {
        if (tankPositionsData.mainTank) {
          assignTankPosition(tankPositionsData.mainTank, 'mainTank');
        }
        if (tankPositionsData.offTank) {
          assignTankPosition(tankPositionsData.offTank, 'offTank');
        }
      }
    } catch (error) {
      console.error('Failed to set tank positions:', error);
    }
  }, [assignTankPosition, clearTankPosition]);

  // Enhanced tank position assignment with sync
  const enhancedAssignTankPosition = useCallback(async (jobId, position) => {
    assignTankPosition(jobId, position);

    // Sync tank positions if comprehensive sync is active
    if (comprehensiveSync.shouldSync) {
      try {
        const newTankPositions = {
          ...tankPositions,
          [position]: jobId
        };
        await comprehensiveSync.syncTankPositions(newTankPositions);
      } catch (error) {
        console.error('Failed to sync tank position assignment:', error);

        // Fallback to legacy sync if comprehensive sync fails
        if (isSyncActive) {
          try {
            await immediateSyncTankPositions(newTankPositions);
          } catch (fallbackError) {
            console.error('Fallback tank position sync also failed:', fallbackError);
          }
        }
      }
    }
  }, [assignTankPosition, tankPositions, comprehensiveSync, isSyncActive, immediateSyncTankPositions]);

  const enhancedImportAssignments = useCallback(async (newAssignments) => {
    importAssignments(newAssignments);

    // Sync with comprehensive sync service for shared plans
    if (comprehensiveSync.shouldSync && newAssignments) {
      try {
        await comprehensiveSync.syncAssignments(newAssignments);
      } catch (error) {
        console.error('Failed to sync mitigation assignments:', error);

        // Fallback to legacy sync if comprehensive sync fails
        if (isSyncActive) {
          try {
            await immediateSyncMitigationAssignments(newAssignments);
          } catch (fallbackError) {
            console.error('Fallback sync also failed:', fallbackError);
          }
        }
      }
    }
  }, [importAssignments, comprehensiveSync, isSyncActive, immediateSyncMitigationAssignments]);

  // Enhanced boss action selection with read-only check
  const enhancedToggleBossActionSelection = useCallback(async (action) => {
    // Check if user has permission to select boss actions
    if (!canSelectBossActions) {
      console.log('%c[BOSS SELECTION] Boss action selection disabled in read-only mode', 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;', {
        isReadOnly,
        canSelectBossActions,
        canEdit,
        action: action.name
      });
      return;
    }

    toggleBossActionSelection(action);
  }, [toggleBossActionSelection, canSelectBossActions, isReadOnly, canEdit]);

  // Enhanced filter toggle with real-time sync
  const enhancedToggleFilterMode = useCallback(async () => {
    const newFilterSettings = { showAllMitigations: !showAllMitigations };

    // Sync filter settings if optimized sync is active
    if (isOptimizedSyncActive) {
      try {
        await syncFilterSettings(newFilterSettings);
      } catch (error) {
        console.error('Failed to sync filter settings:', error);
      }
    }
  }, [showAllMitigations, isOptimizedSyncActive, syncFilterSettings]);

  // Effect to sync assignments when they change
  useEffect(() => {
    if (!shouldSyncAssignments || !isSyncActive) return;

    const syncAssignments = async () => {
      try {
        console.log('%c[COLLABORATION] Syncing assignments after change', 'background: #2196F3; color: white; padding: 2px 5px; border-radius: 3px;', {
          assignmentCount: Object.keys(assignments).length,
          assignments
        });

        await immediateSyncMitigationAssignments(assignments);
        setShouldSyncAssignments(false); // Reset the flag
      } catch (error) {
        console.error('Failed to sync assignments:', error);
        setShouldSyncAssignments(false); // Reset the flag even on error
      }
    };

    syncAssignments();
  }, [shouldSyncAssignments, isSyncActive, assignments, immediateSyncMitigationAssignments]);



  // Enhanced addMitigation with real-time sync
  const enhancedAddMitigation = useCallback((bossActionId, mitigation, tankPosition = null) => {
    // Add mitigation locally first
    const result = addMitigation(bossActionId, mitigation, tankPosition);

    // Mark that we need to sync assignments after this change
    if (isSyncActive && result && result.success) {
      // Set a flag to trigger sync in the useEffect
      setShouldSyncAssignments(true);
    }

    return result;
  }, [addMitigation, isSyncActive]);

  // Enhanced removeMitigation with real-time sync
  const enhancedRemoveMitigation = useCallback((bossActionId, mitigationId) => {
    // Remove mitigation locally first
    const result = removeMitigation(bossActionId, mitigationId);

    // Mark that we need to sync assignments after this change
    if (isSyncActive && result) {
      // Set a flag to trigger sync in the useEffect
      setShouldSyncAssignments(true);
    }

    return result;
  }, [removeMitigation, isSyncActive]);

  // Custom hooks
  const { handleDragStart, handleDragEnd } = useDragAndDrop({
    setActiveMitigation,
    checkAbilityCooldown,
    addMitigation: enhancedAddMitigation,
    addPendingAssignment,
    canAssignMitigationToBossAction,
    setPendingAssignments,
    tankPositions
  });

  const { handleBossActionClick } = useMobileInteraction({
    checkAbilityCooldown,
    addMitigation: enhancedAddMitigation,
    addPendingAssignment,
    canAssignMitigationToBossAction,
    setPendingAssignments,
    sortedBossActions,
    assignments
  });

  // Simplified callback registration - no longer needed with optimized sync
  useEffect(() => {
    // Callbacks are now handled directly by the optimized sync hooks
    console.log('App callbacks registered with optimized sync system');
  }, [enhancedImportAssignments, enhancedSetCurrentBossId, enhancedSetSelectedJobs, importJobs, enhancedSetTankPositions]);

  // Handle real-time collaboration for shared plans
  // Removed live plan data dependency to prevent infinite re-renders
  const {
    roomUsers,
    currentUserId,
    isConnected,
    connectionError,
    isCollaborating,
    currentPlanId,
    userId: collaborationUserId
  } = useCollaboration();

  // Handle URL parameters
  useEnhancedUrlHandler({
    importAssignments: enhancedImportAssignments,
    setCurrentBossId: enhancedSetCurrentBossId,
    setSelectedJobs: enhancedSetSelectedJobs,
    importJobs,
    currentBossId,
    userId: user?.uid || currentUserId || collaborationUserId
  });

  // Determine if CollaborationToolbar should be shown
  const getCollaborationStatus = () => {
    if (!isConnected) return 'disconnected';
    if (connectionError) return 'disconnected';
    if (isCollaborating && currentPlanId === planId) return 'connected';
    return 'disconnected';
  };

  const collaborationStatus = getCollaborationStatus();
  const shouldShowCollaborationToolbar = isSharedPlan && !(collaborationStatus === 'disconnected');

  // Handle incoming collaborative updates
  useEffect(() => {
    if (!isSyncActive) return;

    const handleCollaborativePlanUpdate = (event) => {
      const { planId: eventPlanId, updateType, changedFields, data, updatedBy, isExternalChange } = event.detail;

      // Enhanced feedback loop prevention
      if (eventPlanId !== planId) {
        console.log('%c[APP] Ignoring update for different plan', 'background: #666; color: white; padding: 2px 5px; border-radius: 3px;', {
          eventPlanId,
          currentPlanId: planId
        });
        return;
      }

      if (updatedBy === collaborationUserId) {
        console.log('%c[APP] Ignoring own update to prevent feedback loop', 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;', {
          updatedBy,
          currentUser: collaborationUserId,
          updateType
        });
        return;
      }

      // Additional check for external change flag
      if (!isExternalChange) {
        console.log('%c[APP] Ignoring non-external change', 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;', {
          updateType,
          isExternalChange
        });
        return;
      }

      console.log('%c[APP] Processing external collaborative update', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;', {
        updateType,
        changedFields,
        updatedBy,
        currentUser: collaborationUserId,
        isExternalChange,
        data
      });

      // Apply updates based on type
      switch (updateType) {
        case 'mitigation_assignment':
          if (data.assignments) {
            importAssignments(data.assignments);
          }
          break;
        case 'job_selection':
          if (data.selectedJobs) {
            setSelectedJobs(data.selectedJobs);
          }
          break;
        case 'boss_selection':
          if (data.bossId) {
            setCurrentBossId(data.bossId);
          }
          break;
        case 'tank_positions':
          if (data.tankPositions) {
            // Handle tank position updates if needed
            console.log('Tank positions updated:', data.tankPositions);
          }
          break;
        case 'plan_update':
        case 'plan_state_update':
          // Handle unified plan state updates - apply all changes at once
          console.log('%c[APP] Processing unified plan state update', 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 3px;', {
            changedFields,
            data
          });

          // Only update fields that actually changed for better performance
          if (changedFields.includes('assignments') && data.assignments) {
            importAssignments(data.assignments);
          }
          if (changedFields.includes('selectedJobs') && data.selectedJobs) {
            setSelectedJobs(data.selectedJobs);
          }
          if (changedFields.includes('bossId') && data.bossId) {
            setCurrentBossId(data.bossId);
          }
          if (changedFields.includes('tankPositions') && data.tankPositions) {
            console.log('Tank positions updated via plan state:', data.tankPositions);
          }
          if (changedFields.includes('filterSettings') && data.filterSettings) {
            // Handle filter settings updates
            console.log('Filter settings updated via plan state:', data.filterSettings);
            // Note: We would need to update the FilterContext here if it supports external updates
          }
          break;
        default:
          console.log('Unknown update type:', updateType);
      }
    };



    const handleConflictNotification = (event) => {
      const { planId: eventPlanId, dataType, userId, message } = event.detail;

      if (eventPlanId !== planId) return;

      console.warn('%c[APP] Collaboration conflict detected', 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;', {
        dataType,
        userId,
        message
      });

      // Could show a user-friendly notification here
    };

    // Add event listeners
    window.addEventListener('collaborativePlanUpdate', handleCollaborativePlanUpdate);
    window.addEventListener('collaborationConflict', handleConflictNotification);

    return () => {
      window.removeEventListener('collaborativePlanUpdate', handleCollaborativePlanUpdate);
      window.removeEventListener('collaborationConflict', handleConflictNotification);
    };
  }, [isSyncActive, planId, collaborationUserId, importAssignments, setSelectedJobs, setCurrentBossId]);

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

  // Add keyboard handler for Escape key and debug panel
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && selectedBossAction) {
        clearSelectedBossAction();
      }
      // Toggle sync test panel with Ctrl+Shift+T (development only)
      if (e.ctrlKey && e.shiftKey && e.key === 'T' && process.env.NODE_ENV === 'development') {
        setShowSyncTestPanel(prev => !prev);
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

  // Memoized handler for boss action click with selection tracking
  const memoizedHandleBossActionClick = useCallback(async (action) => {
    handleBossActionClick(
      action,
      isMobile,
      enhancedToggleBossActionSelection
    );


  }, [handleBossActionClick, isMobile, enhancedToggleBossActionSelection]);

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
            canSelect={canSelectBossActions}
            isReadOnly={isReadOnly}
            data-element-id={`boss-action-${action.id}`}
            data-element-type="boss-action"
          >
            <AssignedMitigations
              action={action}
              assignments={assignments}
              getActiveMitigations={getActiveMitigations}
              selectedJobs={selectedJobs}
              currentBossLevel={currentBossLevel}
              isMobile={isMobile}
              onRemoveMitigation={enhancedRemoveMitigation}
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
    enhancedRemoveMitigation,
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
              data-element-id={`mitigation-${mitigation.id}`}
              data-element-type="mitigation-item"

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

  return (
    <>
      <GlobalStyle />

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
                {/* Collaboration Toolbar for shared plans - only show when connected */}
                {shouldShowCollaborationToolbar && (
                  <CollaborationErrorBoundary>
                    <CollaborationToolbar
                      planId={planId}
                      showSessionControls={true}
                      showUserPresence={true}
                    />
                  </CollaborationErrorBoundary>
                )}
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



          {/* Display name collection for unauthenticated users */}
          {isSharedPlan && (
            <CollaborationErrorBoundary>
              <DisplayNameCollector
                planId={planId}
                planTitle={`Boss Timeline & Mitigation Plan`}
              />
            </CollaborationErrorBoundary>
          )}

          <BossSelector
            selectedBossId={currentBossId}
            onSelectBoss={enhancedSetCurrentBossId}
          />

          <JobSelector
            key={`job-selector-${JSON.stringify(selectedJobs)}`}
            onJobsChange={enhancedSetSelectedJobs}
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

            {/* Connect comprehensive real-time sync to MitigationContext for shared plans */}
            {isSharedPlan && (
              <ComprehensiveSyncConnector
                planId={planId}
                enabled={comprehensiveSync.shouldSync}
              />
            )}

            {/* Legacy sync connector for backward compatibility */}
            {isSharedPlan && isSyncActive && !comprehensiveSync.shouldSync && (
              <MitigationSyncConnector
                realTimeSyncFunctions={{
                  syncMitigationAssignments: immediateSyncMitigationAssignments
                }}
              />
            )}

          <EnhancedImportExport
            assignments={assignments}
            bossId={currentBossId}
            selectedJobs={selectedJobs}
            onImport={(importedAssignments, importedBossId, importedSelectedJobs) => {
              // Apply changes to contexts - let each context handle its own localStorage
              if (importedAssignments) {
                enhancedImportAssignments(importedAssignments);
              }

              if (importedBossId && importedBossId !== currentBossId) {
                enhancedSetCurrentBossId(importedBossId);
              }

              if (importedSelectedJobs) {
                enhancedSetSelectedJobs(importedSelectedJobs);
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

      {/* Sync Test Panel (Development Only) */}
      {showSyncTestPanel && process.env.NODE_ENV === 'development' && (
        <SyncTestPanel onClose={() => setShowSyncTestPanel(false)} />
      )}
    </>
  );
}

export default App;