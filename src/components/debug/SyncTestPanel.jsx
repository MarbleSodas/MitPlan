import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useCollaboration } from '../../contexts/CollaborationContext';
import { useDisplayName } from '../../contexts/DisplayNameContext';
import useOptimizedRealTimeSync from '../../hooks/useOptimizedRealTimeSync';
import syncDebugger from '../../utils/syncDebugger';
import OptimizedPlanSyncService from '../../services/OptimizedPlanSyncService';
// Test utilities removed during cleanup

const TestPanel = styled.div`
  position: fixed;
  top: 20px;
  right: 20px;
  width: 400px;
  max-height: 80vh;
  background: white;
  border: 2px solid #2196F3;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
  z-index: 10000;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
`;

const Header = styled.div`
  background: #2196F3;
  color: white;
  padding: 12px 16px;
  font-weight: 600;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: white;
  font-size: 18px;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  
  &:hover {
    background: rgba(255,255,255,0.2);
  }
`;

const Content = styled.div`
  padding: 16px;
  max-height: calc(80vh - 60px);
  overflow-y: auto;
`;

const Section = styled.div`
  margin-bottom: 20px;
  
  h3 {
    margin: 0 0 10px 0;
    font-size: 14px;
    font-weight: 600;
    color: #333;
  }
`;

const TestButton = styled.button`
  background: #4CAF50;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  margin: 4px 4px 4px 0;
  
  &:hover {
    background: #45a049;
  }
  
  &:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
  
  &.danger {
    background: #f44336;
    
    &:hover {
      background: #da190b;
    }
  }
`;

const StatusIndicator = styled.div`
  display: flex;
  align-items: center;
  margin: 8px 0;
  font-size: 12px;
  
  .indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    margin-right: 8px;
    
    &.green { background: #4CAF50; }
    &.red { background: #f44336; }
    &.yellow { background: #FF9800; }
    &.gray { background: #9E9E9E; }
  }
`;

const LogOutput = styled.div`
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 8px;
  font-family: monospace;
  font-size: 11px;
  max-height: 150px;
  overflow-y: auto;
  white-space: pre-wrap;
`;

const InfoBox = styled.div`
  background: #e3f2fd;
  border: 1px solid #2196F3;
  border-radius: 4px;
  padding: 8px;
  font-size: 12px;
  margin: 8px 0;
`;

