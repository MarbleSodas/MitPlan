import React, { memo } from 'react';
import styled from 'styled-components';
import Tooltip from '../common/Tooltip/Tooltip';
import {
  getAbilityDescriptionForLevel,
  getAbilityDurationForLevel,
  getAbilityCooldownForLevel,
  getAbilityMitigationValueForLevel,
  getAbilityChargeCount,
  isMitigationAvailable
} from '../../utils';
import { mitigationAbilities } from '../../data/abilities/mitigationAbilities.js';
import { useTankPositionContext } from '../../contexts';

const AssignedMitigationsContainer = styled.div`
  position: absolute;
  top: 35px;
  right: 0;
  width: 100%;
  max-width: 260px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  border-left: 1px solid ${props => props.theme.colors.border};
  padding: 4px 6px;
  height: calc(100% - 40px);
  overflow-y: auto;
  overflow-x: hidden;
  background-color: ${props => props.theme.mode === 'dark' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.5)'};
  border-bottom-right-radius: ${props => props.theme.borderRadius.medium};
  -webkit-overflow-scrolling: touch;
  z-index: 1;
  box-shadow: -2px 0 5px rgba(0, 0, 0, 0.05);

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    width: 100%;
    max-width: 100vw;
    min-width: 0;
    top: 30px;
    padding: 2px 2px 2px 4px;
    gap: 2px;
    height: calc(100% - 30px);
    touch-action: pan-y;
    overscroll-behavior: contain;
    background-color: ${props => props.theme.mode === 'dark' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.7)'};
    border-left: 1px solid ${props => props.theme.colors.border};
    max-height: calc(100% - 30px);
    overflow-x: hidden;
  }
`;

const AssignedMitigationItem = styled.div`
  background-color: transparent;
  border-radius: ${props => props.theme.borderRadius.small};
  padding: 1px 3px;
  font-size: 12px;
  display: flex;
  align-items: center;
  border-left: 2px solid ${props => props.theme.colors.primary};
  color: ${props => props.theme.colors.text};
  font-weight: ${props => props.theme.mode === 'dark' ? '500' : 'normal'};
  margin-bottom: 1px;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  /* Removed transition for better performance */

  &:hover {
    background-color: ${props => props.theme.mode === 'dark' ? 'rgba(51, 153, 255, 0.1)' : 'rgba(51, 153, 255, 0.05)'};
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: 1px 2px;
    font-size: 10px;
    margin-bottom: 1px;
    background-color: ${props => props.theme.mode === 'dark' ? 'rgba(51, 153, 255, 0.15)' : 'rgba(51, 153, 255, 0.1)'};
    border-radius: 2px;
    white-space: normal;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
    min-width: 0;
    width: 100%;
  }
`;

const InheritedMitigationsContainer = styled.div`
  margin-top: 10px;
  border-top: 1px dashed ${props => props.theme.colors.border};
  padding-top: 5px;
  display: flex;
  flex-direction: column;
  gap: ${props => props.theme.spacing.small};

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    margin-top: 6px;
    padding-top: 3px;
    gap: 2px;
  }
`;

const InheritedMitigationItem = styled.div`
  background-color: transparent;
  border-radius: ${props => props.theme.borderRadius.small};
  padding: 1px 3px;
  font-size: 11px;
  display: flex;
  align-items: center;
  border-left: 2px solid ${props => props.theme.colors.lightText};
  color: ${props => props.theme.colors.lightText};
  font-weight: ${props => props.theme.mode === 'dark' ? '500' : 'normal'};
  margin-bottom: 1px;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  opacity: 0.8;
  font-style: italic;
  /* Removed transition for better performance */

  &:hover {
    background-color: ${props => props.theme.mode === 'dark' ? 'rgba(51, 153, 255, 0.05)' : 'rgba(51, 153, 255, 0.02)'};
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: 1px 2px;
    font-size: 9px;
    margin-bottom: 1px;
    background-color: ${props => props.theme.mode === 'dark' ? 'rgba(150, 150, 150, 0.15)' : 'rgba(150, 150, 150, 0.1)'};
    border-radius: 2px;
    white-space: normal;
    overflow: hidden;
    text-overflow: ellipsis;
    opacity: 0.9;
    max-width: 100%;
    min-width: 0;
    width: 100%;
  }
`;

const MitigationIcon = styled.span`
  margin-right: 4px;
  vertical-align: middle;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  flex-shrink: 0;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    margin-right: 3px;
    width: 13px;
    height: 13px;
    flex-shrink: 0;
  }
`;

