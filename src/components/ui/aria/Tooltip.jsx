import React from 'react';
import styled from 'styled-components';
import { Tooltip as AriaTooltip, TooltipTrigger as AriaTooltipTrigger } from 'react-aria-components';

export const TooltipTrigger = AriaTooltipTrigger;

export const Tooltip = styled(AriaTooltip)`
  background: ${p => p.theme?.colors?.cardBackground || p.theme?.colors?.background || '#111827'};
  color: ${p => p.theme?.colors?.tooltipText || '#ffffff'};
  border: 1px solid ${p => p.theme?.colors?.border || '#e5e7eb'};
  border-radius: ${p => p.theme?.borderRadius?.medium || '10px'};
  box-shadow: ${p => p.theme?.shadows?.medium || '0 10px 30px rgba(0,0,0,0.12)'};
  padding: 8px 10px;
  font-size: 0.85rem;
  line-height: 1.3;
  max-width: 280px;

  &[data-placement^='top']   { transform-origin: bottom; }
  &[data-placement^='bottom']{ transform-origin: top; }
  &[data-placement^='left']  { transform-origin: right; }
  &[data-placement^='right'] { transform-origin: left; }

  &[data-entering], &[data-exiting] {
    transition: transform 120ms ease, opacity 120ms ease;
  }

  position: relative;

  &::after {
    content: '';
    position: absolute;
    width: 8px;
    height: 8px;
    background: inherit;
    border-left: inherit;
    border-top: inherit;
    transform: rotate(45deg);
  }

  &[data-placement^='top']::after {
    bottom: -5px; left: calc(50% - 4px);
  }
  &[data-placement^='bottom']::after {
    top: -5px; left: calc(50% - 4px);
  }
  &[data-placement^='left']::after {
    right: -5px; top: calc(50% - 4px);
  }
  &[data-placement^='right']::after {
    left: -5px; top: calc(50% - 4px);
  }
`;

