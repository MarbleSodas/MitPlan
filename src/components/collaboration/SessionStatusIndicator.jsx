import React from 'react';
import styled, { keyframes } from 'styled-components';
import { useCollaboration } from '../../contexts/CollaborationContext';

const pulse = keyframes`
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
  100% {
    opacity: 1;
  }
`;

const StatusContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: ${props => props.theme.colors.secondary};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 6px;
  font-size: 14px;
  margin: 8px 0;
  
  ${props => props.isActive && `
    animation: ${pulse} 2s infinite;
  `}
`;

const StatusDot = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  
  ${props => {
    switch (props.status) {
      case 'active':
        return `
          background: #4CAF50;
          box-shadow: 0 0 4px #4CAF50;
        `;
      case 'paused':
        return `
          background: #FF9800;
          box-shadow: 0 0 4px #FF9800;
        `;
      case 'ended':
        return `
          background: #757575;
        `;
      default:
        return `
          background: ${props.theme.colors.border};
        `;
    }
  }}
`;

const StatusText = styled.span`
  color: ${props => props.theme.colors.text};
  font-weight: 500;
`;

const ParticipantCount = styled.span`
  color: ${props => props.theme.colors.textSecondary};
  font-size: 12px;
  margin-left: 4px;
`;

const OwnerBadge = styled.span`
  background: #4CAF50;
  color: white;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  margin-left: 8px;
`;

const SessionInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
  font-size: 12px;
  color: ${props => props.theme.colors.textSecondary};
`;

const getStatusMessage = (sessionStatus, isSessionOwner, participantCount) => {
  if (!sessionStatus) {
    return 'No active collaboration session';
  }

  switch (sessionStatus) {
    case 'active':
      return isSessionOwner 
        ? 'You are hosting a collaboration session'
        : 'Collaboration session active';
    case 'paused':
      return isSessionOwner
        ? 'You have paused the collaboration session'
        : 'Collaboration session is paused';
    case 'ended':
      return 'Collaboration session has ended';
    default:
      return 'Unknown session status';
  }
};

const SessionStatusIndicator = ({ compact = false }) => {
  const {
    currentSession,
    sessionParticipants,
    isSessionOwner,
    sessionStatus,
    isCollaborating
  } = useCollaboration();

  // Don't show if not in a shared plan or no session
  if (!isCollaborating && !currentSession) {
    return null;
  }

  const participantCount = sessionParticipants.length;
  const statusMessage = getStatusMessage(sessionStatus, isSessionOwner, participantCount);

  if (compact) {
    return (
      <StatusContainer isActive={sessionStatus === 'active'}>
        <StatusDot status={sessionStatus} />
        <StatusText>
          {sessionStatus === 'active' ? 'Live' : sessionStatus || 'Offline'}
        </StatusText>
        {participantCount > 0 && (
          <ParticipantCount>
            {participantCount} user{participantCount !== 1 ? 's' : ''}
          </ParticipantCount>
        )}
        {isSessionOwner && <OwnerBadge>Owner</OwnerBadge>}
      </StatusContainer>
    );
  }

  return (
    <StatusContainer isActive={sessionStatus === 'active'}>
      <StatusDot status={sessionStatus} />
      <StatusText>{statusMessage}</StatusText>
      
      {participantCount > 0 && (
        <ParticipantCount>
          ({participantCount} participant{participantCount !== 1 ? 's' : ''})
        </ParticipantCount>
      )}
      
      {isSessionOwner && <OwnerBadge>Owner</OwnerBadge>}
      
      {currentSession && (
        <SessionInfo>
          Session ID: {currentSession.id?.slice(-8) || 'Unknown'}
        </SessionInfo>
      )}
    </StatusContainer>
  );
};

export default SessionStatusIndicator;
