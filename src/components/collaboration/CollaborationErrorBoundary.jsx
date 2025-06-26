import React from 'react';
import styled from 'styled-components';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: ${props => props.theme.colors.background};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 8px;
  margin: 1rem;
  text-align: center;
  min-height: 200px;
`;

const ErrorIcon = styled.div`
  color: ${props => props.theme.colors.error};
  margin-bottom: 1rem;
`;

const ErrorTitle = styled.h3`
  color: ${props => props.theme.colors.text};
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
  font-weight: 600;
`;

const ErrorMessage = styled.p`
  color: ${props => props.theme.colors.textSecondary};
  margin: 0 0 1.5rem 0;
  max-width: 500px;
  line-height: 1.5;
`;

const ErrorDetails = styled.details`
  margin: 1rem 0;
  padding: 1rem;
  background: ${props => props.theme.colors.secondary};
  border-radius: 4px;
  text-align: left;
  max-width: 600px;
  
  summary {
    cursor: pointer;
    font-weight: 600;
    color: ${props => props.theme.colors.text};
    margin-bottom: 0.5rem;
  }
  
  pre {
    font-size: 0.875rem;
    color: ${props => props.theme.colors.textSecondary};
    white-space: pre-wrap;
    word-break: break-word;
  }
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
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  
  ${props => props.variant === 'primary' ? `
    background: ${props.theme.colors.primary};
    color: white;
    
    &:hover {
      background: ${props.theme.colors.primaryHover};
    }
  ` : `
    background: ${props.theme.colors.secondary};
    color: ${props.theme.colors.text};
    
    &:hover {
      background: ${props.theme.colors.secondaryHover};
    }
  `}
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

class CollaborationErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error for debugging
    console.error('Collaboration Error Boundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
      hasError: true
    });

    // Report to error tracking service if available
    if (window.gtag) {
      window.gtag('event', 'exception', {
        description: `Collaboration Error: ${error.message}`,
        fatal: false
      });
    }
  }

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, retryCount } = this.state;
      const isFirebaseError = error?.message?.includes('PERMISSION_DENIED') || 
                             error?.message?.includes('Firebase') ||
                             error?.code === 'PERMISSION_DENIED';
      
      return (
        <ErrorContainer>
          <ErrorIcon>
            <AlertTriangle size={48} />
          </ErrorIcon>
          
          <ErrorTitle>
            {isFirebaseError ? 'Collaboration Connection Error' : 'Something went wrong'}
          </ErrorTitle>
          
          <ErrorMessage>
            {isFirebaseError ? (
              <>
                Unable to connect to the collaboration service. This might be due to network issues 
                or temporary service unavailability. The plan will continue to work in read-only mode.
              </>
            ) : (
              <>
                An unexpected error occurred in the collaboration system. 
                You can continue using the plan, but real-time collaboration may not work.
              </>
            )}
          </ErrorMessage>

          {retryCount > 0 && (
            <ErrorMessage style={{ fontSize: '0.875rem', fontStyle: 'italic' }}>
              Retry attempts: {retryCount}
            </ErrorMessage>
          )}

          <ButtonGroup>
            <Button variant="primary" onClick={this.handleRetry}>
              <RefreshCw size={16} />
              Try Again
            </Button>
            
            <Button onClick={this.handleReload}>
              <RefreshCw size={16} />
              Reload Page
            </Button>
            
            <Button onClick={this.handleGoHome}>
              <Home size={16} />
              Go Home
            </Button>
          </ButtonGroup>

          {process.env.NODE_ENV === 'development' && error && (
            <ErrorDetails>
              <summary>Error Details (Development)</summary>
              <pre>
                {error.toString()}
                {errorInfo?.componentStack}
              </pre>
            </ErrorDetails>
          )}
        </ErrorContainer>
      );
    }

    return this.props.children;
  }
}

export default CollaborationErrorBoundary;
