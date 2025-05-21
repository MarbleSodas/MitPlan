import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FaExclamationTriangle, FaCheck, FaTimes } from 'react-icons/fa';
import { usePlan } from '../../contexts/PlanContext';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1100;
`;

const ModalContainer = styled.div`
  background-color: ${props => props.theme.colors.background};
  border-radius: ${props => props.theme.borderRadius.large};
  box-shadow: ${props => props.theme.shadows.large};
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
  padding: ${props => props.theme.spacing.large};
  
  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    width: 95%;
    padding: ${props => props.theme.spacing.medium};
  }
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: ${props => props.theme.spacing.medium};
  
  svg {
    color: ${props => props.theme.colors.warning};
    font-size: 24px;
    margin-right: ${props => props.theme.spacing.small};
  }
`;

const ModalTitle = styled.h3`
  margin: 0;
  color: ${props => props.theme.colors.textPrimary};
`;

const ConflictList = styled.div`
  margin-bottom: ${props => props.theme.spacing.large};
`;

const ConflictItem = styled.div`
  background-color: ${props => props.theme.colors.backgroundAlt};
  border-radius: ${props => props.theme.borderRadius.medium};
  padding: ${props => props.theme.spacing.medium};
  margin-bottom: ${props => props.theme.spacing.medium};
  border-left: 4px solid ${props => props.theme.colors.warning};
`;

const ConflictHeader = styled.div`
  font-weight: bold;
  margin-bottom: ${props => props.theme.spacing.small};
  color: ${props => props.theme.colors.textPrimary};
`;

const ConflictDescription = styled.div`
  margin-bottom: ${props => props.theme.spacing.small};
  color: ${props => props.theme.colors.textSecondary};
`;

const ConflictOptions = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${props => props.theme.spacing.small};
  
  @media (min-width: ${props => props.theme.breakpoints.tablet}) {
    flex-direction: row;
  }
`;

const OptionButton = styled.button`
  flex: 1;
  padding: ${props => props.theme.spacing.small};
  border-radius: ${props => props.theme.borderRadius.small};
  border: none;
  background-color: ${props => props.$primary ? props.theme.colors.primary : props.theme.colors.secondary};
  color: ${props => props.theme.colors.white};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${props => props.theme.spacing.xsmall};
  
  &:hover {
    background-color: ${props => props.$primary ? props.theme.colors.primaryDark : props.theme.colors.secondaryDark};
  }
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${props => props.theme.spacing.medium};
  margin-top: ${props => props.theme.spacing.large};
`;

const Button = styled.button`
  padding: ${props => props.theme.spacing.small} ${props => props.theme.spacing.medium};
  border-radius: ${props => props.theme.borderRadius.small};
  border: none;
  background-color: ${props => props.$primary ? props.theme.colors.primary : props.theme.colors.secondary};
  color: ${props => props.theme.colors.white};
  cursor: pointer;
  
  &:hover {
    background-color: ${props => props.$primary ? props.theme.colors.primaryDark : props.theme.colors.secondaryDark};
  }
`;

const ConflictResolutionModal = ({ conflicts, onClose }) => {
  const { resolveConflict } = usePlan();
  const [resolutions, setResolutions] = useState({});
  
  // Initialize resolutions with default values (keep server changes)
  useEffect(() => {
    if (conflicts && conflicts.length > 0) {
      const initialResolutions = {};
      conflicts.forEach((conflict, index) => {
        initialResolutions[index] = 'server'; // Default to server version
      });
      setResolutions(initialResolutions);
    }
  }, [conflicts]);
  
  // Get a human-readable description of the conflict
  const getConflictDescription = (conflict) => {
    switch (conflict.conflictType) {
      case 'duplicate_mitigation':
        return `Both you and another user added the same mitigation "${conflict.serverOp.mitigation?.name || 'Unknown'}" to the boss action at ${conflict.serverOp.bossActionId}.`;
      
      case 'remove_after_add':
        return `You tried to remove a mitigation that another user just added to the boss action at ${conflict.serverOp.bossActionId}.`;
      
      case 'concurrent_assignment_change':
        return 'You and another user made conflicting changes to the mitigation assignments.';
      
      default:
        return 'There was a conflict between your changes and another user\'s changes.';
    }
  };
  
  // Handle resolution selection
  const handleResolutionChange = (index, value) => {
    setResolutions(prev => ({
      ...prev,
      [index]: value
    }));
  };
  
  // Handle apply button click
  const handleApply = () => {
    // Apply all resolutions
    Object.entries(resolutions).forEach(([index, resolution]) => {
      const conflict = conflicts[parseInt(index)];
      resolveConflict(conflict, resolution);
    });
    
    onClose();
  };
  
  if (!conflicts || conflicts.length === 0) {
    return null;
  }
  
  return (
    <ModalOverlay onClick={onClose}>
      <ModalContainer onClick={e => e.stopPropagation()}>
        <ModalHeader>
          <FaExclamationTriangle />
          <ModalTitle>Conflict Detected</ModalTitle>
        </ModalHeader>
        
        <p>There were conflicts between your changes and changes made by other users. Please resolve them:</p>
        
        <ConflictList>
          {conflicts.map((conflict, index) => (
            <ConflictItem key={index}>
              <ConflictHeader>Conflict #{index + 1}</ConflictHeader>
              <ConflictDescription>
                {getConflictDescription(conflict)}
              </ConflictDescription>
              
              <ConflictOptions>
                <OptionButton
                  $primary={resolutions[index] === 'server'}
                  onClick={() => handleResolutionChange(index, 'server')}
                >
                  <FaCheck /> Keep Their Changes
                </OptionButton>
                <OptionButton
                  $primary={resolutions[index] === 'client'}
                  onClick={() => handleResolutionChange(index, 'client')}
                >
                  <FaCheck /> Keep My Changes
                </OptionButton>
              </ConflictOptions>
            </ConflictItem>
          ))}
        </ConflictList>
        
        <ButtonContainer>
          <Button onClick={onClose}>
            Cancel
          </Button>
          <Button $primary onClick={handleApply}>
            Apply Resolutions
          </Button>
        </ButtonContainer>
      </ModalContainer>
    </ModalOverlay>
  );
};

export default ConflictResolutionModal;
