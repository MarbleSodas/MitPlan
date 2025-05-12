import React, { useState } from 'react';
import styled from 'styled-components';
import { Trash2 } from 'lucide-react';
import {
  isMitigationAvailable,
  getAbilityChargeCount,
  getAbilityCooldownForLevel,
  getAbilityDurationForLevel,
  getRoleSharedAbilityCount
} from '../../../utils';
import { useFilterContext, useChargeCountContext } from '../../../contexts';
import ChargeCounter from '../../../components/ChargeCounter';

// Container for the entire component
const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  max-height: 100%;
`;

// Section for available mitigations
const AvailableMitigationsSection = styled.div`
  flex: 3; /* Take up more space than the assigned section */
  display: flex;
  flex-direction: column;
  margin-bottom: 16px;
`;

// Section for assigned mitigations
const AssignedMitigationsSection = styled.div`
  flex: 2; /* Take up less space than the available section */
  display: flex;
  flex-direction: column;
  border-top: 2px solid ${props => props.theme.colors.border};
  padding-top: 16px;
`;

const MitigationList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch; /* Improve scrolling on iOS devices */
  overscroll-behavior: contain; /* Prevent scroll chaining */
  touch-action: pan-y; /* Allow vertical scrolling */
  flex: 1;
`;

const MitigationItem = styled.div`
  background-color: ${props => {
    if (props.$isAssigned) {
      return props.theme.mode === 'dark' ? 'rgba(51, 153, 255, 0.2)' : 'rgba(51, 153, 255, 0.1)';
    } else if (props.$isDisabled) {
      return props.theme.mode === 'dark' ? 'rgba(50, 50, 50, 0.5)' : 'rgba(240, 240, 240, 0.8)';
    } else {
      return props.theme.colors.cardBackground;
    }
  }};
  border-radius: ${props => props.theme.borderRadius.medium};
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: ${props => props.theme.shadows.small};
  transition: all 0.2s ease;
  position: relative;
  opacity: ${props => props.$isDisabled && !props.$isAssigned ? 0.7 : 1};
  border-left: 4px solid ${props => {
    if (props.$isAssigned) {
      return props.theme.colors.primary;
    } else if (props.$isDisabled) {
      return props.theme.colors.error || '#ff5555';
    } else {
      return 'transparent';
    }
  }};

  &:active {
    background-color: ${props => props.$isDisabled && !props.$isAssigned ?
      props.theme.mode === 'dark' ? 'rgba(50, 50, 50, 0.5)' : 'rgba(240, 240, 240, 0.8)' :
      props.theme.mode === 'dark' ? 'rgba(51, 153, 255, 0.2)' : 'rgba(51, 153, 255, 0.1)'};
    transform: ${props => props.$isDisabled && !props.$isAssigned ? 'none' : 'translateY(-2px)'};
  }
`;

const MitigationIcon = styled.div`
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: ${props => props.theme.borderRadius.small};
  background-color: ${props => props.theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'};
  flex-shrink: 0;

  img {
    max-width: 32px;
    max-height: 32px;
  }
`;

const MitigationContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const MitigationName = styled.div`
  font-weight: 600;
  font-size: 16px;
  color: ${props => props.theme.colors.text};
`;

const MitigationDescription = styled.div`
  font-size: 14px;
  color: ${props => props.theme.colors.lightText};

  small {
    font-size: 12px;
    opacity: 0.8;
  }
`;

const CooldownOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: inherit;
  font-size: 14px;
  color: ${props => props.theme.colors.text};
  text-align: center;
  padding: 0 16px;
