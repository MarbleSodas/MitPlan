/**
 * DisplayNameModal Component
 * 
 * Collects display names from unauthenticated users accessing shared plans.
 * Provides a non-blocking experience while encouraging name entry for better collaboration.
 */

import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { User, Edit3, Eye, X, Check } from 'lucide-react';

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
  z-index: 10000;
  backdrop-filter: blur(4px);
  animation: fadeIn 0.3s ease-out;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const ModalContent = styled.div`
  background: ${props => props.theme?.colors?.surface || '#ffffff'};
  border-radius: 12px;
  padding: 24px;
  max-width: 480px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
  border: 1px solid ${props => props.theme?.colors?.border || '#e0e0e0'};
  animation: slideIn 0.3s ease-out;

  @keyframes slideIn {
    from { 
      opacity: 0;
      transform: translateY(-20px) scale(0.95);
    }
    to { 
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @media (max-width: 768px) {
    padding: 20px;
    margin: 16px;
    max-width: none;
    width: calc(100% - 32px);
  }
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid ${props => props.theme?.colors?.border || '#e0e0e0'};
`;

const ModalTitle = styled.h2`
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: ${props => props.theme?.colors?.text || '#333333'};
  flex: 1;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
  color: ${props => props.theme?.colors?.textSecondary || '#666666'};
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.theme?.colors?.hover || '#f5f5f5'};
    color: ${props => props.theme?.colors?.text || '#333333'};
  }
`;

const ModalBody = styled.div`
  margin-bottom: 24px;
`;

const Description = styled.p`
  margin: 0 0 20px 0;
  color: ${props => props.theme?.colors?.textSecondary || '#666666'};
  line-height: 1.5;
  font-size: 14px;
`;

const InputGroup = styled.div`
  margin-bottom: 16px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: ${props => props.theme?.colors?.text || '#333333'};
  font-size: 14px;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 16px;
  border: 2px solid ${props => props.$hasError ? '#f44336' : (props.theme?.colors?.border || '#e0e0e0')};
  border-radius: 8px;
  font-size: 16px;
  background: ${props => props.theme?.colors?.background || '#ffffff'};
  color: ${props => props.theme?.colors?.text || '#333333'};
  transition: all 0.2s ease;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: ${props => props.$hasError ? '#f44336' : (props.theme?.colors?.primary || '#2196F3')};
    box-shadow: 0 0 0 3px ${props => props.$hasError ? '#f4433620' : (props.theme?.colors?.primary || '#2196F3')}20;
  }

  &::placeholder {
    color: ${props => props.theme?.colors?.textSecondary || '#999999'};
  }
`;

const ErrorMessage = styled.div`
  color: #f44336;
  font-size: 12px;
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
`;

const CharacterCount = styled.div`
  font-size: 12px;
  color: ${props => props.theme?.colors?.textSecondary || '#666666'};
  text-align: right;
  margin-top: 4px;
`;

const ModalFooter = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  align-items: center;

  @media (max-width: 480px) {
    flex-direction: column-reverse;
    gap: 8px;
  }
`;

const Button = styled.button`
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 120px;
  justify-content: center;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (max-width: 480px) {
    width: 100%;
  }
`;

const PrimaryButton = styled(Button)`
  background: ${props => props.theme?.colors?.primary || '#2196F3'};
  color: white;
  border: 2px solid ${props => props.theme?.colors?.primary || '#2196F3'};

  &:hover:not(:disabled) {
    background: ${props => props.theme?.colors?.primaryDark || '#1976D2'};
    border-color: ${props => props.theme?.colors?.primaryDark || '#1976D2'};
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(33, 150, 243, 0.3);
  }
`;

const SecondaryButton = styled(Button)`
  background: transparent;
  color: ${props => props.theme?.colors?.textSecondary || '#666666'};
  border: 2px solid ${props => props.theme?.colors?.border || '#e0e0e0'};

  &:hover:not(:disabled) {
    background: ${props => props.theme?.colors?.hover || '#f5f5f5'};
    border-color: ${props => props.theme?.colors?.textSecondary || '#666666'};
    color: ${props => props.theme?.colors?.text || '#333333'};
  }
