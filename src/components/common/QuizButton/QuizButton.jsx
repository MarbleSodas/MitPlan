import React from 'react';
import styled from 'styled-components';

const QuizLink = styled.a`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease;
  border-radius: 16px;
  height: 36px;
  padding: 0 16px;
  background-color: #4CAF50; /* Green color for the quiz button */
  color: white;
  font-weight: bold;
  text-decoration: none;
  box-shadow: ${props => props.theme.shadows.small};

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${props => props.theme.shadows.medium};
  }

  &:active {
    transform: translateY(0);
  }
`;

const QuizButton = () => {
  return (
    <QuizLink
      href="https://quiz.xivmitplan.com/"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Take the FFXIV Mitigation Quiz"
    >
      Quiz
    </QuizLink>
  );
};

export default QuizButton;
