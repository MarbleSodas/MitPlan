import React from 'react';
import styled from 'styled-components';

const ToggleContainer = styled.div`
  display: flex;
  align-items: center;
  margin-right: 15px;
`;

const ToggleButton = styled.button`
  background-color: ${props => props.isDarkMode ? '#333' : '#f0f0f0'};
  color: ${props => props.isDarkMode ? '#fff' : '#333'};
  border: 1px solid ${props => props.isDarkMode ? '#555' : '#ddd'};
  border-radius: 20px;
  padding: 5px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background-color: ${props => props.isDarkMode ? '#444' : '#e0e0e0'};
  }
`;

const ToggleIcon = styled.span`
  font-size: 16px;
`;

function ThemeToggle({ isDarkMode, toggleDarkMode }) {
  return (
    <ToggleContainer>
      <ToggleButton 
        isDarkMode={isDarkMode} 
        onClick={toggleDarkMode}
        aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
      >
        <ToggleIcon>
          {isDarkMode ? '☀️' : '🌙'}
        </ToggleIcon>
        {isDarkMode ? 'Light Mode' : 'Dark Mode'}
      </ToggleButton>
    </ToggleContainer>
  );
}

export default ThemeToggle;
