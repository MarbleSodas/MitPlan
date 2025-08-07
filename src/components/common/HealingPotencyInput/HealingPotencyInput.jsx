import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useRealtimeBossContext } from '../../../contexts/RealtimeBossContext';

// Default healing potency values for 100 potency heals
const HEALING_POTENCY_VALUES = {
  90: 5000,   // Level 90 default healing per 100 potency (placeholder)
  100: 6000   // Level 100 default healing per 100 potency
};

const Container = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 6px 12px;
  background-color: ${props => props.theme.colors.secondary};
  border-radius: ${props => props.theme.borderRadius.medium};
  font-size: ${props => props.theme.fontSizes.small};

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: 4px 8px;
    gap: 0.375rem;
    font-size: ${props => props.theme.fontSizes.xsmall};
  }
`;

const Label = styled.span`
  color: ${props => props.theme.colors.text};
  white-space: nowrap;
  font-weight: 500;
`;

const LevelDisplay = styled.span`
  color: ${props => props.theme.colors.primary};
  font-weight: 600;
  min-width: 20px;
`;

const PotencyInput = styled.input`
  padding: 4px 8px;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 4px;
  background: ${props => props.theme.colors.background};
  color: ${props => props.theme.colors.text};
  font-size: inherit;
  transition: border-color 0.2s ease;
  width: 70px;
  text-align: center;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
  }

  &:invalid {
    border-color: #ef4444;
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: 3px 6px;
    width: 60px;
  }
`;

const HealingPotencyInput = () => {
  // Get boss level from context
  const { currentBossLevel } = useRealtimeBossContext();

  // Only track healing potency value, level comes from boss context
  const [healingPotency, setHealingPotency] = useState(HEALING_POTENCY_VALUES[currentBossLevel] || HEALING_POTENCY_VALUES[100]);

  // Handle healing potency change
  const handleHealingPotencyChange = (newValue) => {
    setHealingPotency(newValue);
  };

  // Update healing potency when boss level changes
  useEffect(() => {
    const savedPotency = localStorage.getItem(`mitplan-healing-potency-${currentBossLevel}`);
    if (savedPotency) {
      const potencyNum = parseInt(savedPotency, 10);
      if (potencyNum > 0) {
        setHealingPotency(potencyNum);
      }
    } else {
      // Set default for this level if no saved value
      setHealingPotency(HEALING_POTENCY_VALUES[currentBossLevel] || HEALING_POTENCY_VALUES[100]);
    }
  }, [currentBossLevel]);

  // Save to localStorage whenever healing potency changes
  useEffect(() => {
    localStorage.setItem(`mitplan-healing-potency-${currentBossLevel}`, healingPotency.toString());
  }, [healingPotency, currentBossLevel]);

  return (
    <Container>
      <Label>Healing (Lv.</Label>
      <LevelDisplay>{currentBossLevel}</LevelDisplay>
      <Label>per 100 Cure Potency):</Label>
      <PotencyInput
        type="number"
        min="1"
        max="99999"
        value={healingPotency}
        onChange={(e) => handleHealingPotencyChange(Number(e.target.value))}
        placeholder={HEALING_POTENCY_VALUES[currentBossLevel] || HEALING_POTENCY_VALUES[100]}
      />
    </Container>
  );
};

export default HealingPotencyInput;
