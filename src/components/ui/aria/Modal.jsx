import styled from 'styled-components';
import { ModalOverlay as AriaModalOverlay, Modal as AriaModal, Dialog as AriaDialog, Heading as AriaHeading } from 'react-aria-components';

export const ModalOverlay = styled(AriaModalOverlay)`
  position: fixed;
  inset: 0;
  background-color: rgba(0,0,0,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);

  &[data-entering], &[data-exiting] {
    transition: opacity 150ms ease;
  }
`;

export const Modal = styled(AriaModal)`
  outline: none;
`;

export const Dialog = styled(AriaDialog)`
  background: ${props => props.theme?.colors?.background || '#ffffff'};
  border-radius: 12px;
  box-shadow: ${props => props.theme?.shadows?.medium || '0 10px 40px rgba(0,0,0,0.12)'};
  color: ${props => props.theme?.colors?.text || '#333'};
  width: min(600px, 90vw);
  max-height: 80vh;
  overflow: auto;
  padding: 1.5rem;
`;

export const Heading = styled(AriaHeading)`
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
  font-weight: 700;
`;

