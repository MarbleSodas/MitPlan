import React from 'react';
import styled from 'styled-components';
import { Checkbox as AriaCheckbox } from 'react-aria-components';

// Map checked/disabled/focus/hover states via data attributes
const Base = ({ className, children, ...props }) => (
  <AriaCheckbox {...props} className={className}>
    {({ isSelected }) => (
      <>
        <span data-checkbox-indicator aria-hidden="true" />
        <span data-checkbox-label>{children}</span>
      </>
    )}
  </AriaCheckbox>
);

const Checkbox = styled(Base)`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  user-select: none;
  color: ${p => p.theme?.colors?.text || '#333'};

  &[data-disabled] {
    cursor: not-allowed;
    opacity: 0.6;
  }

  [data-checkbox-indicator] {
    width: 18px;
    height: 18px;
    border-radius: 4px;
    border: 2px solid ${p => p.theme?.colors?.border || '#e5e7eb'};
    background: ${p => p.theme?.colors?.background || '#fff'};
    position: relative;
    display: inline-block;
    transition: all 0.2s ease;
  }

  &[data-hovered] [data-checkbox-indicator] {
    box-shadow: 0 0 0 3px ${(p) => (p.theme?.colors?.primary || '#3b82f6')}20;
  }

  &[data-focus-visible] [data-checkbox-indicator] {
    outline: none;
    border-color: ${p => p.theme?.colors?.primary || '#3b82f6'};
    box-shadow: 0 0 0 4px ${(p) => (p.theme?.colors?.primary || '#3b82f6')}33;
  }

  &[data-selected] [data-checkbox-indicator] {
    background: ${p => p.theme?.colors?.primary || '#3b82f6'};
    border-color: ${p => p.theme?.colors?.primary || '#3b82f6'};
  }

  &[data-selected] [data-checkbox-indicator]::after {
    content: '';
    position: absolute;
    left: 4px;
    top: 0px;
    width: 6px;
    height: 12px;
    border: solid #fff;
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
  }
`;

export default Checkbox;

