import React from 'react';
import styled from 'styled-components';

const IndicatorContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: ${props => props.theme.colors.surface};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 8px;
  font-size: 14px;
  color: ${props => props.theme.colors.text};
`;

const StatusDot = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props => props.isCollaborating ? '#4CAF50' : '#FFC107'};
  animation: ${props => props.isCollaborating ? 'pulse 2s infinite' : 'none'};

  @keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.5; }
    100% { opacity: 1; }
  }
`;

const UserCount = styled.span`
  font-weight: 600;
  color: ${props => props.theme.colors.primary};
`;

const CollaborationIndicator = ({ isCollaborating, roomUsers = [] }) => {
  if (!isCollaborating) {
    return null;
  }

  const userCount = roomUsers.length;
  const otherUsers = roomUsers.filter(user => user.userId !== 'current-user'); // Filter out current user

  return (
    <IndicatorContainer>
      <StatusDot isCollaborating={isCollaborating} />
      <span>
        {userCount > 1 ? (
          <>
            <UserCount>{userCount}</UserCount> users collaborating
          </>
        ) : (
          'Waiting for collaborators...'
        )}
      </span>
      {otherUsers.length > 0 && (
        <span style={{ fontSize: '12px', opacity: 0.7 }}>
          ({otherUsers.map(user => user.userName).join(', ')})
        </span>
      )}
    </IndicatorContainer>
  );
};

export default CollaborationIndicator;
