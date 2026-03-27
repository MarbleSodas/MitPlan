/* @vitest-environment jsdom */

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PresenceProvider, usePresence } from './PresenceContext';

const {
  clearDebounceMock,
  clearPresenceMock,
  collaborationStateRef,
  debounceMock,
  presenceSubscriptionRef,
  setFullPresenceMock,
  setupDisconnectHandlerMock,
  subscribeToPresenceMock,
  unsubscribePresenceMock,
  updatePresenceMock,
} = vi.hoisted(() => ({
  clearDebounceMock: vi.fn(),
  clearPresenceMock: vi.fn(),
  collaborationStateRef: {
    current: {
      sessionId: 'session-1',
      collaborators: [
        {
          sessionId: 'session-1',
          userId: 'user-1',
          displayName: 'User One',
          color: '#3b82f6',
        },
        {
          sessionId: 'session-2',
          userId: 'user-2',
          displayName: 'Alice',
          color: '#22c55e',
        },
      ],
      isCollaborating: true,
    } as any,
  },
  debounceMock: vi.fn(),
  presenceSubscriptionRef: {
    current: null as ((presenceMap: Map<string, unknown>) => void) | null,
  },
  setFullPresenceMock: vi.fn(),
  setupDisconnectHandlerMock: vi.fn(),
  subscribeToPresenceMock: vi.fn(),
  unsubscribePresenceMock: vi.fn(),
  updatePresenceMock: vi.fn(),
}));

vi.mock('./CollaborationContext', () => ({
  useCollaboration: () => collaborationStateRef.current,
}));

vi.mock('../services/presenceService', async () => {
  const actual = await vi.importActual<typeof import('../services/presenceService')>(
    '../services/presenceService'
  );

  return {
    ...actual,
    clearPresence: (...args: unknown[]) => clearPresenceMock(...args),
    presenceDebouncer: {
      debounce: (...args: unknown[]) => debounceMock(...args),
      clear: (...args: unknown[]) => clearDebounceMock(...args),
    },
    setFullPresence: (...args: unknown[]) => setFullPresenceMock(...args),
    setupDisconnectHandler: (...args: unknown[]) => setupDisconnectHandlerMock(...args),
    subscribeToPresence: (...args: unknown[]) => subscribeToPresenceMock(...args),
    updatePresence: (...args: unknown[]) => updatePresenceMock(...args),
  };
});

const TARGET_KEY = 'planner|bossAction|boss-1||';

const PresenceConsumer = () => {
  const presence = usePresence();
  const [capturedTarget, setCapturedTarget] = useState('none');
  const [capturedInteraction, setCapturedInteraction] = useState('none');
  const matchingPresence = presence.getPresenceForTarget(TARGET_KEY);

  return (
    <div>
      <button
        onClick={() => {
          presence.setActiveTarget({
            surface: 'planner',
            entityType: 'bossAction',
            entityId: 'boss-1',
          });
          presence.setInteraction('selected');
        }}
      >
        Activate
      </button>
      <button
        onClick={() => {
          presence.setActiveTarget({
            surface: 'planner',
            entityType: 'bossAction',
            entityId: 'boss-1',
          });
        }}
      >
        Publish Target
      </button>
      <button
        onClick={() => {
          presence.setInteraction(null);
          presence.setActiveTarget(null);
        }}
      >
        Deactivate
      </button>
      <button
        onClick={() => {
          const myPresence = presence.getMyPresence();
          setCapturedTarget(myPresence?.activeTarget?.key ?? 'none');
          setCapturedInteraction(myPresence?.interaction ?? 'none');
        }}
      >
        Capture
      </button>
      <div data-testid="target">{capturedTarget}</div>
      <div data-testid="interaction">{capturedInteraction}</div>
      <div data-testid="remote-users">
        {matchingPresence.map((entry) => entry.displayName).join(',') || 'none'}
      </div>
      <div data-testid="availability">{String(presence.collaborationAvailable)}</div>
      <div data-testid="error">{presence.collaborationError ?? 'none'}</div>
    </div>
  );
};

