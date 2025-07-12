import React, { useState } from 'react';
import styled from 'styled-components';

const ActiveUsersContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  background: ${props => props.theme?.colors?.cardBackground || '#ffffff'};
  border: 1px solid ${props => props.theme?.colors?.border || '#e1e5e9'};
  border-radius: 12px;
  margin-bottom: 1rem;
  box-shadow: ${props => props.theme?.shadows?.small || '0 1px 3px rgba(0, 0, 0, 0.1)'};
  transition: all 0.2s ease;

  @media (max-width: ${props => props.theme?.breakpoints?.tablet || '768px'}) {
    padding: 0.75rem 1rem;
    gap: 0.5rem;
  }

  @media (max-width: ${props => props.theme?.breakpoints?.mobile || '480px'}) {
    padding: 0.5rem 0.75rem;
    gap: 0.375rem;
  }
`;

const UsersLabel = styled.span`
  font-size: 0.875rem;
  font-weight: 600;
  color: ${props => props.theme?.colors?.text || '#333333'};
  white-space: nowrap;

  @media (max-width: ${props => props.theme?.breakpoints?.mobile || '480px'}) {
    font-size: 0.8rem;
  }
`;

const AvatarsContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;

  @media (max-width: ${props => props.theme?.breakpoints?.mobile || '480px'}) {
    gap: 0.375rem;
  }
`;

const UserAvatar = styled.div`
  position: relative;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: ${props => props.color || '#3399ff'};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 0.875rem;
  flex-shrink: 0;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid ${props => props.theme?.colors?.cardBackground || '#ffffff'};
  box-shadow: ${props => props.theme?.shadows?.small || '0 1px 3px rgba(0, 0, 0, 0.1)'};

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${props => props.theme?.shadows?.medium || '0 2px 4px rgba(0, 0, 0, 0.1)'};
  }

  @media (max-width: ${props => props.theme?.breakpoints?.tablet || '768px'}) {
    width: 32px;
    height: 32px;
    font-size: 0.8rem;
  }

  @media (max-width: ${props => props.theme?.breakpoints?.mobile || '480px'}) {
    width: 28px;
    height: 28px;
    font-size: 0.75rem;
  }
`;

const Tooltip = styled.div`
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-bottom: 8px;
  padding: 0.5rem 0.75rem;
  background: ${props => props.theme?.colors?.text || '#333333'};
  color: ${props => props.theme?.colors?.cardBackground || '#ffffff'};
  font-size: 0.75rem;
  font-weight: 500;
  border-radius: 6px;
  white-space: nowrap;
  opacity: ${props => props.$visible ? 1 : 0};
  visibility: ${props => props.$visible ? 'visible' : 'hidden'};
  transition: all 0.2s ease;
  z-index: 1000;
  pointer-events: none;
  box-shadow: ${props => props.theme?.shadows?.medium || '0 2px 4px rgba(0, 0, 0, 0.1)'};

  &::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 4px solid transparent;
    border-top-color: ${props => props.theme?.colors?.text || '#333333'};
  }
`;

const OverflowIndicator = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: ${props => props.theme?.colors?.textSecondary || '#666666'};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 0.75rem;
  flex-shrink: 0;
  border: 2px solid ${props => props.theme?.colors?.cardBackground || '#ffffff'};
  box-shadow: ${props => props.theme?.shadows?.small || '0 1px 3px rgba(0, 0, 0, 0.1)'};

  @media (max-width: ${props => props.theme?.breakpoints?.tablet || '768px'}) {
    width: 32px;
    height: 32px;
    font-size: 0.7rem;
  }

  @media (max-width: ${props => props.theme?.breakpoints?.mobile || '480px'}) {
    width: 28px;
    height: 28px;
    font-size: 0.65rem;
  }
`;

const EmptyState = styled.div`
  font-size: 0.875rem;
  color: ${props => props.theme?.colors?.textSecondary || '#666666'};
  font-style: italic;

  @media (max-width: ${props => props.theme?.breakpoints?.mobile || '480px'}) {
    font-size: 0.8rem;
  }
`;

// Generate a consistent color for a user based on their ID
const generateUserColor = (userId) => {
  const colors = [
    '#3399ff', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
  ];
  
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
};

// Helper function to clean display names (remove quotes if present)
const cleanDisplayName = (name) => {
  if (!name) return name;
  // Remove surrounding quotes if present (handles both single and double quotes)
  if ((name.startsWith('"') && name.endsWith('"')) ||
      (name.startsWith("'") && name.endsWith("'"))) {
    return name.slice(1, -1);
  }
  return name;
};

// Get initials from display name
const getInitials = (displayName) => {
  const cleanName = cleanDisplayName(displayName);
  return cleanName
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const ActiveUsersDisplay = ({ 
  collaborators = [], 
  currentSessionId, 
  maxDisplayUsers = 8 
}) => {
  const [hoveredUser, setHoveredUser] = useState(null);

  // Filter active collaborators and sort current user first
  const activeCollaborators = collaborators.filter(c => c.isActive);
  const currentUser = activeCollaborators.find(c => c.sessionId === currentSessionId);
  const otherUsers = activeCollaborators.filter(c => c.sessionId !== currentSessionId);
  
  // Combine users with current user first
  const sortedUsers = currentUser ? [currentUser, ...otherUsers] : otherUsers;
  
  // Split users into displayed and overflow
  const displayedUsers = sortedUsers.slice(0, maxDisplayUsers);
  const overflowCount = Math.max(0, sortedUsers.length - maxDisplayUsers);

  const handleMouseEnter = (sessionId) => {
    setHoveredUser(sessionId);
  };

  const handleMouseLeave = () => {
    setHoveredUser(null);
  };

  if (activeCollaborators.length === 0) {
    return (
      <ActiveUsersContainer>
        <UsersLabel>Active Users:</UsersLabel>
        <EmptyState>No active collaborators</EmptyState>
      </ActiveUsersContainer>
    );
  }

  return (
    <ActiveUsersContainer>
      <UsersLabel>
        Active Users ({activeCollaborators.length}):
      </UsersLabel>
      
      <AvatarsContainer>
        {displayedUsers.map((user) => (
          <UserAvatar
            key={user.sessionId}
            color={generateUserColor(user.userId)}
            onMouseEnter={() => handleMouseEnter(user.sessionId)}
            onMouseLeave={handleMouseLeave}
          >
            {getInitials(user.displayName)}
            <Tooltip $visible={hoveredUser === user.sessionId}>
              {cleanDisplayName(user.displayName)}
              {user.sessionId === currentSessionId ? ' (You)' : ''}
            </Tooltip>
          </UserAvatar>
        ))}
        
        {overflowCount > 0 && (
          <OverflowIndicator>
            +{overflowCount}
          </OverflowIndicator>
        )}
      </AvatarsContainer>
    </ActiveUsersContainer>
  );
};

export default ActiveUsersDisplay;
