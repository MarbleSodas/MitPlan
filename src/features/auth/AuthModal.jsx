import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import ForgotPasswordForm from './ForgotPasswordForm';
import ResetPasswordForm from './ResetPasswordForm';
import EmailVerification from './EmailVerification';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: ${props => props.theme.mode === 'dark' ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)'};
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: ${props => props.theme.spacing.medium};
  backdrop-filter: blur(2px);
  animation: fadeIn 0.2s ease-out;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const ModalContent = styled.div`
  background-color: ${props => props.theme.colors.cardBackground};
  border-radius: ${props => props.theme.borderRadius.large};
  box-shadow: ${props => props.theme.shadows.xlarge};
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  padding: ${props => props.theme.spacing.large};
  animation: slideUp 0.3s ease-out;

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.medium};
    max-width: 100%;
    max-height: 85vh;
  }
`;

const CloseButton = styled.button`
  position: absolute;
  top: ${props => props.theme.spacing.small};
  right: ${props => props.theme.spacing.small};
  background: none;
  border: none;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  color: ${props => props.theme.colors.lightText};
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s ease;

  &:hover {
    color: ${props => props.theme.colors.text};
    background-color: ${props => props.theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'};
  }

  &:active {
    transform: scale(0.95);
  }
`;

const AuthModal = ({ isOpen, onClose, initialView = 'login', resetToken, verifyToken }) => {
  const [currentView, setCurrentView] = useState(
    resetToken ? 'reset-password' :
    verifyToken ? 'verify-email' :
    initialView
  );

  if (!isOpen) {
    return null;
  }

  const handleLoginClick = () => {
    setCurrentView('login');
  };

  const handleRegisterClick = () => {
    setCurrentView('register');
  };

  const handleForgotPasswordClick = () => {
    setCurrentView('forgot-password');
  };

  const handleSuccess = () => {
    // Close modal on successful login
    onClose();
  };

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={e => e.stopPropagation()}>
        <CloseButton onClick={onClose}>&times;</CloseButton>

        {currentView === 'login' && (
          <LoginForm
            onRegisterClick={handleRegisterClick}
            onForgotPasswordClick={handleForgotPasswordClick}
            onSuccess={handleSuccess}
          />
        )}

        {currentView === 'register' && (
          <RegisterForm
            onLoginClick={handleLoginClick}
          />
        )}

        {currentView === 'forgot-password' && (
          <ForgotPasswordForm
            onLoginClick={handleLoginClick}
          />
        )}

        {currentView === 'reset-password' && (
          <ResetPasswordForm
            token={resetToken}
            onLoginClick={handleLoginClick}
          />
        )}

        {currentView === 'verify-email' && (
          <EmailVerification
            token={verifyToken}
            onLoginClick={handleLoginClick}
          />
        )}
      </ModalContent>
    </ModalOverlay>
  );
};

export default AuthModal;