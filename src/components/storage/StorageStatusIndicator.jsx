import React, { useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { usePlanStorage } from '../../contexts/PlanStorageContext';
import { STORAGE_STATES } from '../../services/PlanStorageService';

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const StatusContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 20px;
  background-color: ${props => props.theme.colors.secondary};
  border: 1px solid ${props => props.theme.colors.border};
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;

  &:hover {
    background-color: ${props => props.theme.colors.border};
  }
`;

const StatusIcon = styled.div`
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;

  ${props => props.$spinning && `
    animation: ${spin} 1s linear infinite;
  `}
`;

const StatusText = styled.span`
  font-size: 0.875rem;
  font-weight: 500;
  color: ${props => props.theme.colors.text};

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    display: none;
  }
`;

const StatusDot = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: ${props => {
    switch (props.$status) {
      case 'online': return '#4CAF50';
      case 'offline': return '#FF9800';
      case 'syncing': return '#2196F3';
      case 'error': return '#F44336';
      case 'pending': return '#FFC107';
      default: return '#9E9E9E';
    }
  }};
`;

const Tooltip = styled.div`
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-bottom: 8px;
  padding: 8px 12px;
  background-color: ${props => props.theme.colors.primary};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 6px;
  box-shadow: ${props => props.theme.shadows.medium};
  font-size: 0.875rem;
  color: ${props => props.theme.colors.text};
  white-space: nowrap;
  z-index: 1000;
  opacity: ${props => props.$visible ? 1 : 0};
  visibility: ${props => props.$visible ? 'visible' : 'hidden'};
  transition: opacity 0.2s ease, visibility 0.2s ease;

  &::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 4px solid transparent;
    border-top-color: ${props => props.theme.colors.border};
  }
`;

const SyncButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.theme.colors.textSecondary};
  cursor: pointer;
  padding: 2px;
  border-radius: 3px;
  font-size: 12px;

  &:hover {
    color: ${props => props.theme.colors.text};
    background-color: ${props => props.theme.colors.border};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const StorageStatusIndicator = () => {
  const {
    storageState,
    syncStatus,
    syncPlans,
    getStorageInfo,
    error
  } = usePlanStorage();
  const [showTooltip, setShowTooltip] = useState(false);

  const getStatusInfo = () => {
    const info = getStorageInfo();

    if (error) {
      return {
        status: 'error',
        icon: '⚠️',
        text: 'Error',
        tooltip: `Storage error: ${error}`,
        spinning: false
      };
    }

    if (syncStatus.isSyncing) {
      return {
        status: 'syncing',
        icon: '🔄',
        text: 'Syncing',
        tooltip: 'Syncing plans with your account...',
        spinning: true
      };
    }

    if (syncStatus.pendingCount > 0) {
      return {
        status: 'pending',
        icon: '⏳',
        text: `${syncStatus.pendingCount} Pending`,
        tooltip: `${syncStatus.pendingCount} changes waiting to sync`,
        spinning: false
      };
    }

    switch (storageState) {
      case STORAGE_STATES.ONLINE_DB:
        return {
          status: 'online',
          icon: '☁️',
          text: 'Synced',
          tooltip: 'Plans are synced with your account',
          spinning: false
        };

      case STORAGE_STATES.ONLINE_LOCAL:
        return {
          status: 'offline',
          icon: '💾',
          text: 'Local Mode',
          tooltip: 'Database unavailable - using local storage',
          spinning: false
        };

      case STORAGE_STATES.OFFLINE:
        return {
          status: 'offline',
          icon: '💾',
          text: 'Local Only',
          tooltip: 'Plans saved locally - sign in to sync across devices',
          spinning: false
        };

      default:
        return {
          status: 'unknown',
          icon: '❓',
          text: 'Unknown',
          tooltip: 'Storage status unknown',
          spinning: false
        };
    }
  };

  const statusInfo = getStatusInfo();
  const canSync = storageState === STORAGE_STATES.ONLINE_DB && syncStatus.pendingCount > 0;

  const handleClick = () => {
    if (canSync && !syncStatus.isSyncing) {
      syncPlans();
    }
  };

  const handleSyncClick = (e) => {
    e.stopPropagation();
    if (canSync && !syncStatus.isSyncing) {
      syncPlans();
    }
  };

  return (
    <StatusContainer
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={handleClick}
      style={{ cursor: canSync ? 'pointer' : 'default' }}
    >
      <StatusDot $status={statusInfo.status} />

      <StatusIcon $spinning={statusInfo.spinning}>
        {statusInfo.icon}
      </StatusIcon>

      <StatusText>{statusInfo.text}</StatusText>

      {canSync && (
        <SyncButton
          onClick={handleSyncClick}
          disabled={syncStatus.isSyncing}
          title="Sync now"
        >
          🔄
        </SyncButton>
      )}

      <Tooltip $visible={showTooltip}>
        {statusInfo.tooltip}
        {syncStatus.lastSync && (
          <div style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: '4px' }}>
            Last sync: {new Date(syncStatus.lastSync).toLocaleTimeString()}
          </div>
        )}
      </Tooltip>
    </StatusContainer>
  );
};

export default StorageStatusIndicator;
