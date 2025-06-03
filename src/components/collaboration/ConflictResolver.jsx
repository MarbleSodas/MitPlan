import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const ConflictModal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ConflictDialog = styled.div`
  background: ${props => props.theme.colors.surface};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 12px;
  padding: 24px;
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
`;

const ConflictHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
`;

const ConflictIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #FF9800;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
`;

const ConflictTitle = styled.h3`
  margin: 0;
  color: ${props => props.theme.colors.text};
  font-size: 18px;
  font-weight: 600;
`;

const ConflictDescription = styled.p`
  color: ${props => props.theme.colors.textSecondary};
  margin: 0 0 20px 0;
  line-height: 1.5;
`;

const ConflictOptions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
`;

const ConflictOption = styled.button`
  padding: 16px;
  border: 2px solid ${props => props.selected ? props.theme.colors.primary : props.theme.colors.border};
  border-radius: 8px;
  background: ${props => props.selected ? props.theme.colors.primary + '10' : props.theme.colors.surface};
  color: ${props => props.theme.colors.text};
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${props => props.theme.colors.primary};
    background: ${props => props.theme.colors.primary + '05'};
  }
`;

const OptionTitle = styled.div`
  font-weight: 600;
  margin-bottom: 4px;
`;

const OptionDescription = styled.div`
  font-size: 14px;
  color: ${props => props.theme.colors.textSecondary};
`;

const ConflictActions = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
`;

const ConflictButton = styled.button`
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  ${props => props.variant === 'primary' ? `
    background: ${props.theme.colors.primary};
    color: white;
    &:hover {
      background: ${props.theme.colors.primaryHover};
    }
  ` : `
    background: transparent;
    color: ${props.theme.colors.text};
    border: 1px solid ${props.theme.colors.border};
    &:hover {
      background: ${props.theme.colors.surface};
    }
  `}
`;

const ConflictDetails = styled.div`
  background: ${props => props.theme.colors.background};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 6px;
  padding: 12px;
  margin: 12px 0;
  font-family: monospace;
  font-size: 12px;
  max-height: 200px;
  overflow-y: auto;
`;

/**
 * Component to handle collaboration conflicts
 */
const ConflictResolver = ({ 
  isOpen, 
  conflict, 
  onResolve, 
  onCancel 
}) => {
  const [selectedResolution, setSelectedResolution] = useState('keep_remote');
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedResolution('keep_remote');
      setShowDetails(false);
    }
  }, [isOpen]);

  if (!isOpen || !conflict) {
    return null;
  }

  const handleResolve = () => {
    onResolve(selectedResolution, conflict);
  };

  const resolutionOptions = [
    {
      id: 'keep_remote',
      title: 'Keep Remote Changes',
      description: `Accept changes from ${conflict.remoteUser || 'another user'} and discard your local changes.`
    },
    {
      id: 'keep_local',
      title: 'Keep Your Changes',
      description: 'Keep your local changes and overwrite the remote changes.'
    },
    {
      id: 'merge',
      title: 'Merge Changes',
      description: 'Attempt to automatically merge both sets of changes (may not always be possible).'
    }
  ];

  return (
    <ConflictModal onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <ConflictDialog>
        <ConflictHeader>
          <ConflictIcon>⚠️</ConflictIcon>
          <ConflictTitle>Collaboration Conflict Detected</ConflictTitle>
        </ConflictHeader>

        <ConflictDescription>
          Your changes conflict with recent changes made by {conflict.remoteUser || 'another user'}. 
          Please choose how to resolve this conflict:
        </ConflictDescription>

        <ConflictOptions>
          {resolutionOptions.map(option => (
            <ConflictOption
              key={option.id}
              selected={selectedResolution === option.id}
              onClick={() => setSelectedResolution(option.id)}
            >
              <OptionTitle>{option.title}</OptionTitle>
              <OptionDescription>{option.description}</OptionDescription>
            </ConflictOption>
          ))}
        </ConflictOptions>

        {conflict.details && (
          <div>
            <ConflictButton
              variant="secondary"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? 'Hide' : 'Show'} Conflict Details
            </ConflictButton>
            
            {showDetails && (
              <ConflictDetails>
                <div><strong>Conflict Type:</strong> {conflict.type}</div>
                <div><strong>Local Version:</strong> {conflict.localVersion}</div>
                <div><strong>Remote Version:</strong> {conflict.remoteVersion}</div>
                {conflict.details && (
                  <div>
                    <strong>Details:</strong>
                    <pre>{JSON.stringify(conflict.details, null, 2)}</pre>
                  </div>
                )}
              </ConflictDetails>
            )}
          </div>
        )}

        <ConflictActions>
          <ConflictButton variant="secondary" onClick={onCancel}>
            Cancel
          </ConflictButton>
          <ConflictButton variant="primary" onClick={handleResolve}>
            Resolve Conflict
          </ConflictButton>
        </ConflictActions>
      </ConflictDialog>
    </ConflictModal>
  );
};

export default ConflictResolver;
