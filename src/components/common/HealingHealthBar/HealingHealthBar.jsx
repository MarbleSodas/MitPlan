import React from 'react';
import styled from 'styled-components';
import Tooltip from '../Tooltip/Tooltip';
import { formatHealth, formatPercentage } from '../../../utils';

// Container for the entire healing health bar component
const HealingHealthBarContainer = styled.div`
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

// Label for the healing health bar
const HealingHealthBarLabel = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
  font-size: ${props => props.theme.fontSizes.small};
  color: ${props => props.theme.colors.text};
`;

// Outer container for the healing health bar
const HealingHealthBarOuter = styled.div`
  width: 100%;
  height: 16px;
  background-color: ${props => props.theme.mode === 'dark' ? '#333' : '#e0e0e0'};
  border-radius: ${props => props.theme.borderRadius.small};
  overflow: hidden;
  position: relative;
`;

// Health bar fill (remaining health after damage)
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

// Healing overlay on health bar (shows healing recovery)
const HealingOverlay = styled.div`
  position: absolute;
  top: 0;
  left: ${props => props.$healthPercentage}%;
  height: 100%;
  width: ${props => props.$healingPercentage}%;
  background-color: ${props => props.theme.colors.healing || '#00ff88'};
  opacity: 0.8;
  transition: all 0.3s ease;
`;

// Barrier overlay on health bar (if any barriers remain after healing)
const BarrierOverlay = styled.div`
  position: absolute;
  top: 0;
  left: ${props => props.$healthAfterHealingPercentage}%;
  height: 100%;
  width: ${props => props.$barrierPercentage}%;
  background-color: ${props => props.theme.colors.barrier || '#ffcc00'};
  opacity: 0.7;
  transition: all 0.3s ease;
`;

/**
 * HealingHealthBar component for displaying health recovery after damage
 *
 * @param {Object} props - Component props
 * @param {string} props.label - Label for the healing health bar
 * @param {number} props.maxHealth - Maximum health value
 * @param {number} props.remainingHealth - Health remaining after damage
 * @param {number} props.healingAmount - Amount of healing to display
 * @param {number} props.barrierAmount - Amount of barrier to display (optional)
 * @param {boolean} props.isTankBuster - Whether this is a tank buster health bar
 * @param {string} props.tankPosition - Tank position (mainTank, offTank, or null)
 * @param {boolean} props.isDualTankBuster - Whether this is a dual tank buster health bar
 * @returns {JSX.Element} - Rendered component
 */
const HealingHealthBar = ({
  label,
  maxHealth,
  remainingHealth,
  healingAmount = 0,
  barrierAmount = 0,
  isTankBuster = false,
  tankPosition = null,
  isDualTankBuster = false
}) => {
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

  // Add dual tank buster indicator to the tooltip content if applicable
  const enhancedTooltipContent = isDualTankBuster && tankPosition
    ? `${tooltipContent}\n\nThis shows healing recovery for a dual-tank buster.`
    : tooltipContent;

  return (
    <Tooltip content={enhancedTooltipContent}>
      <HealingHealthBarContainer $isDualTankBuster={isDualTankBuster} $tankPosition={tankPosition}>
        <HealingHealthBarLabel>
          <span>{label}</span>
          <span>{formatHealth(healthAfterHealing)} / {formatHealth(maxHealth)}</span>
        </HealingHealthBarLabel>
        <HealingHealthBarOuter>
          <HealthBarFill $percentage={remainingHealthPercentage} />
          {healingAmount > 0 && (
            <HealingOverlay
              $healthPercentage={remainingHealthPercentage}
              $healingPercentage={healingPercentage}
            />
          )}
          {barrierAmount > 0 && (
            <BarrierOverlay
              $healthAfterHealingPercentage={healthAfterHealingPercentage}
              $barrierPercentage={barrierPercentage}
            />
          )}
        </HealingHealthBarOuter>
      </HealingHealthBarContainer>
    </Tooltip>
  );
};

export default HealingHealthBar;