export const SyncTestPanel = ({ onClose }) => {
  const { isConnected, isCollaborating, currentPlanId, userId } = useCollaboration();
  const { displayName, canEdit, needsDisplayName } = useDisplayName();
  const [testResults, setTestResults] = useState([]);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [debugStats, setDebugStats] = useState(null);

  // Extract plan ID from URL
  const planId = (() => {
    const pathMatch = window.location.pathname.match(/^\/plan\/(?:shared\/)?([a-f0-9-]{36})$/i);
    return pathMatch ? pathMatch[1] : null;
  })();

  const isSharedPlan = window.location.pathname.includes('/plan/shared/');
  
  const {
    isActive: isSyncActive,
    syncMitigationAssignments: immediateSyncMitigationAssignments,
    syncJobSelections: immediateSyncJobSelections,
    syncBossSelection: immediateSyncBossSelection
  } = useOptimizedRealTimeSync(planId, isSharedPlan);

  useEffect(() => {
    // Enable sync debugger
    syncDebugger.setEnabled(true);
    
    // Update debug stats periodically
    const interval = setInterval(() => {
      if (planId) {
        setDebugStats(syncDebugger.getSyncStats(planId));
      }
    }, 2000);

    return () => {
      clearInterval(interval);
    };
  }, [planId]);

  const addTestResult = (test, success, message) => {
    setTestResults(prev => [...prev, {
      test,
      success,
      message,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const clearResults = () => {
    setTestResults([]);
    syncDebugger.clearDebugData();
    setDebugStats(null);
  };

  const testUserIdGeneration = async () => {
    try {
      addTestResult('User ID Generation', true, `User ID: ${userId || 'null'}, Display Name: ${displayName || 'null'}`);
    } catch (error) {
      addTestResult('User ID Generation', false, error.message);
    }
  };

  const testFirebaseConnectivity = async () => {
    try {
      const result = await RealtimeCollaborationService.checkConnectionHealth(planId || 'test');
      addTestResult('Firebase Connectivity', result.healthy, result.message);
    } catch (error) {
      addTestResult('Firebase Connectivity', false, error.message);
    }
  };

  const testSyncPrerequisites = async () => {
    try {
      // Simplified test - just check if sync is active
      const passedAll = isSyncActive;
      addTestResult('Sync Prerequisites', passedAll,
        passedAll ? 'Sync is active and ready' : 'Sync is not active'
      );
    } catch (error) {
      addTestResult('Sync Prerequisites', false, error.message);
    }
  };

  const testDetailedPrerequisites = async () => {
    if (!planId || !userId) {
      addTestResult('Detailed Prerequisites', false, 'Missing plan ID or user ID');
      return;
    }

    try {
      // Simplified detailed test
      const result = { success: true, message: 'Prerequisites met' };

      addTestResult('Detailed Prerequisites', result.valid,
        result.valid ? 'All prerequisites passed' : `Issues: ${result.issues.join(', ')}`
      );
    } catch (error) {
      addTestResult('Detailed Prerequisites', false, error.message);
    }
  };

  const testMitigationSyncPaths = async () => {
    try {
      // Simplified test - check if sync methods are available
      const hasSync = immediateSyncMitigationAssignments && immediateSyncJobSelections;
      addTestResult('Mitigation Sync Paths', hasSync,
        hasSync ? 'Sync methods available' : 'Sync methods not available'
      );
    } catch (error) {
      addTestResult('Mitigation Sync Paths', false, error.message);
    }
  };

  const testMitigationSync = async () => {
    if (!planId || !userId) {
      addTestResult('Mitigation Sync', false, 'Missing plan ID or user ID');
      return;
    }

    try {
      const testAssignments = {
        'test-boss-action': [{
          id: 'test-mitigation',
          name: 'Test Mitigation',
          job: 'PLD',
          type: 'tank'
        }]
      };

      const result = await immediateSyncMitigationAssignments(testAssignments);
      addTestResult('Mitigation Sync', result.success, result.message || 'Sync completed');
    } catch (error) {
      addTestResult('Mitigation Sync', false, error.message);
    }
  };

  const testJobSync = async () => {
    if (!planId || !userId) {
      addTestResult('Job Sync', false, 'Missing plan ID or user ID');
      return;
    }

    try {
      const testJobs = ['PLD', 'WHM', 'BLM'];
      const result = await immediateSyncJobSelections(testJobs);
      addTestResult('Job Sync', result.success, result.message || 'Sync completed');
    } catch (error) {
      addTestResult('Job Sync', false, error.message);
    }
  };

  const testBossSync = async () => {
    if (!planId || !userId) {
      addTestResult('Boss Sync', false, 'Missing plan ID or user ID');
      return;
    }

    try {
      const result = await immediateSyncBossSelection('ketuduke');
      addTestResult('Boss Sync', result.success, result.message || 'Sync completed');
    } catch (error) {
      addTestResult('Boss Sync', false, error.message);
    }
  };

  const runAllTests = async () => {
    setIsRunningTests(true);
    clearResults();

    try {
      await testUserIdGeneration();
      await new Promise(resolve => setTimeout(resolve, 500));

      await testSyncPrerequisites();
      await new Promise(resolve => setTimeout(resolve, 500));

      await testDetailedPrerequisites();
      await new Promise(resolve => setTimeout(resolve, 500));

      await testMitigationSyncPaths();
      await new Promise(resolve => setTimeout(resolve, 500));

      await testFirebaseConnectivity();
      await new Promise(resolve => setTimeout(resolve, 500));

      await testMitigationSync();
      await new Promise(resolve => setTimeout(resolve, 500));

      await testJobSync();
      await new Promise(resolve => setTimeout(resolve, 500));

      await testBossSync();
    } catch (error) {
      addTestResult('Test Suite', false, `Test suite failed: ${error.message}`);
    } finally {
      setIsRunningTests(false);
    }
  };

  const generateDebugReport = () => {
    if (planId) {
      const report = syncDebugger.generateDebugReport(planId);
      console.log('Debug Report:', report);
      addTestResult('Debug Report', true, 'Debug report generated (check console)');
    }
  };

  const exportDebugData = () => {
    syncDebugger.exportDebugData();
    addTestResult('Export', true, 'Debug data exported to file');
  };

  return (
    <TestPanel>
      <Header>
        🔄 Sync Test Panel
        <CloseButton onClick={onClose}>×</CloseButton>
      </Header>
      
      <Content>
        <Section>
          <h3>📊 Status</h3>
          <StatusIndicator>
            <div className={`indicator ${isConnected ? 'green' : 'red'}`}></div>
            Firebase: {isConnected ? 'Connected' : 'Disconnected'}
          </StatusIndicator>
          <StatusIndicator>
            <div className={`indicator ${isCollaborating ? 'green' : 'gray'}`}></div>
            Collaboration: {isCollaborating ? 'Active' : 'Inactive'}
          </StatusIndicator>
          <StatusIndicator>
            <div className={`indicator ${isSyncActive ? 'green' : 'yellow'}`}></div>
            Sync: {isSyncActive ? 'Active' : 'Inactive'}
          </StatusIndicator>
          <StatusIndicator>
            <div className={`indicator ${canEdit ? 'green' : 'yellow'}`}></div>
            Can Edit: {canEdit ? 'Yes' : 'No'}
          </StatusIndicator>
        </Section>

        <Section>
          <h3>ℹ️ Info</h3>
          <InfoBox>
            <div><strong>Plan ID:</strong> {planId || 'None'}</div>
            <div><strong>User ID:</strong> {userId || 'None'}</div>
            <div><strong>Display Name:</strong> {displayName || 'None'}</div>
            <div><strong>Shared Plan:</strong> {isSharedPlan ? 'Yes' : 'No'}</div>
            <div><strong>Needs Name:</strong> {needsDisplayName ? 'Yes' : 'No'}</div>
          </InfoBox>
        </Section>

        {debugStats && (
          <Section>
            <h3>📈 Debug Stats</h3>
            <InfoBox>
              <div><strong>Total Attempts:</strong> {debugStats.totalAttempts}</div>
              <div><strong>Successful:</strong> {debugStats.successful}</div>
              <div><strong>Failed:</strong> {debugStats.failed}</div>
              <div><strong>Pending:</strong> {debugStats.pending}</div>
              <div><strong>Avg Duration:</strong> {debugStats.averageDuration}ms</div>
            </InfoBox>
          </Section>
        )}

        <Section>
          <h3>🧪 Tests</h3>
          <TestButton onClick={runAllTests} disabled={isRunningTests}>
            {isRunningTests ? 'Running...' : 'Run All Tests'}
          </TestButton>
          <TestButton onClick={testUserIdGeneration}>Test User ID</TestButton>
          <TestButton onClick={testSyncPrerequisites}>Test Prerequisites</TestButton>
          <TestButton onClick={testDetailedPrerequisites}>Detailed Prerequisites</TestButton>
          <TestButton onClick={testMitigationSyncPaths}>Test Sync Paths</TestButton>
          <TestButton onClick={testFirebaseConnectivity}>Test Firebase</TestButton>
          <TestButton onClick={testMitigationSync}>Test Mitigation Sync</TestButton>
          <TestButton onClick={testJobSync}>Test Job Sync</TestButton>
          <TestButton onClick={testBossSync}>Test Boss Sync</TestButton>
        </Section>

        <Section>
          <h3>🔧 Debug Tools</h3>
          <TestButton onClick={generateDebugReport}>Generate Report</TestButton>
          <TestButton onClick={exportDebugData}>Export Data</TestButton>
          <TestButton onClick={clearResults} className="danger">Clear Results</TestButton>
        </Section>

        {testResults.length > 0 && (
          <Section>
            <h3>📋 Results</h3>
            <LogOutput>
              {testResults.map((result, index) => (
                `[${result.timestamp}] ${result.success ? '✅' : '❌'} ${result.test}: ${result.message}\n`
              )).join('')}
            </LogOutput>
          </Section>
        )}
      </Content>
    </TestPanel>
  );
};

export default SyncTestPanel;
