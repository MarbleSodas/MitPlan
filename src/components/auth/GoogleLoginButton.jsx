import React, { useState } from 'react';
import styled from 'styled-components';
import { useAuth } from '../../contexts/AuthContext';

const GoogleButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${props => props.theme.spacing.medium};
  width: 100%;
  padding: ${props => props.theme.spacing.medium} ${props => props.theme.spacing.xlarge};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.large};
  background-color: ${props => props.theme.colors.cardBackground};
  color: ${props => props.theme.colors.text};
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
  font-size: ${props => props.theme.fontSizes.responsive.medium};
  font-weight: 600;
  letter-spacing: 0.025em;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
  min-height: 48px;

  &:hover:not(:disabled) {
    background-color: ${props => props.theme.colors.background};
    border-color: ${props => props.theme.colors.primary};
    transform: translateY(-1px);
    box-shadow: ${props => props.theme.shadows.medium};
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 3px ${props => props.theme.colors.primary}40;
  }

  &:active:not(:disabled) {
    transform: translateY(0);
    box-shadow: ${props => props.theme.shadows.small};
  }

  &:disabled {
    background-color: ${props => props.theme.colors.border};
    border-color: ${props => props.theme.colors.border};
    color: ${props => props.theme.colors.lightText};
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const GoogleIcon = styled.div`
  width: 20px;
  height: 20px;
  background-image: url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill='%234285F4' d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'/%3E%3Cpath fill='%2334A853' d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'/%3E%3Cpath fill='%23FBBC05' d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z'/%3E%3Cpath fill='%23EA4335' d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'/%3E%3C/svg%3E");
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
`;

const GoogleLoginButton = ({
  onSuccess,
  disabled = false,
  text = "Continue with Google"
}) => {
  const { signInWithGoogle } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    if (disabled || isLoading) return;

    setIsLoading(true);
    try {
      const result = await signInWithGoogle();

      if (result.success && onSuccess) {
        onSuccess(result);
      }
    } catch (error) {
      console.error('Google sign-in error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <GoogleButton
      type="button"
      onClick={handleClick}
      disabled={disabled || isLoading}
      aria-label={text}
    >
      <GoogleIcon />
      {isLoading ? 'Signing in...' : text}
    </GoogleButton>
  );
};

export default GoogleLoginButton;
