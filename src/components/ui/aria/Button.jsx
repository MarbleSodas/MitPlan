import React from 'react';
import styled from 'styled-components';
import { Button as AriaButton } from 'react-aria-components';

// Map native `disabled` prop to react-aria-components' `isDisabled` prop
const BaseButton = ({ disabled, children, ...rest }) => {
  return (
    <AriaButton isDisabled={disabled} {...rest}>
      {children}
    </AriaButton>
  );
};

const Button = styled(BaseButton)`
  /* Minimal, React Aria-like base. Tones only change colors; layout is universal. */
  --btn-bg: ${p => p.$tone === 'danger' ? (p.theme?.colors?.error || '#ef4444')
              : p.$tone === 'success' ? (p.theme?.colors?.success || '#10b981')
              : p.$tone === 'warning' ? (p.theme?.colors?.warning || '#f59e0b')
              : p.$tone === 'secondary' ? (p.theme?.colors?.background || '#ffffff')
              : p.$tone === 'neutral' ? (p.theme?.colors?.background || '#ffffff')
              : (p.theme?.colors?.primary || '#3b82f6')};
  --btn-fg: ${p => p.$tone === 'secondary' || p.$tone === 'neutral'
              ? (p.theme?.colors?.text || '#111827')
              : '#ffffff'};
  --btn-border: ${p => p.$tone === 'secondary' || p.$tone === 'neutral'
                  ? (p.theme?.colors?.border || '#e5e7eb')
                  : 'transparent'};
  --btn-hover-bg: ${p => p.$tone === 'danger' ? (p.theme?.colors?.errorHover || '#dc2626')
                  : p.$tone === 'success' ? (p.theme?.colors?.successHover || '#059669')
                  : p.$tone === 'warning' ? (p.theme?.colors?.warningHover || '#d97706')
                  : p.$tone === 'secondary' || p.$tone === 'neutral' ? (p.theme?.colors?.hoverBackground || '#f3f4f6')
                  : (p.theme?.colors?.primaryHover || '#2563eb')};
  --btn-ring: ${p => p.$tone === 'danger' ? (p.theme?.colors?.error || '#ef4444')
                : p.$tone === 'success' ? (p.theme?.colors?.success || '#10b981')
                : p.$tone === 'warning' ? (p.theme?.colors?.warning || '#f59e0b')
                : (p.theme?.colors?.primary || '#3b82f6')};

  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: ${p => (p.$size === 'sm' ? '0.375rem 0.75rem' : '0.625rem 1rem')};
  min-height: ${p => (p.$size === 'sm' ? '32px' : '40px')};
  font-size: 0.95rem;
  font-weight: 600;
  border-radius: 8px;
  border: 1px solid var(--btn-border);
  background: var(--btn-bg);
  color: var(--btn-fg);
  text-decoration: none;
  cursor: pointer;
  transition: background-color .15s ease, box-shadow .15s ease;

  &[data-hovered] {
    background: var(--btn-hover-bg);
  }
  &[data-pressed] {
    background: var(--btn-hover-bg);
  }
  &[data-disabled] {
    opacity: 0.6;
    cursor: not-allowed;
  }
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px var(--btn-ring)33;
  }
`;

export default Button;

