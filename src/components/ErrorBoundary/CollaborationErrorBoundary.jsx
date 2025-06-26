/**
 * Collaboration Error Boundary
 * 
 * Catches and handles errors in the enhanced real-time collaboration system
 * to prevent crashes and provide graceful degradation.
 */

import React from 'react';
import collaborationDebugger from '../../utils/collaborationDebugger';

class CollaborationErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error, errorInfo) {
    // Generate unique error ID for tracking
    const errorId = `collab_error_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    
    // Log error to collaboration debugger
    collaborationDebugger.log('error', 'Collaboration component error caught', {
      errorId,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      errorInfo,
      component: this.props.componentName || 'Unknown',
      timestamp: new Date().toISOString()
    });

    // Update state with error details
    this.setState({
      error,
      errorInfo,
      errorId
    });

    // Report to external error tracking if available
    if (window.Sentry) {
      window.Sentry.captureException(error, {
        tags: {
          component: 'collaboration',
          errorBoundary: true
        },
        extra: {
          errorInfo,
          errorId,
          componentName: this.props.componentName
        }
      });
    }

    console.error('%c[COLLAB ERROR BOUNDARY] Error caught', 'background: #f44336; color: white; padding: 2px 5px; border-radius: 3px;', {
      errorId,
      error,
      errorInfo,
      component: this.props.componentName
    });
  }

  handleRetry = () => {
    collaborationDebugger.log('info', 'Collaboration error boundary retry attempted', {
      errorId: this.state.errorId,
      component: this.props.componentName
    });

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    });
  };

  handleFallbackMode = () => {
    collaborationDebugger.log('info', 'Collaboration fallback mode activated', {
      errorId: this.state.errorId,
      component: this.props.componentName
    });

    // Trigger fallback mode if callback provided
    if (this.props.onFallbackMode) {
      this.props.onFallbackMode();
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom error UI provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.state.errorInfo, this.handleRetry);
      }

      // Default error UI
      return (
        <div className="collaboration-error-boundary">
          <div className="error-container">
            <div className="error-icon">⚠️</div>
            <h3>Collaboration System Error</h3>
            <p>
              An error occurred in the real-time collaboration system. 
              You can continue using the application in offline mode.
            </p>
            
            {process.env.NODE_ENV === 'development' && (
              <details className="error-details">
                <summary>Error Details (Development)</summary>
                <div className="error-info">
                  <p><strong>Error ID:</strong> {this.state.errorId}</p>
                  <p><strong>Component:</strong> {this.props.componentName || 'Unknown'}</p>
                  <p><strong>Error:</strong> {this.state.error?.message}</p>
                  {this.state.error?.stack && (
                    <pre className="error-stack">{this.state.error.stack}</pre>
                  )}
                </div>
              </details>
            )}

            <div className="error-actions">
              <button 
                onClick={this.handleRetry}
                className="retry-button"
              >
                Retry Collaboration
              </button>
              <button 
                onClick={this.handleFallbackMode}
                className="fallback-button"
              >
                Continue Offline
              </button>
            </div>
          </div>

          <style jsx>{`
            .collaboration-error-boundary {
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 200px;
              padding: 20px;
              background-color: #fff3cd;
              border: 1px solid #ffeaa7;
              border-radius: 8px;
              margin: 10px;
            }

            .error-container {
              text-align: center;
              max-width: 500px;
            }

            .error-icon {
              font-size: 48px;
              margin-bottom: 16px;
            }

            .error-container h3 {
              color: #856404;
              margin-bottom: 12px;
              font-size: 1.25rem;
            }

            .error-container p {
              color: #856404;
              margin-bottom: 20px;
              line-height: 1.5;
            }

            .error-details {
              text-align: left;
              margin: 20px 0;
              padding: 15px;
              background-color: #f8f9fa;
              border-radius: 4px;
              border: 1px solid #dee2e6;
            }

            .error-details summary {
              cursor: pointer;
              font-weight: bold;
              color: #495057;
              margin-bottom: 10px;
            }

            .error-info p {
              margin: 8px 0;
              font-size: 0.9rem;
              color: #495057;
            }

            .error-stack {
              background-color: #f1f3f4;
              padding: 10px;
              border-radius: 4px;
              font-size: 0.8rem;
              overflow-x: auto;
              white-space: pre-wrap;
              color: #d73a49;
            }

            .error-actions {
              display: flex;
              gap: 12px;
              justify-content: center;
              margin-top: 20px;
            }

            .retry-button, .fallback-button {
              padding: 10px 20px;
              border: none;
              border-radius: 4px;
              cursor: pointer;
              font-weight: 500;
              transition: background-color 0.2s;
            }

            .retry-button {
              background-color: #007bff;
              color: white;
            }

            .retry-button:hover {
              background-color: #0056b3;
            }

            .fallback-button {
              background-color: #6c757d;
              color: white;
            }

            .fallback-button:hover {
              background-color: #545b62;
            }

            @media (max-width: 768px) {
              .collaboration-error-boundary {
                margin: 5px;
                padding: 15px;
              }

              .error-actions {
                flex-direction: column;
              }

              .retry-button, .fallback-button {
                width: 100%;
              }
            }
          `}</style>
        </div>
      );
    }

    return this.props.children;
  }
}

export default CollaborationErrorBoundary;
