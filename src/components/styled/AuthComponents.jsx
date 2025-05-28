import styled from 'styled-components';

// Modal overlay
export const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: ${props => props.theme.spacing.large};
  animation: fadeIn 0.2s ease-out;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.medium};
    align-items: flex-end;
  }
`;

// Modal container
export const ModalContainer = styled.div`
  background: ${props => props.theme.colors.cardBackground};
  border-radius: ${props => props.theme.borderRadius.large};
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15), 0 0 0 1px ${props => props.theme.colors.border}30;
  width: 100%;
  max-width: 400px;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  backdrop-filter: blur(10px);
  border: 1px solid ${props => props.theme.colors.border}40;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    max-width: 100%;
    border-radius: ${props => props.theme.borderRadius.large} ${props => props.theme.borderRadius.large} 0 0;
    max-height: 80vh;
  }
`;

// Modal header
export const ModalHeader = styled.div`
  padding: ${props => props.theme.spacing.xlarge} ${props => props.theme.spacing.xlarge} ${props => props.theme.spacing.large};
  border-bottom: 1px solid ${props => props.theme.colors.border};
  position: relative;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.large} ${props => props.theme.spacing.large} ${props => props.theme.spacing.medium};
  }
`;

// Modal title
export const ModalTitle = styled.h2`
  margin: 0;
  font-size: ${props => props.theme.fontSizes.responsive.xlarge};
  font-weight: 600;
  color: ${props => props.theme.colors.text};
  text-align: center;
`;

// Close button
export const CloseButton = styled.button`
  position: absolute;
  top: ${props => props.theme.spacing.large};
  right: ${props => props.theme.spacing.large};
  background: none;
  border: none;
  font-size: ${props => props.theme.fontSizes.xlarge};
  color: ${props => props.theme.colors.lightText};
  cursor: pointer;
  padding: ${props => props.theme.spacing.small};
  border-radius: ${props => props.theme.borderRadius.small};
  transition: all 0.2s ease;

  &:hover {
    color: ${props => props.theme.colors.text};
    background-color: ${props => props.theme.colors.border};
  }

  &:focus {
    outline: none;
    box-shadow: ${props => props.theme.shadows.focus};
  }
`;

// Modal body
export const ModalBody = styled.div`
  padding: ${props => props.theme.spacing.large} ${props => props.theme.spacing.xlarge} ${props => props.theme.spacing.xlarge};

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.medium} ${props => props.theme.spacing.large} ${props => props.theme.spacing.large};
  }
`;

// Form container
export const FormContainer = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${props => props.theme.spacing.large};
`;

// Form group
export const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${props => props.theme.spacing.small};
`;

// Form label
export const FormLabel = styled.label`
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
  font-size: ${props => props.theme.fontSizes.responsive.medium};
  font-weight: 600;
  letter-spacing: 0.025em;
  color: ${props => props.theme.colors.text};
  margin-bottom: ${props => props.theme.spacing.small};
`;

// Form input
export const FormInput = styled.input`
  padding: ${props => props.theme.spacing.medium} ${props => props.theme.spacing.large};
  border: 2px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.large};
  background: ${props => props.theme.colors.cardBackground};
  color: ${props => props.theme.colors.text};
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
  font-size: ${props => props.theme.fontSizes.responsive.medium};
  font-weight: 500;
  transition: all 0.15s ease;
  min-height: 48px;
  position: relative;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 0 0 3px ${props => props.theme.colors.primary}20, 0 2px 8px ${props => props.theme.colors.primary}15;
    transform: translateY(-1px);
  }

  &::placeholder {
    color: ${props => props.theme.colors.lightText};
    font-weight: 400;
  }

  &:disabled {
    background: ${props => props.theme.colors.border}40;
    border-color: ${props => props.theme.colors.border};
    cursor: not-allowed;
    opacity: 0.6;
    transform: none;
  }
  }

  ${props => props.error && `
    border-color: ${props.theme.colors.error};
    &:focus {
      box-shadow: 0 0 0 3px rgba(255, 85, 85, 0.3);
    }
  `}
