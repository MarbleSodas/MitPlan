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
import { mitigationAbilities } from '../../data';

const AssignedMitigationsContainer = styled.div`
  position: absolute;
  top: 35px; /* Align with content below the time indicator */
  right: 0;
  width: 230px; /* Reduced width to allow more space for description */
  display: flex;
  flex-direction: column;
  gap: ${props => props.theme.spacing.small};
  border-left: 1px solid ${props => props.theme.colors.border};
  padding: ${props => props.theme.spacing.small};
  padding-left: ${props => props.theme.spacing.small}; /* Reduced left padding */
  height: calc(100% - 40px); /* Full height minus time indicator */
  overflow-y: auto; /* Allow scrolling if many mitigations */
  background-color: ${props => props.theme.mode === 'dark' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.5)'};
  border-bottom-right-radius: ${props => props.theme.borderRadius.medium};
  -webkit-overflow-scrolling: touch; /* Improve scrolling on iOS devices */
  z-index: 1; /* Ensure it's above the description */
  box-shadow: -2px 0 5px rgba(0, 0, 0, 0.05); /* Subtle shadow to separate from description */

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    width: 125px; /* Optimized width for mobile */
    top: 30px; /* Adjust for smaller time indicator */
    padding: 4px; /* Smaller padding on mobile */
    padding-left: 6px; /* Slightly larger left padding */
    gap: 3px; /* Reduced gap between items */
    height: calc(100% - 30px);
    touch-action: pan-y; /* Allow vertical scrolling */
    overscroll-behavior: contain; /* Prevent scroll chaining */
    background-color: ${props => props.theme.mode === 'dark' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.7)'}; /* Slight background for better visibility */
    border-left: 1px solid ${props => props.theme.colors.border};
    max-height: calc(100% - 30px); /* Ensure it doesn't overflow */
    overflow-x: hidden; /* Prevent horizontal overflow */
  }
`;

