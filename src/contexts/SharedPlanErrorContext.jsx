import React, { createContext, useContext, useState, useCallback } from 'react';
import { useReadOnly } from './ReadOnlyContext';

// Create the context
const SharedPlanErrorContext = createContext();

// Error types and their configurations
const ERROR_CONFIGS = {
  invalid_plan_id: {
    canRetry: false,
    clearPlanData: true,
    severity: 'error'
  },
  plan_not_found: {
    canRetry: true,
    clearPlanData: true,
    severity: 'error'
  },
  access_denied: {
    canRetry: true,
    clearPlanData: false,
    severity: 'warning'
  },
  network_error: {
    canRetry: true,
    clearPlanData: false,
    severity: 'error'
  },
  session_closed: {
    canRetry: true,
    clearPlanData: false,
    severity: 'warning'
  },
  validation_error: {
    canRetry: false,
    clearPlanData: true,
    severity: 'error'
  }
};

// Provider component
export const SharedPlanErrorProvider = ({ children }) => {
  const { clearPlanContext, setUrlErrorState, clearUrlError } = useReadOnly();
  
  const [errorHistory, setErrorHistory] = useState([]);
  const [retryAttempts, setRetryAttempts] = useState({});
  const [isRetrying, setIsRetrying] = useState(false);

  // Set error with enhanced functionality
  const setError = useCallback((error) => {
    console.log('%c[SHARED PLAN ERROR] Setting error', 'background: #f44336; color: white; padding: 2px 5px; border-radius: 3px;', error);
    
    const errorConfig = ERROR_CONFIGS[error.type] || ERROR_CONFIGS.network_error;
    const enhancedError = {
      ...error,
      ...errorConfig,
      timestamp: Date.now(),
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    // Clear plan data if required by error type
    if (errorConfig.clearPlanData) {
      clearPlanContext();
    }

    // Add to error history
    setErrorHistory(prev => [...prev.slice(-4), enhancedError]); // Keep last 5 errors

    // Set error in ReadOnlyContext for UI display
    setUrlErrorState(enhancedError);

    return enhancedError;
  }, [clearPlanContext, setUrlErrorState]);

  // Clear error
  const clearError = useCallback(() => {
    console.log('%c[SHARED PLAN ERROR] Clearing error', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;');
    clearUrlError();
  }, [clearUrlError]);

  // Retry functionality with exponential backoff
  const retryOperation = useCallback(async (operation, errorId) => {
    if (isRetrying) {
      console.warn('%c[SHARED PLAN ERROR] Retry already in progress', 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;');
      return false;
    }

    const currentAttempts = retryAttempts[errorId] || 0;
    const maxAttempts = 3;
    
    if (currentAttempts >= maxAttempts) {
      console.warn('%c[SHARED PLAN ERROR] Max retry attempts reached', 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;', { errorId, attempts: currentAttempts });
      return false;
    }

    setIsRetrying(true);
    setRetryAttempts(prev => ({ ...prev, [errorId]: currentAttempts + 1 }));

    try {
      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.pow(2, currentAttempts) * 1000;
      if (delay > 0) {
        console.log('%c[SHARED PLAN ERROR] Waiting before retry', 'background: #2196F3; color: white; padding: 2px 5px; border-radius: 3px;', { delay, attempt: currentAttempts + 1 });
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      console.log('%c[SHARED PLAN ERROR] Executing retry operation', 'background: #2196F3; color: white; padding: 2px 5px; border-radius: 3px;', { attempt: currentAttempts + 1 });
      
      const result = await operation();
      
      // Clear error on successful retry
      clearError();
      
      console.log('%c[SHARED PLAN ERROR] Retry successful', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;', { attempt: currentAttempts + 1 });
      
      return true;
    } catch (retryError) {
      console.error('%c[SHARED PLAN ERROR] Retry failed', 'background: #f44336; color: white; padding: 2px 5px; border-radius: 3px;', { 
        attempt: currentAttempts + 1, 
        error: retryError.message 
      });
      
      // Set new error for the retry failure
      setError({
        type: 'network_error',
        planId: errorId,
        message: `Retry failed: ${retryError.message}`,
        originalError: retryError
      });
      
      return false;
    } finally {
      setIsRetrying(false);
    }
  }, [isRetrying, retryAttempts, clearError, setError]);

  // Get retry count for a specific error
  const getRetryCount = useCallback((errorId) => {
    return retryAttempts[errorId] || 0;
  }, [retryAttempts]);

  // Check if retry is available for error type
  const canRetry = useCallback((errorType) => {
    const config = ERROR_CONFIGS[errorType];
    return config ? config.canRetry : false;
  }, []);

  // Get error severity
  const getErrorSeverity = useCallback((errorType) => {
    const config = ERROR_CONFIGS[errorType];
    return config ? config.severity : 'error';
  }, []);

  // Get recent errors for debugging
  const getRecentErrors = useCallback(() => {
    return errorHistory.slice(-3); // Last 3 errors
  }, [errorHistory]);

  // Clear retry attempts for a specific error
  const clearRetryAttempts = useCallback((errorId) => {
    setRetryAttempts(prev => {
      const updated = { ...prev };
      delete updated[errorId];
      return updated;
    });
  }, []);

  // Reset all error state
  const resetErrorState = useCallback(() => {
    console.log('%c[SHARED PLAN ERROR] Resetting all error state', 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 3px;');
    clearError();
    setErrorHistory([]);
    setRetryAttempts({});
    setIsRetrying(false);
  }, [clearError]);

  // Enhanced error logging for debugging
  const logErrorDetails = useCallback((context, additionalData = {}) => {
    console.group('%c[SHARED PLAN ERROR] Debug Info', 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 3px;');
    console.log('Context:', context);
    console.log('Current URL:', window.location.href);
    console.log('Error History:', errorHistory);
    console.log('Retry Attempts:', retryAttempts);
    console.log('Is Retrying:', isRetrying);
    console.log('Additional Data:', additionalData);
    console.groupEnd();
  }, [errorHistory, retryAttempts, isRetrying]);

  // Context value
  const contextValue = {
    // State
    errorHistory,
    retryAttempts,
    isRetrying,

    // Actions
    setError,
    clearError,
    retryOperation,
    resetErrorState,
    clearRetryAttempts,

    // Helpers
    getRetryCount,
    canRetry,
    getErrorSeverity,
    getRecentErrors,
    logErrorDetails,

    // Constants
    ERROR_CONFIGS,
    MAX_RETRY_ATTEMPTS: 3
  };

  return (
    <SharedPlanErrorContext.Provider value={contextValue}>
      {children}
    </SharedPlanErrorContext.Provider>
  );
};

// Custom hook for using the shared plan error context
export const useSharedPlanError = () => {
  const context = useContext(SharedPlanErrorContext);
  if (context === undefined) {
    throw new Error('useSharedPlanError must be used within a SharedPlanErrorProvider');
  }
  return context;
};

// HOC for components that need error handling
export const withSharedPlanErrorHandling = (Component) => {
  return function WrappedComponent(props) {
    const errorContext = useSharedPlanError();
    
    return (
      <Component 
        {...props} 
        errorHandling={errorContext}
      />
    );
  };
};

export default SharedPlanErrorContext;
