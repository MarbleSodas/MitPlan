import React from 'react';
import styled from 'styled-components';
import { Link as AriaLink } from 'react-aria-components';

const Link = styled(AriaLink)`
  color: ${p => p.theme?.colors?.primary || '#3b82f6'};
  text-decoration: none;
  font-weight: 600;

  &[data-hovered] {
    text-decoration: underline;
  }

  &[data-focus-visible] {
    outline: none;
    box-shadow: 0 0 0 3px ${(p) => (p.theme?.colors?.primary || '#3b82f6')}33;
    border-radius: 6px;
  }
`;

export default Link;

