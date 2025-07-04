import { useState, useEffect } from 'react';
import styled from 'styled-components';

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
  max-width: 400px;
  width: 90%;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
`;

const Title = styled.h2`
  margin: 0 0 1rem 0;
  color: ${props => props.theme?.colors?.text || '#333333'};
  font-size: 1.5rem;
  font-weight: 600;
`;

const Description = styled.p`
  margin: 0 0 1.5rem 0;
  color: ${props => props.theme?.colors?.textSecondary || '#666666'};
  line-height: 1.5;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const Input = styled.input`
  padding: 0.75rem;
  border: 2px solid ${props => props.theme?.colors?.border || '#e1e5e9'};
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${props => props.theme?.colors?.primary || '#3399ff'};
  }

  &::placeholder {
    color: ${props => props.theme?.colors?.textSecondary || '#999999'};
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

const PrimaryButton = styled(Button)`
  background: ${props => props.theme?.colors?.primary || '#3399ff'};
  color: white;

  &:hover:not(:disabled) {
    background: ${props => props.theme?.colors?.primaryHover || '#2980ff'};
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

const ErrorMessage = styled.div`
  color: ${props => props.theme?.colors?.error || '#e74c3c'};
  font-size: 0.875rem;
  margin-top: 0.5rem;
`;

const DisplayNameModal = ({ 
  isOpen, 
  onSubmit, 
  onCancel, 
  allowCancel = true,
  title = "Join Collaboration",
  description = "Enter your display name to join this collaborative planning session."
}) => {
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load saved display name on mount
  useEffect(() => {
    if (isOpen) {
      const savedDisplayName = localStorage.getItem('mitplan_display_name');
      if (savedDisplayName) {
        setDisplayName(savedDisplayName);
      }
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const trimmedName = displayName.trim();
    if (!trimmedName) {
      setError('Display name is required');
      return;
    }

    if (trimmedName.length < 2) {
      setError('Display name must be at least 2 characters');
      return;
    }

    if (trimmedName.length > 50) {
      setError('Display name must be less than 50 characters');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await onSubmit(trimmedName);
    } catch (err) {
      setError(err.message || 'Failed to join collaboration');
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (allowCancel && !isSubmitting) {
      onCancel?.();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && allowCancel && !isSubmitting) {
      handleCancel();
    }
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay onClick={allowCancel ? handleCancel : undefined}>
      <ModalContent onClick={(e) => e.stopPropagation()} onKeyDown={handleKeyDown}>
        <Title>{title}</Title>
        <Description>{description}</Description>
        
        <Form onSubmit={handleSubmit}>
          <Input
            type="text"
            placeholder="Enter your display name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={50}
            autoFocus
            disabled={isSubmitting}
          />
          
          {error && <ErrorMessage>{error}</ErrorMessage>}
          
          <ButtonGroup>
            {allowCancel && (
              <SecondaryButton
                type="button"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                Cancel
              </SecondaryButton>
            )}
            <PrimaryButton
              type="submit"
              disabled={isSubmitting || !displayName.trim()}
            >
              {isSubmitting ? 'Joining...' : 'Join Session'}
            </PrimaryButton>
          </ButtonGroup>
        </Form>
      </ModalContent>
    </ModalOverlay>
  );
};

export default DisplayNameModal;
