import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { AlertTriangle, RefreshCw, Home, ExternalLink } from 'lucide-react';

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  padding: 2rem;
  text-align: center;
  background: ${props => props.theme.colors.background};
  color: ${props => props.theme.colors.text};
`;

const ErrorIcon = styled.div`
  margin-bottom: 1.5rem;
  color: ${props => props.theme.colors.error || '#f44336'};
`;

const ErrorTitle = styled.h1`
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: ${props => props.theme.colors.text};
`;

const ErrorMessage = styled.p`
  font-size: 1rem;
  line-height: 1.6;
  margin-bottom: 2rem;
  max-width: 500px;
  color: ${props => props.theme.colors.textSecondary || props.theme.colors.text};
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: center;
`;

const Button = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;

  ${props => props.variant === 'primary' && `
    background: ${props.theme.colors.primary || '#2196F3'};
    color: white;
    
    &:hover {
      background: ${props.theme.colors.primaryHover || '#1976D2'};
      transform: translateY(-1px);
    }
  `}

  ${props => props.variant === 'secondary' && `
    background: ${props.theme.colors.surface || '#f5f5f5'};
    color: ${props.theme.colors.text};
    border: 1px solid ${props.theme.colors.border || '#e0e0e0'};
    
    &:hover {
      background: ${props.theme.colors.surfaceHover || '#eeeeee'};
      transform: translateY(-1px);
    }
  `}

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const RetryInfo = styled.div`
  margin-top: 1rem;
  padding: 1rem;
  background: ${props => props.theme.colors.surface || '#f5f5f5'};
  border-radius: 6px;
  font-size: 0.875rem;
  color: ${props => props.theme.colors.textSecondary || props.theme.colors.text};
`;

const ShareLinkErrorHandler = ({ error, planId, onRetry }) => {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Parse URL error parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlError = urlParams.get('error');
    
    if (urlError && !error) {
      // Clean up URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, [error]);

  const handleRetry = async () => {
    if (isRetrying) return;
    
    setIsRetrying(true);
    setRetryCount(prev => prev + 1);
    
    try {
      if (onRetry) {
        await onRetry();
      } else {
        // Default retry: reload the page
        window.location.reload();
      }
    } catch (retryError) {
      console.error('Retry failed:', retryError);
    } finally {
      setIsRetrying(false);
    }
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  const handleCreatePlan = () => {
    window.location.href = '/?action=create';
  };

  const getErrorInfo = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlError = urlParams.get('error');
    const errorType = error || urlError;

    switch (errorType) {
      case 'plan_not_found':
        return {
          title: 'Plan Not Found',
          message: 'The shared plan you\'re looking for doesn\'t exist or has been removed. It may have been deleted by the owner or the link might be incorrect.',
          showRetry: false,
          showCreate: true
        };
      
      case 'invalid_plan_id':
        return {
          title: 'Invalid Share Link',
          message: 'The share link appears to be malformed or corrupted. Please check the link and try again, or ask the plan owner for a new share link.',
          showRetry: false,
          showCreate: true
        };
      
      case 'access_denied':
        return {
          title: 'Access Denied',
          message: 'You don\'t have permission to view this plan. The plan may be private or your access may have been revoked.',
          showRetry: true,
          showCreate: true
        };
      
      case 'network_error':
        return {
          title: 'Connection Error',
          message: 'Unable to load the shared plan due to a network error. Please check your internet connection and try again.',
          showRetry: true,
          showCreate: false
        };
      
      case 'session_closed':
        return {
          title: 'Collaboration Session Ended',
          message: 'The collaboration session for this plan has been closed by the owner. You can still view the plan, but real-time collaboration is no longer available.',
          showRetry: true,
          showCreate: true
        };
      
      default:
        return {
          title: 'Unable to Load Plan',
          message: 'An unexpected error occurred while loading the shared plan. Please try again or contact support if the problem persists.',
          showRetry: true,
          showCreate: true
        };
    }
  };

  const errorInfo = getErrorInfo();

  return (
    <ErrorContainer>
      <ErrorIcon>
        <AlertTriangle size={48} />
      </ErrorIcon>
      
      <ErrorTitle>{errorInfo.title}</ErrorTitle>
      <ErrorMessage>{errorInfo.message}</ErrorMessage>
      
      <ButtonGroup>
        {errorInfo.showRetry && (
          <Button 
            variant="primary" 
            onClick={handleRetry}
            disabled={isRetrying}
          >
            <RefreshCw size={16} />
            {isRetrying ? 'Retrying...' : 'Try Again'}
          </Button>
        )}
        
        <Button variant="secondary" onClick={handleGoHome}>
          <Home size={16} />
          Go Home
        </Button>
        
        {errorInfo.showCreate && (
          <Button variant="secondary" onClick={handleCreatePlan}>
            <ExternalLink size={16} />
            Create New Plan
          </Button>
        )}
      </ButtonGroup>
      
      {retryCount > 0 && (
        <RetryInfo>
          Retry attempts: {retryCount}
          {retryCount >= 3 && (
            <div style={{ marginTop: '0.5rem' }}>
              If the problem persists, the plan may no longer be available.
            </div>
          )}
        </RetryInfo>
      )}
    </ErrorContainer>
  );
};

export default ShareLinkErrorHandler;
