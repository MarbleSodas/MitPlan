import React, { useState, useEffect, useRef, useCallback } from 'react';
import styled from 'styled-components';
import { Trash2 } from 'lucide-react';
import {
  isMitigationAvailable,
  getAbilityChargeCount,
  getAbilityCooldownForLevel,
  getAbilityDurationForLevel,
  getRoleSharedAbilityCount,
  calculateTotalMitigation,
  calculateMitigatedDamage,
  calculateBarrierAmount
} from '../../../utils';
import {
  useFilterContext,
  useTankPositionContext,
  useTankSelectionModalContext
} from '../../../contexts';
import ChargeCounter from '../../../components/ChargeCounter';
import HealthBar from '../../../components/common/HealthBar';
import TankMitigationDisplay from '../../../components/common/TankMitigationDisplay';
import { bosses, mitigationAbilities } from '../../../data';
import { isDualTankBusterAction } from '../../../utils/boss/bossActionUtils';

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
    } else if (props.$isTouched) {
      return props.theme.mode === 'dark' ? 'rgba(51, 153, 255, 0.15)' : 'rgba(51, 153, 255, 0.05)';
    } else {
      return props.theme.colors.cardBackground;
    }
  }};
  border-radius: ${props => props.theme.borderRadius.responsive.medium};
  padding: ${props => props.theme.spacing.responsive.medium};
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.responsive.medium};
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
      return props.theme.colors.primary || '#3399ff';
    }
  }};
  -webkit-tap-highlight-color: transparent; /* Remove default mobile tap highlight */
  touch-action: manipulation; /* Optimize for touch */
  user-select: none; /* Prevent text selection */
  min-height: 72px; /* Ensure minimum touch target size */
  margin-bottom: ${props => props.theme.spacing.responsive.small};

  /* Desktop hover effect */
  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background-color: ${props => props.$isDisabled && !props.$isAssigned ?
        props.theme.mode === 'dark' ? 'rgba(50, 50, 50, 0.5)' : 'rgba(240, 240, 240, 0.8)' :
        props.theme.mode === 'dark' ? 'rgba(51, 153, 255, 0.15)' : 'rgba(51, 153, 255, 0.05)'};
      transform: ${props => props.$isDisabled && !props.$isAssigned ? 'none' : 'translateY(-1px)'};
      box-shadow: ${props => props.$isDisabled && !props.$isAssigned ? props.theme.shadows.small : props.theme.shadows.medium};
    }
  }

  /* Touch feedback */
  &:active {
    background-color: ${props => props.$isDisabled && !props.$isAssigned ?
      props.theme.mode === 'dark' ? 'rgba(50, 50, 50, 0.5)' : 'rgba(240, 240, 240, 0.8)' :
      props.theme.mode === 'dark' ? 'rgba(51, 153, 255, 0.2)' : 'rgba(51, 153, 255, 0.1)'};
    transform: ${props => props.$isDisabled && !props.$isAssigned ? 'none' : 'scale(0.98)'};
    box-shadow: ${props => props.$isDisabled && !props.$isAssigned ? props.theme.shadows.small : props.theme.shadows.active};
    opacity: ${props => props.$isDisabled && !props.$isAssigned ? 0.7 : 0.95};
  }

  /* Tablet styles */
  @media (min-width: ${props => props.theme.breakpoints.tablet}) {
    padding: ${props => props.theme.spacing.responsive.medium};
    border-radius: ${props => props.theme.borderRadius.responsive.medium};
    min-height: 80px;
  }

  /* Small mobile styles */
  @media (max-width: ${props => props.theme.breakpoints.smallMobile}) {
    padding: ${props => props.theme.spacing.responsive.small};
    border-radius: ${props => props.theme.borderRadius.responsive.small};
    min-height: 64px;
  }