describe('PresenceProvider', () => {
  beforeEach(() => {
    vi.useRealTimers();
    clearDebounceMock.mockReset();
    clearPresenceMock.mockReset();
    debounceMock.mockReset();
    setFullPresenceMock.mockReset();
    setupDisconnectHandlerMock.mockReset();
    subscribeToPresenceMock.mockReset();
    unsubscribePresenceMock.mockReset();
    updatePresenceMock.mockReset();

    collaborationStateRef.current = {
      sessionId: 'session-1',
      collaborators: [
        {
          sessionId: 'session-1',
          userId: 'user-1',
          displayName: 'User One',
          color: '#3b82f6',
        },
        {
          sessionId: 'session-2',
          userId: 'user-2',
          displayName: 'Alice',
          color: '#22c55e',
        },
      ],
      isCollaborating: true,
    };

    debounceMock.mockImplementation((_key: string, fn: () => void) => {
      fn();
    });
    subscribeToPresenceMock.mockImplementation((_roomId: string, callback: (presenceMap: Map<string, unknown>) => void) => {
      presenceSubscriptionRef.current = callback;
      return unsubscribePresenceMock;
    });
    setFullPresenceMock.mockResolvedValue(undefined);
    setupDisconnectHandlerMock.mockResolvedValue(undefined);
    clearPresenceMock.mockResolvedValue(undefined);
    updatePresenceMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    presenceSubscriptionRef.current = null;
    vi.useRealTimers();
  });

  it('keeps local presence stable while collaborator metadata changes', async () => {
    const { rerender, unmount } = render(
      <PresenceProvider roomId="plan-1">
        <PresenceConsumer />
      </PresenceProvider>
    );

    await waitFor(() => {
      expect(setFullPresenceMock).toHaveBeenCalledTimes(1);
      expect(setupDisconnectHandlerMock).toHaveBeenCalledTimes(1);
      expect(subscribeToPresenceMock).toHaveBeenCalledTimes(1);
    });

    act(() => {
      presenceSubscriptionRef.current?.(
        new Map([
          [
            'session-2',
            {
              sessionId: 'session-2',
              activeTarget: {
                surface: 'planner',
                entityType: 'bossAction',
                entityId: 'boss-1',
                key: TARGET_KEY,
              },
              interaction: 'selected',
              cursor: null,
              viewport: null,
              lastUpdated: Date.now(),
            },
          ],
        ])
      );
    });

    expect(screen.getByTestId('remote-users').textContent).toContain('Alice');

    fireEvent.click(screen.getByRole('button', { name: 'Activate' }));
    fireEvent.click(screen.getByRole('button', { name: 'Capture' }));

    expect(screen.getByTestId('target').textContent).toBe(TARGET_KEY);
    expect(screen.getByTestId('interaction').textContent).toBe('selected');

    collaborationStateRef.current = {
      ...collaborationStateRef.current,
      collaborators: [
        {
          sessionId: 'session-1',
          userId: 'user-1',
          displayName: 'User One',
          color: '#3b82f6',
          lastActivity: Date.now(),
        },
        {
          sessionId: 'session-2',
          userId: 'user-2',
          displayName: 'Alice Updated',
          color: '#22c55e',
          lastActivity: Date.now(),
        },
      ],
    };

    rerender(
      <PresenceProvider roomId="plan-1">
        <PresenceConsumer />
      </PresenceProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Capture' }));

    expect(setFullPresenceMock).toHaveBeenCalledTimes(1);
    expect(subscribeToPresenceMock).toHaveBeenCalledTimes(1);
    expect(clearPresenceMock).not.toHaveBeenCalled();
    expect(screen.getByTestId('target').textContent).toBe(TARGET_KEY);
    expect(screen.getByTestId('interaction').textContent).toBe('selected');
    expect(screen.getByTestId('remote-users').textContent).toContain('Alice Updated');

    unmount();

    expect(unsubscribePresenceMock).toHaveBeenCalledTimes(1);
    expect(clearPresenceMock).toHaveBeenCalledTimes(1);
    expect(clearDebounceMock).toHaveBeenCalledTimes(3);
  });

  it('disables further presence publishing after the first permission error', async () => {
    updatePresenceMock.mockRejectedValueOnce(new Error('PERMISSION_DENIED: Permission denied'));

    render(
      <PresenceProvider roomId="plan-1">
        <PresenceConsumer />
      </PresenceProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Publish Target' }));

    await waitFor(() => {
      expect(screen.getByTestId('availability').textContent).toBe('false');
    });

    expect(screen.getByTestId('error').textContent).toContain('Realtime collaboration is temporarily unavailable');
    expect(updatePresenceMock).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Publish Target' }));

    expect(updatePresenceMock).toHaveBeenCalledTimes(1);
  });

  it('keeps selected presence alive with heartbeat updates until deselected', async () => {
    vi.useFakeTimers();

    render(
      <PresenceProvider roomId="plan-1">
        <PresenceConsumer />
      </PresenceProvider>
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(setFullPresenceMock).toHaveBeenCalledTimes(1);
    expect(subscribeToPresenceMock).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Activate' }));

    expect(updatePresenceMock.mock.calls.length).toBeGreaterThan(0);

    const callsAfterSelect = updatePresenceMock.mock.calls.length;

    act(() => {
      vi.advanceTimersByTime(31_000);
    });

    expect(updatePresenceMock.mock.calls.length).toBe(callsAfterSelect + 3);

    fireEvent.click(screen.getByRole('button', { name: 'Capture' }));
    expect(screen.getByTestId('interaction').textContent).toBe('selected');
    expect(screen.getByTestId('target').textContent).toBe(TARGET_KEY);

    fireEvent.click(screen.getByRole('button', { name: 'Deactivate' }));
    fireEvent.click(screen.getByRole('button', { name: 'Capture' }));
    expect(screen.getByTestId('interaction').textContent).toBe('none');
    expect(screen.getByTestId('target').textContent).toBe('none');

    const callsAfterDeactivate = updatePresenceMock.mock.calls.length;

    act(() => {
      vi.advanceTimersByTime(11_000);
    });

    expect(updatePresenceMock.mock.calls.length).toBe(callsAfterDeactivate);
  });
});
