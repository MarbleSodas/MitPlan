/**
 * Error Handling Service
 * 
 * Centralized error handling and user feedback for plan sharing and collaboration
 */

class ErrorHandlingService {
  constructor() {
    this.errorCallbacks = new Set();
    this.warningCallbacks = new Set();
    this.infoCallbacks = new Set();

    // Throttling to prevent duplicate notifications
    this.recentNotifications = new Map();
    this.throttleTime = 1000; // 1 second
  }

  /**
   * Register callback for error notifications
   */
  onError(callback) {
    this.errorCallbacks.add(callback);
    return () => this.errorCallbacks.delete(callback);
  }

  /**
   * Register callback for warning notifications
   */
  onWarning(callback) {
    this.warningCallbacks.add(callback);
    return () => this.warningCallbacks.delete(callback);
  }

  /**
   * Register callback for info notifications
   */
  onInfo(callback) {
    this.infoCallbacks.add(callback);
    return () => this.infoCallbacks.delete(callback);
  }

  /**
   * Check if a notification is a duplicate and should be throttled
   */
  isDuplicateNotification(message) {
    const key = `${message.title}_${message.type}`;
    const now = Date.now();

    if (this.recentNotifications.has(key)) {
      const lastTime = this.recentNotifications.get(key);
      if (now - lastTime < this.throttleTime) {
        return true; // Duplicate within throttle time
      }
    }

    this.recentNotifications.set(key, now);

    // Clean up old entries to prevent memory leaks
    if (this.recentNotifications.size > 50) {
      const cutoff = now - this.throttleTime * 2;
      for (const [k, time] of this.recentNotifications.entries()) {
        if (time < cutoff) {
          this.recentNotifications.delete(k);
        }
      }
    }

    return false;
  }

  /**
   * Handle plan loading errors with user-friendly messages
   */
  handlePlanLoadError(error, planId, context = 'general') {
    console.error(`%c[ERROR HANDLER] Plan load error`, 'background: #f44336; color: white; padding: 2px 5px; border-radius: 3px;', {
      error: error.message,
      planId,
      context,
      stack: error.stack
    });

    let userMessage = {
      title: 'Plan Loading Failed',
      message: 'Unable to load the requested plan.',
      type: 'error',
      actions: []
    };

    // Customize message based on error type
    if (error.message === 'Plan not found') {
      userMessage = {
        title: 'Plan Not Found',
        message: 'The requested plan could not be found. It may have been deleted or the link is invalid.',
        type: 'error',
        actions: [
          { label: 'Go to Home', action: 'navigate_home' },
          { label: 'Create New Plan', action: 'create_plan' }
        ]
      };
    } else if (error.message === 'Access denied') {
      userMessage = {
        title: 'Access Denied',
        message: 'You do not have permission to view this plan. It may be private or require authentication.',
        type: 'error',
        actions: [
          { label: 'Sign In', action: 'sign_in' },
          { label: 'Go to Home', action: 'navigate_home' }
        ]
      };
    } else if (error.message.includes('network') || error.message.includes('fetch')) {
      userMessage = {
        title: 'Connection Error',
        message: 'Unable to connect to the server. Please check your internet connection and try again.',
        type: 'error',
        actions: [
          { label: 'Retry', action: 'retry_load' },
          { label: 'Go to Home', action: 'navigate_home' }
        ]
      };
    } else if (error.message.includes('validation')) {
      userMessage = {
        title: 'Invalid Plan Data',
        message: 'The plan data is corrupted or invalid. This plan cannot be loaded.',
        type: 'error',
        actions: [
          { label: 'Report Issue', action: 'report_issue' },
          { label: 'Go to Home', action: 'navigate_home' }
        ]
      };
    }

    this.notifyError(userMessage);
    return userMessage;
  }

  /**
   * Handle collaboration errors with graceful fallback
   */
  handleCollaborationError(error, planId, context = 'general') {
    console.error(`%c[ERROR HANDLER] Collaboration error`, 'background: #f44336; color: white; padding: 2px 5px; border-radius: 3px;', {
      error: error.message,
      planId,
      context,
      stack: error.stack
    });

    let userMessage = {
      title: 'Collaboration Error',
      message: 'Real-time collaboration is temporarily unavailable. You can still view and edit the plan.',
      type: 'warning',
      actions: []
    };

    // Customize message based on error type
    if (error.message.includes('permission') || error.message.includes('access')) {
      userMessage = {
        title: 'Collaboration Access Denied',
        message: 'You do not have permission to collaborate on this plan. You can view it in read-only mode.',
        type: 'warning',
        actions: [
          { label: 'Sign In for Full Access', action: 'sign_in' }
        ]
      };
    } else if (error.message.includes('validation')) {
      userMessage = {
        title: 'Plan Not Suitable for Collaboration',
        message: 'This plan cannot be used for real-time collaboration due to data issues. You can still view and edit it locally.',
        type: 'warning',
        actions: [
          { label: 'Create New Plan', action: 'create_plan' }
        ]
      };
    } else if (error.message.includes('network') || error.message.includes('connection')) {
      userMessage = {
        title: 'Connection Lost',
        message: 'Lost connection to collaboration server. Your changes are saved locally and will sync when connection is restored.',
        type: 'info',
        actions: [
          { label: 'Retry Connection', action: 'retry_collaboration' }
        ]
      };
    }

    this.notifyWarning(userMessage);
    return userMessage;
  }

