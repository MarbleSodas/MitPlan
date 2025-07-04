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
import CollaboratorsList from '../collaboration/CollaboratorsList';
import DisplayNameModal from '../collaboration/DisplayNameModal';
import ActiveUsersDisplay from '../collaboration/ActiveUsersDisplay';

// Import planning components
import JobSelector from '../../features/jobs/JobSelector/JobSelector';
import BossSelector from '../../features/bosses/BossSelector/BossSelector';
import BossActionItem from '../BossActionItem/BossActionItem';
import MitigationItem from '../MitigationItem/MitigationItem';
import AssignedMitigations from '../AssignedMitigations/AssignedMitigations';
import MobileMitigationSelector from '../mobile/MobileMitigationSelector/MobileMitigationSelector';
import FilterToggle from '../common/FilterToggle/FilterToggle';
import TankSelectionModal from '../common/TankSelectionModal/TankSelectionModal';
import TankPositionSelector from '../TankPositionSelector/TankPositionSelector';
import Draggable from '../dnd/Draggable/Draggable';
import Droppable from '../dnd/Droppable/Droppable';

// Import styled layout components
import MainContent from '../styled/MainContent';
import TimelineContainer from '../styled/TimelineContainer';
import MitigationContainer from '../styled/MitigationContainer';
import BossActionsList from '../styled/BossActionsList';
import MitigationList from '../styled/MitigationList';

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
  gap: 1rem;
  align-items: center;

  @media (max-width: 768px) {
    flex-direction: column;
    width: 100%;
  }