`;

const BenefitsList = styled.ul`
  margin: 16px 0;
  padding-left: 20px;
  color: ${props => props.theme?.colors?.textSecondary || '#666666'};
  font-size: 14px;
  line-height: 1.5;

  li {
    margin-bottom: 4px;
  }
`;

const Spinner = styled.div`
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const DisplayNameModal = ({
  isOpen = false,
  onSubmit,
  onSkip,
  onClose,
  initialValue = '',
  isLoading = false,
  planTitle = 'Shared Plan'
}) => {
  const [displayName, setDisplayName] = useState(initialValue);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef(null);

  const MIN_LENGTH = 2;
  const MAX_LENGTH = 30;

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Validate display name
  const validateDisplayName = (name) => {
    const trimmed = name.trim();
    
    if (!trimmed) {
      return 'Display name is required';
    }
    
    if (trimmed.length < MIN_LENGTH) {
      return `Display name must be at least ${MIN_LENGTH} characters`;
    }
    
    if (trimmed.length > MAX_LENGTH) {
      return `Display name must be no more than ${MAX_LENGTH} characters`;
    }
    
    // Check for invalid characters
    if (!/^[a-zA-Z0-9\s\-_\.]+$/.test(trimmed)) {
      return 'Display name can only contain letters, numbers, spaces, hyphens, underscores, and periods';
    }
    
    return '';
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setDisplayName(value);
    
    // Clear error when user starts typing
    if (error) {
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validationError = validateDisplayName(displayName);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await onSubmit(displayName.trim());
    } catch (err) {
      setError(err.message || 'Failed to set display name. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    } else if (e.key === 'Escape') {
      handleSkip();
    }
  };

  if (!isOpen) return null;

  const isValid = !validateDisplayName(displayName);
  const isProcessing = isSubmitting || isLoading;

  return (
    <ModalOverlay onClick={(e) => e.target === e.currentTarget && handleSkip()}>
      <ModalContent>
        <ModalHeader>
          <User size={24} color="#2196F3" />
          <ModalTitle>Join Collaboration</ModalTitle>
          <CloseButton onClick={handleSkip} title="Skip for now">
            <X size={20} />
          </CloseButton>
        </ModalHeader>

        <ModalBody>
          <Description>
            You're about to join a collaborative editing session for "<strong>{planTitle}</strong>". 
            Enter a display name so other collaborators can identify you.
          </Description>

          <BenefitsList>
            <li>Other users will see your name when you make changes</li>
            <li>Your selections and edits will be highlighted with your color</li>
            <li>You'll have full editing access to the shared plan</li>
          </BenefitsList>

          <form onSubmit={handleSubmit}>
            <InputGroup>
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                ref={inputRef}
                id="displayName"
                type="text"
                value={displayName}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Enter your name (e.g., Alex, Tank Player, etc.)"
                maxLength={MAX_LENGTH}
                $hasError={!!error}
                disabled={isProcessing}
              />
              {error && (
                <ErrorMessage>
                  <X size={12} />
                  {error}
                </ErrorMessage>
              )}
              <CharacterCount>
                {displayName.length}/{MAX_LENGTH}
              </CharacterCount>
            </InputGroup>
          </form>
        </ModalBody>

        <ModalFooter>
          <SecondaryButton
            type="button"
            onClick={handleSkip}
            disabled={isProcessing}
          >
            <Eye size={16} />
            View Only
          </SecondaryButton>
          
          <PrimaryButton
            type="button"
            onClick={handleSubmit}
            disabled={!isValid || isProcessing}
          >
            {isProcessing ? (
              <>
                <Spinner />
                Joining...
              </>
            ) : (
              <>
                <Edit3 size={16} />
                Start Editing
              </>
            )}
          </PrimaryButton>
        </ModalFooter>
      </ModalContent>
    </ModalOverlay>
  );
};

export default DisplayNameModal;