const RemoveButton = styled.button`
  cursor: pointer;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  min-width: 28px;
  min-height: 28px;
  max-width: 28px;
  max-height: 28px;
  border-radius: 50%;
  border: none;
  background-color: rgba(255, 100, 100, 0.18);
  color: inherit;
  /* Removed transition for better performance */
  padding: 0;
  margin-left: 8px;
  line-height: 1;
  flex-shrink: 0;
  /* Ensure button is above other elements and can receive clicks */
  position: relative;
  z-index: 5;

  &:hover {
    background-color: rgba(255, 100, 100, 0.28);
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    width: 24px;
    height: 24px;
    min-width: 24px;
    min-height: 24px;
    max-width: 24px;
    max-height: 24px;
    font-size: 16px;
    margin-left: 6px;
  }
`;

const TankPositionBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  font-weight: bold;
  padding: 1px 3px;
  border-radius: 3px;
  margin-left: 4px;
  background-color: ${props => {
    if (props.$position === 'mainTank') {
      return props.theme.mode === 'dark' ? 'rgba(0, 150, 255, 0.3)' : 'rgba(0, 150, 255, 0.2)';
    } else if (props.$position === 'offTank') {
      return props.theme.mode === 'dark' ? 'rgba(100, 200, 255, 0.3)' : 'rgba(100, 200, 255, 0.2)';
    }
    return 'transparent';
  }};
  color: ${props => props.theme.colors.text};
  text-transform: uppercase;
  letter-spacing: 0.5px;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: 7px;
    padding: 1px 2px;
    margin-left: 2px;
  }
