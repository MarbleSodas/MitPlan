import React from 'react';
import styled from 'styled-components';
import { getAbilityDescriptionForLevel } from '../../../utils';

const DragPreviewContainer = styled.div`
  background-color: ${props => props.theme.colors.cardBackground};
  border-radius: ${props => props.theme.borderRadius.medium};
  padding: ${props => props.theme.spacing.medium};
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
  border-left: 4px solid ${props => props.theme.colors.primary};
  max-width: 300px;
  pointer-events: none;
  display: flex;
  align-items: center;
  gap: 10px;
  transform: scale(0.9);
  opacity: 0.9;
  z-index: 9999;
`;

const DragPreviewIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
`;

const DragPreviewContent = styled.div`
  display: flex;
  flex-direction: column;
`;

const DragPreviewName = styled.div`
  font-weight: bold;
  font-size: 14px;
  margin-bottom: 2px;
`;

const DragPreviewDescription = styled.div`
  font-size: 12px;
  color: ${props => props.theme.colors.lightText};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
`;

const DragPreview = ({ item, currentBossLevel }) => {
  if (!item) return null;
  
  const description = getAbilityDescriptionForLevel(item, currentBossLevel);
  const truncatedDescription = description.length > 50 
    ? `${description.substring(0, 50)}...` 
    : description;

  return (
    <DragPreviewContainer>
      <DragPreviewIcon>
        {typeof item.icon === 'string' && item.icon.startsWith('/') ? (
          <img 
            src={item.icon} 
            alt={item.name} 
            style={{ maxHeight: '24px', maxWidth: '24px' }} 
          />
        ) : (
          item.icon
        )}
      </DragPreviewIcon>
      <DragPreviewContent>
        <DragPreviewName>{item.name}</DragPreviewName>
        <DragPreviewDescription>{truncatedDescription}</DragPreviewDescription>
      </DragPreviewContent>
    </DragPreviewContainer>
  );
};

export default DragPreview;