`;

// Error message
export const ErrorMessage = styled.div`
  color: ${props => props.theme.colors.error};
  font-size: ${props => props.theme.fontSizes.responsive.small};
  margin-top: ${props => props.theme.spacing.xsmall};
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.small};
`;

// Success message
export const SuccessMessage = styled.div`
  color: ${props => props.theme.colors.success};
  font-size: ${props => props.theme.fontSizes.responsive.small};
  margin-top: ${props => props.theme.spacing.xsmall};
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.small};
`;

// Auth Submit Button - Specialized for authentication modal submit actions
export const AuthSubmitButton = styled.button`
  background: linear-gradient(135deg, ${props => props.theme.colors.primary}f0, ${props => props.theme.colors.primary});
  color: white;
  border: none;
  padding: ${props => props.theme.spacing.medium} ${props => props.theme.spacing.large};
  border-radius: ${props => props.theme.borderRadius.large};
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
  font-size: ${props => props.theme.fontSizes.responsive.medium};
  font-weight: 600;
  letter-spacing: 0.025em;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  white-space: nowrap;
  min-height: 40px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${props => props.theme.spacing.small};
  overflow: hidden;
  box-shadow: 0 1px 4px ${props => props.theme.colors.primary}20;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.6s ease;
  }

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, ${props => props.theme.colors.primary}, ${props => props.theme.colors.primary}e0);
    transform: translateY(-1px);
    box-shadow: 0 2px 8px ${props => props.theme.colors.primary}25;
    
    &::before {
      left: 100%;
    }
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px ${props => props.theme.colors.primary}30, 0 2px 8px ${props => props.theme.colors.primary}20;
  }

  &:active:not(:disabled) {
    transform: translateY(0);
    box-shadow: 0 1.5px 4px ${props => props.theme.colors.primary}15;
  }

  &:disabled {
    background: linear-gradient(135deg, ${props => props.theme.colors.border}, ${props => props.theme.colors.border}dd);
    color: ${props => props.theme.colors.lightText};
    cursor: not-allowed;
    opacity: 0.7;
    transform: none;
    box-shadow: none;
    
    &::before {
      display: none;
    }
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.small} ${props => props.theme.spacing.medium};
    min-height: 36px;
    font-size: ${props => props.theme.fontSizes.responsive.small};
    box-shadow: 0 1px 3px ${props => props.theme.colors.primary}15;
    
    &:hover:not(:disabled) {
      box-shadow: 0 2px 6px ${props => props.theme.colors.primary}20;
    }
  }
`;

// Primary button - Enhanced modern design
export const PrimaryButton = styled.button`
  background: linear-gradient(135deg, ${props => props.theme.colors.primary}f0, ${props => props.theme.colors.primary});
  color: white;
  border: none;
  padding: ${props => props.theme.spacing.large} ${props => props.theme.spacing.xlarge};
  border-radius: ${props => props.theme.borderRadius.large};
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
  font-size: ${props => props.theme.fontSizes.responsive.medium};
  font-weight: 600;
  letter-spacing: 0.025em;
  cursor: pointer;
  transition: all 0.15s ease;
  position: relative;
  white-space: nowrap;
  min-height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${props => props.theme.spacing.small};
  overflow: hidden;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.medium} ${props => props.theme.spacing.large};
    min-height: 48px;
    font-size: ${props => props.theme.fontSizes.responsive.medium};
  }

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.5s ease;
  }

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, ${props => props.theme.colors.primary}, ${props => props.theme.colors.primary}e0);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px ${props => props.theme.colors.primary}40;
    
    &::before {
      left: 100%;
    }
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 3px ${props => props.theme.colors.primary}40, 0 4px 12px ${props => props.theme.colors.primary}30;
  }

  &:active:not(:disabled) {
    transform: translateY(0);
    box-shadow: 0 2px 4px ${props => props.theme.colors.primary}30;
  }

  &:disabled {
    background: linear-gradient(135deg, ${props => props.theme.colors.border}, ${props => props.theme.colors.border}dd);
    color: ${props => props.theme.colors.lightText};
    cursor: not-allowed;
    opacity: 0.6;
    transform: none;
    
    &::before {
      display: none;
    }
  }
`;

// Secondary button - Enhanced modern design
export const SecondaryButton = styled.button`
  background: ${props => props.theme.colors.cardBackground};
  color: ${props => props.theme.colors.text};
  border: 2px solid ${props => props.theme.colors.border};
  padding: ${props => props.theme.spacing.large} ${props => props.theme.spacing.xlarge};
  border-radius: ${props => props.theme.borderRadius.large};
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
  font-size: ${props => props.theme.fontSizes.responsive.medium};
  font-weight: 600;
  letter-spacing: 0.025em;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
  min-height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${props => props.theme.spacing.small};
  position: relative;
  overflow: hidden;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.medium} ${props => props.theme.spacing.large};
    min-height: 48px;
    font-size: ${props => props.theme.fontSizes.responsive.medium};
  }

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 0%;
    height: 100%;
    background: linear-gradient(135deg, ${props => props.theme.colors.primary}15, ${props => props.theme.colors.primary}10);
    transition: width 0.3s ease;
    z-index: 0;
  }

  & > * {
    position: relative;
    z-index: 1;
  }

  &:hover:not(:disabled) {
    border-color: ${props => props.theme.colors.primary};
    color: ${props => props.theme.colors.primary};
    transform: translateY(-1px);
    box-shadow: 0 4px 12px ${props => props.theme.colors.primary}20;
    
    &::before {
      width: 100%;
    }
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 3px ${props => props.theme.colors.primary}40;
  }

  &:active:not(:disabled) {
    transform: translateY(0);
    box-shadow: 0 2px 4px ${props => props.theme.colors.primary}20;
  }

  &:disabled {
    background: ${props => props.theme.colors.border};
    border-color: ${props => props.theme.colors.border};
    color: ${props => props.theme.colors.lightText};
    cursor: not-allowed;
    opacity: 0.6;
    transform: none;
    
    &::before {
      display: none;
    }
  }
