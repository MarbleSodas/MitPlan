import React, { useState } from 'react';
import styled from 'styled-components';
import { Eye, Lock, X, Users } from 'lucide-react';
import { useReadOnly } from '../../contexts/ReadOnlyContext';
import { useDisplayName } from '../../contexts/DisplayNameContext';

const BannerContainer = styled.div`
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
  color: white;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  position: relative;
  z-index: 100;
  
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
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 6px;
  }
`;

const BannerIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
`;

const BannerText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
`;

const BannerTitle = styled.div`
  font-weight: 600;
  font-size: 14px;
  line-height: 1.2;
`;

const BannerMessage = styled.div`
  font-size: 13px;
  opacity: 0.9;
  line-height: 1.3;
`;

const BannerActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  
  @media (max-width: 768px) {
    width: 100%;
    justify-content: center;
  }
`;

const ActionButton = styled.button`
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  &:hover {
    background: rgba(255, 255, 255, 0.3);
    border-color: rgba(255, 255, 255, 0.5);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
`;

const DismissButton = styled.button`
  background: none;
  border: none;
  color: white;
  padding: 4px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.7;
  transition: opacity 0.2s ease;

  &:hover {
    opacity: 1;
    background: rgba(255, 255, 255, 0.1);
  }
`;

const ReadOnlyBanner = ({ onSignInClick, onCreatePlanClick, onJoinCollaboration }) => {
  const { isReadOnly, getReadOnlyMessage, isSharedPlan } = useReadOnly();
  const { needsDisplayName, setDisplayName, generateAnonymousName } = useDisplayName();
  const [isDismissed, setIsDismissed] = useState(false);

  // Don't render if not in read-only mode or if dismissed
  if (!isReadOnly || isDismissed) {
    return null;
  }

  const readOnlyInfo = getReadOnlyMessage();
  if (!readOnlyInfo) {
    return null;
  }

  const handleActionClick = () => {
    if (readOnlyInfo.actionText === 'Sign In to Edit' && onSignInClick) {
      onSignInClick();
    } else if (readOnlyInfo.actionText === 'Create Your Own Plan' && onCreatePlanClick) {
      onCreatePlanClick();
    } else if (readOnlyInfo.actionText === 'Join Collaboration' && onJoinCollaboration) {
      onJoinCollaboration();
    }
  };

  const handleQuickJoin = () => {
    // Generate anonymous name and join collaboration
    const anonymousName = generateAnonymousName();
    setDisplayName(anonymousName);

    if (onJoinCollaboration) {
      onJoinCollaboration();
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  return (
    <BannerContainer>
      <BannerContent>
        <BannerIcon>
          {readOnlyInfo.actionText === 'Sign In to Edit' ? (
            <Lock size={20} />
          ) : readOnlyInfo.actionText === 'Join Collaboration' ? (
            <Users size={20} />
          ) : (
            <Eye size={20} />
          )}
        </BannerIcon>
        <BannerText>
          <BannerTitle>
            {isSharedPlan() ? '🎭 ' : ''}{readOnlyInfo.title}
          </BannerTitle>
          <BannerMessage>
            {readOnlyInfo.message}
            {isSharedPlan() && needsDisplayName && (
              <span style={{ display: 'block', marginTop: '4px', fontWeight: '600' }}>
                💡 Tip: Enter your name below to start editing and collaborating!
              </span>
            )}
          </BannerMessage>
        </BannerText>
      </BannerContent>
      <BannerActions>
        <ActionButton onClick={handleActionClick}>
          {readOnlyInfo.actionText}
        </ActionButton>

        {/* Show quick join option for shared plans */}
        {isSharedPlan() && needsDisplayName && (
          <ActionButton onClick={handleQuickJoin} style={{ opacity: 0.8 }}>
            Quick Join
          </ActionButton>
        )}

        <DismissButton onClick={handleDismiss} aria-label="Dismiss banner">
          <X size={16} />
        </DismissButton>
      </BannerActions>
    </BannerContainer>
  );
};

export default ReadOnlyBanner;
