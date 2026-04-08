/* @vitest-environment jsdom */

/**
 * Integration test for the enhanced cooldown system with MitPlan application
 */

import React from 'react';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';

import { ThemeProvider } from '../../../contexts/ThemeContext';
import { EnhancedMitigationProvider } from '../../../contexts/EnhancedMitigationContext';
import { RealtimeBossProvider } from '../../../contexts/RealtimeBossContext';
import { RealtimeJobProvider } from '../../../contexts/RealtimeJobContext';
import { TankPositionProvider } from '../../../contexts/TankPositionContext';
import { validateCooldownSystem } from '../validation';
import { getCooldownManager } from '../cooldownManager';

// Mock data for testing
const mockBossActions = [
  { id: 'action1', time: 10, name: 'Tank Buster 1', isTankBuster: true },
  { id: 'action2', time: 30, name: 'Raid Wide 1', isTankBuster: false },
  { id: 'action3', time: 50, name: 'Tank Buster 2', isTankBuster: true },
  { id: 'action4', time: 70, name: 'Raid Wide 2', isTankBuster: false }
];

const mockSelectedJobs = {
  tank: [{ id: 'PLD', selected: true }],
  healer: [{ id: 'SCH', selected: true }],
  melee: [],
  ranged: [],
  caster: [{ id: 'BLM', selected: true }],
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

vi.mock('../../../contexts/TankPositionContext', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useTankPositionContext: () => ({
      tankPositions: mockTankPositions,
    }),
  };
});

vi.mock('../../../contexts/RealtimePlanContext', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useRealtimePlan: () => ({
      selectedJobs: mockSelectedJobs,
      assignments: mockAssignments,
      updateAssignmentsRealtime: vi.fn().mockResolvedValue(true),
      isInitialized: true,
    }),
  };
});

vi.mock('../../../contexts/RealtimeJobContext', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useRealtimeJobContext: () => ({
      selectedJobs: {
        tank: [
          { id: 'PLD', selected: true },
          { id: 'WAR', selected: false },
        ],
      },
    }),
  };
});

// Import after mocking
vi.mock('../../../contexts/RealtimeBossContext', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useRealtimeBossContext: () => ({
      sortedBossActions: mockBossActions,
      selectedBossAction: null,
      currentBossLevel: 90,
    }),
  };
});

import { useEnhancedMitigation } from '../../../contexts/EnhancedMitigationContext';

describe('Enhanced Cooldown System Integration', () => {
  const renderWithProviders = (component) => {
    return render(
      <ThemeProvider>
        <RealtimeBossProvider>
          <RealtimeJobProvider>
            <TankPositionProvider>
              <EnhancedMitigationProvider>
                {component}
              </EnhancedMitigationProvider>
            </TankPositionProvider>
          </RealtimeJobProvider>
        </RealtimeBossProvider>
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

    expect(validationResult.errors).toHaveLength(0);
    expect(validationResult.warnings).toHaveLength(0);
    expect(validationResult.info.length).toBeGreaterThan(0);
  });

  test('should handle ability availability checking', async () => {
    renderWithProviders(<TestComponent />);

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    // Test availability checking
    fireEvent.click(screen.getByTestId('test-availability'));

    expect(screen.getByTestId('assignments-count')).toHaveTextContent('2');
  });

  test('should handle mitigation assignment', async () => {
    renderWithProviders(<TestComponent />);

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    // Test assignment
    await act(async () => {
      fireEvent.click(screen.getByTestId('test-assignment'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('assignments-count')).toBeInTheDocument();
    });
  });

  test('should handle cooldown-based disabling correctly', () => {
    const manager = getCooldownManager();

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
    const manager = getCooldownManager();

    // Update with test data
    manager.update({
      bossActions: mockBossActions,
      bossLevel: 90,
      selectedJobs: { ...mockSelectedJobs, 'SMN': true }, // Add SMN for more instances
      tankPositions: mockTankPositions,
      assignments: mockAssignments
    });

    const availability = manager.checkAbilityAvailability('lustrate', 50, 'action3');

    expect(availability.isAvailable).toBe(true);
    expect(availability.reason).toBeNull();
    expect(availability.availableCharges).toBe(1);
    expect(availability.canAssign()).toBe(true);
  });

  test('should expose remaining charges when excluding the current assignment', () => {
    const manager = getCooldownManager();

    manager.update({
      bossActions: mockBossActions,
      bossLevel: 90,
      selectedJobs: mockSelectedJobs,
      tankPositions: mockTankPositions,
      assignments: mockAssignments,
    });

    const availability = manager.checkAbilityAvailability('lustrate', 50, 'action3', {
      excludeCurrentAssignment: true,
    });

    expect(availability.isAvailable).toBe(true);
    expect(availability.availableCharges).toBeGreaterThan(0);
    expect(availability.canAssign()).toBe(true);
  });
});

describe('Performance Tests', () => {
  test('should perform cooldown checks efficiently', () => {
    const manager = getCooldownManager();

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