`;

const MitigationActionButton = styled.button`
  position: absolute;
  top: 8px;
  right: 8px;
  background-color: ${props => props.theme.mode === 'dark' ? 'rgba(255, 100, 100, 0.2)' : 'rgba(255, 100, 100, 0.1)'};
  border: 1px solid ${props => props.theme.mode === 'dark' ? 'rgba(255, 100, 100, 0.3)' : 'rgba(255, 100, 100, 0.2)'};
  color: ${props => props.theme.colors.text};
  cursor: pointer;
  padding: 4px 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: ${props => props.theme.borderRadius.small};
  font-size: 12px;
  font-weight: 500;
  z-index: 10;

  &:hover, &:active {
    background-color: ${props => props.theme.mode === 'dark' ? 'rgba(255, 100, 100, 0.3)' : 'rgba(255, 100, 100, 0.2)'};
  }
`;

const AssignedMitigationsList = styled.div`
  overflow-y: auto;
  -webkit-overflow-scrolling: touch; /* Improve scrolling on iOS devices */
  overscroll-behavior: contain; /* Prevent scroll chaining */
  touch-action: pan-y; /* Allow vertical scrolling */
  flex: 1;
`;

const AssignedMitigationItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background-color: ${props => props.theme.mode === 'dark' ? 'rgba(51, 153, 255, 0.2)' : 'rgba(51, 153, 255, 0.1)'};
  border-radius: ${props => props.theme.borderRadius.medium};
  margin-bottom: 12px;
  box-shadow: ${props => props.theme.shadows.small};
`;

const AssignedMitigationName = styled.div`
  font-size: 16px;
  font-weight: 500;
  color: ${props => props.theme.colors.text};
  display: flex;
  align-items: center;
  gap: 8px;

  img {
    max-width: 24px;
    max-height: 24px;
  }
`;

const RemoveButton = styled.button`
  background-color: ${props => props.theme.mode === 'dark' ? 'rgba(255, 100, 100, 0.2)' : 'rgba(255, 100, 100, 0.1)'};
  border: 1px solid ${props => props.theme.mode === 'dark' ? 'rgba(255, 100, 100, 0.3)' : 'rgba(255, 100, 100, 0.2)'};
  color: ${props => props.theme.colors.text};
  cursor: pointer;
  padding: 8px 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: ${props => props.theme.borderRadius.small};
  gap: 6px;
  font-size: 14px;
  font-weight: 500;

  &:hover, &:active {
    background-color: ${props => props.theme.mode === 'dark' ? 'rgba(255, 100, 100, 0.3)' : 'rgba(255, 100, 100, 0.2)'};
  }
`;

const SectionTitle = styled.h4`
  margin: 0 0 12px 0;
  font-size: 18px;
  color: ${props => props.theme.colors.text};
  display: flex;
  align-items: center;
  gap: 8px;
`;

const NoAssignmentsMessage = styled.div`
  text-align: center;
  padding: 16px;
  color: ${props => props.theme.colors.lightText};
  font-style: italic;
  background-color: ${props => props.theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)'};
  border-radius: ${props => props.theme.borderRadius.medium};
`;

const ErrorMessage = styled.div`
  text-align: center;
  padding: 12px;
  margin: 8px 0;
  color: ${props => props.theme.colors.error || '#ff5555'};
  background-color: ${props => props.theme.mode === 'dark' ? 'rgba(255, 100, 100, 0.2)' : 'rgba(255, 100, 100, 0.1)'};
  border-radius: ${props => props.theme.borderRadius.medium};
  border-left: 4px solid ${props => props.theme.colors.error || '#ff5555'};
  font-weight: 500;
  font-size: 14px;
  animation: fadeIn 0.3s ease;

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

const BossActionDetails = styled.div`
  background-color: ${props => props.theme.colors.cardBackground};
  border-radius: ${props => props.theme.borderRadius.medium};
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: ${props => props.theme.shadows.small};
`;

const BossActionTime = styled.div`
  font-size: 14px;
  color: ${props => props.theme.colors.lightText};
  margin-bottom: 8px;
`;

const BossActionName = styled.div`
  font-size: 18px;
  font-weight: 600;
  color: ${props => props.theme.colors.text};
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
`;

const BossActionDescription = styled.div`
  font-size: 15px;
  color: ${props => props.theme.colors.lightText};
  line-height: 1.4;
  margin-bottom: 12px; /* Add space after description */
  word-wrap: break-word; /* Ensure long words don't overflow */
  overflow-wrap: break-word;
