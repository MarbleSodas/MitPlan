/**
 * Feedback Loop Test Component
 * 
 * A debug component to test and verify that the enhanced real-time collaboration
 * system properly prevents feedback loops and unnecessary Firebase operations.
 */

import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import useOptimizedRealTimeSync from '../../hooks/useOptimizedRealTimeSync';

const TestContainer = styled.div`
  position: fixed;
  top: 20px;
  left: 20px;
  width: 500px;
  background: ${props => props.theme.colors.background};
  border: 2px solid ${props => props.theme.colors.primary};
  border-radius: 8px;
  padding: 16px;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  font-size: 12px;
  max-height: 80vh;
  overflow-y: auto;
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

const LogEntry = styled.div`
  font-size: 10px;
  color: ${props => props.theme.colors.textSecondary};
  margin: 2px 0;
  padding: 2px 4px;
  background: ${props => {
    if (props.type === 'sync') return '#e3f2fd';
    if (props.type === 'received') return '#e8f5e8';
    if (props.type === 'filtered') return '#fff3e0';
    if (props.type === 'error') return '#ffebee';
    return props.theme.colors.backgroundSecondary;
  }};
  border-radius: 2px;
  border-left: 3px solid ${props => {
    if (props.type === 'sync') return '#2196f3';
    if (props.type === 'received') return '#4caf50';
    if (props.type === 'filtered') return '#ff9800';
    if (props.type === 'error') return '#f44336';
    return '#666';
  }};
`;

const MetricsDisplay = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  font-size: 10px;
`;

const MetricItem = styled.div`
  padding: 4px 8px;
  background: ${props => props.theme.colors.backgroundSecondary};
  border-radius: 4px;
  text-align: center;
`;

