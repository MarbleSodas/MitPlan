/* @vitest-environment jsdom */

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SectionPresencePill from './SectionPresencePill';

const presenceState = vi.hoisted(() => ({
  current: null as
    | {
        collaborationAvailable: boolean;
        currentSessionId: string | null;
        presenceMap: Map<string, unknown>;
      }
    | null,
}));

vi.mock('../../contexts/PresenceContext', () => ({
  usePresenceOptional: () => presenceState.current,
}));

afterEach(() => {
  cleanup();
  presenceState.current = null;
});

describe('SectionPresencePill', () => {
  it('renders nothing when there are no other collaborators in the section', () => {
    presenceState.current = {
      collaborationAvailable: true,
      currentSessionId: 'session-1',
      presenceMap: new Map(),
    };

    const { container } = render(
      <SectionPresencePill surface="planner" section="timeline" />
    );

    expect(container.firstChild).toBeNull();
  });

  it('shows collaborator chips without the visible "is here" text', () => {
    presenceState.current = {
      collaborationAvailable: true,
      currentSessionId: 'session-1',
      presenceMap: new Map([
        [
          'session-2',
          {
            sessionId: 'session-2',
            displayName: 'Cheesed',
            color: '#22c55e',
            viewport: {
              surface: 'planner',
              section: 'timeline',
            },
          },
        ],
      ]),
    };

    render(<SectionPresencePill surface="planner" section="timeline" />);

    expect(screen.getByText('C')).toBeTruthy();
    expect(screen.queryByText(/is here/i)).toBeNull();
    expect(screen.getByLabelText('Cheesed')).toBeTruthy();
  });

  it('shows an overflow chip for additional collaborators', () => {
    presenceState.current = {
      collaborationAvailable: true,
      currentSessionId: 'session-1',
      presenceMap: new Map([
        [
          'session-2',
          {
            sessionId: 'session-2',
            displayName: 'Cheesed',
            color: '#22c55e',
            viewport: {
              surface: 'planner',
              section: 'timeline',
            },
          },
        ],
        [
          'session-3',
          {
            sessionId: 'session-3',
            displayName: 'Alice',
            color: '#3b82f6',
            viewport: {
              surface: 'planner',
              section: 'timeline',
            },
          },
        ],
        [
          'session-4',
          {
            sessionId: 'session-4',
            displayName: 'Bob',
            color: '#f59e0b',
            viewport: {
              surface: 'planner',
              section: 'timeline',
            },
          },
        ],
      ]),
    };

    render(<SectionPresencePill surface="planner" section="timeline" />);

    expect(screen.getByText('+1')).toBeTruthy();
    expect(screen.getByLabelText('Alice, Bob +1 more')).toBeTruthy();
  });
});
