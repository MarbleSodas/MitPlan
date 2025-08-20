import React from 'react';
import styled from 'styled-components';
import {
  Select as AriaSelect,
  Label,
  Button as AriaButton,
  ListBox,
  ListBoxItem,
  Popover
} from 'react-aria-components';

const SelectButton = styled(AriaButton)`
  padding: 0.75rem 1rem;
  border: 2px solid ${p => p.theme?.colors?.border || '#e5e7eb'};
  border-radius: 10px;
  background: ${p => p.theme?.colors?.inputBackground || '#fff'};
  color: ${p => p.theme?.colors?.text || '#333'};
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: .5rem;

  &[data-hovered] {
    border-color: ${p => p.theme?.colors?.primary || '#3b82f6'};
    box-shadow: 0 0 0 3px ${(p) => (p.theme?.colors?.primary || '#3b82f6')}0d;
  }

  &[data-focus-visible] {
    outline: none;
    border-color: ${p => p.theme?.colors?.primary || '#3b82f6'};
    box-shadow: 0 0 0 4px ${(p) => (p.theme?.colors?.primary || '#3b82f6')}33;
  }
`;

const SelectPopover = styled(Popover)`
  background: ${p => p.theme?.colors?.background || '#fff'};
  border: 1px solid ${p => p.theme?.colors?.border || '#e5e7eb'};
  border-radius: 10px;
  box-shadow: ${p => p.theme?.shadows?.medium || '0 10px 30px rgba(0,0,0,0.12)'};
  padding: .25rem;
`;

const SelectListBox = styled(ListBox)`
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

const Select = (props) => (
  <AriaSelect {...props}>
    <Label>{props.label}</Label>
    <SelectButton>
      {({ selectedText }) => selectedText || props.placeholder || 'Select...'}
      <span aria-hidden>▾</span>
    </SelectButton>
    <SelectPopover>
      <SelectListBox>
        {props.children}
      </SelectListBox>
    </SelectPopover>
  </AriaSelect>
);

Select.Option = Option;
export default Select;