const FeedbackLoopTest = ({ planId, onClose }) => {
  const [testLog, setTestLog] = useState([]);
  const [metrics, setMetrics] = useState({
    syncOperations: 0,
    receivedUpdates: 0,
    filteredUpdates: 0,
    redundantSyncs: 0
  });
  
  const testCounterRef = useRef(0);
  const startTimeRef = useRef(Date.now());

  const {
    syncMitigationAssignments,
    syncBossSelection,
    syncSelectedBossAction,
    syncFilterSettings,
    getSyncStatus,
    isActive
  } = useOptimizedRealTimeSync(planId, true);

  const addLogEntry = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setTestLog(prev => [...prev.slice(-19), { message, type, timestamp }]);
  };

  const updateMetrics = (metricType) => {
    setMetrics(prev => ({
      ...prev,
      [metricType]: prev[metricType] + 1
    }));
  };

  // Test rapid boss selection changes (should trigger redundancy prevention)
  const testRapidBossChanges = async () => {
    addLogEntry('🔄 Testing rapid boss selection changes...', 'sync');
    
    const bosses = ['ketuduke', 'lala', 'statice'];
    
    for (let i = 0; i < 3; i++) {
      const bossId = bosses[i % bosses.length];
      try {
        const result = await syncBossSelection(bossId);
        updateMetrics('syncOperations');
        
        if (result.skipped) {
          updateMetrics('redundantSyncs');
          addLogEntry(`⚡ Boss sync skipped (redundant): ${bossId}`, 'filtered');
        } else {
          addLogEntry(`✅ Boss synced: ${bossId}`, 'sync');
        }
      } catch (error) {
        addLogEntry(`❌ Boss sync error: ${error.message}`, 'error');
      }
      
      // Small delay between changes
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  };

  // Test rapid assignment changes
  const testRapidAssignmentChanges = async () => {
    addLogEntry('🔄 Testing rapid assignment changes...', 'sync');
    
    const testAssignments = {
      'action1': [{ id: 'mit1', name: 'Test Mitigation' }],
      'action2': [{ id: 'mit2', name: 'Another Mitigation' }]
    };
    
    for (let i = 0; i < 3; i++) {
      try {
        const result = await syncMitigationAssignments(testAssignments);
        updateMetrics('syncOperations');
        
        if (result.skipped) {
          updateMetrics('redundantSyncs');
          addLogEntry(`⚡ Assignment sync skipped (redundant)`, 'filtered');
        } else {
          addLogEntry(`✅ Assignments synced`, 'sync');
        }
      } catch (error) {
        addLogEntry(`❌ Assignment sync error: ${error.message}`, 'error');
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  };

  // Test mixed rapid changes
  const testMixedRapidChanges = async () => {
    addLogEntry('🔄 Testing mixed rapid changes...', 'sync');
    
    const operations = [
      () => syncBossSelection('ketuduke'),
      () => syncSelectedBossAction({ id: 'test1', name: 'Test Action' }),
      () => syncFilterSettings({ showAllMitigations: true }),
      () => syncBossSelection('ketuduke'), // Should be redundant
      () => syncSelectedBossAction({ id: 'test1', name: 'Test Action' }) // Should be redundant
    ];
    
    for (const operation of operations) {
      try {
        const result = await operation();
        updateMetrics('syncOperations');
        
        if (result.skipped) {
          updateMetrics('redundantSyncs');
          addLogEntry(`⚡ Operation skipped (redundant)`, 'filtered');
        } else {
          addLogEntry(`✅ Operation completed`, 'sync');
        }
      } catch (error) {
        addLogEntry(`❌ Operation error: ${error.message}`, 'error');
      }
      
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  };

  // Listen for collaborative updates
  useEffect(() => {
    const handleCollaborativeUpdate = (event) => {
      const { changedFields, updatedBy, isExternalChange } = event.detail;
      updateMetrics('receivedUpdates');
      
      if (!isExternalChange) {
        updateMetrics('filteredUpdates');
        addLogEntry(`🚫 Own change filtered: ${changedFields.join(', ')}`, 'filtered');
      } else {
        addLogEntry(`📡 External change: ${changedFields.join(', ')} from ${updatedBy}`, 'received');
      }
    };

    window.addEventListener('collaborativePlanUpdate', handleCollaborativeUpdate);
    
    return () => {
      window.removeEventListener('collaborativePlanUpdate', handleCollaborativeUpdate);
    };
  }, []);

  const resetMetrics = () => {
    setMetrics({
      syncOperations: 0,
      receivedUpdates: 0,
      filteredUpdates: 0,
      redundantSyncs: 0
    });
    setTestLog([]);
    startTimeRef.current = Date.now();
    addLogEntry('📊 Metrics reset', 'info');
  };

  const syncStatus = getSyncStatus();
  const testDuration = Math.round((Date.now() - startTimeRef.current) / 1000);

  return (
    <TestContainer>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h3 style={{ margin: 0, fontSize: '14px' }}>Feedback Loop Prevention Test</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer' }}>×</button>
      </div>

      <TestSection>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '12px' }}>Sync Status</h4>
        <div style={{ fontSize: '10px' }}>
          Active: {isActive ? '✅' : '❌'}<br/>
          Connected: {syncStatus.isConnected ? '✅' : '❌'}<br/>
          Plan ID: {planId || 'None'}<br/>
          Test Duration: {testDuration}s
        </div>
      </TestSection>

      <TestSection>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '12px' }}>Performance Metrics</h4>
        <MetricsDisplay>
          <MetricItem>
            <strong>{metrics.syncOperations}</strong><br/>
            Sync Operations
          </MetricItem>
          <MetricItem>
            <strong>{metrics.redundantSyncs}</strong><br/>
            Redundant Syncs
          </MetricItem>
          <MetricItem>
            <strong>{metrics.receivedUpdates}</strong><br/>
            Received Updates
          </MetricItem>
          <MetricItem>
            <strong>{metrics.filteredUpdates}</strong><br/>
            Filtered Updates
          </MetricItem>
        </MetricsDisplay>
        <div style={{ marginTop: '8px', fontSize: '10px', textAlign: 'center' }}>
          Efficiency: {metrics.syncOperations > 0 ? Math.round((metrics.redundantSyncs / metrics.syncOperations) * 100) : 0}% redundant operations prevented
        </div>
      </TestSection>

      <TestSection>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '12px' }}>Test Operations</h4>
        <TestButton onClick={testRapidBossChanges} disabled={!isActive}>
          Test Rapid Boss Changes
        </TestButton>
        <TestButton onClick={testRapidAssignmentChanges} disabled={!isActive}>
          Test Rapid Assignments
        </TestButton>
        <TestButton onClick={testMixedRapidChanges} disabled={!isActive}>
          Test Mixed Changes
        </TestButton>
        <TestButton onClick={resetMetrics}>
          Reset Metrics
        </TestButton>
      </TestSection>

      <TestSection>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '12px' }}>Activity Log</h4>
        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
          {testLog.map((entry, index) => (
            <LogEntry key={index} type={entry.type}>
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

export default FeedbackLoopTest;
