import React from 'react';
import styled from 'styled-components';
import { Switch as AriaSwitch } from 'react-aria-components';

const Base = ({ className, children, ...props }) => (
  <AriaSwitch {...props} className={className}>
    {children}
  </AriaSwitch>
);

const Switch = styled(Base)`
  --track-width: 48px;
  --track-height: 24px;
  --thumb-size: 18px;

  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  user-select: none;
  color: ${p => p.theme?.colors?.text || '#333'};

  @media (max-width: ${p => p.theme?.breakpoints?.mobile || '480px'}) {
    --track-width: 40px;
    --track-height: 20px;
    --thumb-size: 14px;
  }

  &::before {
    content: '';
    width: var(--track-width);
    height: var(--track-height);
    background: ${p => p.theme?.colors?.border || '#e5e7eb'};
    border-radius: 999px;
    display: inline-block;
    transition: background 0.2s ease;
  }

  &::after {
    content: '';
    position: absolute;
    width: var(--thumb-size);
    height: var(--thumb-size);
    left: 3px;
    background: #fff;
    border-radius: 50%;
    box-shadow: 0 1px 2px rgba(0,0,0,0.2);
    transition: transform 0.25s ease;
  }

  &[data-selected]::before {
    background: ${p => p.theme?.colors?.primary || '#3b82f6'};
  }

  &[data-selected]::after {
    transform: translateX(calc(var(--track-width) - var(--thumb-size) - 6px));
  }

  &[data-hovered]::before {
    box-shadow: 0 0 0 3px ${(p) => (p.theme?.colors?.primary || '#3b82f6')}14;
  }

  &[data-focus-visible]::before {
    box-shadow: 0 0 0 4px ${(p) => (p.theme?.colors?.primary || '#3b82f6')}33;
  }

  &[data-disabled] {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

export default Switch;