`;

const MitigationIcon = styled.div`
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: ${props => props.theme.borderRadius.responsive.medium};
  background-color: ${props => props.theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'};
  flex-shrink: 0;
  user-select: none; /* Prevent text selection */

  img {
    max-width: 36px;
    max-height: 36px;
    user-drag: none;
    -webkit-user-drag: none;
    user-select: none;
    -moz-user-select: none;
    -webkit-user-select: none;
    -ms-user-select: none;
  }

  /* Tablet styles */
  @media (min-width: ${props => props.theme.breakpoints.tablet}) {
    width: 56px;
    height: 56px;

    img {
      max-width: 42px;
      max-height: 42px;
    }
  }

  /* Small mobile styles */
  @media (max-width: ${props => props.theme.breakpoints.smallMobile}) {
    width: 40px;
    height: 40px;

    img {
      max-width: 32px;
      max-height: 32px;
    }
  }
`;

const MitigationContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: ${props => props.theme.spacing.responsive.small};
  user-select: none; /* Prevent text selection */
`;

const MitigationName = styled.div`
  font-weight: 600;
  font-size: ${props => props.theme.fontSizes.responsive.medium};
  color: ${props => props.theme.colors.text};

  /* Tablet styles */
  @media (min-width: ${props => props.theme.breakpoints.tablet}) {
    font-size: ${props => props.theme.fontSizes.responsive.large};
  }

  /* Small mobile styles */
  @media (max-width: ${props => props.theme.breakpoints.smallMobile}) {
    font-size: ${props => props.theme.fontSizes.responsive.small};
  }
`;

const MitigationDescription = styled.div`
  font-size: ${props => props.theme.fontSizes.responsive.small};
  color: ${props => props.theme.colors.lightText};
  line-height: 1.4;

  small {
    font-size: ${props => props.theme.fontSizes.responsive.xsmall};
    opacity: 0.8;
  }

  /* Tablet styles */
  @media (min-width: ${props => props.theme.breakpoints.tablet}) {
    font-size: ${props => props.theme.fontSizes.responsive.medium};

    small {
      font-size: ${props => props.theme.fontSizes.responsive.small};
    }
  }

  /* Small mobile styles */
  @media (max-width: ${props => props.theme.breakpoints.smallMobile}) {
    font-size: ${props => props.theme.fontSizes.xsmall};

    small {
      font-size: ${props => props.theme.fontSizes.xsmall};
    }
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
  padding: ${props => props.theme.spacing.responsive.medium};
  background-color: ${props => {
    if (props.$isTouched) {
      return props.theme.mode === 'dark' ? 'rgba(51, 153, 255, 0.25)' : 'rgba(51, 153, 255, 0.15)';
    }
    return props.theme.mode === 'dark' ? 'rgba(51, 153, 255, 0.2)' : 'rgba(51, 153, 255, 0.1)';
  }};
  border-radius: ${props => props.theme.borderRadius.responsive.medium};
  margin-bottom: ${props => props.theme.spacing.responsive.small};
  box-shadow: ${props => props.theme.shadows.small};
  transition: all 0.2s ease;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent; /* Remove default mobile tap highlight */
  touch-action: manipulation; /* Optimize for touch */
  user-select: none; /* Prevent text selection */
  min-height: 60px; /* Ensure minimum touch target size */

  /* Desktop hover effect */
  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background-color: ${props => props.theme.mode === 'dark' ? 'rgba(51, 153, 255, 0.25)' : 'rgba(51, 153, 255, 0.15)'};
      transform: translateY(-1px);
      box-shadow: ${props => props.theme.shadows.medium};
    }
  }

  /* Touch feedback */
  &:active {
    background-color: ${props => props.theme.mode === 'dark' ? 'rgba(51, 153, 255, 0.3)' : 'rgba(51, 153, 255, 0.2)'};
    transform: scale(0.98);
    box-shadow: ${props => props.theme.shadows.active};
    opacity: 0.95;
  }

  /* Tablet styles */
  @media (min-width: ${props => props.theme.breakpoints.tablet}) {
    padding: ${props => props.theme.spacing.responsive.medium};
    border-radius: ${props => props.theme.borderRadius.responsive.medium};
    min-height: 70px;
  }

  /* Small mobile styles */
  @media (max-width: ${props => props.theme.breakpoints.smallMobile}) {
    padding: ${props => props.theme.spacing.responsive.small};
    border-radius: ${props => props.theme.borderRadius.responsive.small};
    min-height: 50px;
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
  background-color: ${props => props.theme?.colors?.error || '#ef4444'};
  border: none;
  color: white;
  cursor: pointer;
  padding: ${props => props.theme.spacing.responsive.small} ${props => props.theme.spacing.responsive.medium};
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: ${props => props.theme.borderRadius.responsive.medium};
  gap: ${props => props.theme.spacing.responsive.xsmall};
  font-size: ${props => props.theme.fontSizes.responsive.small};
  font-weight: 500;
  min-height: 44px; /* Minimum touch target size */
  min-width: 80px; /* Minimum touch target width */
  -webkit-tap-highlight-color: transparent; /* Remove default mobile tap highlight */
  touch-action: manipulation; /* Optimize for touch */
  user-select: none; /* Prevent text selection */
  transition: all 0.2s ease;

  /* Desktop hover effect */
  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background-color: ${props => props.theme.mode === 'dark' ? 'rgba(255, 100, 100, 0.25)' : 'rgba(255, 100, 100, 0.15)'};
    }
  }

  /* Touch feedback */
  &:active {
    background-color: ${props => props.theme.mode === 'dark' ? 'rgba(255, 100, 100, 0.3)' : 'rgba(255, 100, 100, 0.2)'};
    transform: scale(0.95);
  }

  /* Tablet styles */
  @media (min-width: ${props => props.theme.breakpoints.tablet}) {
    padding: ${props => props.theme.spacing.responsive.small} ${props => props.theme.spacing.responsive.medium};
    font-size: ${props => props.theme.fontSizes.responsive.medium};
    min-width: 100px;
  }

  /* Small mobile styles */
  @media (max-width: ${props => props.theme.breakpoints.smallMobile}) {
    padding: ${props => props.theme.spacing.xsmall} ${props => props.theme.spacing.small};
    font-size: ${props => props.theme.fontSizes.xsmall};
    min-width: 70px;
    min-height: 40px;
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
  checkAbilityAvailability,
  bossLevel,
  selectedJobs
}) => {
  // Get the filter context
  const { filterMitigations, showAllMitigations } = useFilterContext();

  // Note: Pending assignments and charge/instance counts are now handled
  // by the enhanced mitigation system through checkAbilityAvailability

  // Get the tank position context
  const { tankPositions } = useTankPositionContext();

  // Get the tank selection modal context
  const { openTankSelectionModal } = useTankSelectionModalContext();

  // Add state to track the currently assigned mitigation
  // This is used to force a re-render when a mitigation is assigned
  const [justAssignedMitigation, setJustAssignedMitigation] = useState(null);

  // Add state to track local pending assignments
  // This ensures the component can update immediately even before the parent's state updates
  const [localPendingAssignments, setLocalPendingAssignments] = useState(pendingAssignments);

  // Add state to track if we're currently processing an assignment
  // This is used to prevent UI issues during processing
  const [isProcessingAssignment, setIsProcessingAssignment] = useState(false);

  // Add state to track touch feedback
  const [touchedMitigation, setTouchedMitigation] = useState(null);

  // Add state to track touched assigned mitigation
  const [touchedAssignedMitigation, setTouchedAssignedMitigation] = useState(null);

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
  const handleMitigationRemoval = useCallback((mitigationId, tankPosition = null) => {
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

      // Note: Pending assignments are now handled internally by the enhanced mitigation system

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

      // Find the mitigation in the current assignments to get its tank position
      const currentAssignments = assignments[bossAction.id] || [];
      const assignedMitigation = currentAssignments.find(m => m.id === mitigationId);
      
      // Get the full mitigation data
      const fullMitigation = mitigations.find(m => m.id === mitigationId);

      // Use the tank position from the assigned mitigation if available
      let positionToRemove = tankPosition || (assignedMitigation && assignedMitigation.tankPosition) || null;
      
      // If it's a tank-specific ability, make sure we're removing it with the correct tank position
      if (fullMitigation && fullMitigation.target === 'self' && fullMitigation.forTankBusters && !fullMitigation.forRaidWide) {
        const mainTankJob = tankPositions?.mainTank;
        const offTankJob = tankPositions?.offTank;
        
        const canMainTankUse = mainTankJob && fullMitigation.jobs.includes(mainTankJob);
        const canOffTankUse = offTankJob && fullMitigation.jobs.includes(offTankJob);
        
        // Override positionToRemove if we can determine the correct tank based on job compatibility
        if (canMainTankUse && !canOffTankUse) {
          positionToRemove = 'mainTank';
        } else if (canOffTankUse && !canMainTankUse) {
          positionToRemove = 'offTank';
        }
      }

      console.log('[DEBUG] Removing mitigation:', {
        mitigationName: fullMitigation?.name || mitigationId,
        tankPosition: positionToRemove,
        assignedPosition: assignedMitigation?.tankPosition || 'unknown'
      });

      // Remove the mitigation with the appropriate tank position
      onRemoveMitigation(bossAction.id, mitigationId, positionToRemove);

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
  }, [bossAction, justAssignedMitigation, onRemoveMitigation, assignments]);

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

      // Note: Pending assignments are now handled internally by the enhanced mitigation system

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

      // Initialize tankPosition
      // For non-tank-specific abilities, use 'shared'
      // Otherwise, will be determined based on specific conditions below
      let tankPosition = null;

      // If this is a tank buster and either:
      // 1. A self-targeting ability for tank busters, or
      // 2. A single-target ability for tank busters that can target tanks
// DEBUG: Log all relevant values before modal condition
console.log('[DEBUG] Modal Condition Check', {
  bossAction,
  mitigation,
  isTankBuster: bossAction.isTankBuster,
  isDualTankBuster: isDualTankBusterAction(bossAction),
  isDualTankBusterProperty: bossAction.isDualTankBuster,
  mitigationTarget: mitigation.target,
  forTankBusters: mitigation.forTankBusters,
  forRaidWide: mitigation.forRaidWide,
  targetsTank: mitigation.targetsTank
});
      if (bossAction.isTankBuster &&
          ((mitigation.target === 'self' && mitigation.forTankBusters && !mitigation.forRaidWide) ||
           (mitigation.target === 'single' && mitigation.forTankBusters && mitigation.targetsTank))) {

        // For dual tank busters, we need to ask which tank to apply the mitigation to
// DEBUG: Log when modal logic is triggered for dual tank buster
console.log('[DEBUG] Dual Tank Buster Modal Trigger:', {
  bossAction,
  mitigation,
  isDualTankBusterAction: isDualTankBusterAction(bossAction),
  isDualTankBusterProperty: bossAction.isDualTankBuster
});
        // Show modal if:
        // 1. It's a dual tank buster with single-target mitigation OR
        // 2. It's a dual tank buster with self-targeting tank mitigation that BOTH tanks can use
        if (isDualTankBusterAction(bossAction) && 
            ((mitigation.target === 'single') || 
             (mitigation.target === 'self' && mitigation.forTankBusters && !mitigation.forRaidWide &&
              tankPositions?.mainTank && tankPositions?.offTank && 
              mitigation.jobs.includes(tankPositions.mainTank) && mitigation.jobs.includes(tankPositions.offTank)))) {
          // Show the tank selection modal
          openTankSelectionModal(mitigation.name, (selectedTankPosition) => {
            // Process the mitigation assignment with the selected tank position
            onAssignMitigation(bossAction.id, mitigation, selectedTankPosition);

            // Reset processing flags
            setIsProcessingAssignment(false);
            isProcessingRef.current = false;

            // Dispatch custom event to notify MobileBottomSheet
            try {
              window.dispatchEvent(new Event('mitigation-processing-end'));
            } catch (eventError) {
              console.error('Error dispatching mitigation-processing-end event:', eventError);
            }
          }, mitigation, bossAction);

          // Return early since the modal callback will handle the assignment
          return;
        }
        // For class-specific self-targeting abilities, determine which tank can use it and explicitly force that assignment
        else if (mitigation.target === 'self' && mitigation.forTankBusters && !mitigation.forRaidWide) {
          const mainTankJob = tankPositions?.mainTank;
          const offTankJob = tankPositions?.offTank;
          
          // Check which tank can use this ability based on job compatibility
          const canMainTankUse = mainTankJob && mitigation.jobs.includes(mainTankJob);
          const canOffTankUse = offTankJob && mitigation.jobs.includes(offTankJob);
          
          if (canMainTankUse && !canOffTankUse) {
            // Only main tank can use this ability
            tankPosition = 'mainTank';
          } else if (canOffTankUse && !canMainTankUse) {
            // Only off tank can use this ability
            tankPosition = 'offTank';
          } else if (canMainTankUse && canOffTankUse) {
            // If both tanks can use it and a tank position isn't explicitly specified,
            // leave tankPosition as null and it will trigger the modal for dual tank busters
            // otherwise keep the specified tank position
            if (['mainTank', 'offTank'].includes(tankPosition)) {
              // Keep the explicit tank position that was specified
            } else {
              // For all other cases, if both can use it, set to null so a modal will appear
              tankPosition = null;
            }
          } else {
            // Neither tank can use it (shouldn't happen in normal usage)
            // Still specify a tank position to avoid using 'shared'
            tankPosition = mainTankJob ? 'mainTank' : 'offTank';
          }
        }
        // For other cases, if only one tank is selected, use that tank's position
        else if (tankPositions.mainTank) {
          tankPosition = 'mainTank';
        }
        else if (tankPositions.offTank) {
          tankPosition = 'offTank';
        }
      }

      // Debug log for tank-specific mitigations
      if (mitigation.target === 'self' && mitigation.forTankBusters && !mitigation.forRaidWide) {
        console.log('[DEBUG] Tank-specific self-targeting mitigation being assigned (MobileMitigationSelector):', {
          mitigationName: mitigation.name,
          tankPosition,
          mitigationJobs: mitigation.jobs,
          mainTankJob: tankPositions.mainTank,
          offTankJob: tankPositions.offTank,
          canMainTankUse: tankPositions.mainTank && mitigation.jobs.includes(tankPositions.mainTank),
          canOffTankUse: tankPositions.offTank && mitigation.jobs.includes(tankPositions.offTank)
        });
      }

      // Set default tank position if none has been set
      if (tankPosition === null) {
        // For party-wide mitigations, always use 'shared'
        if (!mitigation.forTankBusters || mitigation.forRaidWide) {
          tankPosition = 'shared';
        }
        // For other cases where no specific tank position was determined, default to a specific tank if available
        else if (tankPositions.mainTank) {
          tankPosition = 'mainTank';
        }
        else if (tankPositions.offTank) {
          tankPosition = 'offTank';
        }
        // Final fallback
        else {
          tankPosition = 'shared';
        }
      }

      // Log the final tank position before calling onAssignMitigation
      console.log(`[DEBUG] Final tank position for ${mitigation.name}: ${tankPosition}`);
      console.log('[DEBUG] Calling onAssignMitigation with:', {
        bossActionId: bossAction.id,
        mitigationName: mitigation.name,
        tankPosition: tankPosition,
        isTankSpecific: mitigation.target === 'self' && mitigation.forTankBusters && !mitigation.forRaidWide,
        jobs: mitigation.jobs,
        mainTankJob: tankPositions?.mainTank,
        offTankJob: tankPositions?.offTank,
        canMainTankUse: tankPositions?.mainTank && mitigation.jobs.includes(tankPositions.mainTank),
        canOffTankUse: tankPositions?.offTank && mitigation.jobs.includes(tankPositions.offTank)
      });

      // Then assign the mitigation to the boss action with the appropriate tank position
      // This ensures the UI updates immediately before the assignment is processed
      onAssignMitigation(bossAction.id, mitigation, tankPosition);

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

      // Note: Pending assignments are now handled internally by the enhanced mitigation system

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
  }, [bossAction, onAssignMitigation, tankPositions]);

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
          <>
            <UnmitigatedDamage>
              Unmitigated Damage: {bossAction.unmitigatedDamage}
            </UnmitigatedDamage>

            {/* Health Bars */}
            {(() => {
              // Parse the unmitigated damage value
              const parseUnmitigatedDamage = () => {
                if (!bossAction.unmitigatedDamage) return 0;

                // Extract numeric value from string (e.g., "~81,436" -> 81436)
                const damageString = bossAction.unmitigatedDamage.replace(/[^0-9]/g, '');
                return parseInt(damageString, 10) || 0;
              };

              // Get the current boss's base health values
              const currentBoss = bosses.find(boss => boss.level === bossLevel);
              const baseHealth = currentBoss ? currentBoss.baseHealth : { party: 80000, tank: 120000 };

              // Calculate mitigation and damage
              const unmitigatedDamage = parseUnmitigatedDamage();

              // Get all assigned mitigations for this boss action
              const directMitigations = assignments[bossAction.id] || [];

              // Filter out mitigations that don't have any corresponding selected jobs
              const filteredDirectMitigations = directMitigations.filter(mitigation =>
                isMitigationAvailable(mitigation, selectedJobs)
              );

              // Find all active mitigations from previous actions
              const activeMitigations = Object.entries(assignments)
                .filter(([actionId, mitigations]) => {
                  // Skip the current action
                  if (actionId === bossAction.id) return false;

                  // Get the boss action for this assignment
                  const action = Object.values(bossAction).find(a => a.id === actionId);

                  // Skip if we can't find the action or if it occurs after the current action
                  if (!action || action.time >= bossAction.time) return false;

                  // Check if any of the mitigations are still active at the current action's time
                  return mitigations.some(mitigation => {
                    const fullMitigation = mitigationAbilities.find(m => m.id === mitigation.id);
                    if (!fullMitigation) return false;

                    const duration = getAbilityDurationForLevel(fullMitigation, bossLevel);

                    // Check if the mitigation is still active
                    return (action.time + duration) >= bossAction.time;
                  });
                })
                .flatMap(([, mitigations]) => mitigations)
                .map(mitigation => {
                  // Find the full mitigation data
                  return mitigationAbilities.find(full => full.id === mitigation.id);
                })
                .filter(Boolean);

              // Filter out inherited mitigations that don't have any corresponding selected jobs
              const filteredActiveMitigations = activeMitigations.filter(mitigation =>
                isMitigationAvailable(mitigation, selectedJobs)
              );

              // Combine both types of mitigations
              const allMitigations = [...filteredDirectMitigations, ...filteredActiveMitigations];

              // Calculate barrier mitigations
              const barrierMitigations = allMitigations.filter(m => m.type === 'barrier');

              // Calculate mitigation percentage
              const mitigationPercentage = calculateTotalMitigation(allMitigations, bossAction.damageType, bossLevel);
              const mitigatedDamage = calculateMitigatedDamage(unmitigatedDamage, mitigationPercentage);

              // Calculate barrier amounts for party and tank
              const partyBarrierAmount = barrierMitigations.reduce((total, mitigation) => {
                if (!mitigation.barrierPotency) return total;

                // Only count party-wide barriers for party health bar
                if (mitigation.target === 'party') {
                  return total + calculateBarrierAmount(mitigation, baseHealth.party);
                }

                return total;
              }, 0);

              const tankBarrierAmount = barrierMitigations.reduce((total, mitigation) => {
                if (!mitigation.barrierPotency) return total;

                // Count both tank-specific and party-wide barriers for tank health bar
                if (mitigation.target === 'party' || mitigation.targetsTank) {
                  return total + calculateBarrierAmount(mitigation, baseHealth.tank);
                }

                return total;
              }, 0);

              // Calculate tank-specific mitigation percentages
              const mainTankMitigations = bossAction.isTankBuster && tankPositions.mainTank ?
                allMitigations.filter(m => {
                  // Get the full mitigation ability data
                  const fullMitigation = mitigationAbilities.find(ability => ability.id === m.id);
                  if (!fullMitigation) return false;

                  // For self-targeting abilities (like Rampart), only include if they match this tank position
                  if (fullMitigation.target === 'self') {
                    return m.tankPosition === 'mainTank';
                  }

                  // For single-target abilities (like Intervention), only include if they're targeted at this tank
                  if (fullMitigation.target === 'single') {
                    return m.tankPosition === 'mainTank';
                  }

                  // For party-wide abilities (like Reprisal), include for all tanks
                  if (fullMitigation.target === 'party' || fullMitigation.target === 'area') {
                    return true;
                  }

                  // Include mitigations specifically for this tank position
                  if (m.tankPosition === 'mainTank') {
                    return true;
                  }

                  // Include shared mitigations
                  if (m.tankPosition === 'shared') {
                    return true;
                  }

                  return false;
                }) : [];

              const offTankMitigations = bossAction.isTankBuster && tankPositions.offTank ?
                allMitigations.filter(m => {
                  // Get the full mitigation ability data
                  const fullMitigation = mitigationAbilities.find(ability => ability.id === m.id);
                  if (!fullMitigation) return false;

                  // For self-targeting abilities (like Rampart), only include if they match this tank position
                  if (fullMitigation.target === 'self') {
                    return m.tankPosition === 'offTank';
                  }

                  // For single-target abilities (like Intervention), only include if they're targeted at this tank
                  if (fullMitigation.target === 'single') {
                    return m.tankPosition === 'offTank';
                  }

                  // For party-wide abilities (like Reprisal), include for all tanks
                  if (fullMitigation.target === 'party' || fullMitigation.target === 'area') {
                    return true;
                  }

                  // Include mitigations specifically for this tank position
                  if (m.tankPosition === 'offTank') {
                    return true;
                  }

                  // Include shared mitigations
                  if (m.tankPosition === 'shared') {
                    return true;
                  }

                  return false;
                }) : [];

              // Always calculate from the filtered mitigations, never fall back to the general percentage
              const mainTankMitigationPercentage = calculateTotalMitigation(mainTankMitigations, bossAction.damageType, bossLevel);
              const offTankMitigationPercentage = calculateTotalMitigation(offTankMitigations, bossAction.damageType, bossLevel);

              const mainTankMitigatedDamage = calculateMitigatedDamage(unmitigatedDamage, mainTankMitigationPercentage);
              const offTankMitigatedDamage = calculateMitigatedDamage(unmitigatedDamage, offTankMitigationPercentage);

              // Calculate barrier amounts for main tank
              const mainTankBarrierAmount = bossAction.isTankBuster && tankPositions.mainTank ?
                barrierMitigations.filter(m => {
                  // Get the full mitigation ability data
                  const fullMitigation = mitigationAbilities.find(ability => ability.id === m.id);
                  if (!fullMitigation) return false;

                  // For self-targeting barriers, only include if they match this tank position
                  if (fullMitigation.target === 'self') {
                    return m.tankPosition === 'mainTank';
                  }

                  // For single-target barriers, only include if they're targeted at this tank
                  if (fullMitigation.target === 'single') {
                    return m.tankPosition === 'mainTank';
                  }

                  // For party-wide barriers, include for all tanks
                  if (fullMitigation.target === 'party' || fullMitigation.target === 'area') {
                    return true;
                  }

                  // Include barriers specifically for this tank position
                  if (m.tankPosition === 'mainTank' || m.tankPosition === 'shared') {
                    return true;
                  }

                  return false;
                }).reduce((total, mitigation) => {
                  if (!mitigation.barrierPotency) return total;
                  return total + calculateBarrierAmount(mitigation, baseHealth.tank);
                }, 0) : tankBarrierAmount;

              // Calculate barrier amounts for off tank
              const offTankBarrierAmount = bossAction.isTankBuster && tankPositions.offTank ?
                barrierMitigations.filter(m => {
                  // Get the full mitigation ability data
                  const fullMitigation = mitigationAbilities.find(ability => ability.id === m.id);
                  if (!fullMitigation) return false;

                  // For self-targeting barriers, only include if they match this tank position
                  if (fullMitigation.target === 'self') {
                    return m.tankPosition === 'offTank';
                  }

                  // For single-target barriers, only include if they're targeted at this tank
                  if (fullMitigation.target === 'single') {
                    return m.tankPosition === 'offTank';
                  }

                  // For party-wide barriers, include for all tanks
                  if (fullMitigation.target === 'party' || fullMitigation.target === 'area') {
                    return true;
                  }

                  // Include barriers specifically for this tank position
                  if (m.tankPosition === 'offTank' || m.tankPosition === 'shared') {
                    return true;
                  }

                  return false;
                }).reduce((total, mitigation) => {
                  if (!mitigation.barrierPotency) return total;
                  return total + calculateBarrierAmount(mitigation, baseHealth.tank);
                }, 0) : tankBarrierAmount;

              return (
                <>
                  {/* For dual tank busters, show separate mitigation displays for each tank */}
                  {bossAction.isTankBuster && bossAction.isDualTankBuster && (
                    <TankMitigationDisplay
                      mainTankMitigations={mainTankMitigations}
                      offTankMitigations={offTankMitigations}
                      damageType={bossAction.damageType}
                      bossLevel={bossLevel}
                      mainTankJob={tankPositions.mainTank}
                      offTankJob={tankPositions.offTank}
                    />
                  )}

                  {/* Health bars for tank busters and non-tank busters */}
                  {bossAction.isTankBuster ? (
                    bossAction.isDualTankBuster ? (
                      <>
                        {/* Main Tank - show "N/A" if no tank is selected */}
                        <HealthBar
                          label={`Main Tank (${tankPositions.mainTank || 'N/A'})`}
                          maxHealth={baseHealth.tank}
                          currentHealth={baseHealth.tank}
                          damageAmount={mainTankMitigatedDamage}
                          barrierAmount={mainTankBarrierAmount}
                          isTankBuster={true}
                          tankPosition="mainTank"
                          isDualTankBuster={true}
                        />

                        {/* Off Tank - show "N/A" if no tank is selected */}
                        <HealthBar
                          label={`Off Tank (${tankPositions.offTank || 'N/A'})`}
                          maxHealth={baseHealth.tank}
                          currentHealth={baseHealth.tank}
                          damageAmount={offTankMitigatedDamage}
                          barrierAmount={offTankBarrierAmount}
                          isTankBuster={true}
                          tankPosition="offTank"
                          isDualTankBuster={true}
                        />
                      </>
                    ) : (
                      // For single-target tank busters, only show the Main Tank health bar
                      <HealthBar
                        label={`Main Tank (${tankPositions.mainTank || 'N/A'})`}
                        maxHealth={baseHealth.tank}
                        currentHealth={baseHealth.tank}
                        damageAmount={tankPositions.mainTank ? mainTankMitigatedDamage : mitigatedDamage}
                        barrierAmount={tankPositions.mainTank ? mainTankBarrierAmount : tankBarrierAmount}
                        isTankBuster={true}
                        tankPosition="mainTank"
                      />
                    )
                  ) : (
                    /* Only show party health bar for non-tank busters */
                    <HealthBar
                      label="Party Health"
                      maxHealth={baseHealth.party}
                      currentHealth={baseHealth.party}
                      damageAmount={mitigatedDamage}
                      barrierAmount={partyBarrierAmount}
                      isTankBuster={false}
                    />
                  )}
                </>
              );
            })()}
          </>
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

            // Get enhanced cooldown information for this mitigation
            const availability = checkAbilityAvailability(
              mitigation.id,
              bossAction.time,
              bossAction.id,
              { isBeingAssigned: false }
            );

            // Check if the ability has no available charges or instances
            const hasNoAvailableCharges = availability.totalCharges > 1 && availability.availableCharges === 0;
            const hasNoAvailableInstances = availability.isRoleShared && availability.availableInstances === 0;

            // A mitigation is disabled if:
            // 1. It cannot be assigned (based on enhanced cooldown system), OR
            // 2. It has no available charges or instances
            // 3. BUT, if it was just assigned, we want to allow immediate removal
            const isDisabled = !wasJustAssigned && (
                              !availability.canAssign() ||
                              hasNoAvailableCharges ||
                              hasNoAvailableInstances
                              );

            // Get the cooldown reason if applicable
            let cooldownReason = null;

            // Skip cooldown reason if this mitigation was just assigned
            // This ensures the UI doesn't show a cooldown reason for a mitigation that was just assigned
            if (!wasJustAssigned && !availability.canAssign()) {
              // Use enhanced cooldown system for reason
              cooldownReason = availability.getUnavailabilityReason ? availability.getUnavailabilityReason() : 'Unavailable';
            }

            return (
              <MitigationItem
                key={mitigation.id}
                $isDisabled={isDisabled}
                $isAssigned={isAssigned}
                $isTouched={touchedMitigation === mitigation.id}
                onClick={() => {
                  if (isAssigned) {
                    // If already assigned, handle removal
                    handleMitigationRemoval(mitigation.id);
                  } else if (!isDisabled) {
                    // If not assigned and not disabled, handle assignment
                    handleMitigationAssignment(mitigation);
                  }
                }}
                onTouchStart={() => setTouchedMitigation(mitigation.id)}
                onTouchEnd={() => setTouchedMitigation(null)}
                onTouchCancel={() => setTouchedMitigation(null)}
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
                      // Prevent event bubbling
                      e.stopPropagation();
                      e.preventDefault();

                      // Add a small delay to ensure the click is processed
                      setTimeout(() => {
                        // Use our helper function for removal
                        handleMitigationRemoval(mitigation.id);
                      }, 10);
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
                $isTouched={touchedAssignedMitigation === mitigation.id}
                onClick={() => {
                  // Use our helper function for removal
                  handleMitigationRemoval(mitigation.id);
                }}
                onTouchStart={() => setTouchedAssignedMitigation(mitigation.id)}
                onTouchEnd={() => setTouchedAssignedMitigation(null)}
                onTouchCancel={() => setTouchedAssignedMitigation(null)}
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
                    // Prevent event bubbling
                    e.stopPropagation();
                    e.preventDefault();

                    // Add a small delay to ensure the click is processed
                    setTimeout(() => {
                      // Use our helper function for removal
                      handleMitigationRemoval(mitigation.id);
                    }, 10);
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
