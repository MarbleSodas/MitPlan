/**
 * Enhanced Collaboration Test Component
 * 
 * A debug component to test the enhanced real-time collaboration features
 * including field-level change detection and new state synchronization.
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import useOptimizedRealTimeSync from '../../hooks/useOptimizedRealTimeSync';

const TestContainer = styled.div`
  position: fixed;
  top: 20px;
  right: 20px;
  width: 400px;
  background: ${props => props.theme.colors.background};
  border: 2px solid ${props => props.theme.colors.primary};
  border-radius: 8px;
  padding: 16px;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  font-size: 12px;
`;

const TestSection = styled.div`
  margin-bottom: 16px;
  padding: 12px;
  background: ${props => props.theme.colors.surface};
  border-radius: 4px;
`;

const TestButton = styled.button`
  background: ${props => props.theme.colors.primary};
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  margin: 4px;
  font-size: 11px;

  &:hover {
    opacity: 0.8;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const StatusIndicator = styled.div`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props => props.active ? '#4CAF50' : '#f44336'};
  margin-right: 8px;
`;

const LogEntry = styled.div`
  font-size: 10px;
  color: ${props => props.theme.colors.textSecondary};
  margin: 2px 0;
  padding: 2px 4px;
  background: ${props => props.theme.colors.backgroundSecondary};
  border-radius: 2px;
`;

const EnhancedCollaborationTest = ({ planId, onClose }) => {
  const [testLog, setTestLog] = useState([]);
  const [testData, setTestData] = useState({
    selectedBossAction: null,
    filterSettings: { showAllMitigations: false }
  });

  const {
    syncSelectedBossAction,
    syncFilterSettings,
    getSyncStatus,
    isActive
  } = useOptimizedRealTimeSync(planId, true);

  const addLogEntry = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setTestLog(prev => [...prev.slice(-9), { message, type, timestamp }]);
  };

  // Test selected boss action sync
  const testSelectedBossActionSync = async () => {
    const testAction = {
      id: 'test-action-1',
      name: 'Test Boss Action',
      time: 30
    };

    try {
      addLogEntry('Testing selected boss action sync...', 'info');
      const result = await syncSelectedBossAction(testAction);
      
      if (result.success) {
        addLogEntry('✅ Selected boss action synced successfully', 'success');
        setTestData(prev => ({ ...prev, selectedBossAction: testAction }));
      } else {
        addLogEntry(`❌ Sync failed: ${result.message}`, 'error');
      }
    } catch (error) {
      addLogEntry(`❌ Sync error: ${error.message}`, 'error');
    }
  };

  // Test filter settings sync
  const testFilterSettingsSync = async () => {
    const newFilterSettings = {
      showAllMitigations: !testData.filterSettings.showAllMitigations
    };

    try {
      addLogEntry('Testing filter settings sync...', 'info');
      const result = await syncFilterSettings(newFilterSettings);
      
      if (result.success) {
        addLogEntry('✅ Filter settings synced successfully', 'success');
        setTestData(prev => ({ ...prev, filterSettings: newFilterSettings }));
      } else {
        addLogEntry(`❌ Sync failed: ${result.message}`, 'error');
      }
    } catch (error) {
      addLogEntry(`❌ Sync error: ${error.message}`, 'error');
    }
  };

  // Test clearing selected boss action
  const testClearSelectedBossAction = async () => {
    try {
      addLogEntry('Testing clear selected boss action...', 'info');
      const result = await syncSelectedBossAction(null);
      
      if (result.success) {
        addLogEntry('✅ Selected boss action cleared successfully', 'success');
        setTestData(prev => ({ ...prev, selectedBossAction: null }));
      } else {
        addLogEntry(`❌ Clear failed: ${result.message}`, 'error');
      }
    } catch (error) {
      addLogEntry(`❌ Clear error: ${error.message}`, 'error');
    }
  };

  // Listen for collaborative updates
  useEffect(() => {
    const handleCollaborativeUpdate = (event) => {
      const { changedFields, data } = event.detail;
      
      if (changedFields.includes('selectedBossAction')) {
        addLogEntry(`📡 Received selectedBossAction update: ${data.selectedBossAction?.name || 'cleared'}`, 'received');
      }
      
      if (changedFields.includes('filterSettings')) {
        addLogEntry(`📡 Received filterSettings update: showAll=${data.filterSettings?.showAllMitigations}`, 'received');
      }
    };

    window.addEventListener('collaborativePlanUpdate', handleCollaborativeUpdate);
    
    return () => {
      window.removeEventListener('collaborativePlanUpdate', handleCollaborativeUpdate);
    };
  }, []);

  const syncStatus = getSyncStatus();

  return (
    <TestContainer>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h3 style={{ margin: 0, fontSize: '14px' }}>Enhanced Collaboration Test</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer' }}>×</button>
      </div>

      <TestSection>
        <div style={{ marginBottom: '8px' }}>
          <StatusIndicator active={isActive} />
          <strong>Sync Status:</strong> {isActive ? 'Active' : 'Inactive'}
        </div>
        <div style={{ fontSize: '10px', color: '#666' }}>
          Plan ID: {planId || 'None'}<br/>
          Connected: {syncStatus.isConnected ? 'Yes' : 'No'}<br/>
          Updating: {syncStatus.isUpdating ? 'Yes' : 'No'}
        </div>
      </TestSection>

      <TestSection>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '12px' }}>Selected Boss Action Tests</h4>
        <div style={{ marginBottom: '8px', fontSize: '10px' }}>
          Current: {testData.selectedBossAction?.name || 'None'}
        </div>
        <TestButton onClick={testSelectedBossActionSync} disabled={!isActive}>
          Set Test Action
        </TestButton>
        <TestButton onClick={testClearSelectedBossAction} disabled={!isActive}>
          Clear Action
        </TestButton>
      </TestSection>

      <TestSection>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '12px' }}>Filter Settings Tests</h4>
        <div style={{ marginBottom: '8px', fontSize: '10px' }}>
          Show All: {testData.filterSettings.showAllMitigations ? 'Yes' : 'No'}
        </div>
        <TestButton onClick={testFilterSettingsSync} disabled={!isActive}>
          Toggle Filter
        </TestButton>
      </TestSection>

      <TestSection>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '12px' }}>Activity Log</h4>
        <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
          {testLog.map((entry, index) => (
            <LogEntry key={index}>
              [{entry.timestamp}] {entry.message}
            </LogEntry>
          ))}
          {testLog.length === 0 && (
            <LogEntry>No activity yet...</LogEntry>
          )}
        </div>
      </TestSection>
    </TestContainer>
  );
};

export default EnhancedCollaborationTest;
