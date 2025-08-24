import React, { memo, useMemo, useEffect, useState } from 'react';
import styled from 'styled-components';
import { useEnhancedMitigation } from '../../../contexts/EnhancedMitigationContext';

// Styled components
const GaugeContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 12px;
  background-color: ${props => props.theme.colors.backgroundSecondary};
  border-radius: 8px;
  border: 1px solid ${props => props.theme.colors.border};
  min-width: 120px;
`;

const GaugeTitle = styled.div`
  font-size: ${props => props.theme.fontSizes.xsmall};
  font-weight: 600;
  color: ${props => props.theme.colors.text};
  margin-bottom: 6px;
  text-align: center;
`;

const StacksContainer = styled.div`
  display: flex;
  gap: 4px;
  margin-bottom: 6px;
`;

const StackIndicator = styled.div`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: ${props => {
    if (props.$isAvailable) {
      return '#2ecc40'; // Green for available stacks (restored original)
    } else if (props.$isOnCooldown) {
      return '#666'; // Gray for stacks on cooldown
    } else {
      return props.theme.mode === 'dark' ? '#333' : '#ddd'; // Theme-aware empty stacks
    }
  }};
  border: 1.5px solid ${props => {
    if (props.$isAvailable) {
      return '#27ae60'; // Darker green border (restored original)
    } else {
      return props.theme.colors.border;
    }
  }};
  transition: all 0.3s ease;
  position: relative;
  box-shadow: ${props => props.$isAvailable ? '0 0 6px 2px rgba(46, 204, 64, 0.4)' : 'none'}; /* Green glow (restored original) */

  &.flash-update {
    animation: stackFlash 0.6s;
  }

  @keyframes stackFlash {
    0% { transform: scale(1); background-color: #2ecc40; }
    50% { transform: scale(1.2); background-color: #27ae60; }
    100% { transform: scale(1); background-color: ${props => props.$isAvailable ? '#2ecc40' : '#666'}; }
  }

`;

const StackCount = styled.div`
  font-size: ${props => props.theme.fontSizes.xsmall};
  font-weight: 600;
  color: ${props => props.theme.colors.text};
  text-align: center;
  margin-bottom: 4px;
`;

const RefreshInfo = styled.div`
  font-size: ${props => props.theme.fontSizes.xxsmall};
  color: ${props => props.theme.colors.textSecondary};
  text-align: center;
  line-height: 1.2;
`;

const RefreshButton = styled.button`
  background-color: ${props => props.$canRefresh ? props.theme.colors.primary : props.theme.colors.backgroundSecondary};
  color: ${props => props.$canRefresh ? props.theme.colors.buttonText : props.theme.colors.textSecondary};
  border: 1px solid ${props => props.$canRefresh ? props.theme.colors.primary : props.theme.colors.border};
  border-radius: 4px;
  padding: 2px 6px;
  font-size: ${props => props.theme.fontSizes.xxsmall};
  font-weight: 600;
  cursor: ${props => props.$canRefresh ? 'pointer' : 'not-allowed'};
  margin-top: 4px;
  transition: all 0.2s ease;

  &:hover {
    background-color: ${props => props.$canRefresh ? props.theme.colors.primaryHover : props.theme.colors.backgroundSecondary};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const EnhancedAetherflowGauge = memo(({
  selectedBossAction,
  showRefreshButton = false,
  onRefreshClick = null
}) => {
  // Get enhanced mitigation context
  const { cooldownManager, selectedJobs, currentBossLevel, assignments } = useEnhancedMitigation();

  // Force refresh state to trigger re-renders when assignments change
  const [forceRefresh, setForceRefresh] = useState(0);

  // Force refresh when assignments change
  useEffect(() => {
    setForceRefresh(prev => prev + 1);
  }, [assignments]);

  // Check if Scholar is selected (handles multiple data formats)
  const isScholarSelected = useMemo(() => {
    if (!selectedJobs) return false;

    // Direct format: selectedJobs['SCH']
    if (selectedJobs['SCH']) return true;

    // Check healer array for Scholar
    if (selectedJobs.healer && Array.isArray(selectedJobs.healer)) {
      // Optimized format: ["SCH", "WHM"]
      if (typeof selectedJobs.healer[0] === 'string' && selectedJobs.healer.includes('SCH')) {
        return true;
      }
      // Legacy format: [{ id: "SCH", selected: true }]
      if (typeof selectedJobs.healer[0] === 'object' &&
          selectedJobs.healer.some(job => job && job.id === 'SCH' && job.selected)) {
        return true;
      }
    }

    return false;
  }, [selectedJobs]);

  // Get Aetherflow state for the selected boss action
  const aetherflowState = useMemo(() => {
    if (!isScholarSelected || !selectedBossAction || !cooldownManager?.aetherflowTracker) {
      return {
        availableStacks: 0,
        totalStacks: 3,
        canRefresh: false,
        timeUntilRefresh: 0,
        lastRefreshTime: null
      };
    }

    return cooldownManager.aetherflowTracker.getAetherflowState(selectedBossAction.time);
  }, [isScholarSelected, selectedBossAction, cooldownManager, assignments, forceRefresh]);

  // Don't render if Scholar is not selected
  if (!isScholarSelected) {
    return null;
  }

  // Render individual stack indicators
  const renderStackIndicators = () => {
    const stacks = [];
    
    for (let i = 0; i < aetherflowState.totalStacks; i++) {
      const isAvailable = i < aetherflowState.availableStacks;
      const isOnCooldown = !isAvailable && i < (aetherflowState.totalStacks - aetherflowState.availableStacks);
      
      stacks.push(
        <StackIndicator
          key={i}
          $isAvailable={isAvailable}
          $isOnCooldown={isOnCooldown}
          title={isAvailable ? 'Available' : isOnCooldown ? 'On Cooldown' : 'Empty'}
        />
      );
    }
    
    return stacks;
  };



  return (
    <GaugeContainer>
      <GaugeTitle>Aetherflow</GaugeTitle>
      
      <StacksContainer>
        {renderStackIndicators()}
      </StacksContainer>
      
      <StackCount>
        {aetherflowState.availableStacks}/{aetherflowState.totalStacks} Stacks
      </StackCount>

      {showRefreshButton && (
        <RefreshButton
          $canRefresh={aetherflowState.canRefresh && aetherflowState.availableStacks < aetherflowState.totalStacks}
          onClick={onRefreshClick}
          disabled={!aetherflowState.canRefresh || aetherflowState.availableStacks === aetherflowState.totalStacks}
          title={aetherflowState.canRefresh ? 'Refresh Aetherflow stacks' : 'Aetherflow on cooldown'}
        >
          Refresh
        </RefreshButton>
      )}
    </GaugeContainer>
  );
});

EnhancedAetherflowGauge.displayName = 'EnhancedAetherflowGauge';

export default EnhancedAetherflowGauge;
