import React from 'react';
import Tooltip from '../Tooltip/Tooltip';
import { formatHealth, formatPercentage, formatHealthCompact } from '../../../utils';

const HEALTH_COLORS = {
  success: 'oklch(0.623 0.188 145.28)',
  warning: 'oklch(0.795 0.184 86.047)',
  error: 'var(--color-destructive)',
  barrier: 'oklch(0.795 0.184 86.047)',
};

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
    ? HEALTH_COLORS.success
    : healthPercentage > 40
      ? HEALTH_COLORS.warning
      : HEALTH_COLORS.error;

  const dualBorderClass = isDualTankBuster && tankPosition
    ? tankPosition === 'mainTank' 
      ? 'border-l-primary' 
      : 'border-l-secondary'
    : '';

  return (
    <Tooltip content={enhancedTooltipContent}>
      <div className={`flex flex-col basis-0 flex-1 min-w-40 w-full my-2 ${isDualTankBuster && tankPosition ? `pl-2 rounded border-l-4 ${dualBorderClass}` : ''}`}>
        <div className="flex justify-between items-center mb-1 text-xs tabular-nums min-w-0 overflow-hidden text-foreground/70 dark:text-[var(--color-muted-foreground)] dark:opacity-70">
          <span className="truncate">{label}</span>
          <span className="whitespace-nowrap">{formatHealthCompact(remainingHealth)} / {formatHealthCompact(maxHealth)}</span>
        </div>

        <div className="w-full h-4 rounded overflow-hidden relative bg-[var(--color-muted)]">
          <div className="h-full transition-[width] duration-300" style={{ width: `${healthPercentage}%`, backgroundColor: barColor }} />

          {barrierAmount > 0 && (
            <div className="absolute top-0 h-full opacity-70 transition-all" style={{ left: `${healthPercentage}%`, width: `${barrierPercentage}%`, backgroundColor: HEALTH_COLORS.barrier }} />
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
