import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useEnhancedMitigation } from '../../contexts/EnhancedMitigationContext';
import Tooltip from '../common/Tooltip/Tooltip';

// Container for the entire gauge
const GaugeContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 10px 0;
  padding: 8px;
  background-color: ${props => props.theme.mode === 'dark' ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.7)'};
  border-radius: ${props => props.theme.borderRadius.medium};
  border: 1px solid ${props => props.theme.colors.border};
  box-shadow: ${props => props.theme.shadows.small};
  width: 100%;
  max-width: 300px;
  transition: all 0.3s ease;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: 6px;
    margin: 8px 0;
    max-width: 250px;
  }
`;

// Title for the gauge
const GaugeTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-weight: bold;
  color: ${props => props.theme.colors.text};
  font-size: ${props => props.theme.fontSizes.medium};

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: ${props => props.theme.fontSizes.small};
    gap: 6px;
    margin-bottom: 6px;
  }
`;

// Icon for the gauge
const GaugeIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;

  img {
    width: 24px;
    height: 24px;

    @media (max-width: ${props => props.theme.breakpoints.mobile}) {
      width: 20px;
      height: 20px;
    }
  }
`;

// Container for the stack indicators
const StacksContainer = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 6px;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    gap: 6px;
    margin-top: 4px;
  }
`;

// Individual stack indicator
const StackIndicator = styled.div`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background-color: ${props => props.$active ? '#2ecc40' : props.theme.mode === 'dark' ? '#333' : '#ddd'}; /* Green for active */
  border: 2px solid ${props => props.$active ? '#27ae60' : props.theme.colors.border}; /* Darker green border */
  transition: all 0.3s ease;
  box-shadow: ${props => props.$active ? '0 0 8px 3px rgba(46, 204, 64, 0.4)' : 'none'}; /* Green glow */

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    width: 22px;
    height: 22px;
  }
`;

// Cooldown text
const CooldownText = styled.div`
  font-size: ${props => props.theme.fontSizes.small};
  color: ${props => props.theme.colors.text};
  margin-top: 4px;
  opacity: 0.8;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: ${props => props.theme.fontSizes.xsmall};
    margin-top: 2px;
  }
`;

/**
 * AetherflowGauge component for displaying Scholar's Aetherflow stacks
 * Now uses the Enhanced Mitigation System for improved accuracy
 *
 * @returns {JSX.Element} - Rendered component
 */
const AetherflowGauge = ({ selectedBossAction }) => {
  const {
    cooldownManager,
    selectedJobs,
    assignments
  } = useEnhancedMitigation();

  // Force refresh state to trigger re-renders when assignments change
  const [forceRefresh, setForceRefresh] = useState(0);

  // Force refresh when assignments change
  useEffect(() => {
    setForceRefresh(prev => prev + 1);
  }, [assignments]);

  // Check if Scholar is selected (handle both legacy and optimized formats)
  const isScholarSelected = selectedJobs && (
    selectedJobs['SCH'] || // Direct format
    (selectedJobs.healer && Array.isArray(selectedJobs.healer)) && (
      // Optimized format: ["SCH", "WHM"]
      (typeof selectedJobs.healer[0] === 'string' && selectedJobs.healer.includes('SCH')) ||
      // Legacy format: [{ id: "SCH", selected: true }]
      (typeof selectedJobs.healer[0] === 'object' &&
       selectedJobs.healer.some(job => job && job.id === 'SCH' && job.selected))
    )
  );

  // Get Aetherflow state from enhanced system
  const aetherflowState = cooldownManager?.aetherflowTracker?.getAetherflowState(
    selectedBossAction?.time || 0
  ) || {
    availableStacks: 0,
    totalStacks: 3,
    canRefresh: false,
    timeUntilRefresh: 0
  };

  // If Scholar is not selected, don't render the gauge
  if (!isScholarSelected) {
    return null;
  }

  // If cooldown manager isn't ready, don't render yet
  if (!cooldownManager || !cooldownManager.aetherflowTracker) {
    return null;
  }

  // If no boss action is selected, don't render
  if (!selectedBossAction) {
    return null;
  }

  console.log(`[AetherflowGauge] Rendering gauge with ${aetherflowState.availableStacks} stacks`);



  // Create tooltip content
  const tooltipContent = `
    Aetherflow Stacks: ${aetherflowState.availableStacks}/${aetherflowState.totalStacks}

    Aetherflow automatically refreshes to 3/3 stacks every 60 seconds.
    Each stack is consumed when using abilities like Sacred Soil, Lustrate, Indomitability, Excogitation, or Energy Drain.
    You can also manually refresh using the Aetherflow ability.
  `;

  return (
    <Tooltip content={tooltipContent}>
      <GaugeContainer>
        <GaugeTitle>
          <GaugeIcon>
            <img
              src="/abilities-gamerescape/aetherflow.png"
              alt="Aetherflow"
            />
          </GaugeIcon>
          <span>Aetherflow</span>
        </GaugeTitle>

        <StacksContainer>
          {[...Array(aetherflowState.totalStacks)].map((_, index) => (
            <StackIndicator
              key={index}
              $active={index < aetherflowState.availableStacks}
            />
          ))}
        </StacksContainer>
      </GaugeContainer>
    </Tooltip>
  );
};

export default AetherflowGauge;