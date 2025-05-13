import React, { memo } from 'react';
import styled from 'styled-components';
import Tooltip from '../common/Tooltip/Tooltip';
import HealthBar from '../common/HealthBar';
import {
  calculateTotalMitigation,
  formatMitigation,
  generateMitigationBreakdown,
  isMitigationAvailable,
  calculateMitigatedDamage,
  calculateBarrierAmount
} from '../../utils';
import { mitigationAbilities, bosses } from '../../data';

const BossAction = styled.div`
  background-color: ${props => {
    if (props.$isSelected) {
      return props.theme.mode === 'dark' ? 'rgba(51, 153, 255, 0.2)' : 'rgba(51, 153, 255, 0.1)';
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

  &:hover {
    box-shadow: ${props => props.theme.shadows.medium};
    transform: translateY(-2px);
    border-color: ${props => props.theme.colors.primary};
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.small};
    padding-top: 35px; /* Slightly smaller padding for time indicator on mobile */
    padding-right: ${props => props.$hasAssignments ? '110px' : props.theme.spacing.small}; /* Increased space for mitigations on mobile */
    min-height: 120px; /* Smaller minimum height on mobile */
    margin-bottom: 10px; /* Increased spacing between boss actions */
    position: relative; /* Ensure proper positioning context for absolute elements */

    &:active {
      transform: translateY(-1px);
      box-shadow: ${props => props.theme.shadows.small};
    }
  }
`;

const ActionTime = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: 8px;
  font-size: 16px;
  font-weight: bold;
  color: ${props => props.theme.colors.text};
  background-color: ${props => props.theme.mode === 'dark' ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.1)'};
  border-bottom: 1px solid ${props => props.theme.colors.border};
  border-top-left-radius: ${props => props.theme.borderRadius.medium};
  border-top-right-radius: ${props => props.theme.borderRadius.medium};
  text-align: center;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;

  &::before {
    content: '⏱️';
    margin-right: 5px;
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: 14px;
    padding: 6px;
    height: 20px;
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
`;

const ActionName = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: bold;
  flex-grow: 1;
`;

const ActionDescription = styled.p`
  margin: 0;
  color: ${props => props.theme.colors.lightText};
  font-size: ${props => props.theme.fontSizes.medium};
  font-weight: ${props => props.theme.mode === 'dark' ? '500' : 'normal'};
  min-height: 40px; /* Ensure all descriptions have at least this height */
  flex-grow: 1; /* Allow description to grow and fill available space */
  line-height: 1.4; /* Improve readability */
  padding-left: 2px; /* Slight indent */
  margin-bottom: ${props => props.theme.spacing.medium}; /* Add space before mitigations */
  width: ${props => props.$hasAssignments ? 'calc(100% - 100px)' : '100%'}; /* Ensure description doesn't flow into assignments */
  max-width: ${props => props.$hasAssignments ? 'calc(100% - 100px)' : '100%'}; /* Ensure description doesn't flow into assignments */
  overflow-wrap: break-word; /* Ensure long words don't overflow */
  word-wrap: break-word; /* For older browsers */
  hyphens: auto; /* Allow hyphenation for very long words */
  white-space: normal; /* Ensure text wraps properly */

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    width: ${props => props.$hasAssignments ? 'calc(100% - 25px)' : '100%'};
    max-width: ${props => props.$hasAssignments ? 'calc(100% - 25px)' : '100%'};
    font-size: ${props => props.theme.fontSizes.small}; /* Slightly smaller font on mobile */
  }
`;

const MitigationPercentage = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background-color: ${props => props.theme.mode === 'dark' ? 'rgba(51, 153, 255, 0.2)' : 'rgba(51, 153, 255, 0.1)'};
  color: ${props => props.theme.colors.text};
  font-weight: bold;
  font-size: ${props => props.theme.fontSizes.medium};
  padding: 4px 8px;
  border-radius: ${props => props.theme.borderRadius.small};
  margin-top: 5px;
  margin-bottom: 10px;
  border: 1px solid ${props => props.theme.mode === 'dark' ? 'rgba(51, 153, 255, 0.3)' : 'rgba(51, 153, 255, 0.2)'};

  &::before {
    content: '🛡️';
    margin-right: 5px;
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
      onClick={onClick}
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
      {action.unmitigatedDamage && (
        <div style={{ marginTop: '5px', fontWeight: 'bold' }}>
          Unmitigated Damage: {action.unmitigatedDamage}
        </div>
      )}

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
