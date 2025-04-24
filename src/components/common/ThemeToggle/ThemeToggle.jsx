import React from 'react';
import styled from 'styled-components';

const ToggleContainer = styled.div`
  display: inline-block;
  margin-left: 10px;
`;

const ToggleButton = styled.button`
  background-color: ${props => props.theme.colors.secondary};
  color: ${props => props.theme.colors.text};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 6px;
  padding: 8px 12px;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  transition: all 0.2s ease;
  box-shadow: ${props => props.theme.shadows.small};

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${props => props.theme.shadows.medium};
  }

  &:active {
    transform: translateY(0);
  }
`;

const ToggleImage = styled.span`
  display: flex;
  align-items: center;
`;

function ThemeToggle({ isDarkMode, toggleTheme }) {
  return (
    <ToggleContainer>
      <ToggleButton
        $isDarkMode={isDarkMode}
        onClick={toggleTheme}
        aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
      >
        <ToggleImage>
          {isDarkMode ? '☀️ Light' : '🌙 Dark '}
        </ToggleImage>
      </ToggleButton>
    </ToggleContainer>
  );
}

export default ThemeToggle;