`;

const BackButton = styled.button`
  padding: 0.75rem 1.5rem;
  background: transparent;
  color: ${props => props.theme?.colors?.primary || '#3399ff'};
  border: 2px solid ${props => props.theme?.colors?.primary || '#3399ff'};
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
const PlanningInterface = ({ onSave, saving, isReadOnly = false }) => {
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
          onSelectBoss={isReadOnly ? () => {} : setCurrentBossId}
          disabled={isReadOnly}
        />
        <JobSelector
          disabled={isReadOnly}
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
                  onClick={() => isReadOnly ? () => {} : handleBossActionSelection(action)}
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

const MitigationPlanner = ({ onNavigateBack, planId: propPlanId, isSharedPlan = false }) => {
  const { planId: routePlanId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const {
    joinCollaborativeSession,
    leaveCollaborativeSession,
    collaborators,
    isCollaborating,
    sessionId,
    displayName
  } = useCollaboration();

  const [saving, setSaving] = useState(false);
  const [showDisplayNameModal, setShowDisplayNameModal] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [planIsPublic, setPlanIsPublic] = useState(false);

  // Use route param if available, otherwise fall back to prop (for backward compatibility)
  const planId = routePlanId || propPlanId;

  // Determine if this is a shared plan (either from prop or if plan is public)
  const isActuallySharedPlan = isSharedPlan || planIsPublic;

  console.log('[MitigationPlanner] Rendering with planId:', planId);

  // Check if plan is public to enable collaboration
  useEffect(() => {
    const checkPlanPublicStatus = async () => {
      if (planId && !isSharedPlan) {
        try {
          // Import the service function to check plan status
          const { getPlan } = await import('../../services/realtimePlanService');
          const plan = await getPlan(planId);
          setPlanIsPublic(plan.isPublic || false);
        } catch (error) {
          console.error('Error checking plan public status:', error);
          setPlanIsPublic(false);
        }
      }
    };

    checkPlanPublicStatus();
  }, [planId, isSharedPlan]);

  // Handle collaboration setup for shared plans
  useEffect(() => {
    if (isActuallySharedPlan && planId) {
      // Check if user needs to provide display name
      if (!isAuthenticated && !displayName) {
        setShowDisplayNameModal(true);
      } else {
        // Join collaborative session
        joinCollaborativeSession(planId, displayName);
      }

      // Set read-only mode for unauthenticated users initially
      setIsReadOnly(!isAuthenticated);
    }

    // Cleanup on unmount or plan change
    return () => {
      if (isActuallySharedPlan && isCollaborating) {
        leaveCollaborativeSession();
      }
    };
  }, [
    isActuallySharedPlan,
    planId,
    isAuthenticated,
    displayName,
    joinCollaborativeSession,
    leaveCollaborativeSession,
    isCollaborating
  ]);

  // Handle display name submission for unauthenticated users
  const handleDisplayNameSubmit = async (name) => {
    try {
      await joinCollaborativeSession(planId, name);
      setShowDisplayNameModal(false);
      setIsReadOnly(false); // Allow editing after joining
    } catch (error) {
      console.error('Failed to join collaboration:', error);
      throw error;
    }
  };

  const handleDisplayNameCancel = () => {
    setShowDisplayNameModal(false);
    setIsReadOnly(true); // Keep as read-only if user cancels
  };

  const handleBack = () => {
    // Leave collaboration session before navigating away
    if (isActuallySharedPlan && isCollaborating) {
      leaveCollaborativeSession();
    }

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
      alert('Plan saved successfully!');
    } catch (error) {
      console.error('Error with save operation:', error);
      alert('Failed to save plan. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Loading and error handling is now done inside the RealtimeAppProvider

  return (
    <RealtimeAppProvider planId={planId}>
      <MitigationPlannerContent
        isSharedPlan={isActuallySharedPlan}
        isReadOnly={isReadOnly}
        setIsReadOnly={setIsReadOnly}
        collaborators={collaborators}
        isCollaborating={isCollaborating}
        sessionId={sessionId}
        isAuthenticated={isAuthenticated}
        handleBack={handleBack}
        handleSave={handleSave}
        saving={saving}
        showDisplayNameModal={showDisplayNameModal}
        setShowDisplayNameModal={setShowDisplayNameModal}
        handleDisplayNameSubmit={handleDisplayNameSubmit}
        handleDisplayNameCancel={handleDisplayNameCancel}
      />
    </RealtimeAppProvider>
  );
};

// Content component that has access to real-time contexts
const MitigationPlannerContent = ({
  isSharedPlan,
  isReadOnly,
  setIsReadOnly,
  collaborators,
  isCollaborating,
  sessionId,
  isAuthenticated,
  handleBack,
  handleSave,
  saving,
  showDisplayNameModal,
  setShowDisplayNameModal,
  handleDisplayNameSubmit,
  handleDisplayNameCancel
}) => {
  const { realtimePlan, loading, error } = useRealtimePlan();

  return (
    <PlannerContainer>
      <Header>
        <Title>
          {realtimePlan ? `${isSharedPlan ? 'Shared Plan: ' : 'Editing: '}${realtimePlan.name}` : 'Mitigation Planner'}
        </Title>
        <ButtonGroup>
          {isSharedPlan && isCollaborating && (
            <CollaboratorsList
              collaborators={collaborators}
              currentSessionId={sessionId}
              isReadOnly={isReadOnly}
            />
          )}
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

      {isSharedPlan && isReadOnly && (
        <ReadOnlyBanner>
          <span>You are viewing this plan in read-only mode.</span>
          {!isAuthenticated && (
            <button onClick={() => setShowDisplayNameModal(true)}>
              Join to Edit
            </button>
          )}
        </ReadOnlyBanner>
      )}

      {isSharedPlan && isCollaborating && collaborators.length > 0 && (
        <ActiveUsersDisplay
          collaborators={collaborators}
          currentSessionId={sessionId}
          maxDisplayUsers={8}
        />
      )}

      <PlanningInterface
        onSave={handleSave}
        saving={saving}
        isReadOnly={isReadOnly}
      />

      {showDisplayNameModal && (
        <DisplayNameModal
          isOpen={showDisplayNameModal}
          onSubmit={handleDisplayNameSubmit}
          onCancel={handleDisplayNameCancel}
          allowCancel={true}
          title="Join Collaborative Session"
          description="Enter your display name to join this collaborative planning session and start editing."
        />
      )}
    </PlannerContainer>
  );
};

export default MitigationPlanner;
