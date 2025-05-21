import React, { useState } from 'react';
import styled from 'styled-components';
import { useAuth } from '../../contexts/AuthContext';

const ProfileContainer = styled.div`
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
  background-color: ${props => props.theme.cardBackground};
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
`;

const Title = styled.h2`
  margin-bottom: 20px;
  color: ${props => props.theme.textPrimary};
  border-bottom: 1px solid ${props => props.theme.borderColor};
  padding-bottom: 10px;
`;

const Section = styled.div`
  margin-bottom: 30px;
`;

const SectionTitle = styled.h3`
  margin-bottom: 15px;
  color: ${props => props.theme.textPrimary};
  font-size: 18px;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 15px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
`;

const Label = styled.label`
  font-weight: 500;
  color: ${props => props.theme.textPrimary};
`;

const Input = styled.input`
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

const Button = styled.button`
  padding: 10px;
  background-color: ${props => props.theme.primary};
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: ${props => props.theme.primaryHover};
  }
  
  &:disabled {
    background-color: ${props => props.theme.disabled};
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.div`
  color: ${props => props.theme.error};
  font-size: 14px;
  margin-top: 10px;
`;

const SuccessMessage = styled.div`
  color: ${props => props.theme.success};
  font-size: 14px;
  margin-top: 10px;
  padding: 10px;
  background-color: ${props => props.theme.successBackground};
  border-radius: 4px;
`;

const InfoItem = styled.div`
  margin-bottom: 10px;
  display: flex;
  flex-direction: column;
`;

const InfoLabel = styled.span`
  font-weight: 500;
  color: ${props => props.theme.textSecondary};
  font-size: 14px;
`;

const InfoValue = styled.span`
  color: ${props => props.theme.textPrimary};
  font-size: 16px;
`;

const Badge = styled.span`
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  background-color: ${props => props.verified ? props.theme.success : props.theme.warning};
  color: white;
  margin-left: 10px;
`;

const UserProfile = () => {
  const { user, updateProfile, error, logout } = useAuth();
  
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!username) {
      setFormError('Username is required');
      return;
    }
    
    if (newPassword && newPassword !== confirmPassword) {
      setFormError('Passwords do not match');
      return;
    }
    
    if (newPassword && !currentPassword) {
      setFormError('Current password is required to set a new password');
      return;
    }
    
    try {
      setLoading(true);
      setFormError('');
      
      // Create update data
      const updateData = { username };
      
      // Only include email if it changed
      if (email !== user.email) {
        updateData.email = email;
      }
      
      // Only include password if provided
      if (newPassword && currentPassword) {
        updateData.currentPassword = currentPassword;
        updateData.newPassword = newPassword;
      }
      
      // Update profile
      await updateProfile(updateData);
      
      // Show success message
      setSuccess(true);
      
      // Clear password fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (error) {
      setFormError(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };
  
  const handleLogout = () => {
    logout();
  };
  
  if (!user) {
    return null;
  }
  
  return (
    <ProfileContainer>
      <Title>User Profile</Title>
      
      <Section>
        <SectionTitle>Account Information</SectionTitle>
        
        <InfoItem>
          <InfoLabel>Username</InfoLabel>
          <InfoValue>{user.username}</InfoValue>
        </InfoItem>
        
        <InfoItem>
          <InfoLabel>Email</InfoLabel>
          <InfoValue>
            {user.email}
            <Badge verified={user.isVerified}>
              {user.isVerified ? 'Verified' : 'Not Verified'}
            </Badge>
          </InfoValue>
        </InfoItem>
        
        <InfoItem>
          <InfoLabel>Account Created</InfoLabel>
          <InfoValue>
            {new Date(user.createdAt).toLocaleDateString()}
          </InfoValue>
        </InfoItem>
        
        <InfoItem>
          <InfoLabel>Last Login</InfoLabel>
          <InfoValue>
            {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'N/A'}
          </InfoValue>
        </InfoItem>
      </Section>
      
      <Section>
        <SectionTitle>Update Profile</SectionTitle>
        
        <Form onSubmit={handleProfileUpdate}>
          <FormGroup>
            <Label htmlFor="username">Username</Label>
            <Input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
            />
          </FormGroup>
          
          <FormGroup>
            <Label htmlFor="email">Email</Label>
            <Input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
            {email !== user.email && (
              <small style={{ color: 'orange' }}>
                Changing your email will require re-verification
              </small>
            )}
          </FormGroup>
          
          <SectionTitle>Change Password</SectionTitle>
          
          <FormGroup>
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input
              type="password"
              id="currentPassword"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter your current password"
            />
          </FormGroup>
          
          <FormGroup>
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              type="password"
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter your new password"
            />
          </FormGroup>
          
          <FormGroup>
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your new password"
            />
          </FormGroup>
          
          <Button type="submit" disabled={loading}>
            {loading ? 'Updating...' : 'Update Profile'}
          </Button>
          
          {success && (
            <SuccessMessage>Profile updated successfully!</SuccessMessage>
          )}
          
          {(formError || error) && (
            <ErrorMessage>{formError || error}</ErrorMessage>
          )}
        </Form>
      </Section>
      
      <Section>
        <Button 
          onClick={handleLogout}
          style={{ 
            backgroundColor: '#dc3545',
            marginTop: '20px'
          }}
        >
          Logout
        </Button>
      </Section>
    </ProfileContainer>
  );
};

export default UserProfile;