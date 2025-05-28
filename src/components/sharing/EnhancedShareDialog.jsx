import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { usePlanStorage } from '../../contexts/PlanStorageContext';
import { useAuth } from '../../contexts/AuthContext';
import { generateShareableUrl } from '../../utils/url/urlUtils';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
`;

const ModalContainer = styled.div`
  background-color: ${props => props.theme.colors.primary};
  border-radius: 12px;
  padding: 24px;
  max-width: 500px;
  width: 100%;
  box-shadow: ${props => props.theme.shadows.large};
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid ${props => props.theme.colors.border};
`;

const ModalTitle = styled.h2`
  color: ${props => props.theme.colors.text};
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.theme.colors.textSecondary};
  font-size: 1.5rem;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  
  &:hover {
    background-color: ${props => props.theme.colors.secondary};
    color: ${props => props.theme.colors.text};
  }
`;

const ShareOption = styled.div`
  margin-bottom: 20px;
  padding: 16px;
  border: 2px solid ${props => props.selected ? props.theme.colors.accent : props.theme.colors.border};
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: ${props => props.theme.colors.accent};
  }
`;

const OptionHeader = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 8px;
`;

const OptionRadio = styled.input`
  margin-right: 12px;
  cursor: pointer;
`;

const OptionTitle = styled.h3`
  margin: 0;
  color: ${props => props.theme.colors.text};
  font-size: 1.1rem;
  font-weight: 600;
`;

const OptionDescription = styled.p`
  margin: 0;
  color: ${props => props.theme.colors.textSecondary};
  font-size: 0.875rem;
  line-height: 1.4;
`;

const UrlContainer = styled.div`
  margin-bottom: 20px;
`;

const UrlLabel = styled.label`
  display: block;
  color: ${props => props.theme.colors.text};
  font-weight: 500;
  margin-bottom: 8px;
`;

const UrlInput = styled.input`
  width: 100%;
  padding: 12px;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 6px;
  background-color: ${props => props.theme.colors.secondary};
  color: ${props => props.theme.colors.text};
  font-family: monospace;
  font-size: 0.875rem;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.accent};
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
`;

const Button = styled.button`
  padding: 10px 20px;
  border-radius: 6px;
  border: none;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const SecondaryButton = styled(Button)`
  background-color: ${props => props.theme.colors.secondary};
  color: ${props => props.theme.colors.text};
  
  &:hover:not(:disabled) {
    background-color: ${props => props.theme.colors.border};
  }
`;

const PrimaryButton = styled(Button)`
  background-color: ${props => props.theme.colors.accent};
  color: white;
  
  &:hover:not(:disabled) {
    background-color: ${props => props.theme.colors.accentHover};
  }
`;

const VisibilitySection = styled.div`
  margin-bottom: 20px;
  padding: 16px;
  background-color: ${props => props.theme.colors.secondary};
  border-radius: 8px;
`;

const VisibilityLabel = styled.h4`
  margin: 0 0 12px 0;
  color: ${props => props.theme.colors.text};
  font-size: 1rem;
  font-weight: 600;
`;

const VisibilityOption = styled.label`
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  color: ${props => props.theme.colors.text};
  cursor: pointer;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const VisibilityRadio = styled.input`
  margin-right: 8px;
  cursor: pointer;
`;

const StatusMessage = styled.div`
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 16px;
  font-size: 0.875rem;
  
  ${props => props.type === 'success' && `
    background-color: #E8F5E8;
    color: #2E7D32;
    border: 1px solid #4CAF50;
  `}
  
  ${props => props.type === 'error' && `
    background-color: #FFEBEE;
    color: #C62828;
    border: 1px solid #F44336;
  `}
  
  ${props => props.type === 'info' && `
    background-color: #E3F2FD;
    color: #1565C0;
    border: 1px solid #2196F3;
  `}
`;

