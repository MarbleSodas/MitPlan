import React from 'react';
import styled from 'styled-components';
import { usePlan } from '../../contexts/PlanContext';
import { useAuth } from '../../contexts/AuthContext';
import { FaUser, FaUserEdit, FaEye } from 'react-icons/fa';

const PanelContainer = styled.div`
  position: fixed;
  top: 70px;
  right: 20px;
  background-color: ${props => props.theme.colors.secondary};
  border-radius: ${props => props.theme.borderRadius.medium};
  box-shadow: ${props => props.theme.shadows.medium};
  padding: ${props => props.theme.spacing.medium};
  width: 250px;
  z-index: 1000;

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    top: auto;
    bottom: 20px;
    right: 20px;
    width: 200px;
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    width: 180px;
    padding: ${props => props.theme.spacing.small};
  }
`;

const PanelTitle = styled.h3`
  margin: 0 0 ${props => props.theme.spacing.medium} 0;
  color: ${props => props.theme.colors.textPrimary};
  font-size: ${props => props.theme.fontSizes.medium};
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.small};

  svg {
    color: ${props => props.theme.colors.primary};
  }
`;

const CollaboratorsList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 200px;
  overflow-y: auto;
`;

const CollaboratorItem = styled.li`
  display: flex;
  align-items: center;
  padding: ${props => props.theme.spacing.small};
  border-radius: ${props => props.theme.borderRadius.small};
  margin-bottom: ${props => props.theme.spacing.xsmall};
  background-color: ${props => props.theme.colors.background};

  &:last-child {
    margin-bottom: 0;
  }
`;

const UserAvatar = styled.div`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: ${props => props.$color || props.theme.colors.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: ${props => props.theme.spacing.small};
  color: white;
  font-weight: bold;
  font-size: 12px;
`;

const UserName = styled.span`
  flex: 1;
  font-size: ${props => props.theme.fontSizes.small};
  color: ${props => props.theme.colors.textPrimary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const UserStatus = styled.span`
  margin-left: ${props => props.theme.spacing.small};
  color: ${props => props.theme.colors.textSecondary};

  svg {
    font-size: 14px;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${props => props.theme.spacing.medium};
  color: ${props => props.theme.colors.textSecondary};
  font-size: ${props => props.theme.fontSizes.small};
`;

const CollaborationPanel = () => {
  const { collaborators, userColor, canEdit } = usePlan();
  const { user } = useAuth();

  // Get initials from username
  const getInitials = (username) => {
    if (!username) return '?';
    return username.substring(0, 2).toUpperCase();
  };

  return (
    <PanelContainer>
      <PanelTitle>
        <FaUser />
        Collaborators ({collaborators.length + 1})
      </PanelTitle>

      <CollaboratorsList>
        {/* Current user */}
        <CollaboratorItem>
          <UserAvatar $color={userColor}>
            {user?.username ? getInitials(user.username) : 'ME'}
          </UserAvatar>
          <UserName>You (current user)</UserName>
          <UserStatus>
            {canEdit ? <FaUserEdit title="Can edit" /> : <FaEye title="View only" />}
          </UserStatus>
        </CollaboratorItem>

        {/* Other collaborators */}
        {collaborators.length > 0 ? (
          collaborators.map(collaborator => (
            <CollaboratorItem key={collaborator.id}>
              <UserAvatar $color={collaborator.color}>
                {getInitials(collaborator.username)}
              </UserAvatar>
              <UserName>{collaborator.username}</UserName>
              <UserStatus>
                {collaborator.canEdit ?
                  <FaUserEdit title="Can edit" /> :
                  <FaEye title="View only" />}
              </UserStatus>
            </CollaboratorItem>
          ))
        ) : (
          <EmptyState>No other users currently viewing this plan</EmptyState>
        )}
      </CollaboratorsList>
    </PanelContainer>
  );
};

export default CollaborationPanel;
