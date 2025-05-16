import React from 'react';
import styled from 'styled-components';
import { useTankPositionContext } from '../../contexts/TankPositionContext';

const Container = styled.div`
  background-color: ${props => props.theme.colors.secondary};
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 20px;
  box-shadow: ${props => props.theme.shadows.medium};
  transition: background-color 0.3s ease;
`;

const Title = styled.h3`
  margin-top: 0;
  margin-bottom: 15px;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  padding-bottom: 10px;
  color: ${props => props.theme.colors.text};
`;

const TankPositionsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
  margin-top: 10px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const TankPositionCard = styled.div`
  background-color: ${props => props.theme.colors.cardBackground};
  border-radius: ${props => props.theme.borderRadius.medium};
  padding: 15px;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: ${props => props.theme.shadows.small};
`;

const PositionTitle = styled.h4`
  margin-top: 0;
  margin-bottom: 10px;
  color: ${props => props.theme.colors.text};
  text-align: center;
`;

const TankSelection = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  width: 100%;
`;

const TankOption = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px;
  border-radius: ${props => props.theme.borderRadius.small};
  background-color: ${props => props.$isSelected ? props.theme.colors.primary : props.theme.colors.background};
  cursor: pointer;
  opacity: ${props => props.$isDisabled ? 0.5 : 1};
  transition: all 0.2s ease;
  width: 80px;

  &:hover {
    background-color: ${props => !props.$isDisabled && (props.$isSelected ? props.theme.colors.primary : props.theme.colors.hover)};
  }
`;

const TankIcon = styled.div`
  width: 48px;
  height: 48px;
  margin-bottom: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const TankName = styled.div`
  font-size: ${props => props.theme.fontSizes.small};
  color: ${props => props.$isSelected ? props.theme.colors.buttonText : props.theme.colors.text};
  text-align: center;
`;

const EmptyState = styled.div`
  padding: 20px;
  text-align: center;
  color: ${props => props.theme.colors.textSecondary};
  font-style: italic;
`;

/**
 * Component for selecting tank positions (MT/OT)
 */
const TankPositionSelector = () => {
  const {
    tankPositions,
    assignTankPosition,
    selectedTankJobs
  } = useTankPositionContext();

  // If no tanks are selected, show a message
  if (selectedTankJobs.length === 0) {
    return (
      <Container>
        <Title>Tank Positions</Title>
        <EmptyState>
          Select at least one tank job to assign tank positions.
        </EmptyState>
      </Container>
    );
  }

  return (
    <Container>
      <Title>Tank Positions</Title>
      
      <TankPositionsGrid>
        {/* Main Tank Position */}
        <TankPositionCard>
          <PositionTitle>Main Tank (MT)</PositionTitle>
          <TankSelection>
            {selectedTankJobs.map(tank => (
              <TankOption
                key={`mt-${tank.id}`}
                $isSelected={tankPositions.mainTank === tank.id}
                $isDisabled={tankPositions.offTank === tank.id}
                onClick={() => assignTankPosition(tank.id, 'mainTank')}
              >
                <TankIcon>
                  {typeof tank.icon === 'string' && tank.icon.startsWith('/') ? (
                    <img src={tank.icon} alt={tank.name} style={{ maxHeight: '48px', maxWidth: '48px' }} />
                  ) : (
                    tank.icon
                  )}
                </TankIcon>
                <TankName $isSelected={tankPositions.mainTank === tank.id}>
                  {tank.name}
                </TankName>
              </TankOption>
            ))}
            {selectedTankJobs.length === 0 && (
              <EmptyState>No tanks selected</EmptyState>
            )}
          </TankSelection>
        </TankPositionCard>

        {/* Off Tank Position */}
        <TankPositionCard>
          <PositionTitle>Off Tank (OT)</PositionTitle>
          <TankSelection>
            {selectedTankJobs.map(tank => (
              <TankOption
                key={`ot-${tank.id}`}
                $isSelected={tankPositions.offTank === tank.id}
                $isDisabled={tankPositions.mainTank === tank.id}
                onClick={() => assignTankPosition(tank.id, 'offTank')}
              >
                <TankIcon>
                  {typeof tank.icon === 'string' && tank.icon.startsWith('/') ? (
                    <img src={tank.icon} alt={tank.name} style={{ maxHeight: '48px', maxWidth: '48px' }} />
                  ) : (
                    tank.icon
                  )}
                </TankIcon>
                <TankName $isSelected={tankPositions.offTank === tank.id}>
                  {tank.name}
                </TankName>
              </TankOption>
            ))}
            {selectedTankJobs.length === 0 && (
              <EmptyState>No tanks selected</EmptyState>
            )}
          </TankSelection>
        </TankPositionCard>
      </TankPositionsGrid>
    </Container>
  );
};

export default TankPositionSelector;
