import React, { useState } from 'react';
import styled from 'styled-components';
import { useCollaboration } from '../../contexts/CollaborationContext';

const ControlPanelContainer = styled.div`
  background: ${props => props.theme.colors.secondary};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 8px;
  padding: 16px;
  margin: 16px 0;
  box-shadow: ${props => props.theme.shadows.small};
`;

const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
`;

const PanelTitle = styled.h3`
  margin: 0;
  color: ${props => props.theme.colors.text};
  font-size: 16px;
  font-weight: 600;
`;

const SessionStatus = styled.span`
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
  
  ${props => {
    switch (props.status) {
      case 'active':
        return `
          background: #4CAF50;
          color: white;
        `;
      case 'paused':
        return `
          background: #FF9800;
          color: white;
        `;
      case 'ended':
        return `
          background: #757575;
          color: white;
        `;
      default:
        return `
          background: ${props.theme.colors.border};
          color: ${props.theme.colors.textSecondary};
        `;
    }
  }}
`;

const ControlButtons = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const ControlButton = styled.button`
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  ${props => {
    switch (props.variant) {
      case 'primary':
        return `
          background: #4CAF50;
          color: white;
          &:hover:not(:disabled) {
            background: #45a049;
          }
        `;
      case 'warning':
        return `
          background: #FF9800;
          color: white;
          &:hover:not(:disabled) {
            background: #f57c00;
          }
        `;
      case 'danger':
        return `
          background: #f44336;
          color: white;
          &:hover:not(:disabled) {
            background: #d32f2f;
          }
        `;
      default:
        return `
          background: ${props.theme.colors.border};
          color: ${props.theme.colors.text};
          &:hover:not(:disabled) {
            background: ${props.theme.colors.hover};
          }
        `;
    }
  }}
`;

const ParticipantsList = styled.div`
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid ${props => props.theme.colors.border};
`;

const ParticipantsHeader = styled.h4`
  margin: 0 0 8px 0;
  color: ${props => props.theme.colors.text};
  font-size: 14px;
  font-weight: 500;
`;

const ParticipantItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  font-size: 14px;
  color: ${props => props.theme.colors.textSecondary};
`;

const ParticipantRole = styled.span`
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  background: ${props => props.role === 'owner' ? '#4CAF50' : '#2196F3'};
  color: white;
`;

const StatusMessage = styled.div`
  margin-top: 8px;
  padding: 8px;
  border-radius: 4px;
  font-size: 14px;
  
  ${props => {
    switch (props.type) {
      case 'success':
        return `
          background: #e8f5e8;
          color: #2e7d32;
          border: 1px solid #4caf50;
        `;
      case 'error':
        return `
          background: #ffebee;
          color: #c62828;
          border: 1px solid #f44336;
        `;
      case 'info':
        return `
          background: #e3f2fd;
          color: #1565c0;
          border: 1px solid #2196f3;
        `;
      default:
        return `
          background: ${props.theme.colors.secondary};
          color: ${props.theme.colors.text};
          border: 1px solid ${props.theme.colors.border};
        `;
    }
  }}
`;

const SessionControlPanel = ({ planData, onSessionEnd }) => {
  const {
    currentSession,
    sessionParticipants,
    isSessionOwner,
    sessionStatus,
    startCollaborationSession,
    endCollaborationSession,
    pauseCollaborationSession,
    resumeCollaborationSession
  } = useCollaboration();

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleStartSession = async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      const result = await startCollaborationSession(planData);
      
      if (result.success) {
        setMessage({
          type: 'success',
          text: 'Collaboration session started successfully!'
        });
      } else {
        setMessage({
          type: 'error',
          text: result.message || 'Failed to start session'
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: `Error starting session: ${error.message}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndSession = async () => {
    if (!window.confirm('Are you sure you want to end the collaboration session? All changes will be saved.')) {
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const result = await endCollaborationSession(planData);
      
      if (result.success) {
        setMessage({
          type: 'success',
          text: 'Collaboration session ended successfully!'
        });
        
        // Notify parent component
        if (onSessionEnd) {
          onSessionEnd(result.finalPlanData);
        }
      } else {
        setMessage({
          type: 'error',
          text: result.message || 'Failed to end session'
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: `Error ending session: ${error.message}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePauseSession = async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      const result = await pauseCollaborationSession();
      
      if (result.success) {
        setMessage({
          type: 'info',
          text: 'Collaboration session paused'
        });
      } else {
        setMessage({
          type: 'error',
          text: result.message || 'Failed to pause session'
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: `Error pausing session: ${error.message}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResumeSession = async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      const result = await resumeCollaborationSession();
      
      if (result.success) {
        setMessage({
          type: 'success',
          text: 'Collaboration session resumed'
        });
      } else {
        setMessage({
          type: 'error',
          text: result.message || 'Failed to resume session'
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: `Error resuming session: ${error.message}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Don't show panel if user is not session owner and no session exists
  if (!isSessionOwner && !currentSession) {
    return null;
  }

  return (
    <ControlPanelContainer>
      <PanelHeader>
        <PanelTitle>Collaboration Session</PanelTitle>
        <SessionStatus status={sessionStatus}>
          {sessionStatus || 'No Session'}
        </SessionStatus>
      </PanelHeader>

      {message && (
        <StatusMessage type={message.type}>
          {message.text}
        </StatusMessage>
      )}

      <ControlButtons>
        {!currentSession && isSessionOwner && (
          <ControlButton
            variant="primary"
            onClick={handleStartSession}
            disabled={isLoading}
          >
            {isLoading ? 'Starting...' : 'Start Collaboration'}
          </ControlButton>
        )}

        {currentSession && isSessionOwner && (
          <>
            {sessionStatus === 'active' && (
              <ControlButton
                variant="warning"
                onClick={handlePauseSession}
                disabled={isLoading}
              >
                {isLoading ? 'Pausing...' : 'Pause Session'}
              </ControlButton>
            )}

            {sessionStatus === 'paused' && (
              <ControlButton
                variant="primary"
                onClick={handleResumeSession}
                disabled={isLoading}
              >
                {isLoading ? 'Resuming...' : 'Resume Session'}
              </ControlButton>
            )}

            <ControlButton
              variant="danger"
              onClick={handleEndSession}
              disabled={isLoading}
            >
              {isLoading ? 'Ending...' : 'End Session'}
            </ControlButton>
          </>
        )}
      </ControlButtons>

      {sessionParticipants.length > 0 && (
        <ParticipantsList>
          <ParticipantsHeader>
            Participants ({sessionParticipants.length})
          </ParticipantsHeader>
          {sessionParticipants.map(participant => (
            <ParticipantItem key={participant.userId}>
              <ParticipantRole role={participant.role}>
                {participant.role}
              </ParticipantRole>
              {participant.name || 'Anonymous'}
            </ParticipantItem>
          ))}
        </ParticipantsList>
      )}
    </ControlPanelContainer>
  );
};

export default SessionControlPanel;
