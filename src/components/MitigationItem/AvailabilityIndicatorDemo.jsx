import React from 'react';
import styled from 'styled-components';

/**
 * Demo component to showcase the availability indicator borders
 * This demonstrates the visual feedback system for mitigation availability
 */

const DemoContainer = styled.div`
  padding: 2rem;
  background: ${props => props.theme?.colors?.background || '#f5f5f5'};
  border-radius: 8px;
  margin: 1rem;
`;

const DemoTitle = styled.h3`
  color: ${props => props.theme?.colors?.text || '#333333'};
  margin-bottom: 1rem;
`;

const DemoItem = styled.div`
  background-color: ${props => props.theme?.colors?.cardBackground || '#ffffff'};
  border: none;
  border-left: 4px solid ${props => {
    if (props.$isDisabled) {
      return props.theme?.colors?.error || '#ff5555';
    }
    return props.theme?.colors?.primary || '#3399ff';
  }};
  border-radius: ${props => props.theme?.borderRadius?.small || '4px'};
  padding: 1rem;
  margin-bottom: 0.5rem;
  transition: all 0.2s ease;
  opacity: ${props => props.$isDisabled ? 0.7 : 1};

  &:hover {
    background-color: ${props => 
      props.theme?.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'
    };
  }
`;

const DemoLabel = styled.div`
  font-weight: 600;
  color: ${props => props.theme?.colors?.text || '#333333'};
  margin-bottom: 0.25rem;
`;

const DemoDescription = styled.div`
  font-size: 0.875rem;
  color: ${props => props.theme?.colors?.textSecondary || '#666666'};
`;

const AvailabilityIndicatorDemo = () => {
  return (
    <DemoContainer>
      <DemoTitle>Mitigation Availability Indicators</DemoTitle>
      
      <DemoItem $isDisabled={false}>
        <DemoLabel>Available Mitigation</DemoLabel>
        <DemoDescription>
          Blue border indicates this mitigation can be assigned to the selected boss action.
          No cooldown restrictions or compatibility issues.
        </DemoDescription>
      </DemoItem>

      <DemoItem $isDisabled={true}>
        <DemoLabel>Unavailable Mitigation</DemoLabel>
        <DemoDescription>
          Red border indicates this mitigation cannot be assigned due to cooldown restrictions,
          job compatibility issues, tank targeting restrictions, or charge/stack limitations.
        </DemoDescription>
      </DemoItem>

      <DemoItem $isDisabled={false}>
        <DemoLabel>Scholar Aetherflow (Available)</DemoLabel>
        <DemoDescription>
          Blue border shows this Aetherflow ability can be used (stacks available).
        </DemoDescription>
      </DemoItem>

      <DemoItem $isDisabled={true}>
        <DemoLabel>Scholar Aetherflow (No Stacks)</DemoLabel>
        <DemoDescription>
          Red border indicates no Aetherflow stacks available for this ability.
        </DemoDescription>
      </DemoItem>

      <DemoItem $isDisabled={true}>
        <DemoLabel>Tank-Specific Ability (Wrong Job)</DemoLabel>
        <DemoDescription>
          Red border shows this tank ability cannot be used by the currently selected tank job.
        </DemoDescription>
      </DemoItem>
    </DemoContainer>
  );
};

export default AvailabilityIndicatorDemo;
