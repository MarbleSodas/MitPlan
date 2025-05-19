import React, { memo, useState, useCallback } from 'react';
import styled from 'styled-components';
import Tooltip from '../common/Tooltip/Tooltip';
import HealthBar from '../common/HealthBar';
import AetherflowGauge from '../AetherflowGauge';
import {
  calculateTotalMitigation,
  formatMitigation,
  generateMitigationBreakdown,
  isMitigationAvailable,
  calculateMitigatedDamage,
  calculateBarrierAmount,
  isTouchDevice
} from '../../utils';
import { isDualTankBusterAction } from '../../utils/boss/bossActionUtils';
import { mitigationAbilities, bosses } from '../../data';
import { useAetherflowContext, useTankPositionContext, useTankSelectionModalContext } from '../../contexts';

const BossAction = styled.div`
  background-color: ${props => {
    if (props.$isSelected) {
      return props.theme.mode === 'dark' ? 'rgba(51, 153, 255, 0.2)' : 'rgba(51, 153, 255, 0.1)';
    }
    if (props.$isTouched) {
      return props.theme.mode === 'dark' ? 'rgba(51, 153, 255, 0.15)' : 'rgba(51, 153, 255, 0.05)';
    }
    return props.theme.colors.cardBackground;
  }};
  border-radius: ${props => props.theme.borderRadius.responsive.medium};
  padding: ${props => props.theme.spacing.medium};
  padding-top: 40px; /* Fixed padding at top for time indicator */
  padding-right: ${props => props.$hasAssignments ? '165px' : props.theme.spacing.medium}; /* Extra space on right for mitigations */
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
  -webkit-tap-highlight-color: transparent; /* Remove default mobile tap highlight */
  touch-action: manipulation; /* Optimize for touch */
  user-select: none; /* Prevent text selection on touch */

  /* Desktop hover effect */
  @media (hover: hover) and (pointer: fine) {
    &:hover {
      box-shadow: ${props => props.theme.shadows.hover};
      /* Removed transform animation for better performance */
      border-color: ${props => props.theme.colors.primary};
    }
  }

  /* Touch feedback */
  &:active {
    /* Removed transform scale for better performance */
    box-shadow: ${props => props.theme.shadows.active};
    opacity: 0.95;
  }

  /* Tablet styles */
  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    padding: ${props => props.theme.spacing.responsive.medium};
    padding-top: 40px;
    padding-right: ${props => props.$hasAssignments ? '150px' : props.theme.spacing.responsive.medium};
    min-height: 130px;
    border-radius: ${props => props.theme.borderRadius.responsive.medium};
  }

  /* Mobile styles */
  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.responsive.small};
    padding-top: 35px; /* Slightly smaller padding for time indicator on mobile */
    padding-right: ${props => props.$hasAssignments ? '110px' : props.theme.spacing.responsive.small}; /* Increased space for mitigations on mobile */
    min-height: 120px; /* Smaller minimum height on mobile */
    margin-bottom: ${props => props.theme.spacing.responsive.small}; /* Increased spacing between boss actions */
    position: relative; /* Ensure proper positioning context for absolute elements */
    border-radius: ${props => props.theme.borderRadius.responsive.small};
  }

  /* Small mobile styles */
  @media (max-width: ${props => props.theme.breakpoints.smallMobile}) {
    padding: ${props => props.theme.spacing.small};
    padding-top: 30px;
    padding-right: ${props => props.$hasAssignments ? '100px' : props.theme.spacing.small};
    min-height: 110px;
    margin-bottom: ${props => props.theme.spacing.small};
  }
`;

