import React from 'react';
import styled from 'styled-components';
import { Sun, Moon } from 'lucide-react';

const ToggleContainer = styled.div`
  display: inline-block;
`;

const ToggleButton = styled.button`
  position: relative;
  width: 64px;
  height: 36px;
  border-radius: 64px;
  background-color: ${props => props.$isDarkMode ? '#333333' : '#f5f5f5'} !important;
  cursor: pointer;
  padding: 0;
  transition: all 0.2s ease;
  box-shadow: ${props => props.theme.shadows.medium};
  overflow: hidden;

  &:hover {
    box-shadow: ${props => props.theme.shadows.large};
    transform: translateY(-1px);
  }

  &::before {
    content: "";
    position: absolute;
    height: 26px;
    width: 26px;
    left: ${props => props.$isDarkMode ? '32px' : '6px'};
    bottom: 5px;
    background-color: ${props => props.$isDarkMode ? '#ffffff' : '#ffffff'};
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    transition: left 0.3s;
    border-radius: 50%;
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    width: 52px;
    height: 30px;

    &::before {
      height: 22px;
      width: 22px;
      left: ${props => props.$isDarkMode ? '26px' : '4px'};
      bottom: 4px;
    }
  }
`;

const IconContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 10px;
  pointer-events: none;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: 0 8px;
  }
`;

const SunIcon = styled.div`
  color: ${props => props.$isDarkMode
    ? props.theme.colors.text
    : '#ff9900'};
  opacity: ${props => props.$isDarkMode ? 0.7 : 1};
  transition: opacity 0.3s, color 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  filter: ${props => props.$isDarkMode ? 'none' : 'drop-shadow(0 0 1px rgba(0, 0, 0, 0.3))'};
`;

const MoonIcon = styled.div`
  color: ${props => props.$isDarkMode
    ? '#000000'
    : props.theme.colors.text};
  opacity: ${props => props.$isDarkMode ? 1 : 0.7};
  transition: opacity 0.3s, color 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  filter: ${props => props.$isDarkMode ? 'drop-shadow(0 0 1px rgba(255, 255, 255, 0.5))' : 'none'};
`;

function ThemeToggle({ isDarkMode, toggleTheme }) {
  return (
    <ToggleContainer>
      <ToggleButton
        $isDarkMode={isDarkMode}
        onClick={toggleTheme}
        aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
      >
        <IconContainer>
          <SunIcon $isDarkMode={isDarkMode}>
            <Sun size={window.innerWidth <= 768 ? 16 : 18} strokeWidth={2.5} />
          </SunIcon>
          <MoonIcon $isDarkMode={isDarkMode}>
            <Moon size={window.innerWidth <= 768 ? 16 : 18} strokeWidth={2.5} />
          </MoonIcon>
        </IconContainer>
      </ToggleButton>
    </ToggleContainer>
  );
}

export default ThemeToggle;
