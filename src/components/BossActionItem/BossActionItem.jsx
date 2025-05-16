import React, { memo, useState, useCallback } from 'react';
import styled from 'styled-components';
import Tooltip from '../common/Tooltip/Tooltip';
import HealthBar from '../common/HealthBar';
import AetherflowGauge from '../AetherflowGauge/AetherflowGauge';
import {
  calculateTotalMitigation,
  formatMitigation,
  generateMitigationBreakdown,
  isMitigationAvailable,
  calculateMitigatedDamage,
  calculateBarrierAmount,
  isTouchDevice
} from '../../utils';
import { mitigationAbilities, bosses } from '../../data';

const BossAction = styled.div`
  background-color: ${props => {
    if (props.$isSelected) {
      return props.theme.mode === 'dark' ? 'rgba(77, 171, 255, 0.25)' : 'rgba(51, 153, 255, 0.15)';
    }
    if (props.$isTouched) {
      return props.theme.mode === 'dark' ? 'rgba(77, 171, 255, 0.2)' : 'rgba(51, 153, 255, 0.1)';
    }
    return props.theme.colors.cardBackground;
  }};
  border-radius: ${props => props.theme.borderRadius.medium};
  padding: ${props => props.theme.spacing.medium};
  padding-top: 40px; /* Fixed padding at top for time indicator */
  padding-right: ${props => props.$hasAssignments ? '160px' : props.theme.spacing.medium}; /* Extra space on right for mitigations */
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
  transition: all ${props => props.theme.transitions.normal};
  color: ${props => props.theme.colors.text};
  border: ${props => props.$isSelected
    ? `2px solid ${props.theme.colors.primary}`
    : `1px solid ${props.theme.colors.border}`};
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
  overflow: hidden; /* Ensure content doesn't overflow */

  /* Desktop hover effect */
  @media (hover: hover) and (pointer: fine) {
    &:hover {
      box-shadow: ${props => props.theme.shadows.hover};
      transform: translateY(-2px);
      border-color: ${props => props.theme.colors.primary};
    }
  }

  /* Touch feedback */
  &:active {
    transform: scale(0.98);
    box-shadow: ${props => props.theme.shadows.active};
    opacity: 0.95;
  }

  /* Tablet styles */
  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    padding: ${props => props.theme.spacing.medium};
    padding-top: 40px;
    padding-right: ${props => props.$hasAssignments ? '140px' : props.theme.spacing.medium};
    min-height: 130px;
    border-radius: ${props => props.theme.borderRadius.medium};
  }

  /* Mobile styles */
  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.small};
    padding-top: 35px; /* Slightly smaller padding for time indicator on mobile */
    padding-right: ${props => props.$hasAssignments ? '110px' : props.theme.spacing.small}; /* Increased space for mitigations on mobile */
    min-height: 120px; /* Smaller minimum height on mobile */
    margin-bottom: ${props => props.theme.spacing.small}; /* Increased spacing between boss actions */
    position: relative; /* Ensure proper positioning context for absolute elements */
    border-radius: ${props => props.theme.borderRadius.small};
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
  font-size: ${props => props.theme.typography.fontSize.medium};
  font-weight: ${props => props.theme.typography.fontWeight.semibold};
  color: ${props => props.theme.colors.text};
  background-color: ${props => props.theme.mode === 'dark'
    ? 'rgba(0, 0, 0, 0.3)'
    : 'rgba(0, 0, 0, 0.05)'};
  border-bottom: 1px solid ${props => props.theme.colors.border};
  border-top-left-radius: ${props => props.theme.borderRadius.medium};
  border-top-right-radius: ${props => props.theme.borderRadius.medium};
  text-align: center;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none; /* Prevent text selection */
  z-index: 1; /* Ensure it's above other elements */
  transition: all ${props => props.theme.transitions.fast};

  &::before {
    content: '⏱️';
    margin-right: 6px;
    font-size: 1em;
  }

  /* Tablet styles */
  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    font-size: ${props => props.theme.typography.fontSize.small};
    padding: 8px;
    height: 30px;
    border-top-left-radius: ${props => props.theme.borderRadius.medium};
    border-top-right-radius: ${props => props.theme.borderRadius.medium};
  }

  /* Mobile styles */
  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: ${props => props.theme.typography.fontSize.small};
    padding: 6px;
    height: 26px;
    border-top-left-radius: ${props => props.theme.borderRadius.small};
    border-top-right-radius: ${props => props.theme.borderRadius.small};
  }

  /* Small mobile styles */
  @media (max-width: ${props => props.theme.breakpoints.smallMobile}) {
    font-size: ${props => props.theme.typography.fontSize.xsmall};
    padding: 4px;
    height: 24px;
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
  font-size: 1.25rem;
  background-color: ${props => props.theme.mode === 'dark'
    ? 'rgba(255, 255, 255, 0.05)'
    : 'rgba(0, 0, 0, 0.03)'};
  border-radius: ${props => props.theme.borderRadius.circle};
  padding: 4px;

  /* Tablet styles */
  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    width: 30px;
    height: 30px;
    margin-right: 10px;
    font-size: 1.2rem;
  }

  /* Mobile styles */
  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    width: 28px;
    height: 28px;
    margin-right: 8px;
    font-size: 1.1rem;
  }

  /* Small mobile styles */
  @media (max-width: ${props => props.theme.breakpoints.smallMobile}) {
    width: 24px;
    height: 24px;
    margin-right: 6px;
    font-size: 1rem;
  }
`;

