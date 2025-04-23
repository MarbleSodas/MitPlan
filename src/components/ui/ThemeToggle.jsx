import React from 'react';
import styled from 'styled-components';

const ToggleContainer = styled.div`
  display: inline-block;
  transition: transform 0.2s ease;
  border-radius: 6px;
  overflow: hidden;
  box-shadow: ${props => props.theme.shadows.small};

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${props => props.theme.shadows.medium};
  }

  &:active {
    transform: translateY(0);
  }
`;

const ToggleButton = styled.button`
  display: flex;
  align-items: center;
  background: ${props => props.$isDarkMode ? '#333' : '#f0f0f0'};
  color: ${props => props.$isDarkMode ? '#fff' : '#333'};
  border: 1px solid ${props => props.$isDarkMode ? '#555' : '#ddd'};
  padding: 0;
  cursor: pointer;
  height: 36px;
  border-radius: 6px;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px ${props => props.theme.colors.primary};
  }
`;

const ToggleImage = styled.div`
  display: flex;
  align-items: center;
  height: 36px;
  padding: 0 12px;
  font-size: 14px;
  font-weight: bold;
`;

function ThemeToggle({ isDarkMode, toggleDarkMode }) {
  return (
    <ToggleContainer>
      <ToggleButton
        $isDarkMode={isDarkMode}
        onClick={toggleDarkMode}
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
