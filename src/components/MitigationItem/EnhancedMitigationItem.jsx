import React, { memo, useMemo } from 'react';
import styled from 'styled-components';
import { 
  getAbilityDescriptionForLevel,
  getAbilityDurationForLevel,
  getAbilityCooldownForLevel,
  getAbilityChargeCount,
  getRoleSharedAbilityCount
} from '../../utils';
import { useEnhancedMitigation } from '../../contexts/EnhancedMitigationContext';
import { useTankPositionContext } from '../../contexts/TankPositionContext';

// Styled components
const MitigationItemContainer = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px;
  margin: 8px;
  border-radius: 8px;
  background-color: ${props => {
    if (props.$isDisabled) {
      return props.theme.colors.backgroundSecondary;
    }
    return props.theme.colors.background;
  }};
  border: 2px solid ${props => {
    if (props.$isDisabled) {
      return props.theme.colors.border;
    }
    return props.theme.colors.primary;
  }};
  border-left: 4px solid ${props => {
    if (props.$isDisabled) {
      return props.theme?.colors?.error || '#ff5555';
    }
    return props.theme?.colors?.primary || '#3399ff';
  }};
  cursor: ${props => props.$isDisabled ? 'not-allowed' : 'grab'};
  opacity: ${props => props.$isDisabled ? 0.6 : 1};
  transition: all 0.3s ease;
  min-width: 120px;
  max-width: 180px;

  &:hover {
    transform: ${props => props.$isDisabled ? 'none' : 'translateY(-2px)'};
    box-shadow: ${props => props.$isDisabled ? 'none' : '0 4px 12px rgba(0, 0, 0, 0.15)'};
  }

  &:active {
    transform: ${props => props.$isDisabled ? 'none' : 'translateY(0)'};
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    min-width: 100px;
    max-width: 140px;
    padding: 8px;
    margin: 4px;
  }
`;

const MitigationIcon = styled.div`
  width: 48px;
  height: 48px;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background-color: ${props => props.theme.colors.backgroundSecondary};
  
  img {
    width: 40px;
    height: 40px;
    border-radius: 4px;
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    width: 40px;
    height: 40px;
    
    img {
      width: 32px;
      height: 32px;
    }
  }
`;

const MitigationName = styled.div`
  font-weight: 600;
  font-size: ${props => props.theme.fontSizes.small};
  color: ${props => props.theme.colors.text};
  text-align: center;
  margin-bottom: 4px;
  line-height: 1.2;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: ${props => props.theme.fontSizes.xsmall};
  }
`;

const MitigationDescription = styled.div`
  font-size: ${props => props.theme.fontSizes.xsmall};
  color: ${props => props.theme.colors.textSecondary};
  text-align: center;
  line-height: 1.3;

  small {
    font-size: ${props => props.theme.fontSizes.xxsmall};
    opacity: 0.8;
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: ${props => props.theme.fontSizes.xxsmall};
    
    small {
      font-size: 10px;
    }
  }
`;

const CooldownOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.8);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  font-size: ${props => props.theme.fontSizes.xsmall};
  font-weight: 600;
  text-align: center;
  padding: 4px;
  line-height: 1.2;
`;

const StatusIndicators = styled.div`
  display: flex;
  gap: 4px;
  margin-top: 4px;
  flex-wrap: wrap;
  justify-content: center;
`;

const StatusBadge = styled.span`
  display: inline-block;
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: bold;
  color: white;
  background-color: ${props => {
    switch (props.$type) {
      case 'charges':
        return props.$available === 0 ? '#ff5555' : '#4CAF50';
      case 'instances':
        return props.$available === 0 ? '#ff5555' : '#2196F3';
      case 'aetherflow':
        return props.$available === 0 ? '#ff5555' : '#9C27B0';
      default:
        return '#666';
    }
  }};
  
  &.flash-update {
    animation: flash 0.5s;
  }

  @keyframes flash {
    0% { transform: scale(1); }
    50% { transform: scale(1.1); }
    100% { transform: scale(1); }
  }
`;

