import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { FaCheck, FaExclamationTriangle, FaSync, FaWifi } from 'react-icons/fa';
import { PiWifiSlash } from 'react-icons/pi';
import { usePlan } from '../../contexts/PlanContext';
import { getSyncStatus } from '../../utils/offlineStorage';

const rotate = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

const Container = styled.div`
  position: fixed;
  bottom: 20px;
  left: 20px;
  display: flex;
  align-items: center;
  background-color: ${props => props.theme.colors.background};
  border-radius: ${props => props.theme.borderRadius.medium};
  box-shadow: ${props => props.theme.shadows.medium};
  padding: ${props => props.theme.spacing.small} ${props => props.theme.spacing.medium};
  z-index: 1000;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-5px);
  }
`;

const IconWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin-right: ${props => props.theme.spacing.small};
  
  svg {
    color: ${props => {
      switch (props.$status) {
        case 'online':
        case 'synced':
          return props.theme.colors.success;
        case 'offline':
        case 'pending':
          return props.theme.colors.warning;
        case 'syncing':
          return props.theme.colors.primary;
        case 'error':
          return props.theme.colors.error;
        default:
          return props.theme.colors.textSecondary;
      }
    }};
    
    animation: ${props => props.$status === 'syncing' ? rotate : 'none'} 2s linear infinite;
  }
`;

const StatusText = styled.span`
  font-size: ${props => props.theme.fontSizes.small};
  color: ${props => props.theme.colors.textPrimary};
`;

const ErrorMessage = styled.div`
  font-size: ${props => props.theme.fontSizes.xsmall};
  color: ${props => props.theme.colors.error};
  margin-top: ${props => props.theme.spacing.xsmall};
`;

const SyncStatusIndicator = () => {
  const { currentPlan, syncStatus, syncError } = usePlan();
  const [localStatus, setLocalStatus] = useState('online');
  const [localError, setLocalError] = useState(null);
  
  // Get initial sync status from IndexedDB
  useEffect(() => {
    const fetchSyncStatus = async () => {
      if (currentPlan) {
        const status = await getSyncStatus(currentPlan.id);
        setLocalStatus(status.status);
        setLocalError(status.error);
      }
    };
    
    fetchSyncStatus();
  }, [currentPlan]);
  
  // Update local status when sync status changes
  useEffect(() => {
    if (syncStatus) {
      setLocalStatus(syncStatus);
    }
  }, [syncStatus]);
  
  // Update local error when sync error changes
  useEffect(() => {
    if (syncError) {
      setLocalError(syncError);
    } else {
      setLocalError(null);
    }
  }, [syncError]);
  
  // Get icon based on status
  const getIcon = () => {
    switch (localStatus) {
      case 'online':
        return <FaWifi />;
      case 'offline':
        return <FaWifiSlash />;
      case 'synced':
        return <FaCheck />;
      case 'pending':
        return <FaWifiSlash />;
      case 'syncing':
        return <FaSync />;
      case 'error':
        return <FaExclamationTriangle />;
      default:
        return <FaWifi />;
    }
  };
  
  // Get status text
  const getStatusText = () => {
    switch (localStatus) {
      case 'online':
        return 'Online';
      case 'offline':
        return 'Offline';
      case 'synced':
        return 'All changes saved';
      case 'pending':
        return 'Changes pending';
      case 'syncing':
        return 'Syncing changes...';
      case 'error':
        return 'Sync error';
      default:
        return 'Online';
    }
  };
  
  return (
    <Container>
      <IconWrapper $status={localStatus}>
        {getIcon()}
      </IconWrapper>
      <div>
        <StatusText>{getStatusText()}</StatusText>
        {localError && <ErrorMessage>{localError}</ErrorMessage>}
      </div>
    </Container>
  );
};

export default SyncStatusIndicator;