const ActionName = styled.h3`
  margin: 0;
  font-size: ${props => props.theme.typography.fontSize.large};
  font-weight: ${props => props.theme.typography.fontWeight.semibold};
  flex-grow: 1;
  user-select: none; /* Prevent text selection */
  color: ${props => props.theme.colors.text};
  line-height: ${props => props.theme.typography.lineHeight.tight};
  letter-spacing: -0.01em;

  /* Tablet styles */
  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    font-size: ${props => props.theme.typography.fontSize.medium};
  }

  /* Mobile styles */
  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: ${props => props.theme.typography.fontSize.medium};
  }

  /* Small mobile styles */
  @media (max-width: ${props => props.theme.breakpoints.smallMobile}) {
    font-size: ${props => props.theme.typography.fontSize.small};
  }
`;

const ActionDescription = styled.p`
  margin: 0;
  color: ${props => props.theme.colors.textSecondary};
  font-size: ${props => props.theme.typography.fontSize.medium};
  font-weight: ${props => props.theme.mode === 'dark'
    ? props.theme.typography.fontWeight.medium
    : props.theme.typography.fontWeight.regular};
  min-height: 40px; /* Ensure all descriptions have at least this height */
  flex-grow: 1; /* Allow description to grow and fill available space */
  line-height: ${props => props.theme.typography.lineHeight.normal}; /* Improve readability */
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
    font-size: ${props => props.theme.typography.fontSize.small};
    min-height: 36px;
    line-height: ${props => props.theme.typography.lineHeight.normal};
    margin-bottom: ${props => props.theme.spacing.medium};
    width: ${props => props.$hasAssignments ? 'calc(100% - 80px)' : '100%'};
    max-width: ${props => props.$hasAssignments ? 'calc(100% - 80px)' : '100%'};
  }

  /* Mobile styles */
  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: ${props => props.theme.typography.fontSize.small};
    min-height: 32px;
    line-height: ${props => props.theme.typography.lineHeight.normal};
    margin-bottom: ${props => props.theme.spacing.small};
    width: ${props => props.$hasAssignments ? 'calc(100% - 40px)' : '100%'};
    max-width: ${props => props.$hasAssignments ? 'calc(100% - 40px)' : '100%'};
  }

  /* Small mobile styles */
  @media (max-width: ${props => props.theme.breakpoints.smallMobile}) {
    font-size: ${props => props.theme.typography.fontSize.xsmall};
    min-height: 28px;
    line-height: ${props => props.theme.typography.lineHeight.normal};
    margin-bottom: ${props => props.theme.spacing.small};
    width: ${props => props.$hasAssignments ? 'calc(100% - 30px)' : '100%'};
    max-width: ${props => props.$hasAssignments ? 'calc(100% - 30px)' : '100%'};
  }
`;

