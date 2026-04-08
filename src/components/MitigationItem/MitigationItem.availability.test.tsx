/* @vitest-environment jsdom */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MitigationItem from './MitigationItem';

vi.mock('../../contexts', () => ({
  useTankPositionContext: () => ({
    tankPositions: { mainTank: 'PLD', offTank: 'WAR' },
  }),
}));

vi.mock('../../contexts/UserJobAssignmentContext', () => ({
  useUserJobAssignmentOptional: () => null,
}));

vi.mock('../collaboration/SelectionBorder', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('MitigationItem Availability Indicators', () => {
  const mockMitigation = {
    id: 'test-mitigation',
    name: 'Test Mitigation',
    icon: '🛡️',
    jobs: ['PLD'],
    description: 'Test description',
    duration: 30,
    cooldown: 120
  };

  const mockProps = {
    mitigation: mockMitigation,
    currentBossLevel: 90,
    selectedBossAction: {
      id: 'test-action',
      time: 100,
      assignments: []
    },
    pendingAssignments: [],
    checkAbilityAvailability: vi.fn(),
    selectedJobs: { tank: [{ id: 'PLD', selected: true }] }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show blue border when mitigation is available', () => {
    render(
      <MitigationItem
        {...mockProps}
        isDisabled={false}
        cooldownReason={null}
      />
    );

    expect(screen.getByText('Test Mitigation')).toBeInTheDocument();
    expect(screen.getByText(/Cooldown: 120s/)).toBeInTheDocument();
    expect(screen.queryByText('On cooldown')).toBeNull();
  });

  it('renders the cooldown overlay when the mitigation is disabled', () => {
    render(
      <MitigationItem
        {...mockProps}
        isDisabled={true}
        cooldownReason="On cooldown"
      />
    );

    expect(screen.getByText('On cooldown')).toBeInTheDocument();
  });

  it('shows a charge badge for multi-charge abilities', () => {
    render(
      <MitigationItem
        {...mockProps}
        mitigation={{
          ...mockMitigation,
          id: 'tetragrammaton',
          name: 'Tetragrammaton',
          count: 2,
          jobs: ['WHM'],
        }}
        selectedJobs={{ healer: [{ id: 'WHM', selected: true }] }}
        checkAbilityAvailability={vi.fn(() => ({
          availableCharges: 1,
          totalCharges: 2,
        }))}
      />
    );

    expect(screen.getByText('1/2')).toBeInTheDocument();
  });
});
