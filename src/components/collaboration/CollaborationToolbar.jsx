/**
 * CollaborationToolbar Component
 * 
 * Provides user-facing controls for collaboration features including
 * session management, user presence, and collaboration status.
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useCollaboration } from '../../contexts/CollaborationContext';
import { useAuth } from '../../contexts/AuthContext';
import { useDisplayName } from '../../contexts/DisplayNameContext';
import UserPresence from './UserPresence';
import { 
  Users, 
  Share2, 
  Play, 
  Pause, 
  Square, 
  Settings, 
  Wifi, 
  WifiOff,
  Eye,
  Edit3,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

const ToolbarContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  background: ${props => props.theme?.colors?.surface || '#ffffff'};
  border: 1px solid ${props => props.theme?.colors?.border || '#e0e0e0'};
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  font-size: 14px;
  
  @media (max-width: 768px) {
    padding: 6px 12px;
    gap: 8px;
    font-size: 13px;
  }
`;

const StatusIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: 500;
  
  ${props => {
    switch (props.$status) {
      case 'connected':
        return `
          background: #e8f5e8;
          color: #2e7d32;
          border: 1px solid #c8e6c9;
        `;
      case 'disconnected':
        return `
          background: #ffebee;
          color: #c62828;
          border: 1px solid #ffcdd2;
        `;
      case 'connecting':
        return `
          background: #fff3e0;
          color: #ef6c00;
          border: 1px solid #ffcc02;
        `;
      default:
        return `
          background: #f5f5f5;
          color: #666;
          border: 1px solid #e0e0e0;
        `;
    }
  }}
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border: 1px solid ${props => props.theme?.colors?.border || '#e0e0e0'};
  border-radius: 4px;
  background: ${props => props.theme?.colors?.background || '#ffffff'};
  color: ${props => props.theme?.colors?.text || '#333333'};
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: ${props => props.theme?.colors?.hover || '#f5f5f5'};
    border-color: ${props => props.theme?.colors?.primary || '#2196F3'};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &.primary {
    background: ${props => props.theme?.colors?.primary || '#2196F3'};
    color: white;
    border-color: ${props => props.theme?.colors?.primary || '#2196F3'};

    &:hover:not(:disabled) {
      background: ${props => props.theme?.colors?.primaryDark || '#1976D2'};
    }
  }

  &.danger {
    background: #f44336;
    color: white;
    border-color: #f44336;

    &:hover:not(:disabled) {
      background: #d32f2f;
    }
  }
`;

const UserCount = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  color: ${props => props.theme?.colors?.textSecondary || '#666'};
  font-weight: 500;
`;

const SessionInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: ${props => props.theme?.colors?.textSecondary || '#666'};
`;

const CollaborationToolbar = ({
  planId,
  onSharePlan,
  showSessionControls = true,
  showUserPresence = true,
  className = ''
}) => {
  const { isAuthenticated } = useAuth();
  const { displayName: contextDisplayName, canEdit: contextCanEdit } = useDisplayName();
  const {
    isConnected,
    isCollaborating,
    currentPlanId,
    roomUsers,
    connectionError,
    userId,
    displayName: collaborationDisplayName,
    canEdit: collaborationCanEdit,

    // Session management
    currentSession,
    isSessionOwner,
    sessionStatus,
    startCollaborationSession,
    endCollaborationSession,
    pauseCollaborationSession,
    resumeCollaborationSession
  } = useCollaboration();

  // Use the most appropriate display name and edit permissions
  const effectiveDisplayName = contextDisplayName || collaborationDisplayName || 'Anonymous User';
  const effectiveCanEdit = contextCanEdit && collaborationCanEdit;

  const [isLoading, setIsLoading] = useState(false);
  const [lastActivity, setLastActivity] = useState(Date.now());

  // Update activity timestamp
  useEffect(() => {
    const interval = setInterval(() => {
      setLastActivity(Date.now());
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Get collaboration status
  const getCollaborationStatus = () => {
    if (!isConnected) return 'disconnected';
    if (connectionError) return 'disconnected';
    if (isCollaborating && currentPlanId === planId) return 'connected';
    return 'disconnected';
  };

  const collaborationStatus = getCollaborationStatus();
  const activeUserCount = roomUsers.length;
  const isActiveCollaboration = isCollaborating && currentPlanId === planId;

  // Check if we're on a shared plan URL
  const isSharedPlan = window.location.pathname.includes('/plan/shared/');

  // Session control handlers
  const handleStartSession = async () => {
    if (!isAuthenticated || !effectiveCanEdit) return;
    
    setIsLoading(true);
    try {
      const result = await startCollaborationSession({
        planId,
        initiatedBy: userId,
        timestamp: Date.now()
      });
      
      if (!result.success) {
        console.error('Failed to start session:', result.message);
      }
    } catch (error) {
      console.error('Error starting session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePauseSession = async () => {
    if (!isSessionOwner) return;
    
    setIsLoading(true);
    try {
      await pauseCollaborationSession();
    } catch (error) {
      console.error('Error pausing session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResumeSession = async () => {
    if (!isSessionOwner) return;
    
    setIsLoading(true);
    try {
      await resumeCollaborationSession();
    } catch (error) {
      console.error('Error resuming session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndSession = async () => {
    if (!isSessionOwner) return;
    
    setIsLoading(true);
    try {
      await endCollaborationSession();
    } catch (error) {
      console.error('Error ending session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSharePlan = () => {
    if (onSharePlan) {
      onSharePlan(planId);
    }
  };

  // Render session status
  const renderSessionStatus = () => {
    if (!currentSession) return null;

    const statusIcon = {
      'active': <CheckCircle size={14} />,
      'paused': <Pause size={14} />,
      'ended': <Square size={14} />
    }[sessionStatus] || <Clock size={14} />;

    return (
      <SessionInfo>
        {statusIcon}
        Session {sessionStatus || 'unknown'}
        {isSessionOwner && <span>(Owner)</span>}
      </SessionInfo>
    );
  };

  // Render session controls
  const renderSessionControls = () => {
    if (!showSessionControls || !isActiveCollaboration) return null;

    if (!currentSession && isAuthenticated && effectiveCanEdit) {
      return (
        <ActionButton
          onClick={handleStartSession}
          disabled={isLoading}
          className="primary"
        >
          <Play size={14} />
          Start Session
        </ActionButton>
      );
    }

    if (!isSessionOwner) return null;

    return (
      <>
        {sessionStatus === 'active' && (
          <ActionButton
            onClick={handlePauseSession}
            disabled={isLoading}
          >
            <Pause size={14} />
            Pause
          </ActionButton>
        )}
        
        {sessionStatus === 'paused' && (
          <ActionButton
            onClick={handleResumeSession}
            disabled={isLoading}
            className="primary"
          >
            <Play size={14} />
            Resume
          </ActionButton>
        )}
        
        <ActionButton
          onClick={handleEndSession}
          disabled={isLoading}
          className="danger"
        >
          <Square size={14} />
          End Session
        </ActionButton>
      </>
    );
  };

  return (
    <ToolbarContainer className={className}>
      {/* Collaboration Status - Hide offline status when using shared links */}
      {!(isSharedPlan && collaborationStatus === 'disconnected') && (
        <StatusIndicator $status={collaborationStatus}>
          {collaborationStatus === 'connected' ? <Wifi size={14} /> : <WifiOff size={14} />}
          {collaborationStatus === 'connected' ? 'Connected' : 'Offline'}
        </StatusIndicator>
      )}

      {/* User Count */}
      {isActiveCollaboration && (
        <UserCount>
          <Users size={14} />
          {activeUserCount} {activeUserCount === 1 ? 'user' : 'users'}
        </UserCount>
      )}

      {/* User Presence */}
      {showUserPresence && isActiveCollaboration && (
        <UserPresence planId={planId} />
      )}

      {/* Edit/View Mode Indicator - Hide on shared plans when disconnected */}
      {isActiveCollaboration && !(isSharedPlan && collaborationStatus === 'disconnected') && (
        <StatusIndicator $status={effectiveCanEdit ? 'connected' : 'disconnected'}>
          {effectiveCanEdit ? <Edit3 size={14} /> : <Eye size={14} />}
          {effectiveCanEdit ? `Editing as ${effectiveDisplayName}` : 'Viewing Only'}
        </StatusIndicator>
      )}

      {/* Session Status */}
      {renderSessionStatus()}

      {/* Session Controls */}
      {renderSessionControls()}

      {/* Share Button */}
      {onSharePlan && (
        <ActionButton
          onClick={handleSharePlan}
          disabled={isLoading}
        >
          <Share2 size={14} />
          Share
        </ActionButton>
      )}

      {/* Connection Error */}
      {connectionError && (
        <StatusIndicator $status="disconnected">
          <AlertCircle size={14} />
          {connectionError}
        </StatusIndicator>
      )}
    </ToolbarContainer>
  );
};

export default CollaborationToolbar;
