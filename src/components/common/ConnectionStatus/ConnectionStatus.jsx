import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const StatusContainer = styled.div`
  position: fixed;
  top: 10px;
  right: 10px;
  z-index: 1000;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  color: white;
  transition: all 0.3s ease;
  opacity: ${props => props.$show ? 1 : 0};
  transform: translateY(${props => props.$show ? 0 : -20}px);
  pointer-events: ${props => props.$show ? 'auto' : 'none'};

  ${props => {
    switch (props.$status) {
      case 'online':
        return `
          background-color: #4CAF50;
          box-shadow: 0 2px 8px rgba(76, 175, 80, 0.3);
        `;
      case 'offline':
        return `
          background-color: #F44336;
          box-shadow: 0 2px 8px rgba(244, 67, 54, 0.3);
        `;
      case 'database-unavailable':
        return `
          background-color: #FF9800;
          box-shadow: 0 2px 8px rgba(255, 152, 0, 0.3);
        `;
      case 'syncing':
        return `
          background-color: #2196F3;
          box-shadow: 0 2px 8px rgba(33, 150, 243, 0.3);
        `;
      default:
        return `
          background-color: #9E9E9E;
          box-shadow: 0 2px 8px rgba(158, 158, 158, 0.3);
        `;
    }
  }}
`;

const StatusIcon = styled.span`
  margin-right: 6px;
  display: inline-block;

  ${props => props.$spinning && `
    animation: spin 1s linear infinite;

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `}
`;

const ConnectionStatus = () => {
  const [connectionState, setConnectionState] = useState({
    status: 'online',
    message: '',
    show: false
  });

  useEffect(() => {
    let hideTimeout;

    const handleConnectionStateChange = (event) => {
      const { state, isOnline, dbAvailable } = event.detail;
      
      let status, message, icon;
      
      switch (state) {
        case 'online':
          status = 'online';
          message = 'Connection restored';
          icon = '🌐';
          break;
        case 'offline':
          status = 'offline';
          message = 'No internet connection';
          icon = '📡';
          break;
        case 'database-unavailable':
          status = 'database-unavailable';
          message = 'Database unavailable - using local storage';
          icon = '⚠️';
          break;
        case 'database-available':
          status = 'online';
          message = 'Database connection restored';
          icon = '🌐';
          break;
        case 'syncing':
          status = 'syncing';
          message = 'Syncing changes...';
          icon = '🔄';
          break;
        default:
          return; // Don't show unknown states
      }

      setConnectionState({
        status,
        message: `${icon} ${message}`,
        show: true
      });

      // Clear existing timeout
      if (hideTimeout) {
        clearTimeout(hideTimeout);
      }

      // Hide after 3 seconds for success states, 5 seconds for errors
      const hideDelay = (status === 'offline' || status === 'database-unavailable') ? 5000 : 3000;
      hideTimeout = setTimeout(() => {
        setConnectionState(prev => ({ ...prev, show: false }));
      }, hideDelay);
    };

    // Listen for connection state changes
    window.addEventListener('connectionStateChange', handleConnectionStateChange);

    // Cleanup
    return () => {
      window.removeEventListener('connectionStateChange', handleConnectionStateChange);
      if (hideTimeout) {
        clearTimeout(hideTimeout);
      }
    };
  }, []);

  return (
    <StatusContainer
      $status={connectionState.status}
      $show={connectionState.show}
    >
      <StatusIcon $spinning={connectionState.status === 'syncing'}>
        {connectionState.status === 'syncing' ? '🔄' : ''}
      </StatusIcon>
      {connectionState.message}
    </StatusContainer>
  );
};

export default ConnectionStatus;
