import React from 'react';
import Tooltip from '../Tooltip/Tooltip';
import { useTheme } from '../../../contexts/ThemeContext';
import { formatHealth, formatPercentage, formatHealthCompact } from '../../../utils';

const HealthBar = ({
  label,
  maxHealth,
  currentHealth,
  damageAmount,
  barrierAmount = 0,
  isTankBuster = false,
  tankPosition = null,
  isDualTankBuster = false,
  applyBarrierFirst = false,
  mitigationPercentage = 0,
}) => {
  const { theme } = useTheme();
  const colors = theme.colors;

  const healthPercentage = Math.max(0, Math.min(100, (currentHealth / maxHealth) * 100));
  const barrierPercentage = Math.max(0, Math.min(100, (barrierAmount / maxHealth) * 100));

  const rawDamage = damageAmount || 0;
  const healthLost = applyBarrierFirst
    ? Math.max(0, (rawDamage - barrierAmount) * (1 - (mitigationPercentage || 0)))
    : rawDamage;

  const damagePercentage = Math.max(0, Math.min(100, (healthLost / maxHealth) * 100));
  const damageStartPercentage = Math.max(0, healthPercentage - damagePercentage);

  const damageToHealth = Math.max(0, damageAmount - barrierAmount);
  const remainingHealth = Math.max(0, currentHealth - damageToHealth);

  const tooltipContent = `
    Max Health: ${formatHealth(maxHealth)}
    Current Health: ${formatHealth(currentHealth)} (${formatPercentage(currentHealth / maxHealth)})
    Damage: ${formatHealth(damageAmount)} (${formatPercentage(damageAmount / maxHealth)})
    Barrier: ${formatHealth(barrierAmount)} (${formatPercentage(barrierAmount / maxHealth)})
    Remaining Health: ${formatHealth(remainingHealth)} (${formatPercentage(remainingHealth / maxHealth)})
  `;

  const enhancedTooltipContent = isDualTankBuster && tankPosition
    ? `${tooltipContent}\n\nThis is a dual-tank buster that hits both tanks simultaneously.`
    : tooltipContent;

  const barColor = healthPercentage > 70
    ? colors.success
    : healthPercentage > 40
      ? colors.warning
      : colors.error;

  const dualStyles = isDualTankBuster && tankPosition
    ? { borderLeftColor: tankPosition === 'mainTank' ? colors.primary : colors.secondary }
    : undefined;

  return (
    <Tooltip content={enhancedTooltipContent}>
      <div className={`flex flex-col basis-0 flex-1 min-w-40 w-full my-2 ${isDualTankBuster && tankPosition ? 'pl-2 rounded border-l-4' : ''}`} style={dualStyles}>
        <div className="flex justify-between items-center mb-1 text-xs tabular-nums min-w-0 overflow-hidden" style={{ color: colors.text, opacity: 0.7 }}>
          <span className="truncate">{label}</span>
          <span className="whitespace-nowrap">{formatHealthCompact(remainingHealth)} / {formatHealthCompact(maxHealth)}</span>
        </div>

        <div className="w-full h-4 rounded overflow-hidden relative bg-gray-200 dark:bg-gray-700">
          <div className="h-full transition-[width] duration-300" style={{ width: `${healthPercentage}%`, backgroundColor: barColor }} />

          {barrierAmount > 0 && (
            <div className="absolute top-0 h-full opacity-70 transition-all" style={{ left: `${healthPercentage}%`, width: `${barrierPercentage}%`, backgroundColor: colors.barrier || '#ffcc00' }} />
          )}

          {damageAmount > 0 && (
            <div className="absolute top-0 h-full transition-all" style={{ left: `${damageStartPercentage}%`, width: `${damagePercentage}%`, backgroundColor: 'rgba(255, 0, 0, 0.3)' }} />
          )}
        </div>
      </div>
    </Tooltip>
  );
};

export default HealthBar;
