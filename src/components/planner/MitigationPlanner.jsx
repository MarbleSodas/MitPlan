import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { DndContext, DragOverlay, closestCenter } from '@dnd-kit/core';
import { usePlan } from '../../contexts/PlanContext';
import { useAuth } from '../../contexts/AuthContext';
import { useCollaboration } from '../../contexts/CollaborationContext';
import { RealtimePlanProvider } from '../../contexts/RealtimePlanContext';
import AppProvider from '../../contexts/AppProvider';
import { useDeviceDetection } from '../../hooks';
import { determineMitigationAssignment } from '../../utils/mitigation/autoAssignmentUtils';
import CollaboratorsList from '../Collaboration/CollaboratorsList';
import ActiveUsersDisplay from '../Collaboration/ActiveUsersDisplay';
import KofiButton from '../Common/KofiButton/KofiButton';
import DiscordButton from '../Common/DiscordButton/DiscordButton';
import ThemeToggle from '../Common/ThemeToggle';
import Footer from '../layout/Footer';


// Import planning components
import JobSelector from '../../features/jobs/JobSelector/JobSelector';
import BossSelector from '../../features/bosses/BossSelector/BossSelector';
import BossActionItem from '../BossActionItem/BossActionItem';
import MitigationItem from '../MitigationItem/MitigationItem';
import AssignedMitigations from '../AssignedMitigations/AssignedMitigations';
import MobileMitigationSelector from '../Mobile/MobileMitigationSelector';
import FilterToggle from '../Common/FilterToggle';
import TankSelectionModal from '../Common/TankSelectionModal';
import TankPositionSelector from '../TankPositionSelector/TankPositionSelector';
import Draggable from '../DragAndDrop/Draggable';
import Droppable from '../DragAndDrop/Droppable';

// Import styled layout components
import MainContent from '../Styled/MainContent';
import TimelineContainer from '../Styled/TimelineContainer';
import MitigationContainer from '../Styled/MitigationContainer';
import BossActionsList from '../Styled/BossActionsList';
import MitigationList from '../Styled/MitigationList';

// Import contexts
import {
  useFilterContext,
  useTankPositionContext,
  useTankSelectionModalContext
} from '../../contexts';

// Import real-time contexts
import { useRealtimePlan } from '../../contexts/RealtimePlanContext';
import { useRealtimeBossContext } from '../../contexts/RealtimeBossContext';
import { useRealtimeJobContext } from '../../contexts/RealtimeJobContext';
import { useEnhancedMitigation } from '../../contexts/EnhancedMitigationContext';
import RealtimeAppProvider from '../../contexts/RealtimeAppProvider';

// Import utilities
import { mitigationAbilities } from '../../data';
import { isMitigationAvailable, getAvailableAbilities } from '../../utils';
import { useAutoAssignment } from '../../hooks/useAutoAssignment';

const PlannerContainer = styled.div`
  min-height: 100vh;
  background: ${props => props.theme?.colors?.background || '#f5f5f5'};
  padding: 2rem;

  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid ${props => props.theme?.colors?.border || '#dddddd'};

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
`;

const Title = styled.h1`
  color: ${props => props.theme?.colors?.text || '#333333'};
  font-size: 2rem;
  font-weight: 600;
  margin: 0;

  @media (max-width: 768px) {
    font-size: 1.5rem;
    text-align: center;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;

  @media (max-width: 768px) {
    flex-direction: column;
    width: 100%;
    gap: 0.75rem;
  }
`;

const BackButton = styled.button`
  padding: 0.75rem 1.5rem;
  background: transparent;
  color: ${props => props.theme?.colors?.primary || '#3399ff'};
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.theme?.colors?.primary || '#3399ff'};
    color: white;
  }
`;

const SaveButton = styled.button`
  padding: 0.75rem 1.5rem;
  background: ${props => props.theme?.colors?.primary || '#3399ff'};
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s ease;

  &:hover {
    background: ${props => props.theme?.colors?.primaryDark || '#2980b9'};
  }

  &:disabled {
    background: ${props => props.theme?.colors?.disabled || '#9ca3af'};
    cursor: not-allowed;
  }
`;

const SelectorsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1rem;
`;

const ControlsContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 2rem;
  padding: 1rem;
  background: ${props => props.theme?.colors?.cardBackground || '#ffffff'};
  border-radius: 8px;
  border: 1px solid ${props => props.theme?.colors?.border || '#dddddd'};

  @media (max-width: 768px) {
    padding: 0.75rem;
  }
`;

const LoadingMessage = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  font-size: 1.1rem;
  color: ${props => props.theme?.colors?.textSecondary || '#6b7280'};
`;

const ErrorMessage = styled.div`
  background: ${props => props.theme?.colors?.errorBackground || '#fef2f2'};
  border: 1px solid ${props => props.theme?.colors?.errorBorder || '#fecaca'};
  color: ${props => props.theme?.colors?.error || '#ef4444'};
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 2rem;
`;

const ReadOnlyBanner = styled.div`
  background: ${props => props.theme?.colors?.warning || '#fff3cd'};
  color: ${props => props.theme?.colors?.warningText || '#856404'};
  padding: 0.75rem 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  border: 1px solid ${props => props.theme?.colors?.warningBorder || '#ffeaa7'};
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;

  button {
    background: ${props => props.theme?.colors?.primary || '#3399ff'};
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s ease;

    &:hover {
      background: ${props => props.theme?.colors?.primaryHover || '#2980ff'};
    }
  }
