import React, { useState } from 'react';
import styled from 'styled-components';
import { usePlan } from '../../../contexts/PlanContext';
import ShareLinkGenerator from './ShareLinkGenerator';
import SharedUsersList from './SharedUsersList';

const Container = styled.div`
  background-color: ${props => props.theme.cardBackground};
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  margin-bottom: 20px;
`;

const Header = styled.div`
  padding: 15px;
  border-bottom: 1px solid ${props => props.theme.borderColor};
`;

const Title = styled.h3`
  margin: 0;
  color: ${props => props.theme.textPrimary};
`;

const Body = styled.div`
  padding: 15px;
`;

const TabsContainer = styled.div`
  display: flex;
  margin-bottom: 20px;
  border-bottom: 1px solid ${props => props.theme.borderColor};
`;

const Tab = styled.button`
  padding: 10px 20px;
  background: none;
  border: none;
  border-bottom: 2px solid ${props => props.active ? props.theme.primary : 'transparent'};
  color: ${props => props.active ? props.theme.primary : props.theme.textSecondary};
  font-weight: ${props => props.active ? '600' : '400'};
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    color: ${props => props.theme.primary};
  }
`;

const ShareForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 20px;
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

const CheckboxGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Checkbox = styled.input`
  margin: 0;
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

const PublicSharingToggle = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px;
  background-color: ${props => props.theme.backgroundAlt};
  border-radius: 8px;
  margin-bottom: 20px;
`;

const ToggleLabel = styled.div`
  font-weight: 500;
  color: ${props => props.theme.textPrimary};
`;

const ToggleDescription = styled.div`
  font-size: 14px;
  color: ${props => props.theme.textSecondary};
  margin-top: 4px;
`;

const PlanSharing = ({ plan, isOwner }) => {
  const { sharePlan, removeSharing, updatePlan, error: planError } = usePlan();
  
  const [activeTab, setActiveTab] = useState('users');
  const [email, setEmail] = useState('');
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isPublic, setIsPublic] = useState(plan?.isPublic || false);
  
  const handleShareSubmit = async (e) => {
    e.preventDefault();
    
    if (!email) {
      setError('Please enter an email address');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      // Share plan
      await sharePlan(plan.id, email, { canEdit });
      
      // Show success message
      setSuccess(`Plan shared successfully with ${email}`);
      
      // Clear form
      setEmail('');
      setCanEdit(false);
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to share plan');
    } finally {
      setLoading(false);
    }
  };
  
  const handleRemoveSharing = async (userId) => {
    try {
      setLoading(true);
      setError('');
      
      // Remove sharing
      await removeSharing(plan.id, userId);
      
      // Show success message
      setSuccess('User removed from sharing');
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to remove sharing');
    } finally {
      setLoading(false);
    }
  };
  
  const handlePublicToggle = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Update plan
      await updatePlan(plan.id, {
        ...plan,
        isPublic: !isPublic
      });
      
      // Update local state
      setIsPublic(!isPublic);
      
      // Show success message
      setSuccess(`Plan is now ${!isPublic ? 'public' : 'private'}`);
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to update plan visibility');
    } finally {
      setLoading(false);
    }
  };
  
  if (!plan) {
    return null;
  }
  
  return (
    <Container>
      <Header>
        <Title>Share & Collaborate</Title>
      </Header>
      
      <Body>
        {isOwner && (
          <PublicSharingToggle>
            <div>
              <ToggleLabel>Public Access</ToggleLabel>
              <ToggleDescription>
                {isPublic 
                  ? 'Anyone can view this plan' 
                  : 'Only you and people you share with can access this plan'}
              </ToggleDescription>
            </div>
            
            <label className="switch">
              <input 
                type="checkbox" 
                checked={isPublic} 
                onChange={handlePublicToggle}
                disabled={loading}
              />
              <span className="slider round"></span>
            </label>
          </PublicSharingToggle>
        )}
        
        <TabsContainer>
          <Tab 
            active={activeTab === 'users'} 
            onClick={() => setActiveTab('users')}
          >
            Users
          </Tab>
          <Tab 
            active={activeTab === 'link'} 
            onClick={() => setActiveTab('link')}
          >
            Share Link
          </Tab>
        </TabsContainer>
        
        {activeTab === 'users' ? (
          <>
            {isOwner && (
              <ShareForm onSubmit={handleShareSubmit}>
                <FormGroup>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter email to share with"
                    required
                  />
                </FormGroup>
                
                <CheckboxGroup>
                  <Checkbox
                    type="checkbox"
                    id="canEdit"
                    checked={canEdit}
                    onChange={(e) => setCanEdit(e.target.checked)}
                  />
                  <Label htmlFor="canEdit" style={{ fontWeight: 'normal' }}>
                    Allow editing
                  </Label>
                </CheckboxGroup>
                
                <Button type="submit" disabled={loading}>
                  {loading ? 'Sharing...' : 'Share'}
                </Button>
              </ShareForm>
            )}
            
            <SharedUsersList 
              plan={plan} 
              isOwner={isOwner} 
              onRemoveUser={handleRemoveSharing}
            />
            
            {(error || planError) && (
              <ErrorMessage>{error || planError}</ErrorMessage>
            )}
            
            {success && (
              <SuccessMessage>{success}</SuccessMessage>
            )}
          </>
        ) : (
          <ShareLinkGenerator plan={plan} isOwner={isOwner} />
        )}
      </Body>
    </Container>
  );
};

export default PlanSharing;