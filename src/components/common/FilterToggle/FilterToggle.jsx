import React from 'react';
import styled from 'styled-components';
import { useFilterContext } from '../../../contexts';

// Styled components
const ToggleContainer = styled.div`
  display: flex;
  align-items: center;
  margin: 10px 0;
  padding: 8px 12px;
  background-color: ${props => props.theme.colors.secondary};
  border-radius: ${props => props.theme.borderRadius.medium};
  box-shadow: ${props => props.theme.shadows.small};
  
  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: 6px 10px;
    margin: 8px 0;
  }
`;

const ToggleLabel = styled.span`
  font-size: ${props => props.theme.fontSizes.medium};
  margin-right: 10px;
  color: ${props => props.theme.colors.text};
  
  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: ${props => props.theme.fontSizes.small};
    margin-right: 8px;
  }
`;

const ToggleSwitch = styled.label`
  position: relative;
  display: inline-block;
  width: 48px;
  height: 24px;
  
  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    width: 40px;
    height: 20px;
  }
`;

const ToggleInput = styled.input`
  opacity: 0;
  width: 0;
  height: 0;
  
  &:checked + span {
    background-color: ${props => props.theme.colors.primary};
  }
  
  &:checked + span:before {
    transform: translateX(24px);
    
    @media (max-width: ${props => props.theme.breakpoints.mobile}) {
      transform: translateX(20px);
    }
  }
`;

const ToggleSlider = styled.span`
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: ${props => props.theme.colors.border};
  transition: 0.4s;
  border-radius: 34px;
  
  &:before {
    position: absolute;
    content: "";
    height: 18px;
    width: 18px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    transition: 0.4s;
    border-radius: 50%;
    
    @media (max-width: ${props => props.theme.breakpoints.mobile}) {
      height: 14px;
      width: 14px;
      left: 3px;
      bottom: 3px;
    }
  }
`;

const FilterDescription = styled.div`
  font-size: ${props => props.theme.fontSizes.small};
  color: ${props => props.theme.colors.lightText};
  margin-left: 10px;
  
  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: ${props => props.theme.fontSizes.xsmall};
    margin-left: 8px;
  }
`;

/**
 * FilterToggle component for toggling between showing all mitigations and only relevant ones
 * 
 * @returns {React.ReactElement} - FilterToggle component
 */
const FilterToggle = () => {
  const { showAllMitigations, toggleFilterMode } = useFilterContext();
  
  return (
    <ToggleContainer>
      <ToggleLabel>Filter Mitigations:</ToggleLabel>
      <ToggleSwitch>
        <ToggleInput 
          type="checkbox" 
          checked={!showAllMitigations} 
          onChange={toggleFilterMode}
        />
        <ToggleSlider />
      </ToggleSwitch>
      <FilterDescription>
        {showAllMitigations 
          ? "Showing all mitigations" 
          : "Showing only relevant mitigations for each boss action"}
      </FilterDescription>
    </ToggleContainer>
  );
};

export default FilterToggle;
