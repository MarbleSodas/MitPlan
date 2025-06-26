/**
 * DisplayNameBanner Component
 * 
 * Non-blocking banner that encourages unauthenticated users to set a display name
 * while still allowing them to view the shared plan content.
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import { User, Edit3, Eye, X, Users } from 'lucide-react';

const BannerContainer = styled.div`
  background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);
  color: white;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 2px 8px rgba(33, 150, 243, 0.2);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E") repeat;
    pointer-events: none;
  }

  @media (max-width: 768px) {
    padding: 10px 12px;
    flex-direction: column;
    gap: 8px;
    text-align: center;
  }
`;

const BannerContent = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  position: relative;
  z-index: 1;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 8px;
  }
`;

const IconContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 50%;
  backdrop-filter: blur(10px);

  @media (max-width: 768px) {
    width: 36px;
    height: 36px;
  }
`;

const TextContent = styled.div`
  flex: 1;
  min-width: 0;

  @media (max-width: 768px) {
    text-align: center;
  }
`;

const Title = styled.div`
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 2px;
  display: flex;
  align-items: center;
  gap: 6px;

  @media (max-width: 768px) {
    justify-content: center;
    font-size: 13px;
  }
`;

const Description = styled.div`
  font-size: 12px;
  opacity: 0.9;
  line-height: 1.3;

  @media (max-width: 768px) {
    font-size: 11px;
  }
`;

const Actions = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  position: relative;
  z-index: 1;

  @media (max-width: 768px) {
    width: 100%;
    justify-content: center;
  }
`;

const ActionButton = styled.button`
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 6px;
  border: none;
  white-space: nowrap;

  &:hover {
    transform: translateY(-1px);
  }

  @media (max-width: 768px) {
    padding: 6px 12px;
    font-size: 11px;
    flex: 1;
    justify-content: center;
  }
`;

const PrimaryAction = styled(ActionButton)`
  background: rgba(255, 255, 255, 0.2);
  color: white;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);

  &:hover {
    background: rgba(255, 255, 255, 0.3);
    border-color: rgba(255, 255, 255, 0.5);
  }
`;

const SecondaryAction = styled(ActionButton)`
  background: transparent;
  color: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.3);

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: white;
    border-color: rgba(255, 255, 255, 0.5);
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s ease;
  position: relative;
  z-index: 1;

  &:hover {
    color: white;
    background: rgba(255, 255, 255, 0.1);
  }
`;

const StatusIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  opacity: 0.8;
  background: rgba(255, 255, 255, 0.1);
  padding: 4px 8px;
  border-radius: 12px;
  backdrop-filter: blur(10px);

  @media (max-width: 768px) {
    font-size: 10px;
    padding: 3px 6px;
  }
`;

const DisplayNameBanner = ({
  onSetDisplayName,
  onDismiss,
  currentDisplayName = null,
  collaboratorCount = 0,
  planTitle = 'Shared Plan',
  isVisible = true
}) => {
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  const handleDismiss = () => {
    setIsAnimatingOut(true);
    setTimeout(() => {
      if (onDismiss) {
        onDismiss();
      }
    }, 200);
  };

  const handleSetDisplayName = () => {
    if (onSetDisplayName) {
      onSetDisplayName();
    }
  };

  if (!isVisible || isAnimatingOut) {
    return null;
  }

  // If user already has a display name, show a different message
  if (currentDisplayName) {
    return (
      <BannerContainer style={{ background: 'linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)' }}>
        <BannerContent>
          <IconContainer>
            <Users size={20} />
          </IconContainer>
          <TextContent>
            <Title>
              Collaborating as "{currentDisplayName}"
              <StatusIndicator>
                <Users size={12} />
                {collaboratorCount} {collaboratorCount === 1 ? 'user' : 'users'} online
              </StatusIndicator>
            </Title>
            <Description>
              You're editing "{planTitle}" with full collaboration features
            </Description>
          </TextContent>
        </BannerContent>
        <CloseButton onClick={handleDismiss} title="Dismiss">
          <X size={16} />
        </CloseButton>
      </BannerContainer>
    );
  }

  return (
    <BannerContainer>
      <BannerContent>
        <IconContainer>
          <User size={20} />
        </IconContainer>
        <TextContent>
          <Title>
            Join Collaboration Session
            {collaboratorCount > 0 && (
              <StatusIndicator>
                <Users size={12} />
                {collaboratorCount} {collaboratorCount === 1 ? 'user' : 'users'} online
              </StatusIndicator>
            )}
          </Title>
          <Description>
            Set a display name to start editing "{planTitle}" with others
          </Description>
        </TextContent>
      </BannerContent>

      <Actions>
        <SecondaryAction onClick={handleDismiss}>
          <Eye size={14} />
          View Only
        </SecondaryAction>
        <PrimaryAction onClick={handleSetDisplayName}>
          <Edit3 size={14} />
          Set Name & Edit
        </PrimaryAction>
      </Actions>

      <CloseButton onClick={handleDismiss} title="Dismiss">
        <X size={16} />
      </CloseButton>
    </BannerContainer>
  );
};

export default DisplayNameBanner;