const ActionTime = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: 8px;
  font-size: ${props => props.theme.fontSizes.responsive.medium};
  font-weight: bold;
  color: ${props => props.theme.colors.text};
  background-color: ${props => props.theme.mode === 'dark' ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.1)'};
  border-bottom: 1px solid ${props => props.theme.colors.border};
  border-top-left-radius: ${props => props.theme.borderRadius.responsive.medium};
  border-top-right-radius: ${props => props.theme.borderRadius.responsive.medium};
  text-align: center;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none; /* Prevent text selection */
  z-index: 1; /* Ensure it's above other elements */

  &::before {
    content: '⏱️';
    margin-right: 5px;
    font-size: 1em;
  }

  /* Tablet styles */
  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    font-size: ${props => props.theme.fontSizes.responsive.medium};
    padding: 8px;
    height: 28px;
    border-top-left-radius: ${props => props.theme.borderRadius.responsive.medium};
    border-top-right-radius: ${props => props.theme.borderRadius.responsive.medium};
  }

  /* Mobile styles */
  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: ${props => props.theme.fontSizes.responsive.small};
    padding: 6px;
    height: 24px;
    border-top-left-radius: ${props => props.theme.borderRadius.responsive.small};
    border-top-right-radius: ${props => props.theme.borderRadius.responsive.small};
  }

  /* Small mobile styles */
  @media (max-width: ${props => props.theme.breakpoints.smallMobile}) {
    font-size: ${props => props.theme.fontSizes.small};
    padding: 4px;
    height: 22px;
    border-top-left-radius: ${props => props.theme.borderRadius.small};
    border-top-right-radius: ${props => props.theme.borderRadius.small};
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
  user-select: none; /* Prevent text selection */

  /* Tablet styles */
  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    width: 30px;
    height: 30px;
    margin-right: 10px;
  }

  /* Mobile styles */
  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    width: 28px;
    height: 28px;
    margin-right: 8px;
  }

  /* Small mobile styles */
  @media (max-width: ${props => props.theme.breakpoints.smallMobile}) {
    width: 24px;
    height: 24px;
    margin-right: 6px;
  }
`;

const ActionName = styled.h3`
  margin: 0;
  font-size: ${props => props.theme.fontSizes.responsive.large};
  font-weight: bold;
  flex-grow: 1;
  user-select: none; /* Prevent text selection */

  /* Tablet styles */
  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    font-size: ${props => props.theme.fontSizes.responsive.medium};
  }

  /* Mobile styles */
  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: ${props => props.theme.fontSizes.responsive.medium};
  }

  /* Small mobile styles */
  @media (max-width: ${props => props.theme.breakpoints.smallMobile}) {
    font-size: ${props => props.theme.fontSizes.responsive.small};
  }
`;

const ActionDescription = styled.p`
  margin: 0;
  color: ${props => props.theme.colors.lightText};
  font-size: ${props => props.theme.fontSizes.responsive.medium};
  font-weight: ${props => props.theme.mode === 'dark' ? '500' : 'normal'};
  min-height: 40px; /* Ensure all descriptions have at least this height */
  flex-grow: 1; /* Allow description to grow and fill available space */
  line-height: 1.5; /* Improve readability */
  padding-left: 2px; /* Slight indent */
  margin-bottom: ${props => props.theme.spacing.medium}; /* Add space before mitigations */
  width: ${props => props.$hasAssignments ? 'calc(100% - 100px)' : '100%'}; /* Ensure description doesn't flow into assignments */
  max-width: ${props => props.$hasAssignments ? 'calc(100% - 100px)' : '100%'}; /* Ensure description doesn't flow into assignments */
  overflow-wrap: break-word; /* Ensure long words don't overflow */
  word-wrap: break-word; /* For older browsers */
  hyphens: auto; /* Allow hyphenation for very long words */
  white-space: normal; /* Ensure text wraps properly */

  /* Tablet styles */
  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    font-size: ${props => props.theme.fontSizes.responsive.medium};
    min-height: 36px;
    line-height: 1.4;
    margin-bottom: ${props => props.theme.spacing.responsive.medium};
    width: ${props => props.$hasAssignments ? 'calc(100% - 80px)' : '100%'};
    max-width: ${props => props.$hasAssignments ? 'calc(100% - 80px)' : '100%'};
  }

  /* Mobile styles */
  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: ${props => props.theme.fontSizes.responsive.small};
    min-height: 32px;
    line-height: 1.3;
    margin-bottom: ${props => props.theme.spacing.responsive.small};
    width: ${props => props.$hasAssignments ? 'calc(100% - 40px)' : '100%'};
    max-width: ${props => props.$hasAssignments ? 'calc(100% - 40px)' : '100%'};
  }

  /* Small mobile styles */
  @media (max-width: ${props => props.theme.breakpoints.smallMobile}) {
    font-size: ${props => props.theme.fontSizes.small};
    min-height: 28px;
    line-height: 1.2;
    margin-bottom: ${props => props.theme.spacing.small};
    width: ${props => props.$hasAssignments ? 'calc(100% - 30px)' : '100%'};
    max-width: ${props => props.$hasAssignments ? 'calc(100% - 30px)' : '100%'};
  }
