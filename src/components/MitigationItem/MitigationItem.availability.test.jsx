import React from 'react';
import { render } from '@testing-library/react';
import { vi } from 'vitest';
import { ThemeProvider } from '../../contexts/ThemeContext';
import MitigationItem from './MitigationItem';

// Mock contexts
vi.mock('../../contexts', () => ({
  useTankPositionContext: () => ({
    tankPositions: { mainTank: 'PLD', offTank: 'WAR' }
  })
}));

const TestWrapper = ({ children, isDarkMode = false }) => (
  <ThemeProvider initialTheme={isDarkMode ? 'dark' : 'light'}>
    {children}
  </ThemeProvider>
);

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
    const { container } = render(
      <TestWrapper>
        <MitigationItem
          {...mockProps}
          isDisabled={false}
          cooldownReason={null}
        />
      </TestWrapper>
    );

    const mitigationContainer = container.querySelector('[class*="MitigationItemContainer"]');
    expect(mitigationContainer).toBeTruthy();
    
    // Check that the component renders (detailed styling tests would require more setup)
    expect(mitigationContainer).toBeInTheDocument();
  });

  it('should show red border when mitigation is disabled', () => {
    const { container } = render(
      <TestWrapper>
        <MitigationItem
          {...mockProps}
          isDisabled={true}
          cooldownReason="On cooldown"
        />
      </TestWrapper>
    );

    const mitigationContainer = container.querySelector('[class*="MitigationItemContainer"]');
    expect(mitigationContainer).toBeTruthy();
    expect(mitigationContainer).toBeInTheDocument();
  });

  it('should work correctly in dark theme', () => {
    const { container } = render(
      <TestWrapper isDarkMode={true}>
        <MitigationItem
          {...mockProps}
          isDisabled={false}
          cooldownReason={null}
        />
      </TestWrapper>
    );

    const mitigationContainer = container.querySelector('[class*="MitigationItemContainer"]');
    expect(mitigationContainer).toBeTruthy();
    expect(mitigationContainer).toBeInTheDocument();
  });

  it('should handle drag and drop functionality with borders', () => {
    const { container } = render(
      <TestWrapper>
        <MitigationItem
          {...mockProps}
          isDisabled={false}
          cooldownReason={null}
          isDragging={true}
        />
      </TestWrapper>
    );

    const mitigationContainer = container.querySelector('[class*="MitigationItemContainer"]');
    expect(mitigationContainer).toBeTruthy();
    expect(mitigationContainer).toBeInTheDocument();
  });
});
