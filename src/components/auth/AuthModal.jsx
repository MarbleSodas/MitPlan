import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  ModalOverlay,
  ModalContainer,
  ModalHeader,
  ModalTitle,
  CloseButton,
  ModalBody,
  TabNavigation,
  TabButton,
  ErrorMessage,
  SuccessMessage
} from '../styled/AuthComponents';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import ForgotPasswordForm from './ForgotPasswordForm';

const AuthModal = ({ isOpen, onClose, initialTab = 'login' }) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [message, setMessage] = useState(null);
  const { error, clearError, isLoading } = useAuth();

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Clear error when modal opens/closes or tab changes
  useEffect(() => {
    if (isOpen) {
      clearError();
      setMessage(null);
    }
  }, [isOpen, activeTab, clearError]);

  // Handle overlay click
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle successful registration
  const handleRegistrationSuccess = (result) => {
    if (result.verification_required) {
      setMessage({
        type: 'success',
        text: 'Account created successfully! Please check your email to verify your account before logging in.'
      });
      setActiveTab('login');
    } else {
      setMessage({
        type: 'success',
        text: 'Account created successfully! You can now log in.'
      });
      setActiveTab('login');
    }
  };

  // Handle successful login
  const handleLoginSuccess = () => {
    onClose();
  };

  // Handle password reset request
  const handlePasswordResetSuccess = () => {
    setMessage({
      type: 'success',
      text: 'Password reset instructions have been sent to your email.'
    });
    setActiveTab('login');
  };

  if (!isOpen) return null;

  const getTabTitle = () => {
    switch (activeTab) {
      case 'register':
        return 'Create Account';
      case 'forgot':
        return 'Reset Password';
      default:
        return 'Sign In';
    }
  };

  return (
    <ModalOverlay onClick={handleOverlayClick}>
      <ModalContainer>
        <ModalHeader>
          <ModalTitle>{getTabTitle()}</ModalTitle>
          <CloseButton onClick={onClose} aria-label="Close modal">
            ×
          </CloseButton>
        </ModalHeader>

        <ModalBody>
          {/* Show global error or success message */}
          {error && (
            <ErrorMessage>
              ⚠️ {error}
            </ErrorMessage>
          )}
          
          {message && (
            <div>
              {message.type === 'success' ? (
                <SuccessMessage>
                  ✅ {message.text}
                </SuccessMessage>
              ) : (
                <ErrorMessage>
                  ⚠️ {message.text}
                </ErrorMessage>
              )}
            </div>
          )}

          {/* Tab Navigation - only show for login/register */}
          {activeTab !== 'forgot' && (
            <TabNavigation>
              <TabButton
                $active={activeTab === 'login'}
                onClick={() => setActiveTab('login')}
                disabled={isLoading}
              >
                Sign In
              </TabButton>
              <TabButton
                $active={activeTab === 'register'}
                onClick={() => setActiveTab('register')}
                disabled={isLoading}
              >
                Create Account
              </TabButton>
            </TabNavigation>
          )}

          {/* Tab Content */}
          {activeTab === 'login' && (
            <LoginForm
              onSuccess={handleLoginSuccess}
              onForgotPassword={() => setActiveTab('forgot')}
            />
          )}

          {activeTab === 'register' && (
            <RegisterForm
              onSuccess={handleRegistrationSuccess}
              onSwitchToLogin={() => setActiveTab('login')}
            />
          )}

          {activeTab === 'forgot' && (
            <ForgotPasswordForm
              onSuccess={handlePasswordResetSuccess}
              onBackToLogin={() => setActiveTab('login')}
            />
          )}
        </ModalBody>
      </ModalContainer>
    </ModalOverlay>
  );
};

export default AuthModal;
