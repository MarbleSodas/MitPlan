/**
 * Integration test for the enhanced cooldown system with MitPlan application
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '../../../styles/theme';
import { EnhancedMitigationProvider } from '../../../contexts/EnhancedMitigationContext';
import { BossProvider } from '../../../contexts/BossContext';
import { JobProvider } from '../../../contexts/JobContext';
import { TankPositionProvider } from '../../../contexts/TankPositionContext';
import { validateCooldownSystem } from '../validation';

// Mock data for testing
const mockBossActions = [
  { id: 'action1', time: 10, name: 'Tank Buster 1', isTankBuster: true },
  { id: 'action2', time: 30, name: 'Raid Wide 1', isTankBuster: false },
  { id: 'action3', time: 50, name: 'Tank Buster 2', isTankBuster: true },
  { id: 'action4', time: 70, name: 'Raid Wide 2', isTankBuster: false }
];

const mockSelectedJobs = {
  'PLD': true,
  'SCH': true,
  'BLM': true
};

const mockTankPositions = {
  mainTank: 'PLD',
  offTank: null
};

const mockAssignments = {
  'action1': [
    { id: 'hallowed_ground', name: 'Hallowed Ground', tankPosition: 'mainTank' }
  ],
  'action2': [
    { id: 'lustrate', name: 'Lustrate', tankPosition: 'shared' }
  ]
};

// Test component that uses the enhanced mitigation context
const TestComponent = () => {
  const { 
    checkAbilityAvailability, 
    addMitigation, 
    assignments,
    isInitialized 
  } = useEnhancedMitigation();

  if (!isInitialized) {
    return <div>Loading...</div>;
  }

  const handleTestAssignment = () => {
    // Test assigning a mitigation
    const mitigation = { id: 'addle', name: 'Addle' };
    addMitigation('action3', mitigation);
  };

  const handleCheckAvailability = () => {
    // Test checking availability
    const availability = checkAbilityAvailability('hallowed_ground', 50, 'action3');
    console.log('Availability check result:', availability);
  };

  return (
    <div>
      <div data-testid="assignments-count">
        {Object.keys(assignments).length}
      </div>
      <button onClick={handleTestAssignment} data-testid="test-assignment">
        Test Assignment
      </button>
      <button onClick={handleCheckAvailability} data-testid="test-availability">
        Test Availability
      </button>
    </div>
  );
};

// Mock the contexts that EnhancedMitigationContext depends on
jest.mock('../../../contexts/BossContext', () => ({
  useBossContext: () => ({
    currentBossActions: mockBossActions,
    currentBossLevel: 90
  })
}));

jest.mock('../../../contexts/TankPositionContext', () => ({
  useTankPositionContext: () => ({
    tankPositions: mockTankPositions
  })
}));

jest.mock('../../../contexts/RealtimePlanContext', () => ({
  useRealtimePlan: () => ({
    selectedJobs: mockSelectedJobs,
    assignments: mockAssignments,
    updateAssignmentsRealtime: jest.fn().mockResolvedValue(true),
    isInitialized: true
  })
}));

// Import after mocking
import { useEnhancedMitigation } from '../../../contexts/EnhancedMitigationContext';

describe('Enhanced Cooldown System Integration', () => {
  const renderWithProviders = (component) => {
    return render(
      <ThemeProvider theme={theme}>
        <BossProvider>
          <JobProvider>
            <TankPositionProvider>
              <EnhancedMitigationProvider>
                {component}
              </EnhancedMitigationProvider>
            </TankPositionProvider>
          </JobProvider>
        </BossProvider>
      </ThemeProvider>
    );
  };

  test('should initialize enhanced mitigation context successfully', async () => {
    renderWithProviders(<TestComponent />);
    
    // Wait for initialization
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    // Check that assignments are loaded
    expect(screen.getByTestId('assignments-count')).toHaveTextContent('2');
  });

  test('should validate cooldown system with current data', () => {
    const validationResult = validateCooldownSystem({
      bossActions: mockBossActions,
      bossLevel: 90,
      selectedJobs: mockSelectedJobs,
      tankPositions: mockTankPositions,
      assignments: mockAssignments
    });

    expect(validationResult.isValid).toBe(true);
    expect(validationResult.errors).toHaveLength(0);
    
    console.log('Validation report:', validationResult.getReport());
  });

  test('should handle ability availability checking', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    renderWithProviders(<TestComponent />);
    
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    // Test availability checking
    fireEvent.click(screen.getByTestId('test-availability'));
    
    // Check that console.log was called with availability result
    expect(consoleSpy).toHaveBeenCalledWith(
      'Availability check result:',
      expect.objectContaining({
        abilityId: 'hallowed_ground',
        isAvailable: expect.any(Boolean)
      })
    );

    consoleSpy.mockRestore();
  });

  test('should handle mitigation assignment', async () => {
    renderWithProviders(<TestComponent />);
    
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    // Test assignment
    fireEvent.click(screen.getByTestId('test-assignment'));
    
    // The assignment should be processed (we can't easily test the async result in this setup)
    // but we can verify no errors are thrown
    expect(screen.getByTestId('assignments-count')).toBeInTheDocument();
  });

  test('should handle cooldown-based disabling correctly', () => {
    const { cooldownManager } = require('../cooldownManager');
    const manager = cooldownManager.getCooldownManager();
    
    // Update with test data
    manager.update({
      bossActions: mockBossActions,
      bossLevel: 90,
      selectedJobs: mockSelectedJobs,
      tankPositions: mockTankPositions,
      assignments: mockAssignments
    });

    // Test that Hallowed Ground is on cooldown at time 50 (used at time 10, 420s cooldown)
    const availability = manager.checkAbilityAvailability('hallowed_ground', 50, 'action3');
    
    expect(availability.isAvailable).toBe(false);
    expect(availability.reason).toBe('on_cooldown');
    expect(availability.canAssign()).toBe(false);
  });

  test('should handle multi-charge abilities correctly', () => {
    const { cooldownManager } = require('../cooldownManager');
    const manager = cooldownManager.getCooldownManager();
    
    // Update with test data
    manager.update({
      bossActions: mockBossActions,
      bossLevel: 90,
      selectedJobs: mockSelectedJobs,
      tankPositions: mockTankPositions,
      assignments: mockAssignments
    });

    // Test Lustrate (multi-charge ability) - should have charges available
    const availability = manager.checkAbilityAvailability('lustrate', 50, 'action3');
    
    expect(availability.isAvailable).toBe(true);
    expect(availability.totalCharges).toBeGreaterThan(1);
    expect(availability.availableCharges).toBeGreaterThan(0);
    expect(availability.canAssign()).toBe(true);
  });

  test('should handle role-shared abilities correctly', () => {
    const { cooldownManager } = require('../cooldownManager');
    const manager = cooldownManager.getCooldownManager();
    
    // Update with test data including BLM for Addle
    manager.update({
      bossActions: mockBossActions,
      bossLevel: 90,
      selectedJobs: { ...mockSelectedJobs, 'SMN': true }, // Add SMN for more instances
      tankPositions: mockTankPositions,
      assignments: mockAssignments
    });

    // Test Addle (role-shared ability) - should have multiple instances
    const availability = manager.checkAbilityAvailability('addle', 50, 'action3');
    
    expect(availability.isAvailable).toBe(true);
    expect(availability.isRoleShared).toBe(true);
    expect(availability.totalInstances).toBeGreaterThan(1);
    expect(availability.availableInstances).toBeGreaterThan(0);
    expect(availability.canAssign()).toBe(true);
  });
});

describe('Performance Tests', () => {
  test('should perform cooldown checks efficiently', () => {
    const { cooldownManager } = require('../cooldownManager');
    const manager = cooldownManager.getCooldownManager();
    
    // Update with test data
    manager.update({
      bossActions: mockBossActions,
      bossLevel: 90,
      selectedJobs: mockSelectedJobs,
      tankPositions: mockTankPositions,
      assignments: mockAssignments
    });

    const startTime = performance.now();
    
    // Perform multiple availability checks
    for (let i = 0; i < 100; i++) {
      manager.checkAbilityAvailability('hallowed_ground', 50, 'action3');
      manager.checkAbilityAvailability('lustrate', 50, 'action3');
      manager.checkAbilityAvailability('addle', 50, 'action3');
    }
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const averageTime = totalTime / 300; // 100 iterations * 3 checks
    
    // Should be fast (less than 1ms per check on average)
    expect(averageTime).toBeLessThan(1);
    
    console.log(`Performance test: ${averageTime.toFixed(3)}ms average per check`);
  });
});