`;
const MitigationPercentage = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background-color: ${props => props.theme.mode === 'dark' ? 'rgba(51, 153, 255, 0.2)' : 'rgba(51, 153, 255, 0.1)'};
  color: ${props => props.theme.colors.text};
  font-weight: bold;
  font-size: ${props => props.theme.fontSizes.responsive.medium};
  padding: 6px 10px;
  border-radius: ${props => props.theme.borderRadius.responsive.small};
  margin-top: 8px;
  margin-bottom: 12px;
  border: 1px solid ${props => props.theme.mode === 'dark' ? 'rgba(51, 153, 255, 0.3)' : 'rgba(51, 153, 255, 0.2)'};
  user-select: none; /* Prevent text selection */
  min-height: 36px; /* Ensure minimum touch target size */
  min-width: 100px; /* Ensure minimum touch target width */

  &::before {
    content: '🛡️';
    margin-right: 6px;
  }

  /* Tablet styles */
  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    font-size: ${props => props.theme.fontSizes.responsive.medium};
    padding: 6px 10px;
    min-height: 34px;
  }

  /* Mobile styles */
  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: ${props => props.theme.fontSizes.responsive.small};
    padding: 5px 8px;
    margin-top: 6px;
    margin-bottom: 10px;
    min-height: 32px;
  }

  /* Small mobile styles */
  @media (max-width: ${props => props.theme.breakpoints.smallMobile}) {
    font-size: ${props => props.theme.fontSizes.small};
    padding: 4px 6px;
    margin-top: 4px;
    margin-bottom: 8px;
    min-height: 30px;
  }
`;

const MultiHitIndicator = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background-color: ${props => props.theme.mode === 'dark' ? 'rgba(255, 102, 0, 0.2)' : 'rgba(255, 102, 0, 0.1)'};
  color: ${props => props.theme.colors.text};
  font-weight: bold;
  font-size: ${props => props.theme.fontSizes.responsive.medium};
  padding: 6px 10px;
  border-radius: ${props => props.theme.borderRadius.responsive.small};
  margin-top: 8px;
  margin-right: 10px;
  margin-bottom: 12px;
  border: 1px solid ${props => props.theme.mode === 'dark' ? 'rgba(255, 102, 0, 0.3)' : 'rgba(255, 102, 0, 0.2)'};
  user-select: none; /* Prevent text selection */
  min-height: 36px; /* Ensure minimum touch target size */
  min-width: 100px; /* Ensure minimum touch target width */

  &::before {
    content: '💥';
    margin-right: 6px;
  }

  /* Tablet styles */
  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    font-size: ${props => props.theme.fontSizes.responsive.medium};
    padding: 6px 10px;
    min-height: 34px;
  }

  /* Mobile styles */
  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: ${props => props.theme.fontSizes.responsive.small};
    padding: 5px 8px;
    margin-top: 6px;
    margin-right: 8px;
    margin-bottom: 10px;
    min-height: 32px;
  }

  /* Small mobile styles */
  @media (max-width: ${props => props.theme.breakpoints.smallMobile}) {
    font-size: ${props => props.theme.fontSizes.small};
    padding: 4px 6px;
    margin-top: 4px;
    margin-right: 6px;
    margin-bottom: 8px;
    min-height: 30px;
  }