`;

// Text button - Enhanced modern design
export const TextButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.theme.colors.primary};
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
  font-size: ${props => props.theme.fontSizes.responsive.medium};
  font-weight: 600;
  letter-spacing: 0.025em;
  cursor: pointer;
  padding: ${props => props.theme.spacing.large} ${props => props.theme.spacing.large};
  border-radius: ${props => props.theme.borderRadius.large};
  transition: all 0.15s ease;
  white-space: nowrap;
  min-height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  position: relative;
  overflow: hidden;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.medium} ${props => props.theme.spacing.medium};
    min-height: 48px;
    font-size: ${props => props.theme.fontSizes.responsive.medium};
  }

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 50%;
    width: 0%;
    height: 100%;
    background: ${props => props.theme.colors.primary}10;
    transition: all 0.3s ease;
    transform: translateX(-50%);
    border-radius: ${props => props.theme.borderRadius.large};
  }

  &:hover {
    color: ${props => props.theme.colors.primary};
    transform: translateY(-1px);
    
    &::before {
      width: 100%;
    }
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 3px ${props => props.theme.colors.primary}40;
  }

  &:active {
    transform: translateY(0);
    
    &::before {
      background: ${props => props.theme.colors.primary}20;
    }
  }

  &:disabled {
    color: ${props => props.theme.colors.lightText};
    cursor: not-allowed;
    opacity: 0.6;
    transform: none;
    
    &::before {
      display: none;
    }
  }
`;

// Button group - Enhanced spacing for minimalistic design
export const ButtonGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${props => props.theme.spacing.medium};
  margin-top: ${props => props.theme.spacing.large};

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    gap: ${props => props.theme.spacing.medium};
    margin-top: ${props => props.theme.spacing.medium};
  }
`;

// Divider - Enhanced for minimalistic design
export const Divider = styled.div`
  display: flex;
  align-items: center;
  margin: ${props => props.theme.spacing.xlarge} 0;

  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background-color: ${props => props.theme.colors.border};
    opacity: 0.5;
  }

  span {
    padding: 0 ${props => props.theme.spacing.xlarge};
    color: ${props => props.theme.colors.lightText};
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
    font-size: ${props => props.theme.fontSizes.responsive.small};
    font-weight: 500;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }
`;

// Loading spinner
export const LoadingSpinner = styled.div`
  width: 20px;
  height: 20px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

// Tab navigation
export const TabNavigation = styled.div`
  display: flex;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  margin-bottom: ${props => props.theme.spacing.large};
  gap: 2px;
`;

// Tab button - Enhanced modern design
export const TabButton = styled.button`
  flex: 1;
  padding: ${props => props.theme.spacing.medium} ${props => props.theme.spacing.large};
  background: ${props => props.active ? 
    `linear-gradient(135deg, ${props.theme.colors.primary}08, ${props.theme.colors.primary}05)` : 
    'none'};
  border: none;
  color: ${props => props.active ? props.theme.colors.primary : props.theme.colors.lightText};
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
  font-size: ${props => props.theme.fontSizes.responsive.small};
  font-weight: ${props => props.active ? '700' : '600'};
  letter-spacing: 0.025em;
  cursor: pointer;
  transition: all 0.15s ease;
  border-radius: ${props => props.theme.borderRadius.large};
  min-height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: ${props => props.theme.colors.primary}08;
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  &:hover:not(:disabled) {
    color: ${props => props.active ? props.theme.colors.primary : props.theme.colors.text};
    border-bottom-color: ${props => props.active ? props.theme.colors.primary : props.theme.colors.primary}60;
    
    &::before {
      opacity: ${props => props.active ? 0 : 1};
    }
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 3px ${props => props.theme.colors.primary}40;
  }

  &:active {
    transform: translateY(1px);
  }

  &:disabled {
    color: ${props => props.theme.colors.lightText};
    cursor: not-allowed;
    opacity: 0.6;
    
    &::before {
      display: none;
    }
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.small} ${props => props.theme.spacing.medium};
    min-height: 32px;
    font-size: ${props => props.theme.fontSizes.responsive.xsmall};
  }
`;