`;

const AssignedMitigations = memo(({
  action,
  assignments,
  getActiveMitigations,
  selectedJobs,
  currentBossLevel,
  isMobile,
  onRemoveMitigation,
  removePendingAssignment
}) => {
  // Get tank position context
  const { tankPositions } = useTankPositionContext();
  // Get directly assigned mitigations
  const directMitigations = assignments[action.id] || [];

  // Filter out mitigations that don't have any corresponding selected jobs
  const filteredDirectMitigations = directMitigations.filter(mitigation =>
    isMitigationAvailable(mitigation, selectedJobs)
  );

  // Get inherited mitigations from previous actions
  const activeMitigations = getActiveMitigations(action.id, action.time);

  // Filter out inherited mitigations that don't have any corresponding selected jobs
  const filteredActiveMitigations = activeMitigations.filter(mitigation => {
    // Find the full mitigation data
    const fullMitigation = mitigationAbilities.find(a => a.id === mitigation.id);
    if (!fullMitigation) return false;

    // Check if any of the jobs that can use this ability are selected
    return isMitigationAvailable(fullMitigation, selectedJobs);
  });

  // Only render if we have any mitigations to display
  if (filteredDirectMitigations.length === 0 && filteredActiveMitigations.length === 0) {
    return null;
  }

  console.log('[AssignedMitigations] filteredDirectMitigations.length:', filteredDirectMitigations.length);
  return (
    <AssignedMitigationsContainer>
      {/* Render directly assigned mitigations */}
      {filteredDirectMitigations.map(mitigation => {
        // Compute tooltip content directly (no useMemo)
        const tooltipContent = `${mitigation.name}${mitigation.tankPosition && mitigation.tankPosition !== 'shared' ? ` (${mitigation.tankPosition === 'mainTank' ? 'Main Tank' : 'Off Tank'})` : ''}: ${getAbilityDescriptionForLevel(mitigation, currentBossLevel)} (Duration: ${getAbilityDurationForLevel(mitigation, currentBossLevel)}s, Cooldown: ${getAbilityCooldownForLevel(mitigation, currentBossLevel)}s${getAbilityChargeCount(mitigation, currentBossLevel) > 1 ? `, Charges: ${getAbilityChargeCount(mitigation, currentBossLevel)}` : ''})${mitigation.mitigationValue ? `\nMitigation: ${typeof getAbilityMitigationValueForLevel(mitigation, currentBossLevel) === 'object' ? `${getAbilityMitigationValueForLevel(mitigation, currentBossLevel).physical * 100}% physical, ${getAbilityMitigationValueForLevel(mitigation, currentBossLevel).magical * 100}% magical` : `${getAbilityMitigationValueForLevel(mitigation, currentBossLevel) * 100}%`}` : ''}`;
        return (
          <Tooltip
            key={mitigation.id}
            content={tooltipContent}
          >
            <AssignedMitigationItem>
              <MitigationIcon>
                {typeof mitigation.icon === 'string' && mitigation.icon.startsWith('/') ?
                  <img src={mitigation.icon} alt={mitigation.name} style={{
                    maxHeight: isMobile ? '14px' : '18px',
                    maxWidth: isMobile ? '14px' : '18px',
                    display: 'block'
                  }} /> :
                  mitigation.icon
                }
              </MitigationIcon>
              <span
                style={{
                  flex: '1 1 auto',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: isMobile ? 'nowrap' : 'normal',
                  minWidth: 0,
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                {mitigation.name}
                {mitigation.tankPosition && mitigation.tankPosition !== 'shared' && (
                  <TankPositionBadge $position={mitigation.tankPosition}>
                    {mitigation.tankPosition === 'mainTank' ? 'MT' : 'OT'}
                  </TankPositionBadge>
                )}
              </span>
              <div style={{ display: 'flex', flex: '0 0 auto', alignItems: 'center', justifyContent: 'flex-end' }}>
                <RemoveButton
                  onClick={(e) => {
                    // Prevent event bubbling
                    e.stopPropagation();
                    e.preventDefault();

                    // Add a small delay to ensure the click is processed
                    setTimeout(() => {
                      // Remove pending assignment
                      removePendingAssignment(action.id, mitigation.id);

                      // Remove the mitigation with its tank position
                      onRemoveMitigation(action.id, mitigation.id, mitigation.tankPosition);
                    }, 10);
                  }}
                  aria-label={`Remove ${mitigation.name}`}
                >
                  ×
                </RemoveButton>
              </div>
            </AssignedMitigationItem>
          </Tooltip>
        );
      })}

      {/* Render inherited mitigations from previous boss actions */}
      {filteredActiveMitigations.length > 0 && (
        <InheritedMitigationsContainer>
          {filteredActiveMitigations.map(mitigation => {
            // Find the full mitigation data
            const fullMitigation = mitigationAbilities.find(a => a.id === mitigation.id);
            if (!fullMitigation) return null;

            return (
              <Tooltip
                key={`inherited-${mitigation.id}-${mitigation.sourceActionId}`}
                content={`${fullMitigation.name}${mitigation.tankPosition && mitigation.tankPosition !== 'shared' ? ` (${mitigation.tankPosition === 'mainTank' ? 'Main Tank' : 'Off Tank'})` : ''}: Applied at ${mitigation.sourceActionTime}s (${mitigation.sourceActionName})\nRemaining duration: ${mitigation.remainingDuration.toFixed(1)}s\n${fullMitigation.mitigationValue ? `Mitigation: ${typeof getAbilityMitigationValueForLevel(fullMitigation, currentBossLevel) === 'object' ? `${getAbilityMitigationValueForLevel(fullMitigation, currentBossLevel).physical * 100}% physical, ${getAbilityMitigationValueForLevel(fullMitigation, currentBossLevel).magical * 100}% magical` : `${getAbilityMitigationValueForLevel(fullMitigation, currentBossLevel) * 100}%`}` : ''}`}
              >
                <InheritedMitigationItem>
                  <MitigationIcon>
                    {typeof fullMitigation.icon === 'string' && fullMitigation.icon.startsWith('/') ?
                      <img src={fullMitigation.icon} alt={fullMitigation.name} style={{
                        maxHeight: isMobile ? '12px' : '18px',
                        maxWidth: isMobile ? '12px' : '18px',
                        opacity: isMobile ? 0.8 : 0.7,
                        display: 'block'
                      }} /> :
                      fullMitigation.icon
                    }
                  </MitigationIcon>
                  <span style={{
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: isMobile ? 'nowrap' : 'normal',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    {fullMitigation.name}
                    {mitigation.tankPosition && mitigation.tankPosition !== 'shared' && (
                      <TankPositionBadge $position={mitigation.tankPosition}>
                        {mitigation.tankPosition === 'mainTank' ? 'MT' : 'OT'}
                      </TankPositionBadge>
                    )}
                  </span>
                  <small style={{
                    fontSize: isMobile ? '8px' : '9px',
                    opacity: isMobile ? 0.9 : 0.8,
                    flexShrink: 0
                  }}>{mitigation.remainingDuration.toFixed(1)}s</small>
                </InheritedMitigationItem>
              </Tooltip>
            );
          })}
        </InheritedMitigationsContainer>
      )}
    </AssignedMitigationsContainer>
  );
});

AssignedMitigations.displayName = 'AssignedMitigations';

export default AssignedMitigations;
