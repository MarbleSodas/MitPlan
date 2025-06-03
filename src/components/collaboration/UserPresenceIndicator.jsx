import React from 'react';
import styled from 'styled-components';

const PresenceContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: ${props => props.theme.colors.surface};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 8px;
  font-size: 14px;
  margin-bottom: 16px;
`;

const UserAvatarGroup = styled.div`
  display: flex;
  align-items: center;
  gap: -4px; /* Overlap avatars slightly */
`;

const UserAvatar = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: ${props => props.color || '#4CAF50'};
  border: 2px solid ${props => props.theme.colors.surface};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: white;
  position: relative;
  z-index: ${props => props.index || 1};
  
  &:hover {
    z-index: 10;
    transform: scale(1.1);
    transition: transform 0.2s ease;
  }
`;

const StatusIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  color: ${props => props.theme.colors.text};
`;

const StatusDot = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props => props.isActive ? '#4CAF50' : '#FFC107'};
  animation: ${props => props.isActive ? 'pulse 2s infinite' : 'none'};

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

const UserTooltip = styled.div`
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  background: ${props => props.theme.colors.surface};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
  white-space: nowrap;
  z-index: 1000;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
  
  ${UserAvatar}:hover & {
    opacity: 1;
  }
`;

/**
 * Get user initials from name
 */
const getUserInitials = (name) => {
  if (!name) return '?';
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

/**
 * Component to display active users in a collaboration session
 */
const UserPresenceIndicator = ({ 
  users = [], 
  currentUserId = null,
  isCollaborating = false,
  maxDisplayUsers = 5 
}) => {
  if (!isCollaborating || users.length === 0) {
    return null;
  }

  // Filter out current user and sort by join time
  const otherUsers = users
    .filter(user => user.userId !== currentUserId)
    .sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
  
  const displayUsers = otherUsers.slice(0, maxDisplayUsers);
  const hiddenCount = Math.max(0, otherUsers.length - maxDisplayUsers);
  const totalUsers = users.length;

  return (
    <PresenceContainer>
      <StatusIndicator>
        <StatusDot isActive={isCollaborating} />
        <span>
          <UserCount>{totalUsers}</UserCount> user{totalUsers !== 1 ? 's' : ''} editing
        </span>
      </StatusIndicator>

      {displayUsers.length > 0 && (
        <UserAvatarGroup>
          {displayUsers.map((user, index) => (
            <UserAvatar
              key={user.userId}
              color={user.color}
              index={displayUsers.length - index}
            >
              {getUserInitials(user.name)}
              <UserTooltip>
                {user.name || 'Anonymous'}
              </UserTooltip>
            </UserAvatar>
          ))}
          
          {hiddenCount > 0 && (
            <UserAvatar
              color="#666"
              index={0}
            >
              +{hiddenCount}
              <UserTooltip>
                {hiddenCount} more user{hiddenCount !== 1 ? 's' : ''}
              </UserTooltip>
            </UserAvatar>
          )}
        </UserAvatarGroup>
      )}
    </PresenceContainer>
  );
};

export default UserPresenceIndicator;
