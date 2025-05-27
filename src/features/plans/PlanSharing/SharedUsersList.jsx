import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { FaTrash, FaEdit } from 'react-icons/fa';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

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

const Modal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background-color: ${props => props.theme.background};
  padding: 20px;
  border-radius: 8px;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
`;

const ModalTitle = styled.h3`
  margin: 0;
  color: ${props => props.theme.textPrimary};
`;

const CloseButton = styled.button`
  background-color: transparent;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: ${props => props.theme.textSecondary};

  &:hover {
    color: ${props => props.theme.textPrimary};
  }
`;

const FormGroup = styled.div`
  margin-bottom: 15px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 5px;
  color: ${props => props.theme.textPrimary};
  font-weight: 500;
`;

const Select = styled.select`
  width: 100%;
  padding: 10px;
  border: 1px solid ${props => props.theme.borderColor};
  border-radius: 4px;
  background-color: ${props => props.theme.inputBackground};
  color: ${props => props.theme.textPrimary};

  &:focus {
    outline: none;
    border-color: ${props => props.theme.primary};
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 20px;
`;

const SharedUsersList = ({ planId }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [permission, setPermission] = useState('view');
  const [owner, setOwner] = useState(null);

  useEffect(() => {
    const fetchSharedUsers = async () => {
      try {
        console.log('👥 [SHARED USERS] Fetching shared users for plan', planId);
        setLoading(true);
        setError('');

        const response = await axios.get(`${API_URL}/plans/${planId}/shared-users`);

        setUsers(response.data.users || []);
        setOwner(response.data.owner || null);
        console.log('✅ [SHARED USERS] Shared users fetched successfully', { planId, userCount: response.data.users?.length || 0 });
      } catch (error) {
        console.error('❌ [SHARED USERS] Fetch shared users error:', { planId, error });
        setError('Failed to load shared users');
      } finally {
        setLoading(false);
      }
    };

    // Only fetch if planId exists and we haven't loaded users yet
    if (planId && users.length === 0 && !loading) {
      console.log('👥 [SHARED USERS] Need to fetch shared users for plan', planId);
      fetchSharedUsers();
    } else if (planId && users.length > 0) {
      console.log('⏭️ [SHARED USERS] Shared users already loaded for plan', planId, 'count:', users.length);
    }
  }, [planId]);

  const getInitials = (email) => {
    if (!email) return '?';
    return email.charAt(0).toUpperCase();
  };

  const handleEditPermission = (user) => {
    setSelectedUser(user);
    setPermission(user.permission);
    setShowModal(true);
  };

  const handleUpdatePermission = async () => {
    try {
      setLoading(true);

      await axios.put(`${API_URL}/plans/${planId}/share/${selectedUser.id}`, {
        permission
      });

      // Update user in list
      setUsers(users.map(user =>
        user.id === selectedUser.id
          ? { ...user, permission }
          : user
      ));

      // Close modal
      setShowModal(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Update permission error:', error);
      setError('Failed to update permission');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveUser = async (userId) => {
    try {
      setLoading(true);

      await axios.delete(`${API_URL}/plans/${planId}/share/${userId}`);

      // Remove user from list
      setUsers(users.filter(user => user.id !== userId));
    } catch (error) {
      console.error('Remove user error:', error);
      setError('Failed to remove user');
    } finally {
      setLoading(false);
    }
  };

  if (loading && users.length === 0) {
    return (
      <Container>
        <Title>Shared With</Title>
        <EmptyState>
          <p>Loading shared users...</p>
        </EmptyState>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Title>Shared With</Title>
        <EmptyState>
          <p>Error: {error}</p>
        </EmptyState>
      </Container>
    );
  }

  if (users.length === 0 && !owner) {
    return (
      <Container>
        <Title>Shared With</Title>
        <EmptyState>
          <p>This plan hasn't been shared with anyone yet.</p>
        </EmptyState>
      </Container>
    );
  }

  return (
    <Container>
      <Title>Shared With</Title>
      <UserList>
        {/* Owner */}
        {owner && (
          <UserItem>
            <UserInfo>
              <UserAvatar>{getInitials(owner.email || 'O')}</UserAvatar>
              <UserDetails>
                <UserName>{owner.username || 'Owner'}</UserName>
                <UserEmail>{owner.email || 'Unknown'}</UserEmail>
              </UserDetails>
            </UserInfo>
            <OwnerBadge>Owner</OwnerBadge>
          </UserItem>
        )}

        {/* Shared users */}
        {users.map(user => (
          <UserItem key={user.id}>
            <UserInfo>
              <UserAvatar>{getInitials(user.email)}</UserAvatar>
              <UserDetails>
                <UserName>{user.username || 'User'}</UserName>
                <UserEmail>{user.email}</UserEmail>
              </UserDetails>
            </UserInfo>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <UserPermission canEdit={user.permission === 'edit'}>
                {user.permission === 'edit' ? 'Can Edit' : 'View Only'}
              </UserPermission>

              <RemoveButton onClick={() => handleRemoveUser(user.id)} title="Remove Access">
                <FaTrash />
              </RemoveButton>

              <RemoveButton onClick={() => handleEditPermission(user)} title="Edit Permissions">
                <FaEdit />
              </RemoveButton>
            </div>
          </UserItem>
        ))}
      </UserList>

      {showModal && selectedUser && (
        <Modal>
          <ModalContent>
            <ModalHeader>
              <ModalTitle>Edit Permissions</ModalTitle>
              <CloseButton onClick={() => setShowModal(false)}>&times;</CloseButton>
            </ModalHeader>

            <FormGroup>
              <Label htmlFor="permission">Permission for {selectedUser.email}</Label>
              <Select
                id="permission"
                value={permission}
                onChange={(e) => setPermission(e.target.value)}
              >
                <option value="view">View Only</option>
                <option value="edit">Can Edit</option>
              </Select>
            </FormGroup>

            <ButtonGroup>
              <RemoveButton onClick={() => setShowModal(false)}>Cancel</RemoveButton>
              <RemoveButton onClick={handleUpdatePermission} disabled={loading}>
                {loading ? 'Updating...' : 'Update'}
              </RemoveButton>
            </ButtonGroup>
          </ModalContent>
        </Modal>
      )}
    </Container>
  );
};

export default SharedUsersList;