import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
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
  SuccessMessage,
  TabNavigation,
  TabButton
} from '../styled/AuthComponents';

const SettingsContainer = styled.div`
  max-width: 600px;
  margin: 0 auto;
  padding: ${props => props.theme.spacing.xlarge};
  background-color: ${props => props.theme.colors.cardBackground};
  border-radius: ${props => props.theme.borderRadius.large};
  box-shadow: ${props => props.theme.shadows.medium};
`;

const SettingsHeader = styled.div`
  margin-bottom: ${props => props.theme.spacing.xlarge};
`;

const SettingsTitle = styled.h2`
  margin: 0 0 ${props => props.theme.spacing.small} 0;
  font-size: ${props => props.theme.fontSizes.responsive.xlarge};
  color: ${props => props.theme.colors.text};
`;

const SettingsSubtitle = styled.p`
  margin: 0;
  color: ${props => props.theme.colors.lightText};
  font-size: ${props => props.theme.fontSizes.responsive.medium};
`;

const Select = styled.select`
  padding: ${props => props.theme.spacing.medium} ${props => props.theme.spacing.large};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.medium};
  background-color: ${props => props.theme.colors.cardBackground};
  color: ${props => props.theme.colors.text};
  font-size: ${props => props.theme.fontSizes.responsive.medium};
  transition: all 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
    box-shadow: ${props => props.theme.shadows.focus};
  }
  
  &:disabled {
    background-color: ${props => props.theme.colors.border};
    cursor: not-allowed;
    opacity: 0.6;
  }
`;

const Checkbox = styled.input`
  margin-right: ${props => props.theme.spacing.medium};
  transform: scale(1.2);
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  font-size: ${props => props.theme.fontSizes.responsive.medium};
  color: ${props => props.theme.colors.text};
  cursor: pointer;
`;

