import React, { useState } from 'react';
import styled from 'styled-components';
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
`;

const UserProfile = ({ onClose }) => {
  const { user, updateProfile, isLoading } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    display_name: user?.display_name || '',
    avatar_url: user?.avatar_url || ''
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

    // Avatar URL validation (optional)
    if (formData.avatar_url && !/^https?:\/\/.+/.test(formData.avatar_url)) {
      errors.avatar_url = 'Please enter a valid URL';
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
      display_name: user?.display_name || '',
      avatar_url: user?.avatar_url || ''
    });
    setFormErrors({});
    setMessage(null);
    setIsEditing(false);
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
          {user.avatar_url ? (
            <img 
              src={user.avatar_url} 
              alt="Profile" 
              style={{ width: '100%', height: '100%', borderRadius: '50%' }}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <span style={{ display: user.avatar_url ? 'none' : 'flex' }}>
            {getUserInitials()}
          </span>
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

          <FormGroup>
            <FormLabel htmlFor="avatar_url">Avatar URL (Optional)</FormLabel>
            <FormInput
              id="avatar_url"
              name="avatar_url"
              type="url"
              value={formData.avatar_url}
              onChange={handleChange}
              placeholder="https://example.com/avatar.jpg"
              disabled={isLoading}
              error={formErrors.avatar_url}
            />
            {formErrors.avatar_url && (
              <ErrorMessage>
                ⚠️ {formErrors.avatar_url}
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
