import { useState } from 'react';
import styled from 'styled-components';
import { Users, Eye, Edit3 } from 'lucide-react';

const CollaboratorsContainer = styled.div`
  position: relative;
  display: inline-block;
`;

const CollaboratorsButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: ${props => props.theme?.colors?.backgroundSecondary || '#f8f9fa'};
  border: 1px solid ${props => props.theme?.colors?.border || '#e1e5e9'};
  border-radius: 8px;
  color: ${props => props.theme?.colors?.text || '#333333'};
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.theme?.colors?.backgroundTertiary || '#e9ecef'};
  }

  &:focus {
    outline: none;
    border-color: ${props => props.theme?.colors?.primary || '#3399ff'};
  }
`;

const CollaboratorCount = styled.span`
  background: ${props => props.theme?.colors?.primary || '#3399ff'};
  color: white;
  border-radius: 12px;
  padding: 0.125rem 0.375rem;
  font-size: 0.75rem;
  font-weight: 600;
  min-width: 1.25rem;
  text-align: center;
`;

const CollaboratorsDropdown = styled.div`
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 0.5rem;
  background: ${props => props.theme?.colors?.background || '#ffffff'};
  border: 1px solid ${props => props.theme?.colors?.border || '#e1e5e9'};
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  min-width: 250px;
  max-width: 300px;
  z-index: 1000;
`;

const DropdownHeader = styled.div`
  padding: 0.75rem 1rem;
  border-bottom: 1px solid ${props => props.theme?.colors?.border || '#e1e5e9'};
  font-weight: 600;
  color: ${props => props.theme?.colors?.text || '#333333'};
  font-size: 0.875rem;
`;

const CollaboratorItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid ${props => props.theme?.colors?.border || '#e1e5e9'};

  &:last-child {
    border-bottom: none;
  }
`;

const CollaboratorAvatar = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: ${props => props.color || '#3399ff'};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 0.875rem;
  flex-shrink: 0;
`;

const CollaboratorInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const CollaboratorName = styled.div`
  font-weight: 500;
  color: ${props => props.theme?.colors?.text || '#333333'};
  font-size: 0.875rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const CollaboratorStatus = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: ${props => props.theme?.colors?.textSecondary || '#666666'};
  margin-top: 0.125rem;
`;

const StatusIcon = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props => props.isActive ? '#10b981' : '#6b7280'};
`;

const EmptyState = styled.div`
  padding: 1rem;
  text-align: center;
  color: ${props => props.theme?.colors?.textSecondary || '#666666'};
  font-size: 0.875rem;
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

const CollaboratorsList = ({ collaborators = [], currentSessionId, isReadOnly = false }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleClickOutside = (e) => {
    if (!e.target.closest('[data-collaborators-container]')) {
      setIsOpen(false);
    }
  };

  // Close dropdown when clicking outside
  if (typeof window !== 'undefined') {
    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
    } else {
      document.removeEventListener('click', handleClickOutside);
    }
  }

  const activeCollaborators = collaborators.filter(c => c.isActive);
  const currentUser = activeCollaborators.find(c => c.sessionId === currentSessionId);
  const otherUsers = activeCollaborators.filter(c => c.sessionId !== currentSessionId);

  return (
    <CollaboratorsContainer data-collaborators-container>
      <CollaboratorsButton onClick={handleToggle}>
        <Users size={16} />
        <span>Collaborators</span>
        <CollaboratorCount>{activeCollaborators.length}</CollaboratorCount>
      </CollaboratorsButton>

      {isOpen && (
        <CollaboratorsDropdown>
          <DropdownHeader>
            Active Collaborators ({activeCollaborators.length})
          </DropdownHeader>
          
          {activeCollaborators.length === 0 ? (
            <EmptyState>
              No active collaborators
            </EmptyState>
          ) : (
            <>
              {/* Current user first */}
              {currentUser && (
                <CollaboratorItem>
                  <CollaboratorAvatar color={generateUserColor(currentUser.userId)}>
                    {getInitials(currentUser.displayName)}
                  </CollaboratorAvatar>
                  <CollaboratorInfo>
                    <CollaboratorName>
                      {cleanDisplayName(currentUser.displayName)} (You)
                    </CollaboratorName>
                    <CollaboratorStatus>
                      <StatusIcon isActive={true} />
                      {isReadOnly ? (
                        <>
                          <Eye size={12} />
                          <span>Viewing</span>
                        </>
                      ) : (
                        <>
                          <Edit3 size={12} />
                          <span>Editing</span>
                        </>
                      )}
                    </CollaboratorStatus>
                  </CollaboratorInfo>
                </CollaboratorItem>
              )}
              
              {/* Other users */}
              {otherUsers.map((collaborator) => (
                <CollaboratorItem key={collaborator.sessionId}>
                  <CollaboratorAvatar color={generateUserColor(collaborator.userId)}>
                    {getInitials(collaborator.displayName)}
                  </CollaboratorAvatar>
                  <CollaboratorInfo>
                    <CollaboratorName>
                      {cleanDisplayName(collaborator.displayName)}
                    </CollaboratorName>
                    <CollaboratorStatus>
                      <StatusIcon isActive={true} />
                      <Edit3 size={12} />
                      <span>Editing</span>
                    </CollaboratorStatus>
                  </CollaboratorInfo>
                </CollaboratorItem>
              ))}
            </>
          )}
        </CollaboratorsDropdown>
      )}
    </CollaboratorsContainer>
  );
};

export default CollaboratorsList;