const MitigationPercentage = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background-color: ${props => props.theme.mode === 'dark'
    ? 'rgba(77, 171, 255, 0.25)'
    : 'rgba(51, 153, 255, 0.15)'};
  color: ${props => props.theme.colors.text};
  font-weight: ${props => props.theme.typography.fontWeight.semibold};
  font-size: ${props => props.theme.typography.fontSize.medium};
  padding: 8px 12px;
  border-radius: ${props => props.theme.borderRadius.small};
  margin-top: 8px;
  margin-bottom: 12px;
  border: 1px solid ${props => props.theme.mode === 'dark'
    ? 'rgba(77, 171, 255, 0.35)'
    : 'rgba(51, 153, 255, 0.25)'};
  user-select: none; /* Prevent text selection */
  min-height: 36px; /* Ensure minimum touch target size */
  min-width: 100px; /* Ensure minimum touch target width */
  transition: all ${props => props.theme.transitions.fast};
  box-shadow: ${props => props.theme.shadows.xsmall};

  &::before {
    content: '🛡️';
    margin-right: 8px;
  }

  /* Tablet styles */
  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    font-size: ${props => props.theme.typography.fontSize.small};
    padding: 6px 10px;
    min-height: 34px;
  }

  /* Mobile styles */
  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: ${props => props.theme.typography.fontSize.small};
    padding: 5px 8px;
    margin-top: 6px;
    margin-bottom: 10px;
    min-height: 32px;
  }

  /* Small mobile styles */
  @media (max-width: ${props => props.theme.breakpoints.smallMobile}) {
    font-size: ${props => props.theme.typography.fontSize.xsmall};
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
  background-color: ${props => props.theme.mode === 'dark'
    ? 'rgba(255, 169, 77, 0.25)'
    : 'rgba(255, 169, 77, 0.15)'};
  color: ${props => props.theme.colors.text};
  font-weight: ${props => props.theme.typography.fontWeight.semibold};
  font-size: ${props => props.theme.typography.fontSize.medium};
  padding: 8px 12px;
  border-radius: ${props => props.theme.borderRadius.small};
  margin-top: 8px;
  margin-right: 10px;
  margin-bottom: 12px;
  border: 1px solid ${props => props.theme.mode === 'dark'
    ? 'rgba(255, 169, 77, 0.35)'
    : 'rgba(255, 169, 77, 0.25)'};
  user-select: none; /* Prevent text selection */
  min-height: 36px; /* Ensure minimum touch target size */
  min-width: 100px; /* Ensure minimum touch target width */
  transition: all ${props => props.theme.transitions.fast};
  box-shadow: ${props => props.theme.shadows.xsmall};

  &::before {
    content: '💥';
    margin-right: 8px;
  }

  /* Tablet styles */
  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    font-size: ${props => props.theme.typography.fontSize.small};
    padding: 6px 10px;
    min-height: 34px;
  }

  /* Mobile styles */
  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: ${props => props.theme.typography.fontSize.small};
    padding: 5px 8px;
    margin-top: 6px;
    margin-right: 8px;
    margin-bottom: 10px;
    min-height: 32px;
  }

  /* Small mobile styles */
  @media (max-width: ${props => props.theme.breakpoints.smallMobile}) {
    font-size: ${props => props.theme.typography.fontSize.xsmall};
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
  const calculateMitigationInfo = () => {
    // Get directly assigned mitigations
    const directMitigations = assignments[action.id] || [];

    // Filter out mitigations that don't have any corresponding selected jobs
    const filteredDirectMitigations = directMitigations.filter(mitigation =>
      isMitigationAvailable(mitigation, selectedJobs)
    );

    // Get inherited mitigations from previous actions
    const inheritedMitigations = getActiveMitigations(action.id, action.time)
      .map(m => {
        // Find the full mitigation data
        return mitigationAbilities.find(full => full.id === m.id);
      }).filter(Boolean);

    // Filter out inherited mitigations that don't have any corresponding selected jobs
    const filteredInheritedMitigations = inheritedMitigations.filter(mitigation =>
      isMitigationAvailable(mitigation, selectedJobs)
    );

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

  const { allMitigations, barrierMitigations, hasMitigations } = calculateMitigationInfo();

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
  const mitigationPercentage = calculateTotalMitigation(allMitigations, action.damageType, currentBossLevel);
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
      {isSelected && (
        <div style={{ marginBottom: 8 }}>
          <AetherflowGauge />
        </div>
      )}
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
          {/* Only show tank health bar for tank busters */}
          {action.isTankBuster ? (
            <HealthBar
              label="Tank Health"
              maxHealth={baseHealth.tank}
              currentHealth={baseHealth.tank}
              damageAmount={mitigatedDamage}
              barrierAmount={tankBarrierAmount}
              isTankBuster={true}
            />
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
      )}

      {/* Render children (assigned mitigations) */}
      {children}
    </BossAction>
  );
});

BossActionItem.displayName = 'BossActionItem';

export default BossActionItem;
