import React, { memo, useMemo, useEffect, useState } from 'react';
import { useEnhancedMitigation } from '../../../contexts/EnhancedMitigationContext';
import { useTheme } from '../../../contexts/ThemeContext';

const EnhancedAetherflowGauge = memo(({ selectedBossAction, showRefreshButton = false, onRefreshClick = null }) => {
  const { theme } = useTheme();
  const colors = theme.colors;
  const { cooldownManager, selectedJobs, assignments } = useEnhancedMitigation();

  const [forceRefresh, setForceRefresh] = useState(0);
  useEffect(() => { setForceRefresh((p) => p + 1); }, [assignments]);

  const isScholarSelected = useMemo(() => {
    if (!selectedJobs) return false;
    if (selectedJobs['SCH']) return true;
    if (selectedJobs.healer && Array.isArray(selectedJobs.healer)) {
      if (typeof selectedJobs.healer[0] === 'string' && selectedJobs.healer.includes('SCH')) return true;
      if (typeof selectedJobs.healer[0] === 'object' && selectedJobs.healer.some(j => j && j.id === 'SCH' && j.selected)) return true;
    }
    return false;
  }, [selectedJobs]);

  const aetherflowState = useMemo(() => {
    if (!isScholarSelected || !selectedBossAction || !cooldownManager?.aetherflowTracker) {
      return { availableStacks: 0, totalStacks: 3, canRefresh: false, timeUntilRefresh: 0, lastRefreshTime: null };
    }
    return cooldownManager.aetherflowTracker.getAetherflowState(selectedBossAction.time);
  }, [isScholarSelected, selectedBossAction, cooldownManager, assignments, forceRefresh]);

  if (!isScholarSelected) return null;

  const renderStackIndicators = () => {
    const out = [];
    for (let i = 0; i < aetherflowState.totalStacks; i++) {
      const isAvailable = i < aetherflowState.availableStacks;
      const isOnCooldown = !isAvailable && i < (aetherflowState.totalStacks - aetherflowState.availableStacks);
      const bg = isAvailable ? '#2ecc40' : (isOnCooldown ? '#666' : (theme.mode === 'dark' ? '#333' : '#ddd'));
      const br = isAvailable ? '#27ae60' : colors.border;
      const glow = isAvailable ? '0 0 6px 2px rgba(46, 204, 64, 0.4)' : 'none';
      out.push(
        <div key={i} className="w-5 h-5 rounded-full transition-all relative" title={isAvailable ? 'Available' : isOnCooldown ? 'On Cooldown' : 'Empty'}
             style={{ backgroundColor: bg, border: `1.5px solid ${br}`, boxShadow: glow }} />
      );
    }
    return out;
  };

  return (
    <div className="flex flex-col items-center px-3 py-2 rounded border min-w-[120px]" style={{ backgroundColor: colors.backgroundSecondary, borderColor: colors.border }}>
      <div className="text-center font-semibold mb-1 text-xs" style={{ color: colors.text }}>Aetherflow</div>
      <div className="flex gap-1 mb-1">{renderStackIndicators()}</div>
      <div className="text-center font-semibold mb-1 text-xs" style={{ color: colors.text }}>{aetherflowState.availableStacks}/{aetherflowState.totalStacks} Stacks</div>
      {showRefreshButton && (
        <button
          onClick={onRefreshClick}
          disabled={!aetherflowState.canRefresh || aetherflowState.availableStacks === aetherflowState.totalStacks}
          className="rounded px-2 py-0.5 text-[10px] font-semibold transition-colors border disabled:opacity-60"
          style={{
            backgroundColor: aetherflowState.canRefresh && aetherflowState.availableStacks < aetherflowState.totalStacks ? colors.primary : colors.backgroundSecondary,
            color: aetherflowState.canRefresh && aetherflowState.availableStacks < aetherflowState.totalStacks ? colors.buttonText : colors.textSecondary,
            borderColor: aetherflowState.canRefresh && aetherflowState.availableStacks < aetherflowState.totalStacks ? colors.primary : colors.border,
            cursor: aetherflowState.canRefresh && aetherflowState.availableStacks < aetherflowState.totalStacks ? 'pointer' : 'not-allowed',
          }}
          title={aetherflowState.canRefresh ? 'Refresh Aetherflow stacks' : 'Aetherflow on cooldown'}
        >
          Refresh
        </button>
      )}
    </div>
  );
});

EnhancedAetherflowGauge.displayName = 'EnhancedAetherflowGauge';
export default EnhancedAetherflowGauge;
