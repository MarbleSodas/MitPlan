import React, { useState } from 'react';
import styled from 'styled-components';
import { Trash2, Edit3 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  FormContainer,
  FormGroup,
  FormLabel,
  FormInput,
  PrimaryButton,
  SecondaryButton,
  ButtonGroup,
  LoadingSpinner,
  ErrorMessage,
  SuccessMessage
} from '../styled/AuthComponents';
import ProfilePictureUpload from './ProfilePictureUpload';

const ProfileContainer = styled.div`
  max-width: 500px;
  margin: 0 auto;
  padding: ${props => props.theme.spacing.xlarge};
  background-color: ${props => props.theme.colors.cardBackground};
  border-radius: ${props => props.theme.borderRadius.large};
  box-shadow: ${props => props.theme.shadows.medium};
`;

const ProfileHeader = styled.div`
  text-align: center;
  margin-bottom: ${props => props.theme.spacing.xlarge};
`;

const ProfileTitle = styled.h2`
  margin: 0 0 ${props => props.theme.spacing.small} 0;
  font-size: ${props => props.theme.fontSizes.responsive.xlarge};
  color: ${props => props.theme.colors.text};
`;

const ProfileSubtitle = styled.p`
  margin: 0;
  color: ${props => props.theme.colors.lightText};
  font-size: ${props => props.theme.fontSizes.responsive.medium};
`;

const Avatar = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background-color: ${props => props.theme.colors.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto ${props => props.theme.spacing.large} auto;
  font-size: ${props => props.theme.fontSizes.xxlarge};
  font-weight: bold;
  color: white;
  position: relative;
  overflow: hidden;
`;

const AvatarImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
`;

const AvatarInitials = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
`;

const ProfilePictureSection = styled.div`
  margin-bottom: ${props => props.theme.spacing.large};
`;

const ProfilePictureHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${props => props.theme.spacing.medium};
`;

const ProfilePictureTitle = styled.h3`
  margin: 0;
  font-size: ${props => props.theme.fontSizes.large};
  color: ${props => props.theme.colors.text};
  font-weight: 600;
`;

const ProfilePictureActions = styled.div`
  display: flex;
  gap: 8px;
`;

const IconButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 6px;
  background: ${props => props.variant === 'danger' ? props.theme.colors.danger : props.theme.colors.surface};
  color: ${props => props.variant === 'danger' ? props.theme.colors.white : props.theme.colors.text};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.variant === 'danger' ? props.theme.colors.dangerHover : props.theme.colors.surfaceHover};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const EditingModeContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${props => props.theme.spacing.large};
