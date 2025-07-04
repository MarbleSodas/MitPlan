import React, { memo, useMemo, useState, useEffect } from 'react';
import styled from 'styled-components';
import { useEnhancedMitigation } from '../../../contexts/EnhancedMitigationContext';

// Styled components
const CounterContainer = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  border-radius: 12px;
  background-color: ${props => {
    if (props.$type === 'charges') {
      return props.$available === 0 ? '#ff5555' : '#4CAF50';
    } else if (props.$type === 'instances') {
      return props.$available === 0 ? '#ff5555' : '#2196F3';
    } else {
      return '#666';
    }
  }};
  color: white;
  font-size: 10px;
  font-weight: bold;
  transition: all 0.3s ease;
  position: relative;
  
  &.flash-update {
    animation: counterFlash 0.5s;
  }

  @keyframes counterFlash {
    0% { transform: scale(1); }
    50% { transform: scale(1.1); box-shadow: 0 0 8px rgba(255, 255, 255, 0.6); }
    100% { transform: scale(1); }
  }

  &:hover {
    transform: scale(1.05);
  }
`;

const CounterDots = styled.div`
  display: flex;
  gap: 2px;
`;

const CounterDot = styled.div`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: ${props => props.$isAvailable ? 'white' : 'rgba(255, 255, 255, 0.3)'};
  transition: all 0.2s ease;
  
  &.charging {
    animation: charging 1s infinite;
  }

  @keyframes charging {
    0% { opacity: 0.3; }
    50% { opacity: 1; }
    100% { opacity: 0.3; }
  }
`;

const CounterText = styled.span`
  margin-left: 2px;
  font-size: 9px;
  opacity: 0.9;
`;

const Tooltip = styled.div`
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 10px;
  white-space: nowrap;
  z-index: 1000;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
  margin-bottom: 4px;

  &::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 4px solid transparent;
    border-top-color: rgba(0, 0, 0, 0.9);
  }

  ${CounterContainer}:hover & {
    opacity: 1;
  }
`;

const EnhancedChargeCounter = memo(({
  abilityId,
  bossActionId = null,
  type = 'charges', // 'charges' or 'instances'
  showDots = true,
  showText = true,
  showTooltip = true,
  className = ''
}) => {
  // Get enhanced mitigation context
  const { cooldownManager, selectedBossAction } = useEnhancedMitigation();
  
  // State for flash animation
  const [isFlashing, setIsFlashing] = useState(false);
  const [lastCount, setLastCount] = useState(0);

  // Get the target time for checking availability
  const targetTime = useMemo(() => {
    if (bossActionId && cooldownManager?.bossActions) {
      const bossAction = cooldownManager.bossActions.find(action => action.id === bossActionId);
      return bossAction?.time || 0;
    }
    return selectedBossAction?.time || 0;
  }, [bossActionId, cooldownManager, selectedBossAction]);

  // Get charge/instance state
  const state = useMemo(() => {
    if (!cooldownManager || !targetTime) {
      return {
        available: 0,
        total: 1,
        nextAvailableAt: null,
        isCharging: false
      };
    }

    if (type === 'charges' && cooldownManager.chargesTracker) {
      const chargeState = cooldownManager.chargesTracker.getChargeState(abilityId, targetTime);
      return {
        available: chargeState.availableCharges,
        total: chargeState.totalCharges,
        nextAvailableAt: chargeState.nextChargeAvailableAt,
        isCharging: chargeState.nextChargeAvailableAt && chargeState.nextChargeAvailableAt > targetTime
      };
    } else if (type === 'instances' && cooldownManager.instancesTracker) {
      const instancesState = cooldownManager.instancesTracker.getInstancesState(abilityId, targetTime);
      return {
        available: instancesState.availableInstances,
        total: instancesState.totalInstances,
        nextAvailableAt: instancesState.nextInstanceAvailableAt,
        isCharging: instancesState.nextInstanceAvailableAt && instancesState.nextInstanceAvailableAt > targetTime
      };
    }

    return {
      available: 0,
      total: 1,
      nextAvailableAt: null,
      isCharging: false
    };
  }, [cooldownManager, abilityId, targetTime, type]);

  // Flash animation when count changes
  useEffect(() => {
    if (state.available !== lastCount) {
      setIsFlashing(true);
      setLastCount(state.available);
      
      const timer = setTimeout(() => {
        setIsFlashing(false);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [state.available, lastCount]);

  // Don't render if total is 1 or less (single charge/instance abilities)
  if (state.total <= 1) {
    return null;
  }

  // Render dots for visual representation
  const renderDots = () => {
    if (!showDots) return null;

    const dots = [];
    for (let i = 0; i < state.total; i++) {
      const isAvailable = i < state.available;
      const isCharging = state.isCharging && i === state.available;
      
      dots.push(
        <CounterDot
          key={i}
          $isAvailable={isAvailable}
          className={isCharging ? 'charging' : ''}
          title={isAvailable ? 'Available' : isCharging ? 'Charging' : 'On Cooldown'}
        />
      );
    }
    
    return <CounterDots>{dots}</CounterDots>;
  };

  // Get tooltip text
  const getTooltipText = () => {
    if (!showTooltip) return null;

    const typeLabel = type === 'charges' ? 'Charges' : 'Instances';
    let text = `${state.available}/${state.total} ${typeLabel}`;
    
    if (state.available === 0 && state.nextAvailableAt) {
      const timeUntilNext = state.nextAvailableAt - targetTime;
      if (timeUntilNext > 0) {
        text += ` - Next in ${Math.ceil(timeUntilNext)}s`;
      }
    }
    
    return text;
  };

  return (
    <CounterContainer
      $type={type}
      $available={state.available}
      className={`${isFlashing ? 'flash-update' : ''} ${className}`}
    >
      {renderDots()}
      
      {showText && (
        <CounterText>
          {state.available}/{state.total}
        </CounterText>
      )}

      {showTooltip && (
        <Tooltip>
          {getTooltipText()}
        </Tooltip>
      )}
    </CounterContainer>
  );
});

EnhancedChargeCounter.displayName = 'EnhancedChargeCounter';

export default EnhancedChargeCounter;
