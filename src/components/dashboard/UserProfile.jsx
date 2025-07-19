import { useState } from 'react';
import styled from 'styled-components';
import { Edit3 } from 'lucide-react';
import { updateProfile } from 'firebase/auth';
import { useAuth } from '../../contexts/AuthContext';
import { auth } from '../../config/firebase';

const ProfileContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 8px;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: ${props => props.theme?.colors?.backgroundSecondary || 'rgba(0, 0, 0, 0.05)'};
  }

  @media (max-width: 768px) {
    gap: 0.5rem;
    padding: 0.375rem;
  }
`;

const UserAvatar = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: ${props => props.color || '#3399ff'};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 0.875rem;
  flex-shrink: 0;

  @media (max-width: 768px) {
    width: 36px;
    height: 36px;
    font-size: 0.8rem;
  }
`;

const UserInfo = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
`;

const DisplayName = styled.span`
  color: ${props => props.theme?.colors?.text || '#333333'};
  font-weight: 500;
  font-size: 0.95rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  @media (max-width: 768px) {
    font-size: 0.875rem;
  }
`;


const EditIcon = styled(Edit3)`
  width: 14px;
  height: 14px;
  color: ${props => props.theme?.colors?.textSecondary || '#666666'};
  opacity: 0;
  transition: opacity 0.2s ease;

  ${ProfileContainer}:hover & {
    opacity: 1;
  }

  @media (max-width: 768px) {
    width: 12px;
    height: 12px;
  }
`;

// Modal styles
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
`;

const ModalContent = styled.div`
  background: ${props => props.theme?.colors?.background || '#ffffff'};
  border-radius: 12px;
  padding: 1.5rem;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  border: 1px solid ${props => props.theme?.colors?.border || '#e5e7eb'};
`;

const ModalTitle = styled.h3`
  margin: 0 0 1rem 0;
  color: ${props => props.theme?.colors?.text || '#333333'};
  font-size: 1.25rem;
  font-weight: 600;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const Input = styled.input`
  padding: 0.75rem;
  border: 1px solid ${props => props.theme?.colors?.border || '#e5e7eb'};
  border-radius: 8px;
  font-size: 1rem;
  background: ${props => props.theme?.colors?.background || '#ffffff'};
  color: ${props => props.theme?.colors?.text || '#333333'};

  &:focus {
    outline: none;
    border-color: ${props => props.theme?.colors?.primary || '#3399ff'};
    box-shadow: 0 0 0 3px ${props => props.theme?.colors?.primary || '#3399ff'}20;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
`;

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const PrimaryButton = styled(Button)`
  background: ${props => props.theme?.colors?.primary || '#3399ff'};
  color: white;

  &:hover:not(:disabled) {
    background: ${props => props.theme?.colors?.primaryHover || '#2980ff'};
  }
`;

const SecondaryButton = styled(Button)`
  background: transparent;
  color: ${props => props.theme?.colors?.textSecondary || '#666666'};
  border: 1px solid ${props => props.theme?.colors?.border || '#e5e7eb'};

  &:hover:not(:disabled) {
    background: ${props => props.theme?.colors?.backgroundSecondary || 'rgba(0, 0, 0, 0.05)'};
  }
`;

const ErrorMessage = styled.div`
  color: ${props => props.theme?.colors?.error || '#e74c3c'};
  font-size: 0.875rem;
  margin-top: 0.5rem;
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

const UserProfile = () => {
  const { user, anonymousUser, isAnonymousMode, setAnonymousDisplayName } = useAuth();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Get current user info
  const currentUser = user || anonymousUser;
  const displayName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User';

  const userId = user?.uid || anonymousUser?.id || 'default';

  const handleEditClick = () => {
    setNewDisplayName(cleanDisplayName(displayName));
    setError('');
    setIsEditModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const trimmedName = newDisplayName.trim();
    if (!trimmedName) {
      setError('Display name is required');
      return;
    }

    if (trimmedName.length < 2) {
      setError('Display name must be at least 2 characters');
      return;
    }

    if (trimmedName.length > 50) {
      setError('Display name must be less than 50 characters');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      if (user) {
        // Update authenticated user's display name
        await updateProfile(auth.currentUser, {
          displayName: trimmedName
        });
      } else if (isAnonymousMode && anonymousUser) {
        // Update anonymous user's display name
        setAnonymousDisplayName(trimmedName);
      }

      setIsEditModalOpen(false);
    } catch (err) {
      console.error('Error updating display name:', err);
      setError(err.message || 'Failed to update display name');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (!isSubmitting) {
      setIsEditModalOpen(false);
      setError('');
    }
  };

  return (
    <>
      <ProfileContainer onClick={handleEditClick}>
        <UserAvatar color={generateUserColor(userId)}>
          {getInitials(displayName)}
        </UserAvatar>
        <UserInfo>
          <DisplayName>{cleanDisplayName(displayName)}</DisplayName>
        </UserInfo>
        <EditIcon />
      </ProfileContainer>

      {isEditModalOpen && (
        <ModalOverlay onClick={handleCancel}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalTitle>Edit Display Name</ModalTitle>
            <Form onSubmit={handleSubmit}>
              <Input
                type="text"
                placeholder="Enter your display name"
                value={newDisplayName}
                onChange={(e) => setNewDisplayName(e.target.value)}
                maxLength={50}
                autoFocus
                disabled={isSubmitting}
              />
              
              {error && <ErrorMessage>{error}</ErrorMessage>}
              
              <ButtonGroup>
                <SecondaryButton
                  type="button"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                >
                  Cancel
                </SecondaryButton>
                <PrimaryButton
                  type="submit"
                  disabled={isSubmitting || !newDisplayName.trim()}
                >
                  {isSubmitting ? 'Saving...' : 'Save'}
                </PrimaryButton>
              </ButtonGroup>
            </Form>
          </ModalContent>
        </ModalOverlay>
      )}
    </>
  );
};

export default UserProfile;
