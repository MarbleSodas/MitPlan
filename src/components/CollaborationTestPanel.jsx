import React, { useState, useEffect } from 'react';
import { useCollaboration } from '../contexts/CollaborationContext';
import CollaborationTestUtils from '../utils/CollaborationTestUtils';

/**
 * CollaborationTestPanel - Development tool for testing collaboration features
 * 
 * Features:
 * - Session health monitoring
 * - Manual cleanup triggers
 * - Multi-user simulation
 * - Real-time sync testing
 * - Connection health checks
 */
const CollaborationTestPanel = ({ planId }) => {
  const {
    isCollaborating,
    currentPlanId,
    roomUsers,
    sessionHealth,
    cleanupStatus,
    checkSessionHealth,
    getCleanupStatus,
    triggerManualCleanup,
    checkConnectionHealth
  } = useCollaboration();

  const [testResults, setTestResults] = useState(null);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [connectionHealth, setConnectionHealth] = useState(null);
  const [lastHealthCheck, setLastHealthCheck] = useState(null);

  // Auto-refresh health status
  useEffect(() => {
    if (isCollaborating && currentPlanId) {
      const interval = setInterval(async () => {
        try {
          await checkSessionHealth();
          getCleanupStatus();
          setLastHealthCheck(new Date().toLocaleTimeString());
        } catch (error) {
          console.error('Health check failed:', error);
        }
      }, 10000); // Check every 10 seconds

      return () => clearInterval(interval);
    }
  }, [isCollaborating, currentPlanId, checkSessionHealth, getCleanupStatus]);

  const handleConnectionHealthCheck = async () => {
    try {
      const health = await checkConnectionHealth();
      setConnectionHealth(health);
    } catch (error) {
      setConnectionHealth({ healthy: false, error: error.message });
    }
  };

  const handleManualCleanup = async () => {
    if (!window.confirm('Are you sure you want to manually trigger session cleanup? This will end the current session.')) {
      return;
    }

    try {
      const result = await triggerManualCleanup();
      alert(result.success ? 'Cleanup successful!' : `Cleanup failed: ${result.message}`);
    } catch (error) {
      alert(`Cleanup error: ${error.message}`);
    }
  };

  const runMultiUserTest = async () => {
    if (!currentPlanId) {
      alert('No active plan for testing');
      return;
    }

    setIsRunningTests(true);
    try {
      const result = await CollaborationTestUtils.simulateMultipleUsers(currentPlanId, 3);
      setTestResults(prev => ({ ...prev, multiUser: result }));
    } catch (error) {
      alert(`Multi-user test failed: ${error.message}`);
    } finally {
      setIsRunningTests(false);
    }
  };

  const runSyncTest = async () => {
    if (!currentPlanId) {
      alert('No active plan for testing');
      return;
    }

    setIsRunningTests(true);
    try {
      const result = await CollaborationTestUtils.testRealTimeSync(currentPlanId, 5);
      setTestResults(prev => ({ ...prev, realTimeSync: result }));
    } catch (error) {
      alert(`Sync test failed: ${error.message}`);
    } finally {
      setIsRunningTests(false);
    }
  };

  const runCleanupTest = async () => {
    if (!currentPlanId) {
      alert('No active plan for testing');
      return;
    }

    if (!window.confirm('This will test session cleanup by simulating all users leaving. Continue?')) {
      return;
    }

    setIsRunningTests(true);
    try {
      const result = await CollaborationTestUtils.testSessionCleanup(currentPlanId);
      setTestResults(prev => ({ ...prev, sessionCleanup: result }));
    } catch (error) {
      alert(`Cleanup test failed: ${error.message}`);
    } finally {
      setIsRunningTests(false);
    }
  };

  const runFullTestSuite = async () => {
    if (!currentPlanId) {
      alert('No active plan for testing');
      return;
    }

    if (!window.confirm('This will run the full test suite. This may take several minutes and will affect the current session. Continue?')) {
      return;
    }

    setIsRunningTests(true);
    try {
      const result = await CollaborationTestUtils.runFullTestSuite(currentPlanId);
      setTestResults(prev => ({ ...prev, fullSuite: result }));
    } catch (error) {
      alert(`Full test suite failed: ${error.message}`);
    } finally {
      setIsRunningTests(false);
    }
  };

  if (!isCollaborating) {
    return (
      <div className="bg-gray-100 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Collaboration Test Panel</h3>
        <p className="text-gray-600">Not currently in a collaborative session.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-lg p-4 space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Collaboration Test Panel</h3>
      
      {/* Session Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-blue-50 p-3 rounded">
          <h4 className="font-medium text-blue-900">Session Status</h4>
          <p className="text-sm text-blue-700">Plan ID: {currentPlanId}</p>
          <p className="text-sm text-blue-700">Active Users: {roomUsers.length}</p>
          <p className="text-sm text-blue-700">Last Health Check: {lastHealthCheck || 'Never'}</p>
        </div>

        <div className="bg-green-50 p-3 rounded">
          <h4 className="font-medium text-green-900">Session Health</h4>
          {sessionHealth ? (
            <div className="text-sm text-green-700">
              <p>Status: {sessionHealth.healthy ? '✅ Healthy' : '❌ Unhealthy'}</p>
              <p>Message: {sessionHealth.message}</p>
              {sessionHealth.activeUserCount !== undefined && (
                <p>Active Users: {sessionHealth.activeUserCount}</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-green-700">No health data</p>
          )}
        </div>
      </div>

      {/* Cleanup Status */}
      {cleanupStatus && (
        <div className="bg-yellow-50 p-3 rounded">
          <h4 className="font-medium text-yellow-900">Cleanup Monitoring</h4>
          <p className="text-sm text-yellow-700">Total Sessions: {cleanupStatus.totalSessions}</p>
          {cleanupStatus.sessions.map((session, index) => (
            <div key={index} className="text-xs text-yellow-600 mt-1">
              Plan: {session.planId} | Active Users: {session.activeUsers} | Attempts: {session.cleanupAttempts}
            </div>
          ))}
        </div>
      )}

      {/* Connection Health */}
      <div className="bg-purple-50 p-3 rounded">
        <div className="flex justify-between items-center">
          <h4 className="font-medium text-purple-900">Connection Health</h4>
          <button
            onClick={handleConnectionHealthCheck}
            className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
          >
            Check
          </button>
        </div>
        {connectionHealth && (
          <p className="text-sm text-purple-700 mt-1">
            {connectionHealth.healthy ? '✅ Connected' : '❌ Connection Issues'}: {connectionHealth.message}
          </p>
        )}
      </div>

      {/* Test Controls */}
      <div className="border-t pt-4">
        <h4 className="font-medium text-gray-900 mb-3">Test Controls</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <button
            onClick={runMultiUserTest}
            disabled={isRunningTests}
            className="px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Multi-User Test
          </button>
          
          <button
            onClick={runSyncTest}
            disabled={isRunningTests}
            className="px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
          >
            Sync Test
          </button>
          
          <button
            onClick={runCleanupTest}
            disabled={isRunningTests}
            className="px-3 py-2 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700 disabled:opacity-50"
          >
            Cleanup Test
          </button>
          
          <button
            onClick={runFullTestSuite}
            disabled={isRunningTests}
            className="px-3 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 disabled:opacity-50"
          >
            Full Suite
          </button>
          
          <button
            onClick={handleManualCleanup}
            disabled={isRunningTests}
            className="px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
          >
            Manual Cleanup
          </button>
        </div>
      </div>

      {/* Test Results */}
      {testResults && (
        <div className="border-t pt-4">
          <h4 className="font-medium text-gray-900 mb-3">Test Results</h4>
          <div className="bg-gray-50 p-3 rounded max-h-64 overflow-y-auto">
            <pre className="text-xs text-gray-700">
              {JSON.stringify(testResults, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {isRunningTests && (
        <div className="text-center py-4">
          <div className="inline-flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            <span className="text-blue-600">Running tests...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollaborationTestPanel;
