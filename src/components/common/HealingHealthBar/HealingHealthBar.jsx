import React from 'react';
import Tooltip from '../Tooltip/Tooltip';
import { useTheme } from '../../../contexts/ThemeContext';
import { formatHealth, formatPercentage, formatHealthCompact } from '../../../utils';

/**
 * HealingHealthBar component for displaying health recovery after damage
 */
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
  const { theme } = useTheme();
  const colors = theme.colors;

  // Calculate health after healing (capped at max health)
  const healthAfterHealing = Math.min(maxHealth, remainingHealth + healingAmount);

  // Calculate percentages for display
  const remainingHealthPercentage = Math.max(0, Math.min(100, (remainingHealth / maxHealth) * 100));
  const healingPercentage = Math.max(0, Math.min(100, (healingAmount / maxHealth) * 100));
  const healthAfterHealingPercentage = Math.max(0, Math.min(100, (healthAfterHealing / maxHealth) * 100));
  const barrierPercentage = Math.max(0, Math.min(100, (barrierAmount / maxHealth) * 100));

  // Create tooltip content
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

  const barColor = remainingHealthPercentage > 70
    ? colors.success
    : remainingHealthPercentage > 40
      ? colors.warning
      : colors.error;

  const dualBusterStyles = isDualTankBuster && tankPosition
    ? {
        borderLeftColor: tankPosition === 'mainTank' ? colors.primary : colors.secondary,
      }
    : undefined;

  return (
    <Tooltip content={enhancedTooltipContent}>
      <div
        className={`flex flex-col basis-0 flex-1 min-w-40 w-full my-2 ${isDualTankBuster && tankPosition ? 'pl-2 rounded border-l-4' : ''}`}
        style={dualBusterStyles}
      >
        <div className="flex justify-between items-center mb-1 text-xs tabular-nums min-w-0 overflow-hidden" style={{ color: colors.text, opacity: 0.7 }}>
          <span className="truncate">{label}</span>
          <span className="whitespace-nowrap">&nbsp;{formatHealthCompact(healthAfterHealing)} / {formatHealthCompact(maxHealth)}</span>
        </div>

        <div className="w-full h-4 rounded overflow-hidden relative bg-gray-200 dark:bg-gray-700">
          <div
            className="h-full transition-[width] duration-300"
            style={{ width: `${remainingHealthPercentage}%`, backgroundColor: barColor }}
          />

          {healingAmount > 0 && (
            <div
              className="absolute top-0 h-full opacity-80 transition-all"
              style={{
                left: `${remainingHealthPercentage}%`,
                width: `${healingPercentage}%`,
                backgroundColor: colors.healing || '#00ff88',
              }}
            />
          )}

          {barrierAmount > 0 && (
            <div
              className="absolute top-0 h-full opacity-70 transition-all"
              style={{
                left: `${healthAfterHealingPercentage}%`,
                width: `${barrierPercentage}%`,
                backgroundColor: colors.barrier || '#ffcc00',
              }}
            />
          )}
        </div>
      </div>
    </Tooltip>
  );
};

export default HealingHealthBar;
