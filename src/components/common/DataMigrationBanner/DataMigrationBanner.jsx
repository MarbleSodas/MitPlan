import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { X, AlertTriangle, Download } from 'lucide-react';

const BannerContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: linear-gradient(135deg, 
    ${props => props.theme.mode === 'dark' ? '#4a3800' : '#fff3cd'} 0%, 
    ${props => props.theme.mode === 'dark' ? '#5c4500' : '#ffeaa7'} 100%);
  border-bottom: 2px solid ${props => props.theme.colors.warning};
  box-shadow: ${props => props.theme.shadows.medium};
  animation: slideDown 0.3s ease-out;
  
  @keyframes slideDown {
    from {
      transform: translateY(-100%);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
`;

const BannerContent = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${props => props.theme.spacing.medium} ${props => props.theme.spacing.large};
  max-width: 1200px;
  margin: 0 auto;
  
  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    padding: ${props => props.theme.spacing.small} ${props => props.theme.spacing.medium};
    flex-direction: column;
    gap: ${props => props.theme.spacing.small};
    text-align: center;
  }
  
  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.small};
    gap: ${props => props.theme.spacing.xsmall};
  }
`;

const MessageSection = styled.div`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.medium};
  flex: 1;
  
  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    flex-direction: column;
    gap: ${props => props.theme.spacing.small};
    text-align: center;
  }
  
  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    gap: ${props => props.theme.spacing.xsmall};
  }
`;

const IconWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: ${props => props.theme.colors.warning};
  color: ${props => props.theme.mode === 'dark' ? '#000' : '#fff'};
  flex-shrink: 0;
  
  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    width: 28px;
    height: 28px;
  }
`;

const TextContent = styled.div`
  flex: 1;
`;

const MainMessage = styled.div`
  font-weight: 600;
  font-size: ${props => props.theme.fontSizes.responsive.medium};
  color: ${props => props.theme.mode === 'dark' ? '#fff' : '#856404'};
  margin-bottom: ${props => props.theme.spacing.xsmall};
  
  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: ${props => props.theme.fontSizes.responsive.small};
    margin-bottom: 2px;
  }
`;

const SubMessage = styled.div`
  font-size: ${props => props.theme.fontSizes.responsive.small};
  color: ${props => props.theme.mode === 'dark' ? '#e6e6e6' : '#6c5700'};
  line-height: 1.4;
  
  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: ${props => props.theme.fontSizes.responsive.xsmall};
    line-height: 1.3;
  }
`;

const ActionSection = styled.div`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.small};
  
  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    justify-content: center;
    width: 100%;
  }
  
  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    flex-direction: column;
    gap: ${props => props.theme.spacing.xsmall};
  }
`;

const ExportButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.xsmall};
  padding: ${props => props.theme.spacing.small} ${props => props.theme.spacing.medium};
  background-color: ${props => props.theme.colors.warning};
  color: ${props => props.theme.mode === 'dark' ? '#000' : '#fff'};
  border: none;
  border-radius: ${props => props.theme.borderRadius.medium};
  font-weight: 600;
  font-size: ${props => props.theme.fontSizes.responsive.small};
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  
  &:hover {
    background-color: ${props => props.theme.mode === 'dark' ? '#ffcc44' : '#e0a800'};
    transform: translateY(-1px);
    box-shadow: ${props => props.theme.shadows.small};
  }
  
  &:active {
    transform: translateY(0);
  }
  
  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.xsmall} ${props => props.theme.spacing.small};
    font-size: ${props => props.theme.fontSizes.responsive.xsmall};
    width: 100%;
    justify-content: center;
  }
`;

const CloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: none;
  border: none;
  color: ${props => props.theme.mode === 'dark' ? '#ccc' : '#6c5700'};
  cursor: pointer;
  border-radius: 50%;
  transition: all 0.2s ease;
  flex-shrink: 0;
  
  &:hover {
    background-color: ${props => props.theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'};
    color: ${props => props.theme.mode === 'dark' ? '#fff' : '#000'};
  }
  
  &:active {
    transform: scale(0.95);
  }
  
  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    width: 28px;
    height: 28px;
  }
`;

const BANNER_DISMISSED_KEY = 'mitplan-migration-banner-dismissed';

const DataMigrationBanner = ({ onExportClick, onVisibilityChange }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if banner was previously dismissed
    const wasDismissed = localStorage.getItem(BANNER_DISMISSED_KEY);

    // Check if we're past the migration date (July 10th, 2025)
    const migrationDate = new Date('2025-07-10');
    const currentDate = new Date();

    // Show banner if not dismissed and before migration date
    const shouldShow = !wasDismissed && currentDate < migrationDate;
    setIsVisible(shouldShow);

    // Notify parent of visibility change
    if (onVisibilityChange) {
      onVisibilityChange(shouldShow);
    }
  }, [onVisibilityChange]);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem(BANNER_DISMISSED_KEY, 'true');

    // Notify parent of visibility change
    if (onVisibilityChange) {
      onVisibilityChange(false);
    }
  };

  const handleExportClick = () => {
    if (onExportClick) {
      onExportClick();
    }
    // Optionally scroll to export section or show export modal
    const exportSection = document.querySelector('[data-export-section]');
    if (exportSection) {
      exportSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <BannerContainer>
      <BannerContent>
        <MessageSection>
          <IconWrapper>
            <AlertTriangle size={18} />
          </IconWrapper>
          <TextContent>
            <MainMessage>
              Important: Data Migration Notice
            </MainMessage>
            <SubMessage>
              Export your mitigation plans to JSON before July 10th, 2025. 
              New collaboration features may not preserve locally stored plans.
            </SubMessage>
          </TextContent>
        </MessageSection>
        
        <ActionSection>
          <ExportButton onClick={handleExportClick}>
            <Download size={16} />
            Export Plans
          </ExportButton>
          <CloseButton onClick={handleDismiss} aria-label="Dismiss notification">
            <X size={18} />
          </CloseButton>
        </ActionSection>
      </BannerContent>
    </BannerContainer>
  );
};

export default DataMigrationBanner;
