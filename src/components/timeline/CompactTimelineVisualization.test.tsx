import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CompactTimelineVisualization from './CompactTimelineVisualization';

describe('CompactTimelineVisualization', () => {
  it('renders summary details and lets the user jump to a selected action', () => {
    const onActionClick = vi.fn();

    render(
      <CompactTimelineVisualization
        actions={[
          {
            id: 'action-1',
            name: 'Opening Raidwide',
            time: 10,
            importance: 'high',
            icon: '🔥',
          },
          {
            id: 'action-2',
            name: 'Heavy Tank Buster',
            time: 22,
            importance: 'critical',
            isTankBuster: true,
            icon: '🛡️',
          },
        ]}
        onActionClick={onActionClick}
        selectedActionId="action-2"
      />
    );

    expect(screen.getByText('Timeline Overview')).toBeInTheDocument();
    expect(screen.getByText('2 actions')).toBeInTheDocument();

    const selectedMarker = screen.getByRole('button', {
      name: 'Jump to Heavy Tank Buster at 0:22',
    });
    expect(selectedMarker).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', {
      name: 'Jump to Opening Raidwide at 0:10',
    }));
    expect(onActionClick).toHaveBeenCalledWith('action-1');
  });

  it('renders the empty state when no actions are available', () => {
    render(<CompactTimelineVisualization actions={[]} />);

    expect(
      screen.getByText('No actions yet - add actions to see timeline visualization')
    ).toBeInTheDocument();
  });
});
