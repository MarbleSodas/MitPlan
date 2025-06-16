import React, { useState, useEffect } from 'react';
import ErrorHandlingService from '../../../services/ErrorHandlingService';
import './NotificationBanner.css';

/**
 * NotificationBanner Component
 * 
 * Displays user-friendly error messages, warnings, and success notifications
 * Integrates with ErrorHandlingService for centralized error handling
 */
const NotificationBanner = () => {
  const [notifications, setNotifications] = useState([]);

  // Generate unique notification ID to prevent duplicate keys
  const generateNotificationId = () => {
    return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  useEffect(() => {
    // Register for error notifications
    const unsubscribeError = ErrorHandlingService.onError((message) => {
      addNotification({ ...message, id: generateNotificationId() });
    });

    const unsubscribeWarning = ErrorHandlingService.onWarning((message) => {
      addNotification({ ...message, id: generateNotificationId() });
    });

    const unsubscribeInfo = ErrorHandlingService.onInfo((message) => {
      addNotification({ ...message, id: generateNotificationId() });
    });

    return () => {
      unsubscribeError();
      unsubscribeWarning();
      unsubscribeInfo();
    };
  }, []);

  const addNotification = (notification) => {
    // Prevent duplicate notifications with the same title and message
    setNotifications(prev => {
      const isDuplicate = prev.some(existing =>
        existing.title === notification.title &&
        existing.message === notification.message &&
        existing.type === notification.type
      );

      if (isDuplicate) {
        console.log('🔄 Skipping duplicate notification:', notification.title);
        return prev;
      }

      return [...prev, notification];
    });

    // Auto-remove success and info notifications after 5 seconds
    if (notification.type === 'success' || notification.type === 'info') {
      setTimeout(() => {
        removeNotification(notification.id);
      }, 5000);
    }
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleAction = (action, notificationId) => {
    // Handle different action types
    switch (action) {
      case 'navigate_home':
        window.location.href = '/';
        break;
      case 'create_plan':
        window.location.href = '/?new=true';
        break;
      case 'sign_in':
        // Trigger sign in modal or redirect
        const signInEvent = new CustomEvent('show-auth-modal', { detail: { mode: 'signin' } });
        window.dispatchEvent(signInEvent);
        break;
      case 'retry_load':
        window.location.reload();
        break;
      case 'retry_collaboration':
        // Trigger collaboration retry
        const retryEvent = new CustomEvent('retry-collaboration');
        window.dispatchEvent(retryEvent);
        break;
      case 'report_issue':
        // Open issue reporting (could be a modal or external link)
        console.log('Report issue action triggered');
        break;
      default:
        console.warn('Unknown action:', action);
    }

    // Remove notification after action
    removeNotification(notificationId);
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'success':
        return '✅';
      case 'info':
        return 'ℹ️';
      default:
        return 'ℹ️';
    }
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="notification-banner-container">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`notification-banner notification-banner--${notification.type}`}
        >
          <div className="notification-banner__content">
            <div className="notification-banner__icon">
              {getNotificationIcon(notification.type)}
            </div>
            <div className="notification-banner__text">
              <div className="notification-banner__title">
                {notification.title}
              </div>
              <div className="notification-banner__message">
                {notification.message}
              </div>
            </div>
          </div>
          
          <div className="notification-banner__actions">
            {notification.actions && notification.actions.map((action, index) => (
              <button
                key={index}
                className="notification-banner__action-button"
                onClick={() => handleAction(action.action, notification.id)}
              >
                {action.label}
              </button>
            ))}
            <button
              className="notification-banner__close-button"
              onClick={() => removeNotification(notification.id)}
              aria-label="Close notification"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default NotificationBanner;
