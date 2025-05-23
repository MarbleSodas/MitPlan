import React from 'react';
import styled from 'styled-components';
import Tooltip from '../Tooltip/Tooltip';
import { formatMitigation, generateMitigationBreakdown, calculateTotalMitigation } from '../../../utils';

// Container for the tank mitigation display
const MitigationDisplayContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
  margin-bottom: 12px;
`;

// Container for each tank's mitigation display
const TankMitigationContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

// Tank position label
const TankPositionLabel = styled.div`
  font-weight: bold;
  font-size: ${props => props.theme.fontSizes.responsive.medium};
  min-width: 120px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: ${props => props.theme.fontSizes.responsive.small};
    min-width: 100px;
  }
`;

// Mitigation percentage display with shield icon
const MitigationPercentage = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background-color: ${props => props.theme.mode === 'dark' ? 'rgba(51, 153, 255, 0.2)' : 'rgba(51, 153, 255, 0.1)'};
  color: ${props => props.theme.colors.text};
  font-weight: bold;
  font-size: ${props => props.theme.fontSizes.responsive.medium};
  padding: 6px 10px;
  border-radius: ${props => props.theme.borderRadius.responsive.small};
  border: 1px solid ${props => props.theme.mode === 'dark' ? 'rgba(51, 153, 255, 0.3)' : 'rgba(51, 153, 255, 0.2)'};
  user-select: none; /* Prevent text selection */
  min-height: 36px; /* Ensure minimum touch target size */
  flex: 1;

  &::before {
    content: '🛡️';
    margin-right: 6px;
  }

  /* Tablet styles */
  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    font-size: ${props => props.theme.fontSizes.responsive.medium};
    padding: 6px 10px;
    min-height: 34px;
  }

  /* Mobile styles */
  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: ${props => props.theme.fontSizes.responsive.small};
    padding: 5px 8px;
    min-height: 32px;
  }

  /* Small mobile styles */
  @media (max-width: ${props => props.theme.breakpoints.smallMobile}) {
    font-size: ${props => props.theme.fontSizes.small};
    padding: 4px 6px;
    min-height: 30px;
  }
`;

/**
 * Component to display tank-specific mitigation percentages for dual tank busters
 *
 * @param {Object} props - Component props
 * @param {Array} props.mainTankMitigations - Array of mitigation abilities applied to the main tank
 * @param {Array} props.offTankMitigations - Array of mitigation abilities applied to the off tank
 * @param {string} props.damageType - The type of damage ('magical', 'physical', or 'both')
 * @param {number} props.bossLevel - The level of the boss
 * @param {string} props.mainTankJob - The job of the main tank (or 'N/A' if none selected)
 * @param {string} props.offTankJob - The job of the off tank (or 'N/A' if none selected)
 * @returns {JSX.Element} - The rendered component
 */
const TankMitigationDisplay = ({
  mainTankMitigations,
  offTankMitigations,
  damageType,
  bossLevel,
  mainTankJob,
  offTankJob
}) => {
  return (
    <MitigationDisplayContainer>
      {/* Main Tank Mitigation */}
      <TankMitigationContainer>
        <TankPositionLabel>Main Tank{mainTankJob ? ` (${mainTankJob})` : ''}:</TankPositionLabel>
        <Tooltip
          content={generateMitigationBreakdown(mainTankMitigations, damageType, bossLevel)}
        >
          <MitigationPercentage>
            {formatMitigation(mainTankMitigations.length > 0 ?
              calculateTotalMitigation(mainTankMitigations, damageType, bossLevel) : 0)}
          </MitigationPercentage>
        </Tooltip>
      </TankMitigationContainer>

      {/* Off Tank Mitigation */}
      <TankMitigationContainer>
        <TankPositionLabel>Off Tank{offTankJob ? ` (${offTankJob})` : ''}:</TankPositionLabel>
        <Tooltip
          content={generateMitigationBreakdown(offTankMitigations, damageType, bossLevel)}
        >
          <MitigationPercentage>
            {formatMitigation(offTankMitigations.length > 0 ?
              calculateTotalMitigation(offTankMitigations, damageType, bossLevel) : 0)}
          </MitigationPercentage>
        </Tooltip>
      </TankMitigationContainer>
    </MitigationDisplayContainer>
  );
};

export default TankMitigationDisplay;
