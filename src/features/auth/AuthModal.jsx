import React, { useState } from 'react';
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
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background-color: ${props => props.theme.cardBackground};
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  padding: 20px;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 10px;
  right: 10px;
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: ${props => props.theme.textSecondary};
  
  &:hover {
    color: ${props => props.theme.textPrimary};
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