const AssignedMitigationItem = styled.div`
  background-color: transparent;
  border-radius: ${props => props.theme.borderRadius.small};
  padding: 2px 4px;
  font-size: ${props => props.theme.fontSizes.small};
  display: flex;
  align-items: center;
  border-left: 2px solid ${props => props.theme.colors.primary};
  color: ${props => props.theme.colors.text};
  font-weight: ${props => props.theme.mode === 'dark' ? '500' : 'normal'};
  margin-bottom: 2px;
  width: 100%;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: ${props => props.theme.mode === 'dark' ? 'rgba(51, 153, 255, 0.1)' : 'rgba(51, 153, 255, 0.05)'};
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: 2px 4px;
    font-size: 10px; /* Smaller font on mobile */
    margin-bottom: 3px; /* Increased spacing between items */
    background-color: ${props => props.theme.mode === 'dark' ? 'rgba(51, 153, 255, 0.15)' : 'rgba(51, 153, 255, 0.1)'}; /* Slight background for better visibility */
    border-radius: 3px;
    white-space: nowrap; /* Prevent text wrapping */
    overflow: hidden; /* Hide overflow */
    text-overflow: ellipsis; /* Add ellipsis for overflow text */
    max-width: 110px; /* Ensure it doesn't overflow the container */
    width: 110px; /* Fixed width to prevent overflow */
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
  padding: 3px 6px;
  font-size: ${props => props.theme.fontSizes.small};
  display: flex;
  align-items: center;
  border-left: 2px solid ${props => props.theme.colors.lightText};
  color: ${props => props.theme.colors.lightText};
  font-weight: ${props => props.theme.mode === 'dark' ? '500' : 'normal'};
  margin-bottom: 2px;
  width: 100%;
  opacity: 0.8;
  font-style: italic;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: ${props => props.theme.mode === 'dark' ? 'rgba(51, 153, 255, 0.05)' : 'rgba(51, 153, 255, 0.02)'};
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: 2px 4px;
    font-size: 9px; /* Even smaller font for inherited mitigations */
    margin-bottom: 2px;
    background-color: ${props => props.theme.mode === 'dark' ? 'rgba(150, 150, 150, 0.15)' : 'rgba(150, 150, 150, 0.1)'}; /* Slight background for better visibility */
    border-radius: 3px;
    white-space: nowrap; /* Prevent text wrapping */
    overflow: hidden; /* Hide overflow */
    text-overflow: ellipsis; /* Add ellipsis for overflow text */
    opacity: 0.9; /* Slightly more visible on mobile */
    max-width: 110px; /* Ensure it doesn't overflow the container */
    width: 110px; /* Fixed width to prevent overflow */
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

const RemoveButton = styled.button`
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: none;
  background-color: rgba(255, 100, 100, 0.2);
  color: inherit;
  transition: background-color 0.2s ease;
  padding: 0;

  &:hover {
    background-color: rgba(255, 100, 100, 0.3);
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    width: 16px;
    height: 16px;
    font-size: 10px;
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
    const fullMitigation = mitigationAbilities.find(m => m.id === mitigation.id);
    if (!fullMitigation) return false;

    // Check if any of the jobs that can use this ability are selected
    return isMitigationAvailable(fullMitigation, selectedJobs);
  });

  // Only render if we have any mitigations to display
  if (filteredDirectMitigations.length === 0 && filteredActiveMitigations.length === 0) {
    return null;
  }

  return (
    <AssignedMitigationsContainer>
      {/* Render directly assigned mitigations */}
      {filteredDirectMitigations.map(mitigation => (
        <Tooltip
          key={mitigation.id}
          content={`${mitigation.name}: ${getAbilityDescriptionForLevel(mitigation, currentBossLevel)} (Duration: ${getAbilityDurationForLevel(mitigation, currentBossLevel)}s, Cooldown: ${getAbilityCooldownForLevel(mitigation, currentBossLevel)}s${getAbilityChargeCount(mitigation, currentBossLevel) > 1 ? `, Charges: ${getAbilityChargeCount(mitigation, currentBossLevel)}` : ''})${mitigation.mitigationValue ? `\nMitigation: ${typeof getAbilityMitigationValueForLevel(mitigation, currentBossLevel) === 'object' ? `${getAbilityMitigationValueForLevel(mitigation, currentBossLevel).physical * 100}% physical, ${getAbilityMitigationValueForLevel(mitigation, currentBossLevel).magical * 100}% magical` : `${getAbilityMitigationValueForLevel(mitigation, currentBossLevel) * 100}%`}` : ''}`}
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
            <span style={{
              flex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: isMobile ? 'nowrap' : 'normal'
            }}>{mitigation.name}</span>
            <RemoveButton
              onClick={(e) => {
                e.stopPropagation();

                // Remove pending assignment
                removePendingAssignment(action.id, mitigation.id);

                // Remove the mitigation
                onRemoveMitigation(action.id, mitigation.id);
              }}
              aria-label={`Remove ${mitigation.name}`}
            >
              ×
            </RemoveButton>
          </AssignedMitigationItem>
        </Tooltip>
      ))}

      {/* Render inherited mitigations from previous boss actions */}
      {filteredActiveMitigations.length > 0 && (
        <InheritedMitigationsContainer>
          {filteredActiveMitigations.map(mitigation => {
            // Find the full mitigation data
            const fullMitigation = mitigationAbilities.find(m => m.id === mitigation.id);
            if (!fullMitigation) return null;

            return (
              <Tooltip
                key={`inherited-${mitigation.id}-${mitigation.sourceActionId}`}
                content={`${fullMitigation.name}: Applied at ${mitigation.sourceActionTime}s (${mitigation.sourceActionName})\nRemaining duration: ${mitigation.remainingDuration.toFixed(1)}s\n${fullMitigation.mitigationValue ? `Mitigation: ${typeof getAbilityMitigationValueForLevel(fullMitigation, currentBossLevel) === 'object' ? `${getAbilityMitigationValueForLevel(fullMitigation, currentBossLevel).physical * 100}% physical, ${getAbilityMitigationValueForLevel(fullMitigation, currentBossLevel).magical * 100}% magical` : `${getAbilityMitigationValueForLevel(fullMitigation, currentBossLevel) * 100}%`}` : ''}`}
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
                    whiteSpace: isMobile ? 'nowrap' : 'normal'
                  }}>{fullMitigation.name}</span>
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
