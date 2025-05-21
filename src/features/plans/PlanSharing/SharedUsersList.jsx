import React from 'react';
import styled from 'styled-components';

const Container = styled.div`
  margin-top: 20px;
`;

const Title = styled.h4`
  margin: 0 0 15px 0;
  color: ${props => props.theme.textPrimary};
`;

const EmptyState = styled.div`
  padding: 20px;
  text-align: center;
  background-color: ${props => props.theme.backgroundAlt};
  border-radius: 8px;
  color: ${props => props.theme.textSecondary};
`;

const UserList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const UserItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 15px;
  background-color: ${props => props.theme.backgroundAlt};
  border-radius: 8px;
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const UserAvatar = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: ${props => props.theme.primary};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 14px;
`;

const UserDetails = styled.div`
  display: flex;
  flex-direction: column;
`;

const UserName = styled.div`
  font-weight: 500;
  color: ${props => props.theme.textPrimary};
`;

const UserEmail = styled.div`
  font-size: 12px;
  color: ${props => props.theme.textSecondary};
`;

const UserPermission = styled.div`
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 4px;
  background-color: ${props => props.canEdit ? '#28a745' : '#6c757d'};
  color: white;
`;

const RemoveButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.theme.error};
  cursor: pointer;
  font-size: 14px;
  
  &:hover {
    text-decoration: underline;
  }
`;

const OwnerBadge = styled.span`
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 4px;
  background-color: ${props => props.theme.primary};
  color: white;
`;

const SharedUsersList = ({ plan, isOwner, onRemoveUser }) => {
  if (!plan) {
    return null;
  }
  
  const { sharedWith = [], permissions = {}, userId: ownerId } = plan;
  
  const getInitials = (email) => {
    if (!email) return '?';
    return email.charAt(0).toUpperCase();
  };
  
  // If there are no shared users
  if (sharedWith.length === 0) {
    return (
      <Container>
        <Title>Shared With</Title>
        <EmptyState>
          <p>This plan is not shared with anyone yet.</p>
        </EmptyState>
      </Container>
    );
  }
  
  return (
    <Container>
      <Title>Shared With</Title>
      <UserList>
        {/* Owner */}
        <UserItem>
          <UserInfo>
            <UserAvatar>{getInitials(plan.ownerEmail || 'O')}</UserAvatar>
            <UserDetails>
              <UserName>{plan.ownerName || 'Owner'}</UserName>
              <UserEmail>{plan.ownerEmail || 'Unknown'}</UserEmail>
            </UserDetails>
          </UserInfo>
          <OwnerBadge>Owner</OwnerBadge>
        </UserItem>
        
        {/* Shared users */}
        {sharedWith.map(userId => {
          const userPermissions = permissions[userId] || {};
          const canEdit = userPermissions.canEdit || false;
          
          return (
            <UserItem key={userId}>
              <UserInfo>
                <UserAvatar>{getInitials(userId)}</UserAvatar>
                <UserDetails>
                  <UserName>{userId}</UserName>
                  <UserEmail>{userId}</UserEmail>
                </UserDetails>
              </UserInfo>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <UserPermission canEdit={canEdit}>
                  {canEdit ? 'Can Edit' : 'View Only'}
                </UserPermission>
                
                {isOwner && (
                  <RemoveButton onClick={() => onRemoveUser(userId)}>
                    Remove
                  </RemoveButton>
                )}
              </div>
            </UserItem>
          );
        })}
      </UserList>
    </Container>
  );
};

export default SharedUsersList;