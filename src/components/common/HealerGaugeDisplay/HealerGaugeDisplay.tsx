import React, { memo, useMemo, useEffect, useState } from 'react';
import { useEnhancedMitigation } from '../../../contexts/EnhancedMitigationContext';
import { useTheme } from '../../../contexts/ThemeContext';

const HealerGaugeDisplay = memo(({ selectedBossAction, className = "" }) => {
  const { isDarkMode } = useTheme();
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

  const isSageSelected = useMemo(() => {
    if (!selectedJobs) return false;
    if (selectedJobs['SGE']) return true;
    if (selectedJobs.healer && Array.isArray(selectedJobs.healer)) {
      if (typeof selectedJobs.healer[0] === 'string' && selectedJobs.healer.includes('SGE')) return true;
      if (typeof selectedJobs.healer[0] === 'object' && selectedJobs.healer.some(j => j && j.id === 'SGE' && j.selected)) return true;
    }
    return false;
  }, [selectedJobs]);

  const isWhiteMageSelected = useMemo(() => {
    if (!selectedJobs) return false;
    if (selectedJobs['WHM']) return true;
    if (selectedJobs.healer && Array.isArray(selectedJobs.healer)) {
      if (typeof selectedJobs.healer[0] === 'string' && selectedJobs.healer.includes('WHM')) return true;
      if (typeof selectedJobs.healer[0] === 'object' && selectedJobs.healer.some(j => j && j.id === 'WHM' && j.selected)) return true;
    }
    return false;
  }, [selectedJobs]);

  const aetherflowState = useMemo(() => {
    if (!isScholarSelected || !selectedBossAction || !cooldownManager?.aetherflowTracker) {
      return { availableStacks: 0, totalStacks: 3, canRefresh: false, timeUntilRefresh: 0, lastRefreshTime: null };
    }
    return cooldownManager.aetherflowTracker.getAetherflowState(selectedBossAction.time);
  }, [isScholarSelected, selectedBossAction, cooldownManager, assignments, forceRefresh]);

  const addersgallState = useMemo(() => {
    if (!isSageSelected || !selectedBossAction || !cooldownManager?.addersgallTracker) {
      return { availableStacks: 0, totalStacks: 3, canRefresh: false, timeUntilRefresh: 0, lastRefreshTime: null };
    }
    return cooldownManager.addersgallTracker.getAddersgallState(selectedBossAction.time);
  }, [isSageSelected, selectedBossAction, cooldownManager, assignments, forceRefresh]);

  const lilyState = useMemo(() => {
    if (!isWhiteMageSelected || !selectedBossAction || !cooldownManager?.lilyTracker) {
      return { availableLilies: 0, canGenerate: false, timeUntilNextLily: 0 };
    }
    return cooldownManager.lilyTracker.getLilyState(selectedBossAction.time);
  }, [isWhiteMageSelected, selectedBossAction, cooldownManager, assignments, forceRefresh]);

  const renderStackIndicators = (available, total, color) => {
    const out = [];
    for (let i = 0; i < total; i++) {
      const isAvailable = i < available;
      const bg = isAvailable ? color : (isDarkMode ? '#333' : '#ddd');
      const br = isAvailable ? color : 'var(--border)';
      const glow = isAvailable ? `0 0 6px 2px ${color}66` : 'none';
      out.push(
        <div 
          key={i} 
          className="w-4 h-4 rounded-full transition-all relative" 
          title={isAvailable ? 'Available' : 'Empty'}
          style={{ backgroundColor: bg, border: `1.5px solid ${br}`, boxShadow: glow }}
        />
      );
    }
    return out;
  };

  const hasAnyHealerSelected = isScholarSelected || isSageSelected || isWhiteMageSelected;
  if (!hasAnyHealerSelected) return null;

  return (
    <div className={`flex flex-col items-center px-2 py-1.5 rounded border min-w-[120px] bg-card/50 backdrop-blur-sm border-border ${className}`}>
      <div className="text-center font-bold mb-1.5 text-xs uppercase tracking-wider text-muted-foreground">Gauges</div>
      
      <div className="flex flex-col gap-2 w-full">
        {isScholarSelected && (
          <div className="flex flex-col items-center">
            <div className="text-xs text-muted-foreground mb-1">Aetherflow (SCH)</div>
            <div className="flex gap-1 mb-1">{renderStackIndicators(aetherflowState.availableStacks, aetherflowState.totalStacks, '#9b59b6')}</div>
            <div className="text-xs text-foreground">{aetherflowState.availableStacks}/{aetherflowState.totalStacks}</div>
          </div>
        )}

        {isSageSelected && (
          <div className="flex flex-col items-center">
            <div className="text-xs text-muted-foreground mb-1">Addersgall (SGE)</div>
            <div className="flex gap-1 mb-1">{renderStackIndicators(addersgallState.availableStacks, addersgallState.totalStacks, '#27ae60')}</div>
            <div className="text-xs text-foreground">{addersgallState.availableStacks}/{addersgallState.totalStacks}</div>
          </div>
        )}

        {isWhiteMageSelected && (
          <div className="flex flex-col items-center">
            <div className="text-xs text-muted-foreground mb-1">Lilies (WHM)</div>
            <div className="flex gap-1 mb-1">{renderStackIndicators(lilyState.availableLilies, 3, '#f1c40f')}</div>
            <div className="text-xs text-foreground mb-1">{lilyState.availableLilies}/3 Lilies</div>
          </div>
        )}
      </div>
    </div>
  );
});

HealerGaugeDisplay.displayName = 'HealerGaugeDisplay';
export default HealerGaugeDisplay;