const EnhancedMitigationItem = memo(({
  mitigation,
  currentBossLevel,
  selectedBossAction,
  selectedJobs,
  isDragging = false,
  onClick = null
}) => {
  // Get enhanced mitigation context
  const { checkAbilityAvailability, hasPendingAssignment } = useEnhancedMitigation();

  // Check availability if we have a selected boss action
  const availability = useMemo(() => {
    if (!selectedBossAction) {
      return {
        isAvailable: true,
        canAssign: () => true,
        getUnavailabilityReason: () => null,
        availableCharges: getAbilityChargeCount(mitigation, currentBossLevel),
        totalCharges: getAbilityChargeCount(mitigation, currentBossLevel),
        availableInstances: getRoleSharedAbilityCount(mitigation, selectedJobs),
        totalInstances: getRoleSharedAbilityCount(mitigation, selectedJobs),
        isRoleShared: mitigation.isRoleShared || false
      };
    }

    return checkAbilityAvailability(
      mitigation.id,
      selectedBossAction.time,
      selectedBossAction.id,
      { isBeingAssigned: false }
    );
  }, [mitigation, selectedBossAction, checkAbilityAvailability, currentBossLevel, selectedJobs]);

  // Check for pending assignments
  const isPending = selectedBossAction ? hasPendingAssignment(
    selectedBossAction.id,
    mitigation.id
  ) : false;

  // Determine if the item should be disabled
  const isDisabled = !availability.canAssign() && !isPending;
  const cooldownReason = availability.getUnavailabilityReason();

  // Render charge counter for abilities with multiple charges
  const renderChargeCounter = () => {
    if (availability.totalCharges <= 1) return null;

    return (
      <StatusBadge 
        $type="charges" 
        $available={availability.availableCharges}
        className={isPending ? 'flash-update' : ''}
      >
        {availability.availableCharges}/{availability.totalCharges} Charges
      </StatusBadge>
    );
  };

  // Render instance counter for role-shared abilities
  const renderInstanceCounter = () => {
    if (!availability.isRoleShared || availability.totalInstances <= 1) return null;

    return (
      <StatusBadge 
        $type="instances" 
        $available={availability.availableInstances}
        className={isPending ? 'flash-update' : ''}
      >
        {availability.availableInstances}/{availability.totalInstances} Instances
      </StatusBadge>
    );
  };

  // Render Aetherflow indicator for Aetherflow-consuming abilities
  const renderAetherflowIndicator = () => {
    if (!mitigation.consumesAetherflow) return null;

    // This would need to be enhanced to show actual Aetherflow stacks
    // For now, just show that it consumes Aetherflow
    return (
      <StatusBadge $type="aetherflow" $available={1}>
        Aetherflow
      </StatusBadge>
    );
  };

  return (
    <MitigationItemContainer
      $isDisabled={isDisabled}
      $isDragging={isDragging}
      onClick={onClick}
    >
      <MitigationIcon>
        {typeof mitigation.icon === 'string' && mitigation.icon.startsWith('/') ? (
          <img src={mitigation.icon} alt={mitigation.name} />
        ) : (
          mitigation.icon
        )}
      </MitigationIcon>
      
      <MitigationName>{mitigation.name}</MitigationName>
      
      <MitigationDescription>
        {getAbilityDescriptionForLevel(mitigation, currentBossLevel)}<br />
        <small>
          {getAbilityDurationForLevel(mitigation, currentBossLevel) > 0 && (
            <>Duration: {getAbilityDurationForLevel(mitigation, currentBossLevel)}s | </>
          )}
          Cooldown: {getAbilityCooldownForLevel(mitigation, currentBossLevel)}s
          {mitigation.barrierPotency ? ` | Barrier: ${Math.round(mitigation.barrierPotency * 100)}% max HP` : ''}
          {mitigation.barrierFlatPotency ? ` | Barrier: ${mitigation.barrierFlatPotency} potency` : ''}
        </small>
      </MitigationDescription>

      <StatusIndicators>
        {renderChargeCounter()}
        {renderInstanceCounter()}
        {renderAetherflowIndicator()}
      </StatusIndicators>

      {isDisabled && cooldownReason && (
        <CooldownOverlay>
          {cooldownReason}
        </CooldownOverlay>
      )}
    </MitigationItemContainer>
  );
});

EnhancedMitigationItem.displayName = 'EnhancedMitigationItem';

export default EnhancedMitigationItem;
