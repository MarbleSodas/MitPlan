import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { ThemeProvider } from '../../contexts/ThemeContext';
import TankPositionSelector from './TankPositionSelector';

// Mock the TankPositionContext
const mockTankPositionContext = {
  tankPositions: { mainTank: null, offTank: null },
  assignTankPosition: vi.fn(),
  selectedTankJobs: [
    { id: 'PLD', name: 'Paladin', icon: '/jobs-new/paladin.png' },
    { id: 'WAR', name: 'Warrior', icon: '/jobs-new/warrior.png' }
  ]
};

vi.mock('../../contexts/TankPositionContext', () => ({
  useTankPositionContext: () => mockTankPositionContext
}));

const TestWrapper = ({ children }) => (
  <ThemeProvider>
    {children}
  </ThemeProvider>
);

describe('TankPositionSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders when exactly 2 tanks are selected', () => {
    render(
      <TestWrapper>
        <TankPositionSelector />
      </TestWrapper>
    );

    expect(screen.getByText('Tank Positions')).toBeInTheDocument();
    expect(screen.getByText('Main Tank (MT)')).toBeInTheDocument();
    expect(screen.getByText('Off Tank (OT)')).toBeInTheDocument();
  });

  it('does not render when less than 2 tanks are selected', () => {
    mockTankPositionContext.selectedTankJobs = [
      { id: 'PLD', name: 'Paladin', icon: '/jobs-new/paladin.png' }
    ];

    const { container } = render(
      <TestWrapper>
        <TankPositionSelector />
      </TestWrapper>
    );

    expect(container.firstChild).toBeNull();
  });

  it('does not render when more than 2 tanks are selected', () => {
    mockTankPositionContext.selectedTankJobs = [
      { id: 'PLD', name: 'Paladin', icon: '/jobs-new/paladin.png' },
      { id: 'WAR', name: 'Warrior', icon: '/jobs-new/warrior.png' },
      { id: 'DRK', name: 'Dark Knight', icon: '/jobs-new/darkknight.png' }
    ];

    const { container } = render(
      <TestWrapper>
        <TankPositionSelector />
      </TestWrapper>
    );

    expect(container.firstChild).toBeNull();
  });

  it('calls assignTankPosition when tank is clicked', () => {
    mockTankPositionContext.selectedTankJobs = [
      { id: 'PLD', name: 'Paladin', icon: '/jobs-new/paladin.png' },
      { id: 'WAR', name: 'Warrior', icon: '/jobs-new/warrior.png' }
    ];

    render(
      <TestWrapper>
        <TankPositionSelector />
      </TestWrapper>
    );

    const paladinButtons = screen.getAllByText('Paladin');
    fireEvent.click(paladinButtons[0]); // Click the first Paladin button (MT)

    expect(mockTankPositionContext.assignTankPosition).toHaveBeenCalledWith('PLD', 'mainTank');
  });
});