  /**
   * Handle validation errors with helpful guidance
   */
  handleValidationError(validationResult, context = 'general') {
    console.warn(`%c[ERROR HANDLER] Validation error`, 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;', {
      context,
      errors: validationResult.errors,
      warnings: validationResult.warnings
    });

    if (validationResult.errors && validationResult.errors.length > 0) {
      const userMessage = {
        title: 'Plan Data Issues',
        message: `Found ${validationResult.errors.length} issue(s) with the plan data: ${validationResult.errors.join(', ')}`,
        type: 'error',
        actions: [
          { label: 'Try Different Plan', action: 'navigate_home' },
          { label: 'Report Issue', action: 'report_issue' }
        ]
      };
      this.notifyError(userMessage);
      return userMessage;
    }

    if (validationResult.warnings && validationResult.warnings.length > 0) {
      const userMessage = {
        title: 'Plan Data Warnings',
        message: `Plan loaded with warnings: ${validationResult.warnings.join(', ')}`,
        type: 'warning',
        actions: []
      };
      this.notifyWarning(userMessage);
      return userMessage;
    }

    return null;
  }

  /**
   * Handle import/export errors
   */
  handleImportExportError(error, operation = 'import') {
    console.error(`%c[ERROR HANDLER] ${operation} error`, 'background: #f44336; color: white; padding: 2px 5px; border-radius: 3px;', {
      error: error.message,
      operation,
      stack: error.stack
    });

    const userMessage = {
      title: `${operation === 'import' ? 'Import' : 'Export'} Failed`,
      message: `Failed to ${operation} plan data. ${error.message}`,
      type: 'error',
      actions: [
        { label: 'Try Again', action: `retry_${operation}` }
      ]
    };

    this.notifyError(userMessage);
    return userMessage;
  }

  /**
   * Provide helpful info messages for successful operations
   */
  handleSuccess(operation, details = {}) {
    console.log(`%c[ERROR HANDLER] Success: ${operation}`, 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;', details);

    let userMessage = null;

    switch (operation) {
      case 'plan_loaded':
        userMessage = {
          title: 'Plan Loaded Successfully',
          message: `Loaded plan "${details.planName}" with ${details.assignmentCount || 0} mitigation assignments.`,
          type: 'success',
          actions: []
        };
        break;
      case 'collaboration_started':
        userMessage = {
          title: 'Collaboration Active',
          message: `Real-time collaboration is now active. ${details.userCount || 1} user(s) connected.`,
          type: 'success',
          actions: []
        };
        break;
      case 'plan_shared':
        userMessage = {
          title: 'Plan Shared Successfully',
          message: 'Share link copied to clipboard. Others can now collaborate on this plan.',
          type: 'success',
          actions: []
        };
        break;
    }

    if (userMessage) {
      this.notifyInfo(userMessage);
    }

    return userMessage;
  }

  /**
   * Notify error callbacks
   */
  notifyError(message) {
    if (this.isDuplicateNotification(message)) {
      console.log('🔄 Throttling duplicate error notification:', message.title);
      return;
    }

    this.errorCallbacks.forEach(callback => {
      try {
        callback(message);
      } catch (error) {
        console.error('Error in error callback:', error);
      }
    });
  }

  /**
   * Notify warning callbacks
   */
  notifyWarning(message) {
    if (this.isDuplicateNotification(message)) {
      console.log('🔄 Throttling duplicate warning notification:', message.title);
      return;
    }

    this.warningCallbacks.forEach(callback => {
      try {
        callback(message);
      } catch (error) {
        console.error('Error in warning callback:', error);
      }
    });
  }

  /**
   * Notify info callbacks
   */
  notifyInfo(message) {
    if (this.isDuplicateNotification(message)) {
      console.log('🔄 Throttling duplicate info notification:', message.title);
      return;
    }

    this.infoCallbacks.forEach(callback => {
      try {
        callback(message);
      } catch (error) {
        console.error('Error in info callback:', error);
      }
    });
  }

  /**
   * Create a graceful fallback for failed operations
   */
  createFallback(operation, fallbackAction) {
    return {
      operation,
      fallback: fallbackAction,
      execute: () => {
        try {
          return fallbackAction();
        } catch (error) {
          console.error(`Fallback failed for ${operation}:`, error);
          return null;
        }
      }
    };
  }

  /**
   * Log comprehensive error information for debugging
   */
  logDebugInfo(context, data) {
    console.group(`%c[DEBUG] ${context}`, 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 3px;');
    console.log('Timestamp:', new Date().toISOString());
    console.log('URL:', window.location.href);
    console.log('User Agent:', navigator.userAgent);
    console.log('Data:', data);
    console.groupEnd();
  }
}

export default new ErrorHandlingService();
