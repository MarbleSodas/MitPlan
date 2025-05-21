import React, { useState } from 'react';
import styled from 'styled-components';
import { usePlan } from '../../../contexts/PlanContext';
import { useAuth } from '../../../contexts/AuthContext';
import axios from 'axios';
import { FaLink, FaEnvelope, FaUsers } from 'react-icons/fa';
import SharedUsersList from './SharedUsersList';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const Container = styled.div`
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

const CheckboxGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
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

const LinkContainer = styled.div`
  display: flex;
  margin-top: 15px;
`;

const LinkInput = styled.input`
  flex: 1;
  padding: 10px;
  border: 1px solid ${props => props.theme.borderColor};
  border-radius: 4px 0 0 4px;
  background-color: ${props => props.theme.inputBackground};
  color: ${props => props.theme.textPrimary};

  &:focus {
    outline: none;
    border-color: ${props => props.theme.primary};
  }
`;

const CopyButton = styled.button`
  padding: 10px 15px;
  background-color: ${props => props.theme.secondary};
  color: white;
  border: none;
  border-radius: 0 4px 4px 0;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;

  &:hover {
    background-color: ${props => props.theme.secondaryHover};
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

const TabContainer = styled.div`
  display: flex;
  margin-bottom: 15px;
  border-bottom: 1px solid ${props => props.theme.borderColor};
`;

const Tab = styled.button`
  padding: 10px 15px;
  background-color: transparent;
  border: none;
  border-bottom: 2px solid ${props => props.active ? props.theme.primary : 'transparent'};
  color: ${props => props.active ? props.theme.primary : props.theme.textPrimary};
  cursor: pointer;
  font-weight: ${props => props.active ? '600' : '400'};
  transition: color 0.2s ease, border-color 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;

  &:hover {
    color: ${props => props.theme.primary};
  }
`;

const ExpirationSelect = styled.select`
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

const ShareLinkGenerator = ({ plan, isOwner }) => {
  const { createShareableLink, error: planError } = usePlan();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('link');
  const [isViewOnly, setIsViewOnly] = useState(true);
  const [expiration, setExpiration] = useState('never');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [shareLink, setShareLink] = useState('');

  // User sharing state
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState('view');

  const handleGenerateLink = async () => {
    try {
      setLoading(true);
      setError('');

      // Calculate expiration date if needed
      let expiresAt = null;
      if (expiration !== 'never') {
        const now = new Date();

        switch (expiration) {
          case '1day':
            expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            break;
          case '7days':
            expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            break;
          case '30days':
            expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
            break;
          default:
            expiresAt = null;
        }
      }

      // Create shareable link
      const result = await createShareableLink(plan.id, {
        expiresAt,
        isViewOnly
      });

      // Set share link
      setShareLink(result.link.url);

      // Show success message
      setSuccess('Shareable link generated successfully');

      // Hide success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to generate shareable link');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink)
      .then(() => {
        setSuccess('Link copied to clipboard');

        // Hide success message after 3 seconds
        setTimeout(() => {
          setSuccess('');
        }, 3000);
      })
      .catch(() => {
        setError('Failed to copy link');
      });
  };

  // Handle share with user
  const handleShareWithUser = async (e) => {
    e.preventDefault();

    if (!email) {
      setError('Please enter an email address');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      await axios.post(`${API_URL}/plans/${plan.id}/share`, {
        email,
        permission
      });

      setSuccess(`Plan shared successfully with ${email}`);
      setEmail('');
    } catch (error) {
      console.error('Share plan error:', error);
      setError(error.response?.data?.message || 'Failed to share plan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      {isOwner ? (
        <>
          <TabContainer>
            <Tab
              active={activeTab === 'link'}
              onClick={() => setActiveTab('link')}
            >
              <FaLink />
              Share Link
            </Tab>
            <Tab
              active={activeTab === 'user'}
              onClick={() => setActiveTab('user')}
            >
              <FaEnvelope />
              Share with User
            </Tab>
            <Tab
              active={activeTab === 'users'}
              onClick={() => setActiveTab('users')}
            >
              <FaUsers />
              Shared Users
            </Tab>
          </TabContainer>

          {activeTab === 'link' && (
            <>
              <FormGroup>
                <Label>Link Settings</Label>

                <CheckboxGroup>
                  <Checkbox
                    type="checkbox"
                    id="isViewOnly"
                    checked={isViewOnly}
                    onChange={(e) => setIsViewOnly(e.target.checked)}
                  />
                  <Label htmlFor="isViewOnly" style={{ fontWeight: 'normal' }}>
                    View only (recipients cannot edit)
                  </Label>
                </CheckboxGroup>

                <FormGroup>
                  <Label htmlFor="expiration">Link Expiration</Label>
                  <ExpirationSelect
                    id="expiration"
                    value={expiration}
                    onChange={(e) => setExpiration(e.target.value)}
                  >
                    <option value="never">Never expires</option>
                    <option value="1day">1 day</option>
                    <option value="7days">7 days</option>
                    <option value="30days">30 days</option>
                  </ExpirationSelect>
                </FormGroup>
              </FormGroup>

              <Button onClick={handleGenerateLink} disabled={loading}>
                {loading ? 'Generating...' : 'Generate Shareable Link'}
              </Button>

              {shareLink && (
                <LinkContainer>
                  <LinkInput
                    type="text"
                    value={shareLink}
                    readOnly
                  />
                  <CopyButton onClick={handleCopyLink}>
                    Copy
                  </CopyButton>
                </LinkContainer>
              )}
            </>
          )}

          {activeTab === 'user' && (
            <form onSubmit={handleShareWithUser}>
              <FormGroup>
                <Label htmlFor="email">Email Address</Label>
                <LinkInput
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email address"
                  required
                />
              </FormGroup>

              <FormGroup>
                <Label htmlFor="permission">Permission</Label>
                <ExpirationSelect
                  id="permission"
                  value={permission}
                  onChange={(e) => setPermission(e.target.value)}
                >
                  <option value="view">View Only</option>
                  <option value="edit">Can Edit</option>
                </ExpirationSelect>
              </FormGroup>

              <Button type="submit" disabled={loading}>
                {loading ? 'Sharing...' : 'Share Plan'}
              </Button>
            </form>
          )}

          {activeTab === 'users' && (
            <SharedUsersList planId={plan.id} />
          )}

          {(error || planError) && (
            <ErrorMessage>{error || planError}</ErrorMessage>
          )}

          {success && (
            <SuccessMessage>{success}</SuccessMessage>
          )}
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <p>Only the plan owner can share this plan.</p>
        </div>
      )}
    </Container>
  );
};

export default ShareLinkGenerator;