const EnhancedShareDialog = ({ isOpen, onClose, planData }) => {
  const { isAuthenticated, apiRequest } = useAuth();
  const { savePlan, storageState } = usePlanStorage();
  const [shareType, setShareType] = useState('database');
  const [visibility, setVisibility] = useState('private');
  const [shareUrl, setShareUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState(null);
  const [savedPlan, setSavedPlan] = useState(null);

  // Determine available share options
  const canUseDatabase = isAuthenticated && storageState !== 'offline_local_only';
  const defaultShareType = canUseDatabase ? 'database' : 'anonymous';

  useEffect(() => {
    if (isOpen) {
      setShareType(defaultShareType);
      setShareUrl('');
      setMessage(null);
      setSavedPlan(null);
    }
  }, [isOpen, defaultShareType]);

  // Generate share URL
  const generateUrl = async () => {
    setIsGenerating(true);
    setMessage(null);

    try {
      if (shareType === 'database') {
        // Save plan to database first if not already saved
        let planToShare = savedPlan;
        
        if (!planToShare || planToShare.source !== 'database') {
          const planWithVisibility = {
            ...planData,
            isPublic: visibility === 'public'
          };
          planToShare = await savePlan(planWithVisibility);
          setSavedPlan(planToShare);
        } else if (planToShare.isPublic !== (visibility === 'public')) {
          // Update visibility if changed
          const updatedPlan = await apiRequest(`/plans/${planToShare.id}`, {
            method: 'PUT',
            body: JSON.stringify({
              is_public: visibility === 'public'
            })
          });
          planToShare = { ...planToShare, isPublic: visibility === 'public' };
          setSavedPlan(planToShare);
        }

        // Generate database-based URL
        const baseUrl = window.location.origin;
        const url = `${baseUrl}/plan/${planToShare.id}`;
        setShareUrl(url);
        
        setMessage({
          type: 'success',
          text: `Plan saved and share link generated! ${visibility === 'public' ? 'Anyone with the link can view this plan.' : 'Only you can access this plan.'}`
        });
      } else {
        // Generate anonymous compressed URL
        const url = generateShareableUrl(planData);
        setShareUrl(url);
        
        setMessage({
          type: 'info',
          text: 'Anonymous share link generated. This link contains the plan data and works without an account.'
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: `Failed to generate share link: ${error.message}`
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Copy URL to clipboard
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setMessage({
        type: 'success',
        text: 'Share link copied to clipboard!'
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Failed to copy to clipboard'
      });
    }
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay>
      <ModalContainer>
        <ModalHeader>
          <ModalTitle>Share Plan</ModalTitle>
          <CloseButton onClick={onClose}>×</CloseButton>
        </ModalHeader>

        {message && (
          <StatusMessage type={message.type}>
            {message.text}
          </StatusMessage>
        )}

        {/* Share Type Selection */}
        {canUseDatabase && (
          <ShareOption 
            selected={shareType === 'database'}
            onClick={() => setShareType('database')}
          >
            <OptionHeader>
              <OptionRadio
                type="radio"
                name="shareType"
                value="database"
                checked={shareType === 'database'}
                onChange={() => setShareType('database')}
              />
              <OptionTitle>Share with Account</OptionTitle>
            </OptionHeader>
            <OptionDescription>
              Save the plan to your account and create a persistent share link. 
              The plan will be accessible across all your devices.
            </OptionDescription>
          </ShareOption>
        )}

        <ShareOption 
          selected={shareType === 'anonymous'}
          onClick={() => setShareType('anonymous')}
        >
          <OptionHeader>
            <OptionRadio
              type="radio"
              name="shareType"
              value="anonymous"
              checked={shareType === 'anonymous'}
              onChange={() => setShareType('anonymous')}
            />
            <OptionTitle>Share Anonymously</OptionTitle>
          </OptionHeader>
          <OptionDescription>
            Create a share link that contains the plan data. Works without an account 
            but the link will be longer.
          </OptionDescription>
        </ShareOption>

        {/* Visibility Settings for Database Sharing */}
        {shareType === 'database' && (
          <VisibilitySection>
            <VisibilityLabel>Plan Visibility</VisibilityLabel>
            <VisibilityOption>
              <VisibilityRadio
                type="radio"
                name="visibility"
                value="private"
                checked={visibility === 'private'}
                onChange={() => setVisibility('private')}
              />
              Private - Only you can access this plan
            </VisibilityOption>
            <VisibilityOption>
              <VisibilityRadio
                type="radio"
                name="visibility"
                value="public"
                checked={visibility === 'public'}
                onChange={() => setVisibility('public')}
              />
              Public - Anyone with the link can view this plan
            </VisibilityOption>
          </VisibilitySection>
        )}

        {/* Generated URL */}
        {shareUrl && (
          <UrlContainer>
            <UrlLabel>Share Link</UrlLabel>
            <UrlInput
              value={shareUrl}
              readOnly
              onClick={(e) => e.target.select()}
            />
          </UrlContainer>
        )}

        <ButtonGroup>
          <SecondaryButton onClick={onClose}>
            Close
          </SecondaryButton>
          
          {!shareUrl ? (
            <PrimaryButton 
              onClick={generateUrl}
              disabled={isGenerating}
            >
              {isGenerating ? 'Generating...' : 'Generate Link'}
            </PrimaryButton>
          ) : (
            <PrimaryButton onClick={copyToClipboard}>
              Copy Link
            </PrimaryButton>
          )}
        </ButtonGroup>
      </ModalContainer>
    </ModalOverlay>
  );
};

export default EnhancedShareDialog;