const AccountSettings = ({ onClose }) => {
  const { 
    user, 
    changePassword, 
    getUserPreferences, 
    updatePreferences, 
    isLoading 
  } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  
  const [activeTab, setActiveTab] = useState('preferences');
  const [preferences, setPreferences] = useState({
    theme: 'dark',
    default_boss: 'ketuduke',
    notifications: true
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [message, setMessage] = useState(null);

  // Load user preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const userPrefs = await getUserPreferences();
        setPreferences(userPrefs);
      } catch (error) {
        console.error('Failed to load preferences:', error);
      }
    };

    if (user) {
      loadPreferences();
    }
  }, [user, getUserPreferences]);

  // Handle preference changes
  const handlePreferenceChange = (e) => {
    const { name, value, type, checked } = e.target;
    setPreferences(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear messages when user makes changes
    if (message) {
      setMessage(null);
    }
  };

  // Handle password input changes
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
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

  // Save preferences
  const handleSavePreferences = async (e) => {
    e.preventDefault();
    
    try {
      const result = await updatePreferences(preferences);
      
      if (result.success) {
        setMessage({
          type: 'success',
          text: 'Preferences saved successfully!'
        });
        
        // Update theme if it changed
        if (preferences.theme !== (isDarkMode ? 'dark' : 'light')) {
          toggleTheme();
        }
      }
    } catch (error) {
      console.error('Preferences update error:', error);
    }
  };

  // Validate password form
  const validatePasswordForm = () => {
    const errors = {};

    if (!passwordData.currentPassword) {
      errors.currentPassword = 'Current password is required';
    }

    if (!passwordData.newPassword) {
      errors.newPassword = 'New password is required';
    } else if (passwordData.newPassword.length < 8) {
      errors.newPassword = 'Password must be at least 8 characters long';
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(passwordData.newPassword)) {
      errors.newPassword = 'Password must contain at least one lowercase letter, one uppercase letter, and one number';
    }

    if (!passwordData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your new password';
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle password change
  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (!validatePasswordForm()) {
      return;
    }

    try {
      const result = await changePassword(
        passwordData.currentPassword,
        passwordData.newPassword
      );
      
      if (result.success) {
        setMessage({
          type: 'success',
          text: 'Password changed successfully!'
        });
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      }
    } catch (error) {
      console.error('Password change error:', error);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <SettingsContainer>
      <SettingsHeader>
        <SettingsTitle>Account Settings</SettingsTitle>
        <SettingsSubtitle>Manage your account preferences and security</SettingsSubtitle>
      </SettingsHeader>

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

      <TabNavigation>
        <TabButton
          $active={activeTab === 'preferences'}
          onClick={() => setActiveTab('preferences')}
        >
          Preferences
        </TabButton>
        <TabButton
          $active={activeTab === 'security'}
          onClick={() => setActiveTab('security')}
        >
          Security
        </TabButton>
      </TabNavigation>

      {activeTab === 'preferences' && (
        <FormContainer onSubmit={handleSavePreferences}>
          <FormGroup>
            <FormLabel htmlFor="theme">Theme</FormLabel>
            <Select
              id="theme"
              name="theme"
              value={preferences.theme}
              onChange={handlePreferenceChange}
              disabled={isLoading}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </Select>
          </FormGroup>

          <FormGroup>
            <FormLabel htmlFor="default_boss">Default Boss</FormLabel>
            <Select
              id="default_boss"
              name="default_boss"
              value={preferences.default_boss}
              onChange={handlePreferenceChange}
              disabled={isLoading}
            >
              <option value="ketuduke">Ketuduke</option>
              <option value="lala">Lala</option>
              <option value="statice">Statice</option>
              <option value="sugar_riot">Sugar Riot (M6S)</option>
              <option value="brute_abominator">Brute Abominator (M7S)</option>
              <option value="m8s">M8S</option>
            </Select>
          </FormGroup>

          <FormGroup>
            <CheckboxLabel>
              <Checkbox
                type="checkbox"
                name="notifications"
                checked={preferences.notifications}
                onChange={handlePreferenceChange}
                disabled={isLoading}
              />
              Enable notifications
            </CheckboxLabel>
          </FormGroup>

          <ButtonGroup>
            <PrimaryButton type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <LoadingSpinner /> Saving...
                </>
              ) : (
                'Save Preferences'
              )}
            </PrimaryButton>
          </ButtonGroup>
        </FormContainer>
      )}

      {activeTab === 'security' && (
        <FormContainer onSubmit={handleChangePassword}>
          <FormGroup>
            <FormLabel htmlFor="currentPassword">Current Password</FormLabel>
            <FormInput
              id="currentPassword"
              name="currentPassword"
              type="password"
              value={passwordData.currentPassword}
              onChange={handlePasswordChange}
              placeholder="Enter your current password"
              disabled={isLoading}
              error={formErrors.currentPassword}
              autoComplete="current-password"
              required
            />
            {formErrors.currentPassword && (
              <ErrorMessage>
                ⚠️ {formErrors.currentPassword}
              </ErrorMessage>
            )}
          </FormGroup>

          <FormGroup>
            <FormLabel htmlFor="newPassword">New Password</FormLabel>
            <FormInput
              id="newPassword"
              name="newPassword"
              type="password"
              value={passwordData.newPassword}
              onChange={handlePasswordChange}
              placeholder="Enter your new password"
              disabled={isLoading}
              error={formErrors.newPassword}
              autoComplete="new-password"
              required
            />
            {formErrors.newPassword && (
              <ErrorMessage>
                ⚠️ {formErrors.newPassword}
              </ErrorMessage>
            )}
          </FormGroup>

          <FormGroup>
            <FormLabel htmlFor="confirmPassword">Confirm New Password</FormLabel>
            <FormInput
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={passwordData.confirmPassword}
              onChange={handlePasswordChange}
              placeholder="Confirm your new password"
              disabled={isLoading}
              error={formErrors.confirmPassword}
              autoComplete="new-password"
              required
            />
            {formErrors.confirmPassword && (
              <ErrorMessage>
                ⚠️ {formErrors.confirmPassword}
              </ErrorMessage>
            )}
          </FormGroup>

          <ButtonGroup>
            <PrimaryButton type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <LoadingSpinner /> Changing Password...
                </>
              ) : (
                'Change Password'
              )}
            </PrimaryButton>
          </ButtonGroup>
        </FormContainer>
      )}

      {onClose && (
        <div style={{ marginTop: '24px' }}>
          <SecondaryButton onClick={onClose}>
            Close
          </SecondaryButton>
        </div>
      )}
    </SettingsContainer>
  );
};

export default AccountSettings;