`;

const BossActionItem = memo(({
  action,
  isSelected,
  assignments,
  getActiveMitigations,
  selectedJobs,
  currentBossLevel,
  onClick,
  children
}) => {
  // State for touch feedback
  const [isTouched, setIsTouched] = useState(false);
  const isTouch = isTouchDevice();

  // Tank selection modal context
  const { openTankSelectionModal } = useTankSelectionModalContext();

  // Handler for assigning mitigation (single-target, dual tank buster)
  const handleAssignMitigation = useCallback((mitigation, assignCallback) => {
    // DEBUG: Log all relevant values before modal condition in BossActionItem
    console.log('[DEBUG] BossActionItem Modal Condition Check', {
      action,
      mitigation,
      isTankBuster: action.isTankBuster,
      isDualTankBuster: isDualTankBusterAction(action),
      isDualTankBusterProperty: action.isDualTankBuster,
      mitigationTarget: mitigation.target
    });

    if (
      mitigation.target === 'single' &&
      isDualTankBusterAction(action)
    ) {
      // DEBUG: Log when modal logic is triggered for dual tank buster in BossActionItem
      console.log('[DEBUG] BossActionItem Dual Tank Buster Modal Trigger:', {
        action,
        mitigation,
        isDualTankBusterAction: isDualTankBusterAction(action),
        isDualTankBusterProperty: action.isDualTankBuster
      });

      openTankSelectionModal(mitigation.name, (selectedTankPosition) => {
        assignCallback(selectedTankPosition);
      });
      return;
    }
    // Default assignment (no modal)
    assignCallback();
  }, [action, openTankSelectionModal]);

  // Touch event handlers
  const handleTouchStart = useCallback(() => {
    setIsTouched(true);
  }, []);

  const handleTouchEnd = useCallback(() => {
    setIsTouched(false);
  }, []);

  const handleTouchCancel = useCallback(() => {
    setIsTouched(false);
  }, []);

  // Click handler with touch optimization
  const handleClick = useCallback((e) => {
    // Prevent default behavior to avoid double-tap zoom on mobile
    if (isTouch) {
      e.preventDefault();
    }

    // Call the original onClick handler
    onClick(e);
  }, [onClick, isTouch]);

  // Calculate if this action has any assignments
  const hasAssignments =
    (assignments[action.id] && assignments[action.id].filter(mitigation =>
      isMitigationAvailable(mitigation, selectedJobs)
    ).length > 0) ||
    getActiveMitigations(action.id, action.time).filter(mitigation => {
      const fullMitigation = mitigationAbilities.find(m => m.id === mitigation.id);
      return fullMitigation && isMitigationAvailable(fullMitigation, selectedJobs);
    }).length > 0;
  // Calculate total mitigation
  const calculateMitigationInfo = (tankPosition = null) => {
    // Get directly assigned mitigations
    const directMitigations = assignments[action.id] || [];

    // Filter out mitigations that don't have any corresponding selected jobs
    let filteredDirectMitigations = directMitigations.filter(mitigation =>
      isMitigationAvailable(mitigation, selectedJobs)
    );

    // If a tank position is specified, filter mitigations by tank position and targeting type
    if (tankPosition) {
      filteredDirectMitigations = filteredDirectMitigations.filter(mitigation => {
        // Get the full mitigation ability data
        const fullMitigation = mitigationAbilities.find(m => m.id === mitigation.id);
        if (!fullMitigation) return false;

        // For self-targeting abilities (like Rampart), only include if they match this tank position
        if (fullMitigation.target === 'self') {
          return mitigation.tankPosition === tankPosition;
        }

        // For single-target abilities (like Intervention, Heart of Corundum)
        // Only include if they're specifically targeted at this tank position
        if (fullMitigation.target === 'single') {
          return mitigation.tankPosition === tankPosition;
        }

        // For party-wide abilities (like Reprisal, Divine Veil), include for all tanks
        if (fullMitigation.target === 'party' || fullMitigation.target === 'area') {
          return true;
        }

        // Include mitigations specifically for this tank position
        if (mitigation.tankPosition === tankPosition) {
          return true;
        }

        // Include shared mitigations
        if (mitigation.tankPosition === 'shared') {
          return true;
        }

        return false;
      });
    }

    // Get inherited mitigations from previous actions
    const inheritedMitigations = getActiveMitigations(action.id, action.time, tankPosition)
      .map(m => {
        // Find the full mitigation data
        return mitigationAbilities.find(full => full.id === m.id);
      }).filter(Boolean);

    // Filter out inherited mitigations that don't have any corresponding selected jobs
    const filteredInheritedMitigations = inheritedMitigations.filter(mitigation =>
      isMitigationAvailable(mitigation, selectedJobs)
    );

    // If a tank position is specified, filter inherited mitigations by targeting type
    if (tankPosition) {
      const filteredByTarget = filteredInheritedMitigations.filter(mitigation => {
        // For self-targeting abilities (like Rampart), check if they were applied to this tank
        if (mitigation.target === 'self') {
          // Find the original assignment to check its tank position
          const originalAssignment = getActiveMitigations(action.id, action.time, tankPosition)
            .find(m => m.id === mitigation.id);
          return originalAssignment && originalAssignment.tankPosition === tankPosition;
        }

        // For single-target abilities, check if they were cast on this tank
        if (mitigation.target === 'single') {
          // Find the original assignment to check its tank position
          const originalAssignment = getActiveMitigations(action.id, action.time, tankPosition)
            .find(m => m.id === mitigation.id);
          return originalAssignment && originalAssignment.tankPosition === tankPosition;
        }

        // For party-wide abilities, always include
        if (mitigation.target === 'party' || mitigation.target === 'area') {
          return true;
        }

        // For abilities without a specific target, include only if they're shared or for this tank
        const originalAssignment = getActiveMitigations(action.id, action.time, tankPosition)
          .find(m => m.id === mitigation.id);
        return originalAssignment &&
          (originalAssignment.tankPosition === 'shared' || originalAssignment.tankPosition === tankPosition);
      });

      // Use the filtered list
      return {
        allMitigations: [...filteredDirectMitigations, ...filteredByTarget],
        barrierMitigations: [...filteredDirectMitigations, ...filteredByTarget].filter(m => m.type === 'barrier'),
        hasMitigations: filteredDirectMitigations.length > 0 || filteredByTarget.length > 0
      };
    }

    // Combine both types of mitigations
    const allMitigations = [...filteredDirectMitigations, ...filteredInheritedMitigations];

    // Calculate barrier amount
    const barrierMitigations = allMitigations.filter(m => m.type === 'barrier');

    return {
      allMitigations,
      barrierMitigations,
      hasMitigations: allMitigations.length > 0
    };
  };

  // Get general mitigation info (for display in the UI)
  const { allMitigations, barrierMitigations, hasMitigations } = calculateMitigationInfo();

  // Get Aetherflow context
  const { isScholarSelected } = useAetherflowContext();

  // Get tank position context
  const { tankPositions } = useTankPositionContext();

  // Get the current boss's base health values
  const currentBoss = bosses.find(boss => boss.level === currentBossLevel);
  const baseHealth = currentBoss ? currentBoss.baseHealth : { party: 80000, tank: 120000 };

  // Parse the unmitigated damage value
  const parseUnmitigatedDamage = () => {
    if (!action.unmitigatedDamage) return 0;

    // Extract numeric value from string (e.g., "~81,436" -> 81436)
    const damageString = action.unmitigatedDamage.replace(/[^0-9]/g, '');
    return parseInt(damageString, 10) || 0;
  };

  const unmitigatedDamage = parseUnmitigatedDamage();

  // Calculate general mitigation percentage (for display in the UI)
  const mitigationPercentage = calculateTotalMitigation(allMitigations, action.damageType, currentBossLevel);
  const mitigatedDamage = calculateMitigatedDamage(unmitigatedDamage, mitigationPercentage);

  // Calculate tank-specific mitigation percentages
  // Get the mitigation info for each tank position
  const mainTankMitigationInfo = action.isTankBuster && tankPositions.mainTank ?
    calculateMitigationInfo('mainTank') : { allMitigations: [], barrierMitigations: [] };
  const offTankMitigationInfo = action.isTankBuster && tankPositions.offTank ?
    calculateMitigationInfo('offTank') : { allMitigations: [], barrierMitigations: [] };

  // Extract the mitigations for each tank
  const mainTankMitigations = mainTankMitigationInfo.allMitigations;
  const offTankMitigations = offTankMitigationInfo.allMitigations;

  // Calculate the mitigation percentages for each tank
  // Always calculate from the filtered mitigations, never fall back to the general percentage
  const mainTankMitigationPercentage = calculateTotalMitigation(mainTankMitigations, action.damageType, currentBossLevel);
  const offTankMitigationPercentage = calculateTotalMitigation(offTankMitigations, action.damageType, currentBossLevel);

  // Calculate the mitigated damage for each tank
  const mainTankMitigatedDamage = calculateMitigatedDamage(unmitigatedDamage, mainTankMitigationPercentage);
  const offTankMitigatedDamage = calculateMitigatedDamage(unmitigatedDamage, offTankMitigationPercentage);
  // Calculate barrier amounts for party and tanks
  const partyBarrierAmount = barrierMitigations.reduce((total, mitigation) => {
    if (!mitigation.barrierPotency) return total;

    // Only count party-wide barriers for party health bar
    if (mitigation.target === 'party') {
      return total + calculateBarrierAmount(mitigation, baseHealth.party);
    }

    return total;
  }, 0);

  // Generic tank barrier amount for when no tank positions are assigned
  const tankBarrierAmount = barrierMitigations.reduce((total, mitigation) => {
    if (!mitigation.barrierPotency) return total;

    // For party-wide barriers, include for all tanks
    if (mitigation.target === 'party') {
      return total + calculateBarrierAmount(mitigation, baseHealth.tank);
    }

    // For self-targeting barriers, only include if they're assigned to a tank
    if (mitigation.target === 'self' && mitigation.tankPosition) {
      // Since we don't know which tank this is for in the generic case,
      // only include if it's marked as shared
      if (mitigation.tankPosition === 'shared') {
        return total + calculateBarrierAmount(mitigation, baseHealth.tank);
      }
      return total;
    }

    // For single-target barriers, only include if they're assigned to a tank
    if (mitigation.target === 'single' && mitigation.tankPosition) {
      // Since we don't know which tank this is for in the generic case,
      // only include if it's marked as shared
      if (mitigation.tankPosition === 'shared') {
        return total + calculateBarrierAmount(mitigation, baseHealth.tank);
      }
      return total;
    }

    // For other barriers that target tanks
    if (mitigation.targetsTank) {
      return total + calculateBarrierAmount(mitigation, baseHealth.tank);
    }

    return total;
  }, 0);

  // Calculate barrier amounts for main tank using the same filtering logic as for mitigations
  const mainTankBarrierAmount = action.isTankBuster && tankPositions.mainTank ?
    mainTankMitigationInfo.barrierMitigations.reduce((total, mitigation) => {
      if (!mitigation.barrierPotency) return total;

      // For self-targeting barriers, only include if they match this tank position
      if (mitigation.target === 'self') {
        if (mitigation.tankPosition === 'mainTank') {
          return total + calculateBarrierAmount(mitigation, baseHealth.tank);
        }
        return total;
      }

      // For single-target barriers, only include if they're targeted at this tank
      if (mitigation.target === 'single') {
        if (mitigation.tankPosition === 'mainTank') {
          return total + calculateBarrierAmount(mitigation, baseHealth.tank);
        }
        return total;
      }

      // For party-wide barriers, include for all tanks
      if (mitigation.target === 'party' || mitigation.target === 'area') {
        return total + calculateBarrierAmount(mitigation, baseHealth.tank);
      }

      // Include barriers specifically for this tank position
      if (mitigation.tankPosition === 'mainTank' || mitigation.tankPosition === 'shared') {
        return total + calculateBarrierAmount(mitigation, baseHealth.tank);
      }

      return total;
    }, 0) : tankBarrierAmount;

  // Calculate barrier amounts for off tank using the same filtering logic as for mitigations
  const offTankBarrierAmount = action.isTankBuster && tankPositions.offTank ?
    offTankMitigationInfo.barrierMitigations.reduce((total, mitigation) => {
      if (!mitigation.barrierPotency) return total;

      // For self-targeting barriers, only include if they match this tank position
      if (mitigation.target === 'self') {
        if (mitigation.tankPosition === 'offTank') {
          return total + calculateBarrierAmount(mitigation, baseHealth.tank);
        }
        return total;
      }

      // For single-target barriers, only include if they're targeted at this tank
      if (mitigation.target === 'single') {
        if (mitigation.tankPosition === 'offTank') {
          return total + calculateBarrierAmount(mitigation, baseHealth.tank);
        }
        return total;
      }

      // For party-wide barriers, include for all tanks
      if (mitigation.target === 'party' || mitigation.target === 'area') {
        return total + calculateBarrierAmount(mitigation, baseHealth.tank);
      }

      // Include barriers specifically for this tank position
      if (mitigation.tankPosition === 'offTank' || mitigation.tankPosition === 'shared') {
        return total + calculateBarrierAmount(mitigation, baseHealth.tank);
      }

      return total;
    }, 0) : tankBarrierAmount;

  return (
    <BossAction
      $time={action.time}
      $importance={action.importance}
      $isSelected={isSelected}
      $hasAssignments={hasAssignments}
      $isTouched={isTouched}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
    >
      <ActionTime>{action.time} seconds</ActionTime>
      <div style={{ display: 'flex', alignItems: 'center', margin: '10px 0' }}>
        <ActionIcon>
          {action.icon}
        </ActionIcon>
        <ActionName>{action.name}</ActionName>
      </div>
      <ActionDescription $hasAssignments={hasAssignments}>
        {action.description}
      </ActionDescription>

      {/* Display multi-hit indicator for multi-hit tank busters and raid-wide abilities */}
      <div style={{ display: 'flex', flexWrap: 'wrap' }}>
        {action.isMultiHit && action.hitCount > 1 && (
          <Tooltip content={`This ${action.isTankBuster ? 'tank buster' : 'ability'} consists of ${action.hitCount} hits ${action.originalDamagePerHit ? `with ${action.originalDamagePerHit} damage per hit` : ''}`}>
            <MultiHitIndicator>
              {action.hitCount}-Hit {action.isTankBuster ? 'Tank Buster' : 'Ability'}
            </MultiHitIndicator>
          </Tooltip>
        )}

        {action.unmitigatedDamage && (
          <div style={{ marginTop: '5px', fontWeight: 'bold' }}>
            Unmitigated Damage: {action.unmitigatedDamage}
            {action.isMultiHit && action.originalDamagePerHit && (
              <span style={{ fontSize: '0.9em', marginLeft: '5px', fontWeight: 'normal' }}>
                ({action.hitCount} × {action.originalDamagePerHit})
              </span>
            )}
          </div>
        )}
      </div>

      {/* Display mitigation percentage if there are any mitigations */}
      {hasMitigations && (
        <Tooltip
          content={generateMitigationBreakdown(allMitigations, action.damageType, currentBossLevel)}
        >
          <MitigationPercentage>
            Damage Mitigated: {formatMitigation(mitigationPercentage)}
          </MitigationPercentage>
        </Tooltip>
      )}
      {/* Display health bars if we have unmitigated damage */}
      {unmitigatedDamage > 0 && (
        <>
          {/* Show tank or party health bar, with AetherflowGauge adjacent if selected and Scholar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {action.isTankBuster ? (
              <>
                {/* For dual tank busters */}
                {action.isDualTankBuster ? (
                  <>
                    {/* Main Tank - show "N/A" if no tank is selected */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
                      {isSelected && isScholarSelected && (
                        <AetherflowGauge />
                      )}
                    </div>

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
                  /* For single-target tank busters, only show the Main Tank health bar */
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <HealthBar
                      label={`Main Tank (${tankPositions.mainTank || 'N/A'})`}
                      maxHealth={baseHealth.tank}
                      currentHealth={baseHealth.tank}
                      damageAmount={tankPositions.mainTank ? mainTankMitigatedDamage : mitigatedDamage}
                      barrierAmount={tankPositions.mainTank ? mainTankBarrierAmount : tankBarrierAmount}
                      isTankBuster={true}
                      tankPosition="mainTank"
                    />
                    {isSelected && isScholarSelected && (
                      <AetherflowGauge />
                    )}
                  </div>
                )}
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <HealthBar
                  label="Party Health"
                  maxHealth={baseHealth.party}
                  currentHealth={baseHealth.party}
                  damageAmount={mitigatedDamage}
                  barrierAmount={partyBarrierAmount}
                  isTankBuster={false}
                />
                {isSelected && isScholarSelected && (
                  <AetherflowGauge />
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* Display Aetherflow gauge if Scholar is selected and this is the selected boss action */}
      {/* (Moved next to tank health bar for tank busters) */}

      {/* Render children (assigned mitigations) */}
      {children}
    </BossAction>
  );
});

BossActionItem.displayName = 'BossActionItem';

export default BossActionItem;
