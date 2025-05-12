import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  transition: all 0.2s ease;
  cursor: pointer;

  &:active {
    background-color: ${props => props.theme.mode === 'dark' ? 'rgba(51, 153, 255, 0.3)' : 'rgba(51, 153, 255, 0.2)'};
    transform: translateY(-2px);
  }
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
  const {
    addPendingAssignment,
    removePendingAssignment,
    canAssignMitigationToBossAction,
    getChargeCount,
    getInstanceCount
  } = useChargeCountContext();

  // Add state to track the currently assigned mitigation
  // This is used to force a re-render when a mitigation is assigned
  const [justAssignedMitigation, setJustAssignedMitigation] = useState(null);

  // Add state to track local pending assignments
  // This ensures the component can update immediately even before the parent's state updates
  const [localPendingAssignments, setLocalPendingAssignments] = useState(pendingAssignments);

  // Add state to track if we're currently processing an assignment
  // This is used to prevent UI issues during processing
  const [isProcessingAssignment, setIsProcessingAssignment] = useState(false);

  // Add a ref to track if we're currently processing an assignment
  // This is used to prevent multiple rapid assignments
  const isProcessingRef = useRef(false);

  // Add error state to track and handle errors
  const [error, setError] = useState(null);

  // Use a ref to track component mounted state
  const isMounted = useRef(true);

  // Use a ref to track active timeouts for cleanup
  const activeTimeouts = useRef([]);

  // Helper function to safely set timeouts with automatic cleanup
  const safeSetTimeout = (callback, delay) => {
    if (!isMounted.current) return;

    const timeoutId = setTimeout(() => {
      // Remove this timeout from the tracking array
      activeTimeouts.current = activeTimeouts.current.filter(id => id !== timeoutId);

      // Only execute callback if component is still mounted
      if (isMounted.current) {
        callback();
      }
    }, delay);

    // Add this timeout to the tracking array
    activeTimeouts.current.push(timeoutId);

    return timeoutId;
  };

  // Helper function to handle mitigation removal
  const handleMitigationRemoval = useCallback((mitigationId) => {
    // Check if we're already processing to prevent multiple rapid operations
    if (isProcessingRef.current) return;

    // Set processing flag to prevent multiple rapid operations
    isProcessingRef.current = true;

    try {
      // Set UI processing state for visual feedback
      setIsProcessingAssignment(true);

      // Dispatch custom event to notify MobileBottomSheet
      try {
        window.dispatchEvent(new Event('mitigation-processing-start'));
      } catch (eventError) {
        console.error('Error dispatching mitigation-processing-start event:', eventError);
      }

      // Remove pending assignment from the ChargeCountContext immediately
      // This will update the charge/instance counts immediately
      removePendingAssignment(bossAction.id, mitigationId);

      // Clear the justAssignedMitigation state if it matches this mitigation
      if (justAssignedMitigation === mitigationId) {
        setJustAssignedMitigation(null);
      }

      // Update local pending assignments state
      // Remove any existing pending assignments for this mitigation
      setLocalPendingAssignments(prev =>
        prev.filter(pa =>
          !(pa.bossActionId === bossAction.id && pa.mitigationId === mitigationId)
        )
      );

      // Remove the mitigation
      onRemoveMitigation(bossAction.id, mitigationId);

      // Immediately set processing flags to false to allow immediate follow-up actions
      setIsProcessingAssignment(false);
      isProcessingRef.current = false;

      // Dispatch custom event to notify MobileBottomSheet
      try {
        window.dispatchEvent(new Event('mitigation-processing-end'));
      } catch (eventError) {
        console.error('Error dispatching mitigation-processing-end event:', eventError);
      }
    } catch (err) {
      // Handle any errors that occur during removal
      console.error('Error removing mitigation:', err);
      setError(`Error removing mitigation: ${err.message}`);

      // Reset processing flags
      setIsProcessingAssignment(false);
      isProcessingRef.current = false;

      // Dispatch custom event to notify MobileBottomSheet
      try {
        window.dispatchEvent(new Event('mitigation-processing-end'));
      } catch (eventError) {
        console.error('Error dispatching mitigation-processing-end event:', eventError);
      }

      // Clear the error after a delay
      safeSetTimeout(() => {
        setError(null);
      }, 3000);
    }
  }, [bossAction, justAssignedMitigation, onRemoveMitigation, removePendingAssignment]);

  // Helper function to handle mitigation assignment
  const handleMitigationAssignment = useCallback((mitigation) => {
    // Check if we're already processing to prevent multiple rapid operations
    if (isProcessingRef.current) return;

    // Set processing flag to prevent multiple rapid operations
    isProcessingRef.current = true;

    try {
      // Set UI processing state for visual feedback
      setIsProcessingAssignment(true);

      // Dispatch custom event to notify MobileBottomSheet
      try {
        window.dispatchEvent(new Event('mitigation-processing-start'));
      } catch (eventError) {
        console.error('Error dispatching mitigation-processing-start event:', eventError);
      }

      // First, ensure any existing pending assignments for this mitigation are removed
      // This is crucial for immediate reassignment after removal
      setLocalPendingAssignments(prev =>
        prev.filter(pa =>
          !(pa.bossActionId === bossAction.id && pa.mitigationId === mitigation.id)
        )
      );

      // Add pending assignment to the ChargeCountContext
      // This will update the charge/instance counts immediately
      addPendingAssignment(bossAction.id, mitigation.id);

      // Set justAssignedMitigation for immediate UI feedback
      // This will update the charge count display without requiring deselection
      setJustAssignedMitigation(mitigation.id);

      // Create a new pending assignment for local state
      const newPendingAssignment = {
        bossActionId: bossAction.id,
        mitigationId: mitigation.id,
        timestamp: Date.now(),
        isBeingRemoved: false
      };

      // Update local pending assignments state with the new assignment
      setLocalPendingAssignments(prev => [...prev, newPendingAssignment]);

      // Then assign the mitigation to the boss action
      // This ensures the UI updates immediately before the assignment is processed
      onAssignMitigation(bossAction.id, mitigation);

      // Immediately set processing flags to false to allow immediate follow-up actions
      setIsProcessingAssignment(false);
      isProcessingRef.current = false;

      // Dispatch custom event to notify MobileBottomSheet
      try {
        window.dispatchEvent(new Event('mitigation-processing-end'));
      } catch (eventError) {
        console.error('Error dispatching mitigation-processing-end event:', eventError);
      }
    } catch (err) {
      // Handle any errors that occur during assignment
      console.error('Error assigning mitigation:', err);
      setError(`Error assigning ${mitigation.name}: ${err.message}`);

      // Reset processing flags
      setIsProcessingAssignment(false);
      isProcessingRef.current = false;

      // Dispatch custom event to notify MobileBottomSheet
      try {
        window.dispatchEvent(new Event('mitigation-processing-end'));
      } catch (eventError) {
        console.error('Error dispatching mitigation-processing-end event:', eventError);
      }

      // Remove the pending assignment since it failed
      try {
        removePendingAssignment(bossAction.id, mitigation.id);
      } catch (removeError) {
        console.error('Error removing pending assignment:', removeError);
      }

      // Update local pending assignments state to remove this mitigation
      setLocalPendingAssignments(prev =>
        prev.filter(pa =>
          !(pa.bossActionId === bossAction.id && pa.mitigationId === mitigation.id)
        )
      );

      // Clear the error after a delay
      safeSetTimeout(() => {
        setError(null);
      }, 3000);
    }
  }, [bossAction, onAssignMitigation, addPendingAssignment, removePendingAssignment]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Mark component as unmounted
      isMounted.current = false;

      // Reset processing ref
      isProcessingRef.current = false;

      // Clear all active timeouts
      activeTimeouts.current.forEach(timeoutId => {
        clearTimeout(timeoutId);
      });
      activeTimeouts.current = [];
    };
  }, []);

  // Sync local pending assignments with props
  useEffect(() => {
    if (isMounted.current) {
      setLocalPendingAssignments(pendingAssignments);
    }
  }, [pendingAssignments]);

  // Clean up stale pending assignments after a certain time
  useEffect(() => {
    const staleTime = 3000; // Reduced from 5000 to 3000 ms for faster cleanup

    // Immediately clean up any conflicting pending assignments
    // This is crucial for immediate reassignment after removal
    setLocalPendingAssignments(prev => {
      const now = Date.now();

      // First, identify any conflicting assignments (same bossAction, same mitigation)
      const assignmentsByKey = {};

      // Group assignments by bossActionId + mitigationId
      prev.forEach(pa => {
        const key = `${pa.bossActionId}-${pa.mitigationId}`;
        if (!assignmentsByKey[key]) {
          assignmentsByKey[key] = [];
        }
        assignmentsByKey[key].push(pa);
      });

      // For each group with multiple assignments, keep only the newest one
      const filteredAssignments = [];
      Object.values(assignmentsByKey).forEach(group => {
        if (group.length === 1) {
          // If there's only one assignment in the group, keep it
          filteredAssignments.push(group[0]);
        } else {
          // If there are multiple assignments, find the newest one
          const newest = group.reduce((newest, current) => {
            return current.timestamp > newest.timestamp ? current : newest;
          }, group[0]);

          // Keep only the newest assignment
          filteredAssignments.push(newest);
        }
      });

      // Then filter out stale assignments
      return filteredAssignments.filter(pa => {
        const age = now - pa.timestamp;

        // Keep non-stale assignments
        if (age < staleTime) return true;

        // Remove all stale assignments
        return false;
      });
    });

    // Set up a timer to clean up stale assignments
    const cleanupTimer = safeSetTimeout(() => {
      const now = Date.now();

      // Filter out stale pending assignments
      setLocalPendingAssignments(prev => {
        return prev.filter(pa => {
          const age = now - pa.timestamp;

          // Keep non-stale assignments
          if (age < staleTime) return true;

          // Remove all stale assignments
          return false;
        });
      });
    }, staleTime / 2); // Run cleanup more frequently than the stale time

    // Clean up the timer on unmount or when dependencies change
    return () => {
      if (cleanupTimer) clearTimeout(cleanupTimer);
    };
  }, []); // Empty dependency array to run only once on mount

  // Get the current assignments for this boss action
  // We need to create a new array to ensure React detects the change
  const currentAssignments = assignments[bossAction.id] || [];

  // Create a derived state that includes both actual assignments and pending assignments
  // This ensures the UI reflects the latest state even before the parent component updates
  const derivedAssignments = [...currentAssignments];

  // Add any pending assignments that aren't already in the current assignments
  localPendingAssignments.forEach(pa => {
    if (pa.bossActionId === bossAction.id && !derivedAssignments.some(m => m.id === pa.mitigationId)) {
      // Find the full mitigation object
      const mitigation = mitigations.find(m => m.id === pa.mitigationId);
      if (mitigation) {
        derivedAssignments.push(mitigation);
      }
    }
  });

  // Filter out mitigations that don't have any corresponding selected jobs
  const filteredAssignments = derivedAssignments.filter(mitigation =>
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
            // Check if this mitigation is already assigned to this action in the current assignments
            const isAssignedInCurrentAssignments = currentAssignments.some(m => m.id === mitigation.id);

            // Find the most recent pending assignment for this mitigation (if any)
            const pendingAssignments = localPendingAssignments.filter(
              pa => pa.bossActionId === bossAction.id && pa.mitigationId === mitigation.id
            );

            // Sort by timestamp (newest first)
            pendingAssignments.sort((a, b) => b.timestamp - a.timestamp);

            // Get the most recent pending assignment (if any)
            const mostRecentPendingAssignment = pendingAssignments.length > 0 ? pendingAssignments[0] : null;

            // Check if this mitigation has a pending assignment that is not being removed
            const hasPendingAssignmentLocal = mostRecentPendingAssignment && !mostRecentPendingAssignment.isBeingRemoved;

            // Check if this mitigation is being removed
            const isBeingRemoved = mostRecentPendingAssignment && mostRecentPendingAssignment.isBeingRemoved;

            // A mitigation is considered assigned if:
            // 1. It's in the current assignments AND not being removed, OR
            // 2. It has a pending assignment that is not being removed
            const isAssigned = (isAssignedInCurrentAssignments && !isBeingRemoved) ||
                              (!isAssignedInCurrentAssignments && hasPendingAssignmentLocal);

            // Check if this mitigation was just assigned (for immediate UI feedback)
            const wasJustAssigned = justAssignedMitigation === mitigation.id;

            // Get cooldown information for this mitigation
            // We need to pass isAssigned to ensure the cooldown is calculated correctly
            const cooldownResult = checkAbilityCooldown(
              mitigation.id,
              bossAction.time,
              isAssigned,
              bossAction.id
            );

            // Check if the ability has no available charges
            const hasNoAvailableCharges = cooldownResult &&
                                         cooldownResult.totalCharges > 1 &&
                                         cooldownResult.availableCharges === 0;

            // Check if this mitigation can be assigned to this boss action
            // based on the rules for raid-wide vs tank buster mitigations
            const cannotBeAssignedMultipleTimes = isAssigned && !canAssignMitigationToBossAction(bossAction.id, mitigation.id);

            // A mitigation is disabled if:
            // 1. It cannot be assigned multiple times to this boss action, OR
            // 2. It's on cooldown, OR
            // 3. It has no available charges
            // 4. BUT, if it was just assigned, we want to allow immediate removal
            const isDisabled = !wasJustAssigned && (
                              (cannotBeAssignedMultipleTimes) ||
                              (cooldownResult && cooldownResult.isOnCooldown) ||
                              hasNoAvailableCharges
                              );

            // Get the cooldown reason if applicable
            let cooldownReason = null;

            // Skip cooldown reason if this mitigation was just assigned
            // This ensures the UI doesn't show a cooldown reason for a mitigation that was just assigned
            if (!wasJustAssigned && (
                (cooldownResult && cooldownResult.isOnCooldown) ||
                (cooldownResult && cooldownResult.availableCharges === 0) ||
                (cooldownResult && cooldownResult.reason === 'already-assigned') ||
                (isAssigned && !canAssignMitigationToBossAction(bossAction.id, mitigation.id))
            )) {
              // Check if this mitigation can be assigned to this boss action
              // based on the rules for raid-wide vs tank buster mitigations
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
                    // If already assigned, handle removal
                    handleMitigationRemoval(mitigation.id);
                  } else if (!isDisabled) {
                    // If not assigned and not disabled, handle assignment
                    handleMitigationAssignment(mitigation);
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
                        // Get the total charges for this ability
                        const totalCharges = getAbilityChargeCount(mitigation, bossLevel);

                        // Get the charge count from the context
                        const chargeCount = getChargeCount(mitigation.id);

                        // Use the context value if available, otherwise calculate it
                        let availableCharges;
                        if (chargeCount) {
                          availableCharges = chargeCount.availableCharges;
                        } else {
                          // Find all boss actions with this ability assigned
                          const actionsWithAbility = Object.entries(assignments)
                            .filter(([, mitigations]) => mitigations && mitigations.some(m => m.id === mitigation.id))
                            .map(([actionId]) => ({ id: actionId }));

                          // Calculate how many charges are used
                          let chargesUsed = actionsWithAbility.length;

                          // If it's already assigned to this action, don't count it twice
                          if (isAssignedInCurrentAssignments) {
                            chargesUsed--;
                          }

                          // Calculate available charges
                          availableCharges = Math.max(0, totalCharges - chargesUsed);
                        }

                        // We don't need to check for pending assignments here because the context already decremented the count
                        // This prevents double-decrementing in the mobile view

                        // If this ability is being removed, show one more charge available
                        if (isBeingRemoved && isAssignedInCurrentAssignments) {
                          availableCharges = Math.min(totalCharges, availableCharges + 1);
                        }

                        return <> | <ChargeCounter
                          mitigationId={mitigation.id}
                          bossActionId={bossAction.id}
                          type="charges"
                          totalCount={totalCharges}
                          availableCount={availableCharges}
                        /></>;
                      })()}

                      {/* Display instance count for role-shared abilities */}
                      {mitigation.isRoleShared && (() => {
                        // Get the total instances for this ability
                        const totalInstances = getRoleSharedAbilityCount(mitigation, selectedJobs);

                        // Only show if we have multiple instances available
                        if (totalInstances <= 1) return null;

                        // Get the instance count from the context
                        const instanceCount = getInstanceCount(mitigation.id);

                        // Use the context value if available, otherwise calculate it
                        let availableInstances;
                        if (instanceCount) {
                          availableInstances = instanceCount.availableInstances;
                        } else {
                          // Find all boss actions with this ability assigned
                          const actionsWithAbility = Object.entries(assignments)
                            .filter(([, mitigations]) => mitigations && mitigations.some(m => m.id === mitigation.id))
                            .map(([actionId]) => ({ id: actionId }));

                          // Calculate how many instances are used
                          let instancesUsed = actionsWithAbility.length;

                          // If it's already assigned to this action, don't count it twice
                          if (isAssignedInCurrentAssignments) {
                            instancesUsed--;
                          }

                          // Calculate available instances
                          availableInstances = Math.max(0, totalInstances - instancesUsed);
                        }

                        // We don't need to check for pending assignments here because the context already decremented the count
                        // This prevents double-decrementing in the mobile view

                        // If this ability is being removed, show one more instance available
                        if (isBeingRemoved && isAssignedInCurrentAssignments) {
                          availableInstances = Math.min(totalInstances, availableInstances + 1);
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
                      // Use our helper function for removal
                      handleMitigationRemoval(mitigation.id);
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
              <AssignedMitigationItem
                key={mitigation.id}
                onClick={() => {
                  // Use our helper function for removal
                  handleMitigationRemoval(mitigation.id);
                }}
              >
                <AssignedMitigationName>
                  {typeof mitigation.icon === 'string' && mitigation.icon.startsWith('/') ?
                    <img src={mitigation.icon} alt={mitigation.name} /> :
                    null
                  }
                  {mitigation.name}
                </AssignedMitigationName>
                <RemoveButton
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent the parent onClick from firing
                    // Use our helper function for removal
                    handleMitigationRemoval(mitigation.id);
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
