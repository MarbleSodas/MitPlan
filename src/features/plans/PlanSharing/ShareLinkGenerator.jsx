import React, { useState } from 'react';
import styled from 'styled-components';
import { usePlan } from '../../../contexts/PlanContext';

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
  
  const [isViewOnly, setIsViewOnly] = useState(true);
  const [expiration, setExpiration] = useState('never');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [shareLink, setShareLink] = useState('');
  
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
  
  return (
    <Container>
      {isOwner ? (
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
          
          {(error || planError) && (
            <ErrorMessage>{error || planError}</ErrorMessage>
          )}
          
          {success && (
            <SuccessMessage>{success}</SuccessMessage>
          )}
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <p>Only the plan owner can generate shareable links.</p>
        </div>
      )}
    </Container>
  );
};

export default ShareLinkGenerator;