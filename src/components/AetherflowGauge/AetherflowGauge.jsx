import React from 'react';
import styled from 'styled-components';
import { useAetherflowContext } from '../../contexts/AetherflowContext';
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
  gap: 6px;
  margin-top: 4px;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    gap: 4px;
    margin-top: 2px;
  }
`;

// Individual stack indicator
const StackIndicator = styled.div`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: ${props => props.$active ? '#2ecc40' : props.theme.mode === 'dark' ? '#333' : '#ddd'}; /* Green for active */
  border: 1.5px solid ${props => props.$active ? '#27ae60' : props.theme.colors.border}; /* Darker green border */
  transition: all 0.3s ease;
  box-shadow: ${props => props.$active ? '0 0 6px 2px rgba(46, 204, 64, 0.4)' : 'none'}; /* Green glow */

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    width: 16px;
    height: 16px;
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
 *
 * @returns {JSX.Element} - Rendered component
 */
const AetherflowGauge = () => {
  const {
    aetherflowStacks,
    lastAetherflowTime,
    isScholarSelected,
    aetherflowAbility
  } = useAetherflowContext();

  // If Scholar is not selected, don't render the gauge
  if (!isScholarSelected) {
    return null;
  }

  console.log(`[AetherflowGauge] Rendering gauge with ${aetherflowStacks} stacks`);

  // Create tooltip content
  const tooltipContent = `
    Aetherflow Stacks: ${aetherflowStacks}/3

    Aetherflow is a Scholar resource that allows the use of powerful healing and utility abilities.
    Each stack is consumed when using abilities like Sacred Soil, Lustrate, Indomitability, Excogitation, or Energy Drain.
    Stacks are refreshed to 3/3 when using the Aetherflow ability (60s cooldown).
  `;

  return (
    <Tooltip content={tooltipContent}>
      <GaugeContainer>
        <GaugeTitle>
          <GaugeIcon>
            <img
              src={aetherflowAbility?.icon || '/abilities-gamerescape/aetherflow.png'}
              alt="Aetherflow"
            />
          </GaugeIcon>
          <span>Aetherflow</span>
        </GaugeTitle>

        <StacksContainer>
          {[...Array(3)].map((_, index) => (
            <StackIndicator
              key={index}
              $active={index < aetherflowStacks}
            />
          ))}
        </StacksContainer>
      </GaugeContainer>
    </Tooltip>
  );
};

export default AetherflowGauge;