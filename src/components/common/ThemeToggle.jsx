import React from 'react';
import styled from 'styled-components';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

const ToggleButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem 0.75rem;
  background: transparent;
  color: ${props => props.theme?.colors?.primary || '#3399ff'};
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;

  &:hover {
    background: ${props => props.theme?.colors?.primary || '#3399ff'};
    color: white;
  }

  &:active {
    transform: translateY(0);
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 3px ${props => props.theme?.colors?.primary || '#3b82f6'}33;
  }

  svg {
    width: 20px;
    height: 20px;
    transition: all 0.3s ease;
  }
`;

const IconWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  transform: ${props => props.$isVisible ? 'scale(1) rotate(0deg)' : 'scale(0) rotate(180deg)'};
  opacity: ${props => props.$isVisible ? 1 : 0};
  position: ${props => props.$isVisible ? 'static' : 'absolute'};
`;

const ThemeToggle = ({ className, showLabel = false }) => {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <ToggleButton 
      onClick={toggleTheme} 
      className={className}
      title={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
      aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
    >
      <IconWrapper $isVisible={!isDarkMode}>
        <Sun />
      </IconWrapper>
      <IconWrapper $isVisible={isDarkMode}>
        <Moon />
      </IconWrapper>
      {showLabel && (
        <span style={{ marginLeft: '8px', fontSize: '14px' }}>
          {isDarkMode ? 'Dark' : 'Light'}
        </span>
      )}
    </ToggleButton>
  );
};

export default ThemeToggle;
