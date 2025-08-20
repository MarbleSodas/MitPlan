import React from 'react';
import styled from 'styled-components';
import { TextField as AriaTextField, Label as AriaLabel, Input as AriaInput, FieldError } from 'react-aria-components';

export const Input = styled(AriaInput)`
  padding: 0.75rem 1rem;
  border: 2px solid ${props => props.theme?.colors?.border || '#e1e5e9'};
  border-radius: 10px;
  font-size: 0.95rem;
  font-weight: 500;
  line-height: 1.5;
  transition: all 0.2s ease;
  background: ${props => props.theme?.colors?.inputBackground || '#ffffff'};
  color: ${props => props.theme?.colors?.text || '#333333'};
  width: 100%;
  box-sizing: border-box;

  &[data-hovered] {
    border-color: ${props => props.theme?.colors?.primary || '#3b82f6'};
    box-shadow: 0 0 0 3px ${props => props.theme?.colors?.primary || '#3b82f6'}08;
  }

  &:focus-visible {
    outline: none;
    border-color: ${props => props.theme?.colors?.primary || '#3b82f6'};
    box-shadow: 0 0 0 4px ${props => props.theme?.colors?.primary || '#3b82f6'}20;
    transform: translateY(-1px);
  }

  &::placeholder {
    color: ${props => props.theme?.colors?.textSecondary || '#6b7280'};
    font-weight: 400;
  }

  &[data-disabled] {
    background: ${props => props.theme?.colors?.hoverBackground || '#f9fafb'};
    border-color: ${props => props.theme?.colors?.disabled || '#9ca3af'};
    color: ${props => props.theme?.colors?.disabled || '#9ca3af'};
    cursor: not-allowed;
  }

  @media (max-width: 480px) {
    padding: 0.75rem 0.875rem;
    font-size: 16px; /* Prevents zoom on iOS */
  }
`;

export const Label = styled(AriaLabel)`
  margin-bottom: 0.25rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: ${props => props.theme?.colors?.text || '#333333'};
`;

const Wrapper = styled(AriaTextField)`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
`;

export const ErrorText = styled(FieldError)`
  color: ${props => props.theme?.colors?.error || '#ef4444'};
  font-size: 0.875rem;
`;

const TextField = Object.assign(Wrapper, { Label, Input, ErrorText });
export default TextField;

