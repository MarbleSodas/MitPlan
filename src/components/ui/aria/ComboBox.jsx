import React from 'react';
import styled from 'styled-components';
import {
  ComboBox as AriaComboBox,
  Label,
  Input as AriaInput,
  Button as AriaButton,
  ListBox,
  ListBoxItem,
  Popover
} from 'react-aria-components';

const ComboWrapper = styled(AriaComboBox)`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
`;

const Input = styled(AriaInput)`
  padding: 0.75rem 1rem;
  border: 2px solid ${p => p.theme?.colors?.border || '#e5e7eb'};
  border-radius: 10px;
  background: ${p => p.theme?.colors?.inputBackground || '#fff'};

  &[data-hovered] { box-shadow: 0 0 0 3px ${(p)=> (p.theme?.colors?.primary||'#3b82f6')}0d; }
  &:focus-visible {
    outline: none;
    border-color: ${p => p.theme?.colors?.primary || '#3b82f6'};
    box-shadow: 0 0 0 4px ${(p)=> (p.theme?.colors?.primary||'#3b82f6')}33;
  }
`;

const Button = styled(AriaButton)`
  margin-left: -44px; /* place arrow on right over input */
  background: transparent;
  border: none;
  color: ${p => p.theme?.colors?.text || '#333'};
`;

const ComboPopover = styled(Popover)`
  background: ${p => p.theme?.colors?.background || '#fff'};
  border: 1px solid ${p => p.theme?.colors?.border || '#e5e7eb'};
  border-radius: 10px;
  box-shadow: ${p => p.theme?.shadows?.medium || '0 10px 30px rgba(0,0,0,0.12)'};
  padding: .25rem;
`;

const ComboListBox = styled(ListBox)`
  padding: 0;
  margin: 0;
  max-height: 280px;
  overflow: auto;
`;

const Option = styled(ListBoxItem)`
  padding: .5rem .75rem;
  border-radius: 8px;
  cursor: pointer;

  &[data-hovered] { background: ${p => p.theme?.colors?.hoverBackground || '#f3f4f6'}; }
  &[data-focused] { background: ${p => p.theme?.colors?.hoverBackground || '#f3f4f6'}; }
  &[data-selected] {
    background: ${p => p.theme?.colors?.primary || '#3b82f6'};
    color: #fff;
  }
`;

const ComboBox = (props) => (
  <ComboWrapper {...props}>
    <Label>{props.label}</Label>
    <div style={{ position: 'relative' }}>
      <Input />
      <Button aria-label="Toggle suggestions">▾</Button>
    </div>
    <ComboPopover>
      <ComboListBox>
        {props.children}
      </ComboListBox>
    </ComboPopover>
  </ComboWrapper>
);

ComboBox.Option = Option;
export default ComboBox;

