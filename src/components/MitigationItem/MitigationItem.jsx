import React, { memo } from 'react';
import styled from 'styled-components';
import ChargeCounter from '../ChargeCounter';
import {
  getAbilityDescriptionForLevel,
  getAbilityDurationForLevel,
  getAbilityCooldownForLevel,
  getAbilityChargeCount,
  getRoleSharedAbilityCount
} from '../../utils';

const MitigationItemContainer = styled.div`
  background-color: ${props => props.$disabled ?
    props.theme.mode === 'dark' ? 'rgba(50, 50, 50, 0.5)' : 'rgba(240, 240, 240, 0.8)' :
    props.theme.colors.cardBackground};
  border-radius: ${props => props.theme.borderRadius.medium};
  padding: ${props => props.theme.spacing.medium};
  box-shadow: ${props => props.theme.shadows.small};
  cursor: ${props => props.$disabled ? 'not-allowed' : 'grab'};
  border-left: 4px solid ${props => props.$disabled ?
    props.theme.colors.error || '#ff5555' :
    props.theme.colors.primary};
  transition: all 0.2s ease;
  width: 100%;
  opacity: ${props => props.$disabled ? 0.7 : 1};
  position: relative;

  &:hover {
    background-color: ${props => props.$disabled ?
      props.theme.mode === 'dark' ? 'rgba(50, 50, 50, 0.5)' : 'rgba(240, 240, 240, 0.8)' :
      props.theme.colors.background};
    transform: ${props => props.$disabled ? 'none' : 'translateY(-2px)'};
    box-shadow: ${props => props.$disabled ? props.theme.shadows.small : props.theme.shadows.medium};
  }

  &:active {
    cursor: ${props => props.$disabled ? 'not-allowed' : 'grabbing'};
  }
`;

const MitigationIcon = styled.span`
  margin-right: ${props => props.theme.spacing.small};
  vertical-align: middle;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    margin-right: 4px;
    width: 16px;
    height: 16px;
    flex-shrink: 0; /* Prevent icon from shrinking */
  }
`;

const MitigationName = styled.h4`
  margin: 0 0 5px 0;
  display: inline-block;
`;

const MitigationDescription = styled.p`
  margin: 0;
  font-size: ${props => props.theme.fontSizes.medium};
  color: ${props => props.theme.colors.lightText};
  font-weight: ${props => props.theme.mode === 'dark' ? '500' : 'normal'};
`;

const CooldownOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-size: 12px;
  padding: 5px;
  border-radius: inherit;
  z-index: 2;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;

  ${MitigationItemContainer}:hover & {
    opacity: 1;
  }
`;

const MitigationItem = memo(({
  mitigation,
  isDisabled,
  cooldownReason,
  currentBossLevel,
  selectedBossAction,
  pendingAssignments,
  checkAbilityCooldown,
  selectedJobs
}) => {
  // Render charge counter for abilities with multiple charges
  const renderChargeCounter = () => {
    if (getAbilityChargeCount(mitigation, currentBossLevel) <= 1) {
      return null;
    }

    // Get the cooldown result to check available charges
    const cooldownResult = selectedBossAction ?
      checkAbilityCooldown(
        mitigation.id,
        selectedBossAction.time,
        // Check if this ability is being assigned to the current boss action
        // The isBeingAssigned parameter is true if:
        // 1. The ability is already assigned to this action, or
        // 2. The ability is currently being assigned to this action (via pendingAssignments)
        selectedBossAction.assignments?.some(m => m.id === mitigation.id) ||
        pendingAssignments.some(pa =>
          pa.mitigationId === mitigation.id &&
          pa.bossActionId === selectedBossAction.id
        ),
        selectedBossAction.id
      ) :
      {
        availableCharges: getAbilityChargeCount(mitigation, currentBossLevel),
        totalCharges: getAbilityChargeCount(mitigation, currentBossLevel),
        isRoleShared: mitigation.isRoleShared
      };

    // Get the available charges
    let availableCharges = cooldownResult.availableCharges || 0;

    // Check if there are any pending assignments for this mitigation
    // This ensures the UI updates immediately after assignment
    const hasPendingAssignment = selectedBossAction ? pendingAssignments.some(pa =>
      pa.mitigationId === mitigation.id &&
      pa.bossActionId === selectedBossAction.id &&
      !selectedBossAction.assignments?.some(m => m.id === mitigation.id)
    ) : false;

    // If there's a pending assignment, decrement the available charges
    if (hasPendingAssignment) {
      availableCharges = Math.max(0, availableCharges - 1);
    }

    return (
      <> | <ChargeCounter
        mitigationId={mitigation.id}
        bossActionId={selectedBossAction?.id}
        type="charges"
        totalCount={cooldownResult.totalCharges}
        availableCount={availableCharges}
      /></>
    );
  };

  // Render instance counter for role-shared abilities
  const renderInstanceCounter = () => {
    if (!mitigation.isRoleShared) {
      return null;
    }

    // Get the cooldown result to check available instances
    const cooldownResult = selectedBossAction ?
      checkAbilityCooldown(
        mitigation.id,
        selectedBossAction.time,
        // Check if this ability is being assigned to the current boss action
        selectedBossAction.assignments?.some(m => m.id === mitigation.id) ||
        pendingAssignments.some(pa =>
          pa.mitigationId === mitigation.id &&
          pa.bossActionId === selectedBossAction.id
        ),
        selectedBossAction.id
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

    // Check if there are any pending assignments for this mitigation
    const hasPendingAssignment = selectedBossAction ? pendingAssignments.some(pa =>
      pa.mitigationId === mitigation.id &&
      pa.bossActionId === selectedBossAction.id &&
      !selectedBossAction.assignments?.some(m => m.id === mitigation.id)
    ) : false;

    // If there's a pending assignment, decrement the available instances
    if (hasPendingAssignment) {
      availableInstances = Math.max(0, availableInstances - 1);
    }

    return (
      <> | <ChargeCounter
        mitigationId={mitigation.id}
        bossActionId={selectedBossAction?.id}
        type="instances"
        totalCount={totalInstances}
        availableCount={availableInstances}
      /></>
    );
  };

  return (
    <MitigationItemContainer $disabled={isDisabled}>
      <MitigationIcon>
        {typeof mitigation.icon === 'string' && mitigation.icon.startsWith('/') ?
          <img src={mitigation.icon} alt={mitigation.name} style={{ maxHeight: '24px', maxWidth: '24px' }} /> :
          mitigation.icon
        }
      </MitigationIcon>
      <MitigationName>{mitigation.name}</MitigationName>
      <MitigationDescription>
        {getAbilityDescriptionForLevel(mitigation, currentBossLevel)}<br />
        <small>
          Duration: {getAbilityDurationForLevel(mitigation, currentBossLevel)}s |
          Cooldown: {getAbilityCooldownForLevel(mitigation, currentBossLevel)}s
          {renderChargeCounter()}
          {renderInstanceCounter()}
        </small>
      </MitigationDescription>
      {isDisabled && cooldownReason && (
        <CooldownOverlay className="cooldown-reason">
          {cooldownReason}
        </CooldownOverlay>
      )}
    </MitigationItemContainer>
  );
});

MitigationItem.displayName = 'MitigationItem';

export default MitigationItem;