`;

const UnmitigatedDamage = styled.div`
  font-size: 15px;
  font-weight: 600;
  color: ${props => props.theme.colors.text};
  margin-top: 8px;
`;

const MobileMitigationSelector = ({
  mitigations,
  bossAction,
  assignments,
  pendingAssignments = [], // Add pendingAssignments prop with default empty array
  onAssignMitigation,
  onRemoveMitigation,
  checkAbilityCooldown,
  bossLevel,
  selectedJobs
}) => {
  // Get the filter context
  const { filterMitigations, showAllMitigations } = useFilterContext();

  // Get the charge count context
  const { addPendingAssignment, removePendingAssignment, canAssignMitigationToBossAction } = useChargeCountContext();

  // Add state to track the currently assigned mitigation
  // This is used to force a re-render when a mitigation is assigned
  const [justAssignedMitigation, setJustAssignedMitigation] = useState(null);

  // Add state to track local pending assignments
  // This ensures the component can update immediately even before the parent's state updates
  const [localPendingAssignments, setLocalPendingAssignments] = useState(pendingAssignments);

  // Add state to track if we're currently processing an assignment
  // This prevents multiple rapid assignments that could cause UI issues
  const [isProcessingAssignment, setIsProcessingAssignment] = useState(false);

  // Add error state to track and handle errors
  const [error, setError] = useState(null);

  // Get the current assignments for this boss action
  const currentAssignments = assignments[bossAction.id] || [];

  // Filter out mitigations that don't have any corresponding selected jobs
  const filteredAssignments = currentAssignments.filter(mitigation =>
    isMitigationAvailable(mitigation, selectedJobs)
  );

  // Filter mitigations based on the boss action type and filter settings
  // First filter by availability with selected jobs
  const availableMitigations = mitigations.filter(mitigation =>
    isMitigationAvailable(mitigation, selectedJobs)
  );

  // Then filter by boss action type if needed
  const filteredMitigations = showAllMitigations || !bossAction
    ? availableMitigations
    : filterMitigations(availableMitigations, bossAction);

  return (
    <Container>
      <BossActionDetails>
        <BossActionTime>{bossAction.time} seconds</BossActionTime>
        <BossActionName>
          {bossAction.icon} {bossAction.name}
        </BossActionName>
        <BossActionDescription>
          {bossAction.description}
        </BossActionDescription>
        {bossAction.unmitigatedDamage && (
          <UnmitigatedDamage>
            Unmitigated Damage: {bossAction.unmitigatedDamage}
          </UnmitigatedDamage>
        )}
      </BossActionDetails>

      {/* Display error message if there is one */}
      {error && (
        <ErrorMessage>
          {error}
        </ErrorMessage>
      )}

      <AvailableMitigationsSection>
        <SectionTitle>Available Mitigations</SectionTitle>
        <MitigationList>
          {filteredMitigations.map(mitigation => {
            // Check if this mitigation is already assigned to this action
            const isAssigned = currentAssignments.some(m => m.id === mitigation.id);

            // Check if this mitigation would be on cooldown or has no available charges
            const cooldownResult = checkAbilityCooldown(
              mitigation.id,
              bossAction.time,
              currentAssignments.some(m => m.id === mitigation.id),
              bossAction.id
            );

            // Check if the ability has no available charges
            const hasNoAvailableCharges = cooldownResult &&
                                         cooldownResult.totalCharges > 1 &&
                                         cooldownResult.availableCharges === 0;

            // Check if this mitigation can be assigned to this boss action
            // based on the new rules for raid-wide vs tank buster mitigations
            const cannotBeAssignedMultipleTimes = isAssigned && !canAssignMitigationToBossAction(bossAction.id, mitigation.id);

            const isDisabled = cannotBeAssignedMultipleTimes ||
                              (cooldownResult && cooldownResult.isOnCooldown) ||
                              hasNoAvailableCharges;

            // Get the cooldown reason if applicable
            let cooldownReason = null;
            if ((cooldownResult && cooldownResult.isOnCooldown) ||
                (cooldownResult && cooldownResult.availableCharges === 0) ||
                (cooldownResult && cooldownResult.reason === 'already-assigned') ||
                (isAssigned && !canAssignMitigationToBossAction(bossAction.id, mitigation.id))) {

              // Check if this mitigation can be assigned to this boss action
              // based on the new rules for raid-wide vs tank buster mitigations
              if (isAssigned && !canAssignMitigationToBossAction(bossAction.id, mitigation.id)) {
                cooldownReason = `Cannot be assigned multiple times to this action`;
              }
              else if (cooldownResult.reason === 'already-assigned') {
                cooldownReason = `Already assigned to this action`;
              }
              // Handle role-shared abilities
              else if (cooldownResult.isRoleShared && cooldownResult.roleSharedCount > 1) {
                if (cooldownResult.availableCharges === 0) {
                  cooldownReason = `All ${cooldownResult.roleSharedCount} instances on cooldown`;
                } else {
                  const availableInstances = cooldownResult.roleSharedCount - (cooldownResult.instancesUsed || 0);
                  cooldownReason = `${availableInstances}/${cooldownResult.roleSharedCount} instances available`;
                }
              }
              // Handle abilities with multiple charges
              else if (cooldownResult.totalCharges > 1) {
                if (cooldownResult.availableCharges === 0) {
                  cooldownReason = `All ${cooldownResult.totalCharges} charges on cooldown\nLast used: ${cooldownResult.lastUsedActionName} (${cooldownResult.lastUsedTime}s)`;
                } else {
                  cooldownReason = `${cooldownResult.availableCharges}/${cooldownResult.totalCharges} charges available\nLast used: ${cooldownResult.lastUsedActionName} (${cooldownResult.lastUsedTime}s)`;
                }
              }
              // Handle regular abilities
              else {
                cooldownReason = `On cooldown from ${cooldownResult.lastUsedActionName} (${cooldownResult.lastUsedTime}s)`;
              }
            }

            return (
              <MitigationItem
                key={mitigation.id}
                $isDisabled={isDisabled}
                $isAssigned={isAssigned}
                onClick={() => {
                  if (isAssigned) {
                    // If already assigned, do nothing (let the remove button handle it)
                    return;
                  } else if (!isDisabled && !isProcessingAssignment) {
                    try {
                      // Set processing flag to prevent multiple rapid assignments
                      setIsProcessingAssignment(true);

                      // Dispatch custom event to notify MobileBottomSheet
                      window.dispatchEvent(new Event('mitigation-processing-start'));

                      // Create a new pending assignment for local state
                      const newPendingAssignment = {
                        bossActionId: bossAction.id,
                        mitigationId: mitigation.id,
                        timestamp: Date.now()
                      };

                      // Add pending assignment to the ChargeCountContext
                      // This will update the charge/instance counts immediately
                      addPendingAssignment(bossAction.id, mitigation.id);

                      // Set justAssignedMitigation for immediate UI feedback
                      // This will update the charge count display without requiring deselection
                      setJustAssignedMitigation(mitigation.id);

                      // Update local pending assignments state
                      setLocalPendingAssignments(prev => [...prev, newPendingAssignment]);

                      // Then assign the mitigation to the boss action
                      // This ensures the UI updates immediately before the assignment is processed
                      onAssignMitigation(bossAction.id, mitigation);

                      // Clear the justAssignedMitigation and processing flag after a delay
                      // This ensures the UI has time to update before we clear the state
                      setTimeout(() => {
                        setJustAssignedMitigation(null);
                        setIsProcessingAssignment(false);

                        // Dispatch custom event to notify MobileBottomSheet
                        window.dispatchEvent(new Event('mitigation-processing-end'));

                        // Force a re-render to ensure the UI is updated
                        const event = new Event('resize');
                        window.dispatchEvent(event);
                      }, 500);
                    } catch (err) {
                      // Handle any errors that occur during assignment
                      console.error('Error assigning mitigation:', err);
                      setError(`Error assigning ${mitigation.name}: ${err.message}`);

                      // Reset processing flag
                      setIsProcessingAssignment(false);

                      // Dispatch custom event to notify MobileBottomSheet
                      window.dispatchEvent(new Event('mitigation-processing-end'));

                      // Remove the pending assignment since it failed
                      removePendingAssignment(bossAction.id, mitigation.id);

                      // Update local pending assignments state to remove this mitigation
                      setLocalPendingAssignments(prev =>
                        prev.filter(pa =>
                          !(pa.bossActionId === bossAction.id && pa.mitigationId === mitigation.id)
                        )
                      );

                      // Clear the error after a delay
                      setTimeout(() => {
                        setError(null);
                      }, 3000);
                    }
                  }
                }}
              >
                <MitigationIcon>
                  {typeof mitigation.icon === 'string' && mitigation.icon.startsWith('/') ?
                    <img src={mitigation.icon} alt={mitigation.name} /> :
                    mitigation.icon
                  }
                </MitigationIcon>
                <MitigationContent>
                  <MitigationName>{mitigation.name}</MitigationName>
                  <MitigationDescription>
                    {mitigation.description}<br />
                    <small>
                      Duration: {getAbilityDurationForLevel(mitigation, bossLevel)}s |
                      Cooldown: {getAbilityCooldownForLevel(mitigation, bossLevel)}s
                      {/* Display charge count for abilities with multiple charges */}
                      {getAbilityChargeCount(mitigation, bossLevel) > 1 && (() => {
                        // Get the cooldown result to check available charges
                        const cooldownResult = bossAction ?
                          checkAbilityCooldown(
                            mitigation.id,
                            bossAction.time,
                            currentAssignments.some(m => m.id === mitigation.id),
                            bossAction.id
                          ) :
                          {
                            availableCharges: getAbilityChargeCount(mitigation, bossLevel),
                            totalCharges: getAbilityChargeCount(mitigation, bossLevel),
                            isRoleShared: mitigation.isRoleShared
                          };

                        // Get the available charges
                        let availableCharges = cooldownResult.availableCharges || 0;

                        // If this ability is being assigned but not yet in the assignments array,
                        // decrement the available charges to reflect the current assignment
                        // This can happen in three ways:
                        // 1. The ability is assigned but not yet in the assignments array (isAssigned)
                        // 2. The ability was just assigned (justAssignedMitigation)
                        // 3. The ability is in the pendingAssignments array (either from props or local state)
                        const hasPendingAssignment = localPendingAssignments.some(pa =>
                          pa.mitigationId === mitigation.id &&
                          pa.bossActionId === bossAction.id &&
                          !currentAssignments.some(m => m.id === mitigation.id)
                        );

                        // Check if this ability is currently being assigned
                        // This is critical for ensuring the UI updates synchronously with the user action
                        const isCurrentlyBeingAssigned =
                          (isAssigned && !currentAssignments.some(m => m.id === mitigation.id)) ||
                          justAssignedMitigation === mitigation.id ||
                          hasPendingAssignment;

                        if (isCurrentlyBeingAssigned) {
                          availableCharges = Math.max(0, availableCharges - 1);
                        }

                        return <> | <ChargeCounter
                          mitigationId={mitigation.id}
                          bossActionId={bossAction.id}
                          type="charges"
                          totalCount={cooldownResult.totalCharges}
                          availableCount={availableCharges}
                        /></>;
                      })()}

                      {/* Display instance count for role-shared abilities */}
                      {mitigation.isRoleShared && (() => {
                        // Get the cooldown result to check available instances
                        const cooldownResult = bossAction ?
                          checkAbilityCooldown(
                            mitigation.id,
                            bossAction.time,
                            currentAssignments.some(m => m.id === mitigation.id),
                            bossAction.id
                          ) :
                          {
                            isRoleShared: true,
                            roleSharedCount: getRoleSharedAbilityCount(mitigation, selectedJobs),
                            instancesUsed: 0,
                            totalInstances: getRoleSharedAbilityCount(mitigation, selectedJobs)
                          };

                        // Only show if we have multiple instances available
                        const roleSharedCount = cooldownResult.roleSharedCount || 0;
                        if (roleSharedCount <= 1) return null;

                        // Calculate available instances
                        const totalInstances = cooldownResult.totalInstances || roleSharedCount;
                        const instancesUsed = cooldownResult.instancesUsed || 0;
                        let availableInstances = Math.max(0, totalInstances - instancesUsed);

                        // If this ability is being assigned but not yet in the assignments array,
                        // decrement the available instances to reflect the current assignment
                        // This can happen in three ways:
                        // 1. The ability is assigned but not yet in the assignments array (isAssigned)
                        // 2. The ability was just assigned (justAssignedMitigation)
                        // 3. The ability is in the pendingAssignments array (either from props or local state)
                        const hasPendingAssignment = localPendingAssignments.some(pa =>
                          pa.mitigationId === mitigation.id &&
                          pa.bossActionId === bossAction.id &&
                          !currentAssignments.some(m => m.id === mitigation.id)
                        );

                        // Check if this ability is currently being assigned
                        // This is critical for ensuring the UI updates synchronously with the user action
                        const isCurrentlyBeingAssigned =
                          (isAssigned && !currentAssignments.some(m => m.id === mitigation.id)) ||
                          justAssignedMitigation === mitigation.id ||
                          hasPendingAssignment;

                        if (isCurrentlyBeingAssigned) {
                          availableInstances = Math.max(0, availableInstances - 1);
                        }

                        return <> | <ChargeCounter
                          mitigationId={mitigation.id}
                          bossActionId={bossAction.id}
                          type="instances"
                          totalCount={totalInstances}
                          availableCount={availableInstances}
                        /></>;
                      })()}
                    </small>
                  </MitigationDescription>
                </MitigationContent>

                {isAssigned ? (
                  <MitigationActionButton
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent the parent onClick from firing

                      if (isProcessingAssignment) {
                        return; // Don't allow removal while processing an assignment
                      }

                      try {
                        // Set processing flag to prevent multiple rapid operations
                        setIsProcessingAssignment(true);

                        // Dispatch custom event to notify MobileBottomSheet
                        window.dispatchEvent(new Event('mitigation-processing-start'));

                        // Remove pending assignment from the ChargeCountContext
                        // This will update the charge/instance counts immediately
                        removePendingAssignment(bossAction.id, mitigation.id);

                        // Update local pending assignments state to remove this mitigation
                        setLocalPendingAssignments(prev =>
                          prev.filter(pa =>
                            !(pa.bossActionId === bossAction.id && pa.mitigationId === mitigation.id)
                          )
                        );

                        // Remove the mitigation
                        onRemoveMitigation(bossAction.id, mitigation.id);

                        // Force re-render to update UI immediately
                        // This will update the charge count display without requiring deselection
                        setTimeout(() => {
                          // Using setTimeout with a short delay to ensure the state update happens after the current execution
                          // This is a workaround to force a re-render in the mobile view
                          const event = new Event('resize');
                          window.dispatchEvent(event);

                          // Also update the component state to force a re-render
                          setJustAssignedMitigation(null);
                          setIsProcessingAssignment(false);

                          // Dispatch custom event to notify MobileBottomSheet
                          window.dispatchEvent(new Event('mitigation-processing-end'));
                        }, 300);
                      } catch (err) {
                        // Handle any errors that occur during removal
                        console.error('Error removing mitigation:', err);
                        setError(`Error removing ${mitigation.name}: ${err.message}`);

                        // Reset processing flag
                        setIsProcessingAssignment(false);

                        // Dispatch custom event to notify MobileBottomSheet
                        window.dispatchEvent(new Event('mitigation-processing-end'));

                        // Clear the error after a delay
                        setTimeout(() => {
                          setError(null);
                        }, 3000);
                      }
                    }}
                    aria-label={`Remove ${mitigation.name}`}
                  >
                    <Trash2 size={12} style={{ marginRight: '4px' }} />
                    Remove
                  </MitigationActionButton>
                ) : isDisabled && (
                  <CooldownOverlay>
                    {cooldownReason}
                  </CooldownOverlay>
                )}
              </MitigationItem>
            );
          })}
        </MitigationList>
      </AvailableMitigationsSection>

      <AssignedMitigationsSection>
        <SectionTitle>
          Assigned Mitigations
          {filteredAssignments.length > 0 && ` (${filteredAssignments.length})`}
        </SectionTitle>

        <AssignedMitigationsList>
          {filteredAssignments.length > 0 ? (
            filteredAssignments.map(mitigation => (
              <AssignedMitigationItem key={mitigation.id}>
                <AssignedMitigationName>
                  {typeof mitigation.icon === 'string' && mitigation.icon.startsWith('/') ?
                    <img src={mitigation.icon} alt={mitigation.name} /> :
                    null
                  }
                  {mitigation.name}
                </AssignedMitigationName>
                <RemoveButton
                  onClick={() => {
                    if (isProcessingAssignment) {
                      return; // Don't allow removal while processing an assignment
                    }

                    try {
                      // Set processing flag to prevent multiple rapid operations
                      setIsProcessingAssignment(true);

                      // Dispatch custom event to notify MobileBottomSheet
                      window.dispatchEvent(new Event('mitigation-processing-start'));

                      // Remove pending assignment from the ChargeCountContext
                      // This will update the charge/instance counts immediately
                      removePendingAssignment(bossAction.id, mitigation.id);

                      // Update local pending assignments state to remove this mitigation
                      setLocalPendingAssignments(prev =>
                        prev.filter(pa =>
                          !(pa.bossActionId === bossAction.id && pa.mitigationId === mitigation.id)
                        )
                      );

                      // Remove the mitigation
                      onRemoveMitigation(bossAction.id, mitigation.id);

                      // Force re-render to update UI immediately
                      setTimeout(() => {
                        // Using setTimeout with a short delay to ensure the state update happens after the current execution
                        // This is a workaround to force a re-render in the mobile view
                        const event = new Event('resize');
                        window.dispatchEvent(event);

                        // Also update the component state to force a re-render
                        setJustAssignedMitigation(null);
                        setIsProcessingAssignment(false);

                        // Dispatch custom event to notify MobileBottomSheet
                        window.dispatchEvent(new Event('mitigation-processing-end'));
                      }, 300);
                    } catch (err) {
                      // Handle any errors that occur during removal
                      console.error('Error removing mitigation:', err);
                      setError(`Error removing ${mitigation.name}: ${err.message}`);

                      // Reset processing flag
                      setIsProcessingAssignment(false);

                      // Dispatch custom event to notify MobileBottomSheet
                      window.dispatchEvent(new Event('mitigation-processing-end'));

                      // Clear the error after a delay
                      setTimeout(() => {
                        setError(null);
                      }, 3000);
                    }
                  }}
                  aria-label={`Remove ${mitigation.name}`}
                >
                  <Trash2 size={16} />
                  Remove
                </RemoveButton>
              </AssignedMitigationItem>
            ))
          ) : (
            <NoAssignmentsMessage>
              No mitigations assigned yet. Tap a mitigation above to assign it.
            </NoAssignmentsMessage>
          )}
        </AssignedMitigationsList>
      </AssignedMitigationsSection>
    </Container>
  );
};

export default MobileMitigationSelector;
