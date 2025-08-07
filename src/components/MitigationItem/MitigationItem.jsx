import React, { memo } from 'react';
import styled from 'styled-components';
import ChargeCounter from '../ChargeCounter';
import {
  getAbilityDescriptionForLevel,
  getAbilityDurationForLevel,
  getAbilityCooldownForLevel,
  getAbilityChargeCount,
  getRoleSharedAbilityCount,
  isSelfTargetingAbilityUsableByTank
} from '../../utils';
import { useTankPositionContext } from '../../contexts';

const MitigationItemContainer = styled.div`
  background-color: ${props => {
    if (props.$disabled) {
      return props.theme.mode === 'dark' ? 'rgba(50, 50, 50, 0.5)' : 'rgba(240, 240, 240, 0.8)';
    }
    return 'transparent';
  }};
  border: none;
  border-left: 4px solid ${props => {
    if (props.$disabled) {
      return props.theme?.colors?.error || '#ff5555';
    }
    return props.theme?.colors?.primary || '#3399ff';
  }};
  border-radius: ${props => props.theme.borderRadius.small};
  padding: ${props => props.theme.spacing.small} ${props => props.theme.spacing.medium};
  cursor: ${props => props.$disabled ? 'not-allowed' : 'grab'};
  transition: all 0.2s ease;
  width: 100%;
  opacity: ${props => props.$disabled ? 0.7 : 1};
  position: relative;
  margin-bottom: 2px;

  &:hover {
    background-color: ${props => {
      if (props.$disabled) {
        return props.theme.mode === 'dark' ? 'rgba(50, 50, 50, 0.5)' : 'rgba(240, 240, 240, 0.8)';
      }
      return props.theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
    }};
    transform: none;
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
  pendingAssignments = [],
  checkAbilityAvailability,
  selectedJobs,
  isDragging = false
}) => {
  // Get the tank position context
  const { tankPositions } = useTankPositionContext();
  // Render charge counter for abilities with multiple charges
  const renderChargeCounter = () => {
    if (getAbilityChargeCount(mitigation, currentBossLevel) <= 1) {
      return null;
    }

    // Get the availability result to check available charges
    const availabilityResult = selectedBossAction && checkAbilityAvailability ?
      checkAbilityAvailability(
        mitigation.id,
        selectedBossAction.time,
        selectedBossAction.id,
        {
          isBeingAssigned: selectedBossAction.assignments?.some(m => m.id === mitigation.id) ||
            pendingAssignments.some(pa =>
              pa.mitigationId === mitigation.id &&
              pa.bossActionId === selectedBossAction.id
            )
        }
      ) :
      {
        availableCharges: getAbilityChargeCount(mitigation, currentBossLevel),
        totalCharges: getAbilityChargeCount(mitigation, currentBossLevel),
        isRoleShared: mitigation.isRoleShared
      };

    // Get the available charges
    let availableCharges = availabilityResult.availableCharges || 0;

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
        totalCount={availabilityResult.totalCharges}
        availableCount={availableCharges}
      /></>
    );
  };

  // Render instance counter for role-shared abilities
  const renderInstanceCounter = () => {
    if (!mitigation.isRoleShared) {
      return null;
    }

    // Get the availability result to check available instances
    const instanceAvailability = selectedBossAction && checkAbilityAvailability ?
      checkAbilityAvailability(
        mitigation.id,
        selectedBossAction.time,
        selectedBossAction.id,
        {
          isBeingAssigned: selectedBossAction.assignments?.some(m => m.id === mitigation.id) ||
            pendingAssignments.some(pa =>
              pa.mitigationId === mitigation.id &&
              pa.bossActionId === selectedBossAction.id
            )
        }
      ) :
      {
        isRoleShared: true,
        totalInstances: getRoleSharedAbilityCount(mitigation, selectedJobs),
        availableInstances: getRoleSharedAbilityCount(mitigation, selectedJobs)
      };

    // Only show if we have multiple instances available
    const totalInstances = instanceAvailability.totalInstances || 0;
    if (totalInstances <= 1) return null;

    // Calculate available instances
    let availableInstances = instanceAvailability.availableInstances || 0;

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

  // Check if this is a self-targeting ability that's not usable by the current tank
  const isSelfTargetingAbility = mitigation.target === 'self' && mitigation.forTankBusters;

  // Check if the ability is usable by the main tank or off tank
  const isUsableByMainTank = !isSelfTargetingAbility || isSelfTargetingAbilityUsableByTank(mitigation, tankPositions.mainTank, tankPositions);
  const isUsableByOffTank = !isSelfTargetingAbility || isSelfTargetingAbilityUsableByTank(mitigation, tankPositions.offTank, tankPositions);

  // If this is a self-targeting ability and it's not usable by either tank, disable it
  const isTankSpecificDisabled = isSelfTargetingAbility && !isUsableByMainTank && !isUsableByOffTank;

  // Combine the original disabled state with the tank-specific disabled state
  const finalDisabled = isDisabled || isTankSpecificDisabled;

  // Create a custom reason for tank-specific abilities
  const finalReason = isTankSpecificDisabled && !isDisabled ?
    `This ability can only be used by ${mitigation.jobs.join(', ')}` :
    cooldownReason;

  return (
    <MitigationItemContainer $disabled={finalDisabled}>
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
          {getAbilityDurationForLevel(mitigation, currentBossLevel) > 0 && (
            <>Duration: {getAbilityDurationForLevel(mitigation, currentBossLevel)}s | </>
          )}
          Cooldown: {getAbilityCooldownForLevel(mitigation, currentBossLevel)}s
          {renderChargeCounter()}
          {renderInstanceCounter()}
        </small>
      </MitigationDescription>
      {finalDisabled && finalReason && (
        <CooldownOverlay className="cooldown-reason">
          {finalReason}
        </CooldownOverlay>
      )}
    </MitigationItemContainer>
  );
});

MitigationItem.displayName = 'MitigationItem';

export default MitigationItem;
