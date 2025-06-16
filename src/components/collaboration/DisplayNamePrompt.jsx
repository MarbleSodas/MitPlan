import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { X, Users, Edit3, Eye } from 'lucide-react';
import { AuthButton } from '../auth';

const PromptOverlay = styled.div`
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
  backdrop-filter: blur(4px);
`;

const PromptModal = styled.div`
  background: ${props => props.theme.colors.background};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 12px;
  padding: 32px;
  max-width: 480px;
  width: 90%;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  position: relative;
`;

const PromptBanner = styled.div`
  background: ${props => props.theme.colors.primary}15;
  border: 1px solid ${props => props.theme.colors.primary}30;
  border-radius: 8px;
  padding: 16px 20px;
  margin: 16px;
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 12px;
  right: 12px;
  background: none;
  border: none;
  color: ${props => props.theme.colors.textSecondary};
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  
  &:hover {
    background: ${props => props.theme.colors.backgroundSecondary};
    color: ${props => props.theme.colors.text};
  }
`;

const Title = styled.h2`
  margin: 0 0 8px 0;
  color: ${props => props.theme.colors.text};
  font-size: 24px;
  font-weight: 600;
`;

const Subtitle = styled.p`
  margin: 0 0 24px 0;
  color: ${props => props.theme.colors.textSecondary};
  font-size: 16px;
  line-height: 1.5;
`;

const BannerTitle = styled.h3`
  margin: 0 0 4px 0;
  color: ${props => props.theme.colors.text};
  font-size: 16px;
  font-weight: 600;
`;

const BannerText = styled.p`
  margin: 0;
  color: ${props => props.theme.colors.textSecondary};
  font-size: 14px;
`;

const InputGroup = styled.div`
  margin-bottom: 20px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  color: ${props => props.theme.colors.text};
  font-weight: 500;
  font-size: 14px;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 16px;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 8px;
  background: ${props => props.theme.colors.backgroundSecondary};
  color: ${props => props.theme.colors.text};
  font-size: 16px;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 0 0 3px ${props => props.theme.colors.primary}20;
  }
  
  &::placeholder {
    color: ${props => props.theme.colors.textSecondary};
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
`;

const Button = styled.button`
  padding: 12px 20px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  
  ${props => props.variant === 'primary' && `
    background: ${props.theme.colors.primary};
    color: white;
    border: none;
    
    &:hover:not(:disabled) {
      background: ${props.theme.colors.primaryHover};
    }
    
    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  `}
  
  ${props => props.variant === 'secondary' && `
    background: ${props.theme.colors.backgroundSecondary};
    color: ${props.theme.colors.text};
    border: 1px solid ${props.theme.colors.border};
    
    &:hover {
      background: ${props.theme.colors.backgroundTertiary};
    }
  `}
  
  ${props => props.variant === 'ghost' && `
    background: none;
    color: ${props.theme.colors.textSecondary};
    border: none;
    
    &:hover {
      color: ${props.theme.colors.text};
      background: ${props.theme.colors.backgroundSecondary};
    }
  `}
`;

const FeatureList = styled.div`
  margin: 20px 0;
  padding: 16px;
  background: ${props => props.theme.colors.backgroundSecondary};
  border-radius: 8px;
`;

const FeatureItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  color: ${props => props.theme.colors.textSecondary};
  font-size: 14px;
  
  &:last-child {
    margin-bottom: 0;
  }
  
  svg {
    color: ${props => props.theme.colors.primary};
    flex-shrink: 0;
  }
`;

const DisplayNamePrompt = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  onSignIn,
  mode = 'modal', // 'modal' or 'banner'
  planName = 'Shared Plan'
}) => {
  const [displayName, setDisplayName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Focus input when modal opens
      const timer = setTimeout(() => {
        const input = document.querySelector('[data-display-name-input]');
        if (input) input.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!displayName.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit(displayName.trim());
    } catch (error) {
      console.error('Failed to set display name:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAnonymous = () => {
    onSubmit(null); // Use auto-generated name
  };

  if (!isOpen) return null;

  if (mode === 'banner') {
    return (
      <PromptBanner>
        <Users size={20} />
        <div style={{ flex: 1 }}>
          <BannerTitle>🎭 Join "{planName}" Collaboration</BannerTitle>
          <BannerText>You're viewing in read-only mode. Enter your name or sign in to edit this plan with others in real-time!</BannerText>
        </div>
        <ButtonGroup>
          <Button variant="primary" onClick={() => setDisplayName('') || document.querySelector('[data-display-name-input]')?.focus()}>
            <Edit3 size={16} />
            Enter Name to Edit
          </Button>
          <Button variant="ghost" onClick={onSignIn}>
            Sign In Instead
          </Button>
        </ButtonGroup>
        <CloseButton onClick={onClose}>
          <X size={16} />
        </CloseButton>
      </PromptBanner>
    );
  }

  return (
    <PromptOverlay onClick={(e) => e.target === e.currentTarget && onClose()}>
      <PromptModal>
        <CloseButton onClick={onClose}>
          <X size={20} />
        </CloseButton>
        
        <Title>🎭 Join "{planName}" Collaboration</Title>
        <Subtitle>
          You're currently viewing this shared mitigation plan in <strong>read-only mode</strong>. To edit mitigation assignments, job selections, and collaborate in real-time with other users, please choose an option below:
        </Subtitle>

        <form onSubmit={handleSubmit}>
          <InputGroup>
            <Label htmlFor="displayName">Your Display Name</Label>
            <Input
              id="displayName"
              data-display-name-input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your name (e.g., John Smith)"
              maxLength={50}
            />
          </InputGroup>

          <ButtonGroup>
            <Button 
              type="submit" 
              variant="primary" 
              disabled={!displayName.trim() || isSubmitting}
            >
              <Edit3 size={16} />
              {isSubmitting ? 'Joining...' : 'Start Collaborating'}
            </Button>
            
            <AuthButton 
              variant="secondary"
              onSuccess={() => onSignIn()}
            />
            
            <Button 
              type="button" 
              variant="ghost" 
              onClick={handleAnonymous}
            >
              <Eye size={16} />
              Continue Anonymously
            </Button>
          </ButtonGroup>
        </form>

        <FeatureList>
          <FeatureItem>
            <Users size={16} />
            Real-time collaboration with other users
          </FeatureItem>
          <FeatureItem>
            <Edit3 size={16} />
            Edit mitigation assignments and job selections
          </FeatureItem>
          <FeatureItem>
            <Eye size={16} />
            See live changes and user presence indicators
          </FeatureItem>
        </FeatureList>
      </PromptModal>
    </PromptOverlay>
  );
};

export default DisplayNamePrompt;
