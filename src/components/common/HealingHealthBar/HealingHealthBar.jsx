import React from 'react';
import Tooltip from '../Tooltip/Tooltip';
import { formatHealth, formatPercentage, formatHealthCompact } from '../../../utils';
import { cn } from '../../../lib/utils';

const HealingHealthBar = ({
  label,
  maxHealth,
  remainingHealth,
  healingAmount = 0,
  barrierAmount = 0,
  isTankBuster = false,
  tankPosition = null,
  isDualTankBuster = false,
}) => {
  const healthAfterHealing = Math.min(maxHealth, remainingHealth + healingAmount);

  const remainingHealthPercentage = Math.max(0, Math.min(100, (remainingHealth / maxHealth) * 100));
  const healingPercentage = Math.max(0, Math.min(100, (healingAmount / maxHealth) * 100));
  const healthAfterHealingPercentage = Math.max(0, Math.min(100, (healthAfterHealing / maxHealth) * 100));
  const barrierPercentage = Math.max(0, Math.min(100, (barrierAmount / maxHealth) * 100));

  const tooltipContent = `
    Max Health: ${formatHealth(maxHealth)}
    Health After Damage: ${formatHealth(remainingHealth)} (${formatPercentage(remainingHealth / maxHealth)})
    Healing Amount: ${formatHealth(healingAmount)} (${formatPercentage(healingAmount / maxHealth)})
    Health After Healing: ${formatHealth(healthAfterHealing)} (${formatPercentage(healthAfterHealing / maxHealth)})
    Barrier: ${formatHealth(barrierAmount)} (${formatPercentage(barrierAmount / maxHealth)})
  `;

  const enhancedTooltipContent = isDualTankBuster && tankPosition
    ? `${tooltipContent}\n\nThis shows healing recovery for a dual-tank buster.`
    : tooltipContent;

  const getBarColorClass = () => {
    if (remainingHealthPercentage > 70) return 'oklch(0.623 0.188 145.28)';
    if (remainingHealthPercentage > 40) return 'oklch(0.795 0.184 86.047)';
    return 'var(--color-destructive)';
  };

  return (
    <Tooltip content={enhancedTooltipContent}>
      <div
        className={cn(
            "flex flex-col basis-0 flex-1 min-w-40 w-full my-2",
            isDualTankBuster && tankPosition && "pl-2 rounded border-l-4",
            isDualTankBuster && tankPosition && (tankPosition === 'mainTank' ? "border-l-primary" : "border-l-secondary")
        )}
      >
        <div className="flex justify-between items-center mb-1 text-xs tabular-nums min-w-0 overflow-hidden text-foreground/70 dark:text-muted-foreground dark:opacity-70">
          <span className="truncate">{label}</span>
          <span className="whitespace-nowrap">&nbsp;{formatHealthCompact(healthAfterHealing)} / {formatHealthCompact(maxHealth)}</span>
        </div>

        <div className="w-full h-4 rounded overflow-hidden relative bg-[var(--color-muted)]">
          <div
            className="h-full transition-[width] duration-300"
            style={{ 
              width: `${remainingHealthPercentage}%`,
              backgroundColor: getBarColorClass()
            }}
          />

          {healingAmount > 0 && (
            <div
              className="absolute top-0 h-full opacity-80 transition-all"
              style={{
                left: `${remainingHealthPercentage}%`,
                width: `${healingPercentage}%`,
                backgroundColor: 'oklch(0.623 0.188 145.28)'
              }}
            />
          )}

          {barrierAmount > 0 && (
            <div
              className="absolute top-0 h-full opacity-70 transition-all"
              style={{
                left: `${healthAfterHealingPercentage}%`,
                width: `${barrierPercentage}%`,
                backgroundColor: 'oklch(0.795 0.184 86.047)'
              }}
            />
          )}
        </div>
      </div>
    </Tooltip>
  );
};

export default HealingHealthBar;
