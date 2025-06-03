/**
 * Profile Management Component
 *
 * Comprehensive profile management with multiple avatar options
 * Uses ProfileService for free-tier friendly profile management
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useAuth } from '../../contexts/AuthContext';
import ProfileService from '../../services/ProfileService';
import ProfilePictureUpload from './ProfilePictureUpload';

const ProfileContainer = styled.div`
  max-width: 600px;
  margin: 0 auto;
  padding: 24px;
  background: ${props => props.theme.colors.cardBackground};
  border-radius: 16px;
  box-shadow: ${props => props.theme.shadows.large};
`;

const ProfileHeader = styled.div`
  text-align: center;
  margin-bottom: 32px;
`;

const ProfileTitle = styled.h2`
  color: ${props => props.theme.colors.text};
  margin-bottom: 8px;
  font-size: 24px;
  font-weight: 600;
`;

const ProfileSubtitle = styled.p`
  color: ${props => props.theme.colors.textSecondary};
  margin: 0;
`;

const AvatarSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  margin-bottom: 32px;
`;

const CurrentAvatar = styled.div`
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: ${props => props.theme.colors.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  font-weight: bold;
  color: white;
  overflow: hidden;
  border: 4px solid ${props => props.theme.colors.border};

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const AvatarOptions = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
`;

const AvatarOption = styled.div`
  padding: 16px;
  border: 2px solid ${props => props.isSelected ? props.theme.colors.primary : props.theme.colors.border};
  border-radius: 12px;
  background: ${props => props.theme.colors.surface};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${props => props.theme.colors.primary};
    background: ${props => props.theme.colors.primaryLight};
  }
`;

const OptionTitle = styled.h4`
  margin: 0 0 8px 0;
  color: ${props => props.theme.colors.text};
  font-size: 16px;
  font-weight: 600;
`;

const OptionDescription = styled.p`
  margin: 0 0 12px 0;
  color: ${props => props.theme.colors.textSecondary};
  font-size: 14px;
`;

const OptionPreview = styled.div`
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: ${props => props.theme.colors.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: bold;
  color: white;
  overflow: hidden;
  margin: 0 auto;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const FormSection = styled.div`
  margin-bottom: 24px;
`;

const FormLabel = styled.label`
  display: block;
  margin-bottom: 8px;
  color: ${props => props.theme.colors.text};
  font-weight: 600;
`;

const FormInput = styled.input`
  width: 100%;
  padding: 12px 16px;
  border: 2px solid ${props => props.theme.colors.border};
  border-radius: 8px;
  background: ${props => props.theme.colors.surface};
  color: ${props => props.theme.colors.text};
  font-size: 16px;
  transition: border-color 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
`;

const Button = styled.button`
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  ${props => props.variant === 'primary' ? `
    background: ${props.theme.colors.primary};
    color: white;

    &:hover {
      background: ${props.theme.colors.primaryHover};
    }
  ` : `
    background: ${props.theme.colors.surface};
    color: ${props.theme.colors.text};
    border: 1px solid ${props.theme.colors.border};

    &:hover {
      background: ${props.theme.colors.surfaceHover};
    }
  `}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const StatusMessage = styled.div`
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 14px;

  ${props => props.type === 'success' ? `
    background: ${props.theme.colors.successLight};
    color: ${props.theme.colors.success};
  ` : `
    background: ${props.theme.colors.dangerLight};
    color: ${props.theme.colors.danger};
  `}
`;

const ProfileManagement = ({ onClose }) => {
  const { user, updateUser } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName || user?.display_name || '');
  const [selectedAvatarType, setSelectedAvatarType] = useState('current');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [avatarOptions, setAvatarOptions] = useState({});

  useEffect(() => {
    if (user) {
      // Generate avatar options with proper fallbacks
      const options = {
        gravatar: ProfileService.getGravatarUrl(user.email, 200, 'identicon'),
        generated: ProfileService.getUIAvatarUrl(user.displayName || user.display_name || user.email),
        initials: null // Will show initials
      };
      setAvatarOptions(options);
    }
  }, [user]);

  const handleSave = async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      // Update display name if changed
      if (displayName !== (user?.displayName || user?.display_name)) {
        const result = await ProfileService.updateDisplayName(
          { uid: user.id },
          displayName
        );

        if (!result.success) {
          throw new Error(result.message);
        }
      }

      // TEMPORARILY DISABLED: Avatar selection handling
      // Avatar will automatically use Gravatar or generated initials
      /* COMMENTED OUT FOR FUTURE RE-ENABLING:
      // Handle avatar selection
      if (selectedAvatarType === 'remove') {
        await ProfileService.removeProfilePicture({ uid: user.id });
      }
      */

      setMessage({ type: 'success', text: 'Display name updated successfully!' });

      // Refresh user data
      if (updateUser) {
        await updateUser();
      }

      // Close after a short delay
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Profile update error:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to update profile' });
    } finally {
      setIsLoading(false);
    }
  };

  // TEMPORARILY DISABLED: Upload handler functions
  /* COMMENTED OUT FOR FUTURE RE-ENABLING:
  const handleUploadComplete = (url) => {
    setMessage({ type: 'success', text: 'Profile picture uploaded successfully!' });
    setSelectedAvatarType('custom');

    // Refresh user data
    if (updateUser) {
      updateUser();
    }
  };

  const handleUploadError = (error) => {
    setMessage({ type: 'error', text: error });
  };
  */

  const getCurrentAvatarUrl = () => {
    if (user?.profilePictureBase64) return user.profilePictureBase64;
    if (user?.profilePictureUrl || user?.avatar_url) return user.profilePictureUrl || user.avatar_url;
    return null;
  };

  return (
    <ProfileContainer>
      <ProfileHeader>
        <ProfileTitle>Profile Management</ProfileTitle>
        <ProfileSubtitle>Manage your display name and profile picture</ProfileSubtitle>
      </ProfileHeader>

      {message && (
        <StatusMessage type={message.type}>
          {message.text}
        </StatusMessage>
      )}

      <AvatarSection>
        <CurrentAvatar>
          {getCurrentAvatarUrl() ? (
            <img src={getCurrentAvatarUrl()} alt="Current avatar" />
          ) : (
            ProfileService.getInitials(user?.displayName || user?.display_name || user?.email || 'User')
          )}
        </CurrentAvatar>
      </AvatarSection>

      <FormSection>
        <FormLabel>Display Name</FormLabel>
        <FormInput
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Enter your display name"
        />
      </FormSection>

      <FormSection>
        <FormLabel>Profile Picture Options</FormLabel>

        {/* TEMPORARILY DISABLED: Profile picture upload options */}
        <div style={{
          padding: '16px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #e9ecef',
          textAlign: 'center'
        }}>
          <div style={{ marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#495057' }}>
            Profile Picture Options Temporarily Disabled
          </div>
          <div style={{ fontSize: '12px', color: '#6c757d' }}>
            Your avatar will automatically use Gravatar (if available) or generated initials based on your display name
          </div>
        </div>

        {/* COMMENTED OUT FOR FUTURE RE-ENABLING:
        <AvatarOptions>
          <AvatarOption
            isSelected={selectedAvatarType === 'upload'}
            onClick={() => setSelectedAvatarType('upload')}
          >
            <OptionTitle>Upload Custom Image</OptionTitle>
            <OptionDescription>Upload and crop your own profile picture</OptionDescription>
          </AvatarOption>

          <AvatarOption
            isSelected={selectedAvatarType === 'gravatar'}
            onClick={() => setSelectedAvatarType('gravatar')}
          >
            <OptionTitle>Gravatar</OptionTitle>
            <OptionDescription>Use your Gravatar image</OptionDescription>
            <OptionPreview>
              <img src={avatarOptions.gravatar} alt="Gravatar preview" />
            </OptionPreview>
          </AvatarOption>

          <AvatarOption
            isSelected={selectedAvatarType === 'generated'}
            onClick={() => setSelectedAvatarType('generated')}
          >
            <OptionTitle>Generated Avatar</OptionTitle>
            <OptionDescription>Colorful generated avatar with initials</OptionDescription>
            <OptionPreview>
              <img src={avatarOptions.generated} alt="Generated avatar preview" />
            </OptionPreview>
          </AvatarOption>

          <AvatarOption
            isSelected={selectedAvatarType === 'remove'}
            onClick={() => setSelectedAvatarType('remove')}
          >
            <OptionTitle>Remove Picture</OptionTitle>
            <OptionDescription>Use initials only</OptionDescription>
            <OptionPreview>
              {ProfileService.getInitials(displayName || user?.displayName || user?.display_name || user?.email || 'User')}
            </OptionPreview>
          </AvatarOption>
        </AvatarOptions>

        {selectedAvatarType === 'upload' && (
          <ProfilePictureUpload
            currentImageUrl={getCurrentAvatarUrl()}
            onUploadComplete={handleUploadComplete}
            onUploadError={handleUploadError}
            userId={user?.id}
          />
        )}
        */
      </FormSection>

      <ButtonGroup>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={isLoading}
        >
          {isLoading ? 'Saving...' : 'Save Changes'}
        </Button>
      </ButtonGroup>
    </ProfileContainer>
  );
};

export default ProfileManagement;
