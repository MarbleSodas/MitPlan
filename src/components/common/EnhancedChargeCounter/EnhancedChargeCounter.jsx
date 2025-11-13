import React, { memo, useMemo, useState, useEffect } from 'react';
import { useEnhancedMitigation } from '../../../contexts/EnhancedMitigationContext';

const EnhancedChargeCounter = memo(({
  abilityId,
  bossActionId = null,
  type = 'charges',
  showDots = true,
  showText = true,
  showTooltip = true,
  className = ''
}) => {
  const { cooldownManager, selectedBossAction } = useEnhancedMitigation();

  const [isFlashing, setIsFlashing] = useState(false);
  const [lastCount, setLastCount] = useState(0);

  const targetTime = useMemo(() => {
    if (bossActionId && cooldownManager?.bossActions) {
      const bossAction = cooldownManager.bossActions.find(action => action.id === bossActionId);
      return bossAction?.time || 0;
    }
    return selectedBossAction?.time || 0;
  }, [bossActionId, cooldownManager, selectedBossAction]);

  const state = useMemo(() => {
    if (!cooldownManager || !targetTime) {
      return { available: 0, total: 1, nextAvailableAt: null, isCharging: false };
    }

    if (type === 'charges' && cooldownManager.chargesTracker) {
      const s = cooldownManager.chargesTracker.getChargeState(abilityId, targetTime);
      return { available: s.availableCharges, total: s.totalCharges, nextAvailableAt: s.nextChargeAvailableAt, isCharging: s.nextChargeAvailableAt && s.nextChargeAvailableAt > targetTime };
    } else if (type === 'instances' && cooldownManager.instancesTracker) {
      const s = cooldownManager.instancesTracker.getInstancesState(abilityId, targetTime);
      return { available: s.availableInstances, total: s.totalInstances, nextAvailableAt: s.nextInstanceAvailableAt, isCharging: s.nextInstanceAvailableAt && s.nextInstanceAvailableAt > targetTime };
    }

    return { available: 0, total: 1, nextAvailableAt: null, isCharging: false };
  }, [cooldownManager, abilityId, targetTime, type]);

  useEffect(() => {
    if (state.available !== lastCount) {
      setIsFlashing(true);
      setLastCount(state.available);
      const t = setTimeout(() => setIsFlashing(false), 500);
      return () => clearTimeout(t);
    }
  }, [state.available, lastCount]);

  if (state.total <= 1) return null;

  const bgColor = (() => {
    if (type === 'charges') return state.available === 0 ? '#ff5555' : '#4CAF50';
    if (type === 'instances') return state.available === 0 ? '#ff5555' : '#2196F3';
    return '#666';
  })();

  const tooltipText = (() => {
    if (!showTooltip) return null;
    const typeLabel = type === 'charges' ? 'Charges' : 'Instances';
    let text = `${state.available}/${state.total} ${typeLabel}`;
    if (state.available === 0 && state.nextAvailableAt) {
      const dt = state.nextAvailableAt - targetTime;
      if (dt > 0) text += ` - Next in ${Math.ceil(dt)}s`;
    }
    return text;
  })();

  return (
    <div
      className={`group inline-flex items-center gap-1 px-1.5 py-[2px] rounded-xl text-white text-[10px] font-bold transition-all relative ${isFlashing ? 'animate-[flash]' : ''} ${className}`}
      style={{ backgroundColor: bgColor }}
      title={showTooltip ? tooltipText ?? undefined : undefined}
    >
      {showDots && (
        <div className="flex gap-0.5">
          {Array.from({ length: state.total }).map((_, i) => {
            const isAvailable = i < state.available;
            const isCharging = state.isCharging && i === state.available;
            return (
              <div
                key={i}
                className={`${isCharging ? 'animate-pulse' : ''} w-[6px] h-[6px] rounded-full ${isAvailable ? 'bg-white' : 'bg-white/30'}`}
                title={isAvailable ? 'Available' : isCharging ? 'Charging' : 'On Cooldown'}
              />
            );
          })}
        </div>
      )}

      {showText && (
        <span className="ml-0.5 text-[9px] opacity-90">{state.available}/{state.total}</span>
      )}
    </div>
  );
});

EnhancedChargeCounter.displayName = 'EnhancedChargeCounter';
export default EnhancedChargeCounter;
