import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Copy, Check, Share2, Users } from 'lucide-react';
import * as planService from '../../services/realtimePlanService';
import { useToast } from '../common/Toast';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: ${props => props.theme?.colors?.background || '#ffffff'};
  border-radius: 12px;
  padding: 2rem;
  max-width: 500px;
  width: 90%;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
`;

const Title = styled.h2`
  margin: 0;
  color: ${props => props.theme?.colors?.text || '#333333'};
  font-size: 1.5rem;
  font-weight: 600;
`;

const Description = styled.p`
  margin: 0 0 1.5rem 0;
  color: ${props => props.theme?.colors?.textSecondary || '#666666'};
  line-height: 1.5;
`;

const ShareSection = styled.div`
  margin-bottom: 1.5rem;
`;

const SectionTitle = styled.h3`
  margin: 0 0 0.75rem 0;
  color: ${props => props.theme?.colors?.text || '#333333'};
  font-size: 1rem;
  font-weight: 600;
`;

const UrlContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
`;

const UrlInput = styled.input`
  flex: 1;
  padding: 0.75rem;
  border: 2px solid ${props => props.theme?.colors?.border || '#e1e5e9'};
  border-radius: 8px;
  font-size: 0.875rem;
  background: ${props => props.theme?.colors?.backgroundSecondary || '#f8f9fa'};
  color: ${props => props.theme?.colors?.text || '#333333'};
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme?.colors?.primary || '#3399ff'};
  }
`;

const CopyButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: ${props => props.copied ? '#10b981' : props.theme?.colors?.primary || '#3399ff'};
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 100px;
  justify-content: center;

  &:hover {
    background: ${props => props.copied ? '#059669' : props.theme?.colors?.primaryHover || '#2980ff'};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const StatusMessage = styled.div`
  padding: 0.75rem;
  border-radius: 8px;
  font-size: 0.875rem;
  margin-bottom: 1rem;
  
  &.success {
    background: ${props => props.theme?.colors?.successBackground || '#f0f9ff'};
    color: ${props => props.theme?.colors?.success || '#10b981'};
    border: 1px solid ${props => props.theme?.colors?.successBorder || '#bfdbfe'};
  }
  
  &.error {
    background: ${props => props.theme?.colors?.errorBackground || '#fef2f2'};
    color: ${props => props.theme?.colors?.error || '#ef4444'};
    border: 1px solid ${props => props.theme?.colors?.errorBorder || '#fecaca'};
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
`;

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const SecondaryButton = styled(Button)`
  background: transparent;
  color: ${props => props.theme?.colors?.textSecondary || '#666666'};
  border: 2px solid ${props => props.theme?.colors?.border || '#e1e5e9'};

  &:hover:not(:disabled) {
    background: ${props => props.theme?.colors?.backgroundSecondary || '#f8f9fa'};
  }
`;

const SharePlanModal = ({ isOpen, onClose, plan }) => {
  const { addToast } = useToast();
  const [isPublic, setIsPublic] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Generate share URL
  useEffect(() => {
    if (plan && isOpen) {
      const baseUrl = window.location.origin;
      const url = `${baseUrl}/plan/edit/${plan.id}`;
      setShareUrl(url);
      setIsPublic(plan.isPublic || false);
    }
  }, [plan, isOpen]);

  const handleMakePublic = async () => {
    if (!plan) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await planService.makePlanPublic(plan.id, true);
      setIsPublic(true);
      setSuccess('Plan is now public and can be shared!');
    } catch (err) {
      setError('Failed to make plan public. Please try again.');
      console.error('Error making plan public:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);

      // Show success toast
      addToast({
        type: 'success',
        title: 'Plan link copied!',
        message: 'The plan link has been copied to your clipboard.',
        duration: 3000
      });
    } catch (err) {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);

      // Show success toast for fallback method
      addToast({
        type: 'success',
        title: 'Plan link copied!',
        message: 'The plan link has been copied to your clipboard.',
        duration: 3000
      });
    }
  };

  const handleClose = () => {
    setCopied(false);
    setError('');
    setSuccess('');
    onClose();
  };

  if (!isOpen || !plan) return null;

  return (
    <ModalOverlay onClick={handleClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <Header>
          <Share2 size={24} color="#3399ff" />
          <Title>Share Plan</Title>
        </Header>

        <Description>
          Share "{plan.name}" with others for collaborative editing. Anyone with the link will be able to view and edit this plan.
        </Description>

        <ShareSection>
          <SectionTitle>Share Link</SectionTitle>
          <Description>
            Universal access enabled - all plans are shareable and editable by anyone.
          </Description>
          <UrlContainer>
            <UrlInput
              value={shareUrl}
              readOnly
              onClick={(e) => e.target.select()}
            />
            <CopyButton
              onClick={handleCopyUrl}
              copied={copied}
            >
              {copied ? (
                <>
                  <Check size={16} />
                  Copied!
                </>
              ) : (
                <>
                  <Copy size={16} />
                  Copy
                </>
              )}
            </CopyButton>
          </UrlContainer>
        </ShareSection>

        {error && (
          <StatusMessage className="error">
            {error}
          </StatusMessage>
        )}

        {success && (
          <StatusMessage className="success">
            {success}
          </StatusMessage>
        )}

        <ButtonGroup>
          <SecondaryButton onClick={handleClose}>
            Close
          </SecondaryButton>
        </ButtonGroup>
      </ModalContent>
    </ModalOverlay>
  );
};

export default SharePlanModal;
