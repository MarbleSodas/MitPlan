import { useEffect, useState } from 'react';
import { useEnhancedMitigation } from '../../contexts/EnhancedMitigationContext';
import { useTheme } from '../../contexts/ThemeContext';
import Tooltip from '../common/Tooltip/Tooltip';

const AetherflowGauge = ({ selectedBossAction }) => {
  const { isDarkMode } = useTheme();
  const { cooldownManager, selectedJobs, assignments } = useEnhancedMitigation();

  const [forceRefresh, setForceRefresh] = useState(0);
  useEffect(() => { setForceRefresh((p) => p + 1); }, [assignments]);

  const isScholarSelected = selectedJobs && (
    selectedJobs['SCH'] || (
      selectedJobs.healer && Array.isArray(selectedJobs.healer) && (
        (typeof selectedJobs.healer[0] === 'string' && selectedJobs.healer.includes('SCH')) ||
        (typeof selectedJobs.healer[0] === 'object' && selectedJobs.healer.some(j => j && j.id === 'SCH' && j.selected))
      )
    )
  );

  const aetherflowState = cooldownManager?.aetherflowTracker?.getAetherflowState(selectedBossAction?.time || 0) || {
    availableStacks: 0,
    totalStacks: 3,
    canRefresh: false,
    timeUntilRefresh: 0,
  };

  if (!isScholarSelected || !cooldownManager?.aetherflowTracker || !selectedBossAction) return null;

  const tooltipContent = `
    Aetherflow Stacks: ${aetherflowState.availableStacks}/${aetherflowState.totalStacks}

    Aetherflow automatically refreshes to 3/3 stacks every 60 seconds.
    Each stack is consumed when using abilities like Sacred Soil, Lustrate, Indomitability, Excogitation, or Energy Drain.
    You can also manually refresh using the Aetherflow ability.
  `;

  return (
    <Tooltip content={tooltipContent}>
      <div className="flex flex-col items-center my-2 p-2 rounded border w-full max-w-[300px] transition-all bg-white/70 dark:bg-black/30 border-[var(--color-border)]">
        <div className="flex items-center gap-2 mb-2 font-bold text-[var(--color-text)]">
          <div className="flex items-center justify-center">
            <img src="/abilities-gamerescape/aetherflow.png" alt="Aetherflow" style={{ width: 24, height: 24 }} />
          </div>
          <span>Aetherflow</span>
        </div>

        <div className="flex gap-2 mt-1">
          {[...Array(aetherflowState.totalStacks)].map((_, index) => {
            const active = index < aetherflowState.availableStacks;
            const bg = active ? '#2ecc40' : (isDarkMode ? '#333' : '#ddd');
            const br = active ? '#27ae60' : 'var(--color-border)';
            const glow = active ? '0 0 8px 3px rgba(46, 204, 64, 0.4)' : 'none';
            return <div key={index} className="w-7 h-7 rounded-full transition-all" style={{ backgroundColor: bg, border: `2px solid ${br}`, boxShadow: glow }} />
          })}
        </div>
      </div>
    </Tooltip>
  );
};

export default AetherflowGauge;