`;

// Planning interface component that gets data from real-time contexts
const PlanningInterface = ({ onSave, saving }) => {
  const { isMobile } = useDeviceDetection();

  // Get real-time plan data
  const { realtimePlan, loading, error } = useRealtimePlan();

  // Get real-time contexts - ALWAYS call all hooks before any early returns
  const { currentBossId, setCurrentBossId, sortedBossActions, selectedBossAction, toggleBossActionSelection, currentBossLevel } = useRealtimeBossContext();
  const { selectedJobs, toggleJobSelection } = useRealtimeJobContext();
  const {
    assignments,
    addMitigation,
    removeMitigation,
    checkAbilityAvailability,
    getActiveMitigations,
    pendingAssignments,
    isInitialized
  } = useEnhancedMitigation();
  const { showAllMitigations, filterMitigations } = useFilterContext();
  const { tankPositions } = useTankPositionContext();
  const { openTankSelectionModal } = useTankSelectionModalContext();
  const { triggerAutoAssignment, canAutoAssign } = useAutoAssignment(currentBossLevel);

  // Local state for drag and drop
  const [activeMitigation, setActiveMitigation] = useState(null);

  // Enhanced boss action selection with disabled auto-assignment
  const handleBossActionSelection = useCallback((action) => {
    const wasSelected = selectedBossAction?.id === action.id;
    const isBeingSelected = !wasSelected;

    // First, toggle the selection
    toggleBossActionSelection(action);

    // Disable auto-assignment for now to prevent interference with manual assignment
    // Users can manually assign mitigations without auto-assignment interference
    console.log('[MitigationPlanner] Boss action selected:', {
      actionId: action.id,
      actionName: action.name,
      isBeingSelected,
      autoAssignmentDisabled: true
    });

    // TODO: Re-enable auto-assignment with proper user preference controls
    // if (isBeingSelected && action.isTankBuster) {
    //   // Auto-assignment logic would go here
    // }
  }, [toggleBossActionSelection, selectedBossAction]);

  // Get available mitigations based on selected jobs and boss level - MUST be called before early returns
  const availableMitigations = useMemo(() => {
    return getAvailableAbilities(mitigationAbilities, selectedJobs, currentBossLevel);
  }, [selectedJobs, currentBossLevel]);

  // Filter mitigations based on selected boss action and filter settings - MUST be called before early returns
  const filteredMitigations = useMemo(() => {
    if (!selectedBossAction) return availableMitigations;

    return filterMitigations(availableMitigations, selectedBossAction);
  }, [availableMitigations, selectedBossAction, filterMitigations]);

  // Drag and drop handlers - MUST be called before early returns
  const handleDragStart = useCallback((event) => {
    const { active } = event;
    const mitigation = availableMitigations.find(m => m.id === active.id);
    if (mitigation) {
      setActiveMitigation(mitigation);
    }
  }, [availableMitigations, setActiveMitigation]);

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;

    if (!over) {
      setActiveMitigation(null);
      return;
    }

    // Find the target boss action from the drop target ID
    const targetBossAction = sortedBossActions?.find(action => action.id === over.id);

    if (!targetBossAction) {
      setActiveMitigation(null);
      return;
    }

    // Temporarily disable selection validation to test tank selection modal
    // TODO: Re-enable this validation after fixing the selection state issue
    /*
    if (!selectedBossAction || selectedBossAction.id !== targetBossAction.id) {
      console.log('[MitigationPlanner] Drop rejected - boss action not selected:', {
        targetActionId: targetBossAction.id,
        targetActionName: targetBossAction.name,
        selectedActionId: selectedBossAction?.id,
        selectedActionName: selectedBossAction?.name
      });
      setActiveMitigation(null);
      return;
    }
    */

    const mitigation = availableMitigations.find(m => m.id === active.id);
    if (!mitigation) {
      setActiveMitigation(null);
      return;
    }

    // Check if this mitigation requires tank selection using the unified assignment function
    const assignmentDecision = determineMitigationAssignment(mitigation, targetBossAction, tankPositions, selectedJobs);

    console.log('[MitigationPlanner] Mitigation assignment decision:', {
      mitigationName: mitigation.name,
      mitigationType: mitigation.target,
      bossActionName: targetBossAction.name,
      decision: assignmentDecision
    });

    if (assignmentDecision.shouldShowModal) {
      console.log('[MitigationPlanner] Opening tank selection modal for tank-specific mitigation');

      // Use the tank selection modal context (which includes auto-assignment logic)
      openTankSelectionModal(mitigation.name, (selectedTankPosition) => {
        console.log('[MitigationPlanner] Tank selected in modal:', {
          mitigationName: mitigation.name,
          selectedTankPosition,
          bossActionId: targetBossAction.id
        });
        // Assign the mitigation with the selected tank position
        addMitigation(targetBossAction.id, mitigation, selectedTankPosition);
      }, mitigation, targetBossAction);
      setActiveMitigation(null);
      return;
    } else if (assignmentDecision.assignment) {
      console.log('[MitigationPlanner] Auto-assigning based on decision:', assignmentDecision.assignment);
      // Auto-assign based on the decision
      addMitigation(targetBossAction.id, mitigation, assignmentDecision.assignment.targetPosition);
      setActiveMitigation(null);
      return;
    }

    // Check if mitigation can be assigned using enhanced cooldown system
    const availability = checkAbilityAvailability(
      mitigation.id,
      targetBossAction.time,
      targetBossAction.id,
      { isBeingAssigned: true }
    );

    if (availability.canAssign()) {
      // Use the enhanced addMitigation with real-time sync
      addMitigation(targetBossAction.id, mitigation);
    }

    setActiveMitigation(null);
  }, [sortedBossActions, availableMitigations, setActiveMitigation, addMitigation, checkAbilityAvailability, openTankSelectionModal]);



  // Show loading state while data is being loaded (AFTER all hooks are called)
  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div>Loading plan data...</div>
      </div>
    );
  }

  // Show error state if there's an error (AFTER all hooks are called)
  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'red' }}>
        <div>Error loading plan: {error}</div>
        {error.includes('permission') && (
          <div style={{ marginTop: '1rem', fontSize: '0.9em', color: '#666' }}>
            This plan may be private or you may not have access to it.
          </div>
        )}
      </div>
    );
  }

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SelectorsContainer>
        <BossSelector
          selectedBossId={currentBossId}
          onSelectBoss={setCurrentBossId}
          disabled={false}
        />
        <JobSelector
          disabled={false}
        />
        <TankPositionSelector />
      </SelectorsContainer>

      <ControlsContainer>
        <FilterToggle />
      </ControlsContainer>

      <MainContent>
        <TimelineContainer>
          <BossActionsList>
            {sortedBossActions.map(action => {
              const isSelected = selectedBossAction?.id === action.id;
              return (
                <Droppable
                  key={action.id}
                  id={action.id}
                  data={{ type: 'bossAction', action }}
                  disableDrop={!isSelected}
                  isSelected={isSelected}
                >
                <BossActionItem
                  action={action}
                  isSelected={selectedBossAction?.id === action.id}
                  assignments={assignments}
                  getActiveMitigations={getActiveMitigations}
                  selectedJobs={selectedJobs}
                  currentBossLevel={currentBossLevel}
                  onClick={() => handleBossActionSelection(action)}
                >
                  <AssignedMitigations
                    action={action}
                    assignments={assignments}
                    getActiveMitigations={getActiveMitigations}
                    selectedJobs={selectedJobs}
                    currentBossLevel={currentBossLevel}
                    isMobile={isMobile}
                    onRemoveMitigation={removeMitigation}
                  />
                </BossActionItem>
              </Droppable>
              );
            })}
          </BossActionsList>
        </TimelineContainer>

        {!isMobile && (
          <MitigationContainer>
            <MitigationList>
              {filteredMitigations.map(mitigation => {
                // Use enhanced cooldown checking
                const availability = selectedBossAction ? checkAbilityAvailability(
                  mitigation.id,
                  selectedBossAction.time,
                  selectedBossAction.id,
                  { isBeingAssigned: false }
                ) : { isAvailable: true, canAssign: () => true };

                const isDisabled = !availability.canAssign();
                const cooldownReason = availability.getUnavailabilityReason ? availability.getUnavailabilityReason() : null;

                return (
                  <Draggable
                    key={mitigation.id}
                    id={mitigation.id}
                    data={{ type: 'mitigation', mitigation }}
                    isDisabled={isDisabled}
                    cooldownReason={cooldownReason}
                  >
                    <MitigationItem
                      mitigation={mitigation}
                      isDisabled={isDisabled}
                      cooldownReason={cooldownReason}
                      currentBossLevel={currentBossLevel}
                      selectedBossAction={selectedBossAction}
                      selectedJobs={selectedJobs}
                      checkAbilityAvailability={checkAbilityAvailability}
                      pendingAssignments={pendingAssignments}
                    />
                  </Draggable>
                );
              })}
            </MitigationList>
          </MitigationContainer>
        )}
      </MainContent>

      {isMobile && selectedBossAction && (
        <MobileMitigationSelector
          mitigations={filteredMitigations}
          bossAction={selectedBossAction}
          assignments={assignments}
          onAssignMitigation={addMitigation}
          onRemoveMitigation={removeMitigation}
          checkAbilityAvailability={checkAbilityAvailability}
          bossLevel={currentBossLevel}
          selectedJobs={selectedJobs}
        />
      )}

      <DragOverlay>
        {activeMitigation && (
          <MitigationItem
            mitigation={activeMitigation}
            isDisabled={false}
            cooldownReason={null}
            currentBossLevel={currentBossLevel}
            selectedJobs={selectedJobs}
            checkAbilityAvailability={checkAbilityAvailability}
            pendingAssignments={pendingAssignments}
            isDragging={true}
          />
        )}
      </DragOverlay>

      <TankSelectionModal />
    </DndContext>
  );
};

const MitigationPlanner = ({ onNavigateBack, planId: propPlanId, isSharedPlan = false, isAnonymous = false }) => {
  const { planId: routePlanId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, isAnonymousMode, anonymousUser, enableAnonymousMode } = useAuth();
  // Remove collaboration context usage from here - it will be moved to MitigationPlannerContent

  const [saving, setSaving] = useState(false);
  const [planIsPublic, setPlanIsPublic] = useState(false);

  // Use route param if available, otherwise fall back to prop (for backward compatibility)
  const planId = routePlanId || propPlanId;

  // Determine if this is a shared plan (either from prop or if plan is public)
  const isActuallySharedPlan = isSharedPlan || planIsPublic;

  // Determine if this is an anonymous session
  const isAnonymousSession = isAnonymous || (!isAuthenticated && isAnonymousMode);

  console.log('[MitigationPlanner] Rendering with planId:', planId);

  // Initialize anonymous mode if needed
  useEffect(() => {
    if (isAnonymous && !isAuthenticated && !isAnonymousMode) {
      enableAnonymousMode();
    }
  }, [isAnonymous, isAuthenticated, isAnonymousMode, enableAnonymousMode]);

  // Set plan public status based on isSharedPlan prop
  useEffect(() => {
    // If this is explicitly marked as a shared plan, treat it as public
    // Otherwise, assume it's private (no need to check permissions)
    setPlanIsPublic(isSharedPlan);
  }, [isSharedPlan]);

  // Access tracking is now handled in RealtimePlanContext

  // Collaboration logic moved to MitigationPlannerContent

  const handleBack = () => {
    if (onNavigateBack) {
      onNavigateBack();
    } else if (isActuallySharedPlan) {
      // For shared plans, go to landing page
      navigate('/');
    } else {
      navigate('/dashboard');
    }
  };

  const handleSave = async () => {
    // Real-time plans are automatically saved, so this is just for user feedback
    setSaving(true);
    try {
      // Simulate save delay for user feedback
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('Real-time plan is automatically saved');
      // Show success toast (if toast system is available)
      if (typeof addToast === 'function') {
        addToast({
          type: 'success',
          title: 'Plan saved!',
          message: 'Your plan has been saved successfully.',
          duration: 3000
        });
      } else {
        alert('Plan saved successfully!');
      }
    } catch (error) {
      console.error('Error with save operation:', error);
      // Show error toast (if toast system is available)
      if (typeof addToast === 'function') {
        addToast({
          type: 'error',
          title: 'Save failed',
          message: 'Failed to save plan. Please try again.',
          duration: 4000
        });
      } else {
        alert('Failed to save plan. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  // Loading and error handling is now done inside the RealtimeAppProvider

  return (
    <RealtimeAppProvider planId={planId}>
      <MitigationPlannerContent
        planId={planId}
        isSharedPlan={isActuallySharedPlan}
        isAnonymousSession={isAnonymousSession}
        isAuthenticated={isAuthenticated}
        handleBack={handleBack}
        handleSave={handleSave}
        saving={saving}
      />
    </RealtimeAppProvider>
  );
};

// Content component that has access to real-time contexts
const MitigationPlannerContent = ({
  planId,
  isSharedPlan,
  isAnonymousSession,
  isAuthenticated,
  handleBack,
  handleSave,
  saving
}) => {
  const { realtimePlan, error } = useRealtimePlan();

  // Use collaboration hook
  const {
    joinCollaborativeSession,
    leaveCollaborativeSession,
    collaborators,
    isCollaborating,
    sessionId,
    displayName,
    isInitialized: collaborationInitialized
  } = useCollaboration();

  // No longer need display name modal for anonymous users

  // Handle collaboration setup for all plans (not just shared plans)
  useEffect(() => {
    if (planId && collaborationInitialized) {
      // Check if collaboration functions are available
      if (typeof joinCollaborativeSession !== 'function') {
        console.error('[MitigationPlannerContent] joinCollaborativeSession is not a function');
        return;
      }

      // Setting up collaboration for plan editing

      // Join collaborative session - anonymous users now have auto-generated display names
      console.log('[MitigationPlannerContent] Joining collaboration session with display name:', displayName);
      joinCollaborativeSession(planId, displayName);

      // Universal access enabled - no read-only restrictions
    }

    // Cleanup on unmount or plan change
    return () => {
      if (isCollaborating && typeof leaveCollaborativeSession === 'function') {
        leaveCollaborativeSession();
      }
    };
  }, [
    planId,
    isAuthenticated,
    displayName,
    collaborationInitialized,
    joinCollaborativeSession,
    leaveCollaborativeSession,
    isCollaborating
  ]);

  // No longer need display name handlers for anonymous users

  return (
    <>
      <PlannerContainer>
      <Header>
        <Title>
          {realtimePlan ? `${isSharedPlan ? 'Shared Plan: ' : ''}${realtimePlan.name}` : 'Mitigation Planner'}
        </Title>
        <ButtonGroup>
          {isCollaborating && (
            <CollaboratorsList
              collaborators={collaborators}
              currentSessionId={sessionId}
              isReadOnly={false}
            />
          )}
          <KofiButton />
          <DiscordButton />
          <ThemeToggle />
          <SaveButton onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Plan'}
          </SaveButton>
          <BackButton onClick={handleBack}>
            {isSharedPlan ? 'Back to Home' : 'Back to Dashboard'}
          </BackButton>
        </ButtonGroup>
      </Header>

      {error && (
        <ErrorMessage>
          Error: {error}
        </ErrorMessage>
      )}

      {/* Universal access enabled - no read-only restrictions */}

      {isCollaborating && collaborators.length > 0 && (
        <ActiveUsersDisplay
          collaborators={collaborators}
          currentSessionId={sessionId}
          maxDisplayUsers={8}
        />
      )}



      <PlanningInterface
        onSave={handleSave}
        saving={saving}
      />

      {/* No longer showing display name modal for anonymous users */}
    </PlannerContainer>
    <Footer />
  </>
  );
};

export default MitigationPlanner;
