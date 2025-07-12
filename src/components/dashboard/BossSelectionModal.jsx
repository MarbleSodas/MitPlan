import { useState } from 'react';
import styled from 'styled-components';
import { bosses } from '../../data';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: ${props => props.theme?.colors?.background || '#ffffff'};
  padding: 2rem;
  border-radius: 12px;
  max-width: 800px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: ${props => props.theme?.shadows?.large || '0 20px 25px -5px rgba(0, 0, 0, 0.1)'};
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`;

const ModalTitle = styled.h2`
  color: ${props => props.theme?.colors?.text || '#333333'};
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
`;

const ModalSubtitle = styled.p`
  color: ${props => props.theme?.colors?.textSecondary || '#6b7280'};
  margin: 0.5rem 0 0 0;
  font-size: 1rem;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: ${props => props.theme?.colors?.textSecondary || '#6b7280'};
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;

  &:hover {
    background: ${props => props.theme?.colors?.hoverBackground || '#f9fafb'};
    color: ${props => props.theme?.colors?.text || '#333333'};
  }
`;

const BossGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-top: 1rem;

  @media (max-width: ${props => props.theme?.breakpoints?.tablet || '768px'}) {
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 1rem;
  }

  @media (max-width: ${props => props.theme?.breakpoints?.mobile || '480px'}) {
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
  }
`;

const BossCard = styled.div`
  background: ${props => props.theme?.colors?.cardBackground || '#ffffff'};
  border: 2px solid ${props => props.theme?.colors?.border || '#e5e7eb'};
  border-radius: 12px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
  position: relative;
  overflow: hidden;

  &:hover {
    border-color: ${props => props.theme?.colors?.primary || '#3b82f6'};
    transform: translateY(-2px);
    box-shadow: ${props => props.theme?.shadows?.medium || '0 10px 15px -3px rgba(0, 0, 0, 0.1)'};
  }

  &:active {
    transform: translateY(-1px);
  }

  @media (max-width: ${props => props.theme?.breakpoints?.mobile || '480px'}) {
    padding: 1rem;
  }
`;

const BossIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 1rem;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;

  img {
    max-height: 60px;
    max-width: 60px;
    object-fit: contain;
  }

  @media (max-width: ${props => props.theme?.breakpoints?.mobile || '480px'}) {
    font-size: 2.5rem;
    height: 50px;
    margin-bottom: 0.75rem;

    img {
      max-height: 50px;
      max-width: 50px;
    }
  }
`;

const BossName = styled.h3`
  color: ${props => props.theme?.colors?.text || '#333333'};
  margin: 0 0 0.5rem 0;
  font-size: 1.125rem;
  font-weight: 600;

  @media (max-width: ${props => props.theme?.breakpoints?.mobile || '480px'}) {
    font-size: 1rem;
  }
`;

const BossLevel = styled.div`
  color: ${props => props.theme?.colors?.textSecondary || '#6b7280'};
  font-size: 0.875rem;
  margin-bottom: 0.75rem;
`;

const BossDescription = styled.p`
  color: ${props => props.theme?.colors?.textSecondary || '#6b7280'};
  font-size: 0.875rem;
  margin: 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;

  @media (max-width: ${props => props.theme?.breakpoints?.mobile || '480px'}) {
    font-size: 0.8rem;
    -webkit-line-clamp: 2;
  }
`;

const BossSelectionModal = ({ onClose, onSelectBoss }) => {
  const [selectedBoss, setSelectedBoss] = useState(null);

  const handleBossClick = (boss) => {
    setSelectedBoss(boss);
    // Small delay for visual feedback before proceeding
    setTimeout(() => {
      onSelectBoss(boss.id);
    }, 150);
  };

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <div>
            <ModalTitle>Select Boss Encounter</ModalTitle>
            <ModalSubtitle>Choose a boss to create a mitigation plan for</ModalSubtitle>
          </div>
          <CloseButton onClick={onClose}>×</CloseButton>
        </ModalHeader>

        <BossGrid>
          {bosses.map(boss => (
            <BossCard
              key={boss.id}
              onClick={() => handleBossClick(boss)}
              style={{
                opacity: selectedBoss?.id === boss.id ? 0.7 : 1,
                transform: selectedBoss?.id === boss.id ? 'scale(0.98)' : 'scale(1)'
              }}
            >
              <BossIcon>
                {typeof boss.icon === 'string' && boss.icon.startsWith('/') ? (
                  <img src={boss.icon} alt={boss.name} />
                ) : (
                  boss.icon
                )}
              </BossIcon>
              <BossName>{boss.name}</BossName>
              <BossLevel>Level {boss.level}</BossLevel>
              <BossDescription>{boss.description}</BossDescription>
            </BossCard>
          ))}
        </BossGrid>
      </ModalContent>
    </ModalOverlay>
  );
};

export default BossSelectionModal;
