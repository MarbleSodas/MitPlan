import React from 'react';
import styled from 'styled-components';
import { X, Trash2 } from 'lucide-react';

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
  background-color: ${props => props.theme.colors.cardBackground};
  border-radius: ${props => props.theme.borderRadius.medium};
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: ${props => props.theme.shadows.small};
  transition: all 0.2s ease;
  position: relative;
  opacity: ${props => props.$isDisabled ? 0.5 : 1};

  &:active {
    background-color: ${props => props.$isDisabled ? props.theme.colors.cardBackground : props.theme.mode === 'dark' ? 'rgba(51, 153, 255, 0.2)' : 'rgba(51, 153, 255, 0.1)'};
    transform: ${props => props.$isDisabled ? 'none' : 'translateY(-2px)'};
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

const MobileMitigationSelector = ({
  mitigations,
  bossAction,
  assignments,
  onAssignMitigation,
  onRemoveMitigation,
  checkAbilityCooldown,
  bossLevel
}) => {
  // Get the current assignments for this boss action
  const currentAssignments = assignments[bossAction.id] || [];

  return (
    <Container>
      <AvailableMitigationsSection>
        <SectionTitle>Available Mitigations</SectionTitle>
        <MitigationList>
          {mitigations.map(mitigation => {
            // Check if this mitigation is already assigned to this action
            const isAssigned = currentAssignments.some(m => m.id === mitigation.id);

            // Check if this mitigation would be on cooldown
            const cooldownResult = checkAbilityCooldown(mitigation.id, bossAction.time);
            const isDisabled = isAssigned || (cooldownResult && cooldownResult.isOnCooldown);

            // Get the cooldown reason if applicable
            const cooldownReason = cooldownResult && cooldownResult.isOnCooldown ?
              `On cooldown from ${cooldownResult.lastUsedActionName} (${cooldownResult.lastUsedTime}s)` :
              null;

            return (
              <MitigationItem
                key={mitigation.id}
                $isDisabled={isDisabled}
                onClick={() => {
                  if (!isDisabled) {
                    onAssignMitigation(bossAction.id, mitigation);
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
                    <small>Duration: {mitigation.duration}s | Cooldown: {mitigation.cooldown}s</small>
                  </MitigationDescription>
                </MitigationContent>

                {isDisabled && (
                  <CooldownOverlay>
                    {isAssigned ? 'Already assigned' : cooldownReason}
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
          {currentAssignments.length > 0 && ` (${currentAssignments.length})`}
        </SectionTitle>

        <AssignedMitigationsList>
          {currentAssignments.length > 0 ? (
            currentAssignments.map(mitigation => (
              <AssignedMitigationItem key={mitigation.id}>
                <AssignedMitigationName>
                  {typeof mitigation.icon === 'string' && mitigation.icon.startsWith('/') ?
                    <img src={mitigation.icon} alt={mitigation.name} /> :
                    null
                  }
                  {mitigation.name}
                </AssignedMitigationName>
                <RemoveButton
                  onClick={() => onRemoveMitigation(bossAction.id, mitigation.id)}
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