`;

const UserProfile = ({ onClose }) => {
  const { user, updateProfile, updateProfilePicture, removeProfilePicture, isLoading } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingPicture, setIsEditingPicture] = useState(false);
  const [formData, setFormData] = useState({
    display_name: user?.display_name || ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [message, setMessage] = useState(null);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear field error when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }

    // Clear messages when user starts typing
    if (message) {
      setMessage(null);
    }
  };

  // Validate form
  const validateForm = () => {
    const errors = {};

    // Display name validation
    if (!formData.display_name) {
      errors.display_name = 'Display name is required';
    } else if (formData.display_name.length < 2) {
      errors.display_name = 'Display name must be at least 2 characters';
    } else if (formData.display_name.length > 50) {
      errors.display_name = 'Display name must be less than 50 characters';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const result = await updateProfile(formData);

      if (result.success) {
        setMessage({
          type: 'success',
          text: 'Profile updated successfully!'
        });
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Profile update error:', error);
    }
  };

  // Handle cancel editing
  const handleCancel = () => {
    setFormData({
      display_name: user?.display_name || ''
    });
    setFormErrors({});
    setMessage(null);
    setIsEditing(false);
  };

  // Handle profile picture upload complete
  const handleProfilePictureUpload = async (imageUrl, imagePath) => {
    try {
      const result = await updateProfilePicture(imageUrl, imagePath);

      if (result.success) {
        setMessage({
          type: 'success',
          text: 'Profile picture updated successfully!'
        });
        setIsEditingPicture(false);
      } else {
        setMessage({
          type: 'error',
          text: result.message || 'Failed to update profile picture'
        });
      }
    } catch (error) {
      console.error('Profile picture update error:', error);
      setMessage({
        type: 'error',
        text: 'Failed to update profile picture'
      });
    }
  };

  // Handle profile picture upload error
  const handleProfilePictureError = (errorMessage) => {
    setMessage({
      type: 'error',
      text: errorMessage
    });
  };

  // Handle profile picture removal
  const handleRemoveProfilePicture = async () => {
    if (!window.confirm('Are you sure you want to remove your profile picture?')) {
      return;
    }

    try {
      const result = await removeProfilePicture();

      if (result.success) {
        setMessage({
          type: 'success',
          text: 'Profile picture removed successfully!'
        });
      } else {
        setMessage({
          type: 'error',
          text: result.message || 'Failed to remove profile picture'
        });
      }
    } catch (error) {
      console.error('Profile picture removal error:', error);
      setMessage({
        type: 'error',
        text: 'Failed to remove profile picture'
      });
    }
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user?.display_name) return '?';
    return user.display_name
      .split(' ')
      .map(name => name.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (!user) {
    return null;
  }

  return (
    <ProfileContainer>
      <ProfileHeader>
        <Avatar>
          {(user.profilePictureUrl || user.avatar_url) ? (
            <AvatarImage
              src={user.profilePictureUrl || user.avatar_url}
              alt="Profile"
              onError={(e) => {
                // Silently handle image load errors and show initials instead
                e.target.style.display = 'none';
                if (e.target.nextSibling) {
                  e.target.nextSibling.style.display = 'flex';
                }
              }}
              onLoad={(e) => {
                // Ensure the image is visible when it loads successfully
                e.target.style.display = 'block';
                if (e.target.nextSibling) {
                  e.target.nextSibling.style.display = 'none';
                }
              }}
            />
          ) : null}
          <AvatarInitials style={{ display: (user.profilePictureUrl || user.avatar_url) ? 'none' : 'flex' }}>
            {getUserInitials()}
          </AvatarInitials>
        </Avatar>
        <ProfileTitle>{user.display_name}</ProfileTitle>
        <ProfileSubtitle>{user.email}</ProfileSubtitle>
      </ProfileHeader>

      {message && (
        <div style={{ marginBottom: '16px' }}>
          {message.type === 'success' ? (
            <SuccessMessage>
              ✅ {message.text}
            </SuccessMessage>
          ) : (
            <ErrorMessage>
              ⚠️ {message.text}
            </ErrorMessage>
          )}
        </div>
      )}

      {isEditing ? (
        <EditingModeContainer>
          {/* TEMPORARILY DISABLED: Profile Picture Section */}
          <ProfilePictureSection>
            <ProfilePictureHeader>
              <ProfilePictureTitle>Profile Picture</ProfilePictureTitle>
            </ProfilePictureHeader>

            <div style={{
              padding: '16px',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              border: '1px solid #e9ecef',
              textAlign: 'center'
            }}>
              <div style={{ marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#495057' }}>
                Profile Picture Upload Temporarily Disabled
              </div>
              <div style={{ fontSize: '12px', color: '#6c757d' }}>
                Your avatar will automatically use Gravatar (if available) or generated initials
              </div>
            </div>
          </ProfilePictureSection>

          {/* COMMENTED OUT FOR FUTURE RE-ENABLING:
          <ProfilePictureSection>
            <ProfilePictureHeader>
              <ProfilePictureTitle>Profile Picture</ProfilePictureTitle>
              <ProfilePictureActions>
                {user.profilePictureUrl && (
                  <IconButton
                    variant="danger"
                    onClick={handleRemoveProfilePicture}
                    disabled={isLoading}
                    title="Remove profile picture"
                  >
                    <Trash2 size={16} />
                  </IconButton>
                )}
                <IconButton
                  onClick={() => setIsEditingPicture(!isEditingPicture)}
                  disabled={isLoading}
                  title="Edit profile picture"
                >
                  <Edit3 size={16} />
                </IconButton>
              </ProfilePictureActions>
            </ProfilePictureHeader>

            {isEditingPicture && (
              <ProfilePictureUpload
                currentImageUrl={user.profilePictureUrl}
                onUploadComplete={handleProfilePictureUpload}
                onUploadError={handleProfilePictureError}
                userId={user.id || user.uid}
                isLoading={isLoading}
              />
            )}
          </ProfilePictureSection>
          */}

          {/* Display Name Form */}
          <FormContainer onSubmit={handleSubmit}>
            <FormGroup>
              <FormLabel htmlFor="display_name">Display Name</FormLabel>
              <FormInput
                id="display_name"
                name="display_name"
                type="text"
                value={formData.display_name}
                onChange={handleChange}
                placeholder="Enter your display name"
                disabled={isLoading}
                error={formErrors.display_name}
                required
              />
              {formErrors.display_name && (
                <ErrorMessage>
                  ⚠️ {formErrors.display_name}
                </ErrorMessage>
              )}
            </FormGroup>

            <ButtonGroup>
              <PrimaryButton type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <LoadingSpinner /> Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </PrimaryButton>
              <SecondaryButton
                type="button"
                onClick={handleCancel}
                disabled={isLoading}
              >
                Cancel
              </SecondaryButton>
            </ButtonGroup>
          </FormContainer>
        </EditingModeContainer>
      ) : (
        <ButtonGroup>
          <PrimaryButton onClick={() => setIsEditing(true)}>
            Edit Profile
          </PrimaryButton>
          {onClose && (
            <SecondaryButton onClick={onClose}>
              Close
            </SecondaryButton>
          )}
        </ButtonGroup>
      )}
    </ProfileContainer>
  );
};

export default UserProfile;
