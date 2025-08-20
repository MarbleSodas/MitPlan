import React from 'react';
import styled from 'styled-components';
import Tooltip from '../Tooltip/Tooltip';
import { formatHealth, formatPercentage } from '../../../utils';

// Container for the entire health bar component
const HealthBarContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  margin: 8px 0;
  ${props => props.$isDualTankBuster && props.$tankPosition && `
    border-left: 3px solid ${props.$tankPosition === 'mainTank' ? props.theme.colors.primary : props.theme.colors.secondary};
    padding-left: 8px;
    border-radius: 4px;
  `}
`;

// Label for the health bar
const HealthBarLabel = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
  font-size: ${props => props.theme.fontSizes.small};
  color: ${props => props.theme.colors.text};
`;

// Outer container for the health bar
const HealthBarOuter = styled.div`
  width: 100%;
  height: 16px;
  background-color: ${props => props.theme.mode === 'dark' ? '#333' : '#e0e0e0'};
  border-radius: ${props => props.theme.borderRadius.small};
  overflow: hidden;
  position: relative;
`;

// Health bar fill
const HealthBarFill = styled.div`
  height: 100%;
  width: ${props => props.$percentage}%;
  background-color: ${props => {
    // Color based on health percentage
    if (props.$percentage > 70) return props.theme.colors.success;
    if (props.$percentage > 40) return props.theme.colors.warning;
    return props.theme.colors.error;
  }};
  transition: width 0.3s ease;
`;

// Barrier overlay on health bar
const BarrierOverlay = styled.div`
  position: absolute;
  top: 0;
  left: ${props => props.$healthPercentage}%;
  height: 100%;
  width: ${props => props.$barrierPercentage}%;
  background-color: ${props => props.theme.colors.barrier || '#ffcc00'};
  opacity: 0.7;
  transition: all 0.3s ease;
`;

// Damage indicator overlay
const DamageOverlay = styled.div`
  position: absolute;
  top: 0;
  left: ${props => props.$startPercentage}%;
  height: 100%;
  width: ${props => props.$damagePercentage}%;
  background-color: rgba(255, 0, 0, 0.3);
  transition: all 0.3s ease;
`;

/**
 * HealthBar component for displaying health and damage
 *
 * @param {Object} props - Component props
 * @param {string} props.label - Label for the health bar
 * @param {number} props.maxHealth - Maximum health value
 * @param {number} props.currentHealth - Current health value
 * @param {number} props.damageAmount - Amount of damage to display
 * @param {number} props.barrierAmount - Amount of barrier to display (optional)
 * @param {boolean} props.isTankBuster - Whether this is a tank buster health bar
 * @param {string} props.tankPosition - Tank position (mainTank, offTank, or null)
 * @param {boolean} props.isDualTankBuster - Whether this is a dual tank buster health bar
 * @returns {JSX.Element} - Rendered component
 */
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
  mitigationPercentage = 0
}) => {
  // Calculate percentages for display
  const healthPercentage = Math.max(0, Math.min(100, (currentHealth / maxHealth) * 100));
  const barrierPercentage = Math.max(0, Math.min(100, (barrierAmount / maxHealth) * 100));

  // Determine damage to health depending on calculation mode
  const rawDamage = damageAmount || 0;
  const healthLost = applyBarrierFirst
    ? Math.max(0, (rawDamage - barrierAmount) * (1 - (mitigationPercentage || 0)))
    : rawDamage; // legacy mode expects already-mitigated damage passed in

  const damagePercentage = Math.max(0, Math.min(100, (healthLost / maxHealth) * 100));

  // Calculate where damage overlay should start
  const damageStartPercentage = Math.max(0, healthPercentage - damagePercentage);

  // Calculate remaining health after damage (considering barriers)
  const damageToHealth = Math.max(0, damageAmount - barrierAmount);
  const remainingHealth = Math.max(0, currentHealth - damageToHealth);
  const remainingPercentage = (remainingHealth / maxHealth) * 100;

  // Create tooltip content
  const tooltipContent = `
    Max Health: ${formatHealth(maxHealth)}
    Current Health: ${formatHealth(currentHealth)} (${formatPercentage(currentHealth / maxHealth)})
    Damage: ${formatHealth(damageAmount)} (${formatPercentage(damageAmount / maxHealth)})
    Barrier: ${formatHealth(barrierAmount)} (${formatPercentage(barrierAmount / maxHealth)})
    Remaining Health: ${formatHealth(remainingHealth)} (${formatPercentage(remainingHealth / maxHealth)})
  `;

  // Add dual tank buster indicator to the tooltip content if applicable
  const enhancedTooltipContent = isDualTankBuster && tankPosition
    ? `${tooltipContent}\n\nThis is a dual-tank buster that hits both tanks simultaneously.`
    : tooltipContent;

  return (
    <Tooltip content={enhancedTooltipContent}>
      <HealthBarContainer $isDualTankBuster={isDualTankBuster} $tankPosition={tankPosition}>
        <HealthBarLabel>
          <span>{label}</span>
          <span>{formatHealth(remainingHealth)} / {formatHealth(maxHealth)}</span>
        </HealthBarLabel>
        <HealthBarOuter>
          <HealthBarFill $percentage={healthPercentage} />
          {barrierAmount > 0 && (
            <BarrierOverlay
              $healthPercentage={healthPercentage}
              $barrierPercentage={barrierPercentage}
            />
          )}
          {damageAmount > 0 && (
            <DamageOverlay
              $startPercentage={damageStartPercentage}
              $damagePercentage={damagePercentage}
            />
          )}
        </HealthBarOuter>
      </HealthBarContainer>
    </Tooltip>
  );
};

export default HealthBar;
