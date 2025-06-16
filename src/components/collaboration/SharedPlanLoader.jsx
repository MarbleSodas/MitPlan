import React, { useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { AlertTriangle, RefreshCw, Home, ExternalLink, Loader, Users, Clock } from 'lucide-react';

// Animations
const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

const shimmer = keyframes`
  0% { background-position: -200px 0; }
  100% { background-position: calc(200px + 100%) 0; }
`;

// Container
const LoaderContainer = styled.div`
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

// Loading States
const LoadingIcon = styled.div`
  margin-bottom: 1.5rem;
  color: ${props => props.theme.colors.primary || '#2196F3'};
  animation: ${spin} 1s linear infinite;
`;

const LoadingTitle = styled.h1`
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: ${props => props.theme.colors.text};
`;

const LoadingMessage = styled.p`
  font-size: 1rem;
  line-height: 1.6;
  margin-bottom: 2rem;
  max-width: 500px;
  color: ${props => props.theme.colors.textSecondary || props.theme.colors.text};
`;

// Skeleton Components
const SkeletonContainer = styled.div`
  width: 100%;
  max-width: 800px;
  margin: 2rem auto;
  padding: 1rem;
`;

const SkeletonItem = styled.div`
  height: ${props => props.$height || '20px'};
  background: linear-gradient(90deg,
    ${props => props.theme.colors.border || '#e0e0e0'} 25%,
    ${props => props.theme.colors.surface || '#f5f5f5'} 50%,
    ${props => props.theme.colors.border || '#e0e0e0'} 75%
  );
  background-size: 200px 100%;
  animation: ${shimmer} 1.5s infinite;
  border-radius: 4px;
  margin-bottom: ${props => props.$marginBottom || '1rem'};
`;

const SkeletonRow = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
`;

// Error States
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

// Buttons
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
    
    &:hover:not(:disabled) {
      background: ${props.theme.colors.primaryHover || '#1976D2'};
      transform: translateY(-1px);
    }
  `}

  ${props => props.variant === 'secondary' && `
    background: ${props.theme.colors.surface || '#f5f5f5'};
    color: ${props.theme.colors.text};
    border: 1px solid ${props.theme.colors.border || '#e0e0e0'};
    
    &:hover:not(:disabled) {
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

// Progress Indicator
const ProgressContainer = styled.div`
  margin: 1rem 0;
  padding: 1rem;
  background: ${props => props.theme.colors.surface || '#f5f5f5'};
  border-radius: 6px;
  font-size: 0.875rem;
  color: ${props => props.theme.colors.textSecondary || props.theme.colors.text};
`;

const ProgressSteps = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
`;

const ProgressStep = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  opacity: ${props => props.$active ? 1 : 0.5};
  animation: ${props => props.$active ? pulse : 'none'} 1.5s infinite;
`;

const SharedPlanLoader = ({ 
  isLoading = false, 
  error = null, 
  onRetry = null,
  planId = null,
  showSkeleton = false 
}) => {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const handleRetry = async () => {
    if (isRetrying || !onRetry) return;
    
    setIsRetrying(true);
    setRetryCount(prev => prev + 1);
    
    try {
      await onRetry();
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

  // Loading State
  if (isLoading) {
    return (
      <LoaderContainer>
        <LoadingIcon>
          <Loader size={48} />
        </LoadingIcon>
        
        <LoadingTitle>Loading Shared Plan</LoadingTitle>
        <LoadingMessage>
          Fetching plan data and preparing collaboration features...
        </LoadingMessage>

        <ProgressContainer>
          <div>Loading Progress</div>
          <ProgressSteps>
            <ProgressStep $active={true}>
              <Clock size={16} />
              Connecting to database
            </ProgressStep>
            <ProgressStep $active={false}>
              <Users size={16} />
              Setting up collaboration
            </ProgressStep>
          </ProgressSteps>
        </ProgressContainer>

        {showSkeleton && (
          <SkeletonContainer>
            <SkeletonItem $height="40px" $marginBottom="2rem" />
            <SkeletonRow>
              <SkeletonItem $height="60px" />
              <SkeletonItem $height="60px" />
              <SkeletonItem $height="60px" />
            </SkeletonRow>
            <SkeletonItem $height="30px" />
            <SkeletonItem $height="30px" />
            <SkeletonItem $height="30px" />
          </SkeletonContainer>
        )}
      </LoaderContainer>
    );
  }

  // Error State
  if (error) {
    const getErrorInfo = () => {
      switch (error.type) {
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
      <LoaderContainer>
        <ErrorIcon>
          <AlertTriangle size={48} />
        </ErrorIcon>
        
        <ErrorTitle>{errorInfo.title}</ErrorTitle>
        <ErrorMessage>{errorInfo.message}</ErrorMessage>
        
        {planId && (
          <ProgressContainer>
            Plan ID: {planId}
            {error.message && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', opacity: 0.8 }}>
                Error: {error.message}
              </div>
            )}
          </ProgressContainer>
        )}
        
        <ButtonGroup>
          {errorInfo.showRetry && error.canRetry && (
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
          <ProgressContainer style={{ marginTop: '1rem' }}>
            Retry attempts: {retryCount}
            {retryCount >= 3 && (
              <div style={{ marginTop: '0.5rem' }}>
                If the problem persists, the plan may no longer be available.
              </div>
            )}
          </ProgressContainer>
        )}
      </LoaderContainer>
    );
  }

  // No loading or error - don't render anything
  return null;
};

export default SharedPlanLoader;
