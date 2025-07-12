import React, { useState } from 'react';
import { useRealtimePlan } from '../../contexts/RealtimePlanContext';
import { useRealtimeJobContext } from '../../contexts/RealtimeJobContext';
import { useTankPositionContext } from '../../contexts/TankPositionContext';
import { useRealtimeMitigationContext } from '../../contexts/RealtimeMitigationContext';

/**
 * Debug component to test realtime synchronization
 * This component displays the current state of all realtime data
 * and provides buttons to test updates
 */
const RealtimeSyncTest = () => {
  const { 
    realtimePlan, 
    loading, 
    error, 
    isInitialized,
    recoverPlanData 
  } = useRealtimePlan();
  
  const { selectedJobs, toggleJobSelection } = useRealtimeJobContext();
  const { tankPositions, assignTankPosition, clearTankPosition } = useTankPositionContext();
  const { assignments, addMitigation, removeMitigation } = useRealtimeMitigationContext();
  
  const [testLog, setTestLog] = useState([]);

  const addToLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setTestLog(prev => [...prev.slice(-9), `[${timestamp}] ${message}`]);
  };

  const testJobSelection = () => {
    addToLog('Testing job selection...');
    // Toggle PLD selection
    toggleJobSelection('tank', 'PLD');
    addToLog('Toggled PLD selection');
  };

  const testTankPositions = () => {
    addToLog('Testing tank positions...');
    // Assign PLD as main tank
    assignTankPosition('PLD', 'mainTank');
    addToLog('Assigned PLD as main tank');
  };

  const testMitigationAssignment = () => {
    addToLog('Testing mitigation assignment...');
    // This would need a real boss action ID and mitigation
    addToLog('Mitigation test would need real boss action data');
  };

  const testRecovery = () => {
    addToLog('Testing data recovery...');
    recoverPlanData();
    addToLog('Recovery initiated');
  };

  if (loading) {
    return <div>Loading realtime data...</div>;
  }

  return (
    <div style={{ 
      padding: '20px', 
      border: '1px solid #ccc', 
      margin: '20px',
      fontFamily: 'monospace',
      fontSize: '12px'
    }}>
      <h3>Realtime Sync Test</h3>
      
      {error && (
        <div style={{ color: 'red', marginBottom: '10px' }}>
          Error: {error}
        </div>
      )}
      
      <div style={{ marginBottom: '20px' }}>
        <strong>Status:</strong> {isInitialized ? 'Initialized' : 'Not Initialized'}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div>
          <h4>Current State</h4>
          
          <div style={{ marginBottom: '10px' }}>
            <strong>Plan ID:</strong> {realtimePlan?.id || 'None'}
          </div>
          
          <div style={{ marginBottom: '10px' }}>
            <strong>Boss:</strong> {realtimePlan?.bossId || 'None'}
          </div>
          
          <div style={{ marginBottom: '10px' }}>
            <strong>Selected Jobs:</strong>
            <pre style={{ fontSize: '10px', background: '#f5f5f5', padding: '5px' }}>
              {JSON.stringify(selectedJobs, null, 2)}
            </pre>
          </div>
          
          <div style={{ marginBottom: '10px' }}>
            <strong>Tank Positions:</strong>
            <pre style={{ fontSize: '10px', background: '#f5f5f5', padding: '5px' }}>
              {JSON.stringify(tankPositions, null, 2)}
            </pre>
          </div>
          
          <div style={{ marginBottom: '10px' }}>
            <strong>Assignments Count:</strong> {Object.keys(assignments).length}
          </div>
        </div>

        <div>
          <h4>Test Actions</h4>
          
          <div style={{ marginBottom: '10px' }}>
            <button onClick={testJobSelection} style={{ marginRight: '10px' }}>
              Test Job Selection
            </button>
            <button onClick={testTankPositions} style={{ marginRight: '10px' }}>
              Test Tank Positions
            </button>
          </div>
          
          <div style={{ marginBottom: '10px' }}>
            <button onClick={testMitigationAssignment} style={{ marginRight: '10px' }}>
              Test Mitigations
            </button>
            <button onClick={testRecovery}>
              Test Recovery
            </button>
          </div>
          
          <div>
            <h5>Test Log</h5>
            <div style={{ 
              height: '200px', 
              overflow: 'auto', 
              background: '#f0f0f0', 
              padding: '5px',
              fontSize: '10px'
            }}>
              {testLog.map((log, index) => (
                <div key={index}>{log}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealtimeSyncTest;
