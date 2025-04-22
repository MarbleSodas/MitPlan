import React from 'react';
import styled from 'styled-components';
import { bosses } from '../data/sampleData';

const SelectorContainer = styled.div`
  background-color: ${props => props.theme.colors.secondary};
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 20px;
  box-shadow: ${props => props.theme.shadows.medium};
  transition: background-color 0.3s ease;
`;

const SelectorTitle = styled.h3`
  margin-top: 0;
  margin-bottom: 15px;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  padding-bottom: 10px;
  color: ${props => props.theme.colors.text};
`;

const BossList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`;

const BossCard = styled.div`
  background-color: ${props => {
    if (props.theme.mode === 'dark') {
      return props.isSelected ? 'rgba(51, 153, 255, 0.2)' : props.theme.colors.cardBackground;
    }
    return props.isSelected ? '#e6f7ff' : 'white';
  }};
  border: 2px solid ${props => props.isSelected ? props.theme.colors.primary : props.theme.colors.border};
  border-radius: 6px;
  padding: 10px;
  cursor: pointer;
  transition: all 0.2s;
  width: 120px;
  color: ${props => props.theme.colors.text};

  &:hover {
    border-color: ${props => props.theme.colors.primary};
    transform: translateY(-2px);
    box-shadow: ${props => props.theme.shadows.medium};
  }
`;

const BossIcon = styled.div`
  margin-bottom: 5px;
  text-align: center;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const BossName = styled.div`
  font-weight: ${props => props.isSelected ? 'bold' : 'normal'};
  text-align: center;
  font-size: 14px;
`;

const BossLevel = styled.div`
  text-align: center;
  font-size: 12px;
  color: ${props => props.theme.colors.lightText};
  margin-top: 5px;
`;

function BossSelector({ selectedBossId, onSelectBoss }) {
  return (
    <SelectorContainer>
      <SelectorTitle>Select Boss</SelectorTitle>
      <BossList>
        {bosses.map(boss => (
          <BossCard
            key={boss.id}
            isSelected={boss.id === selectedBossId}
            onClick={() => onSelectBoss(boss.id)}
          >
              <BossIcon>
                {typeof boss.icon === 'string' && boss.icon.startsWith('/') ?
                  <img src={boss.icon} alt={boss.name} style={{ maxHeight: '40px', maxWidth: '40px' }} /> :
                  boss.icon
                }
              </BossIcon>
              <BossName isSelected={boss.id === selectedBossId}>
                {boss.name}
              </BossName>
              <BossLevel>Level {boss.level}</BossLevel>
            </BossCard>
        ))}
      </BossList>
    </SelectorContainer>
  );
}

export default BossSelector;
