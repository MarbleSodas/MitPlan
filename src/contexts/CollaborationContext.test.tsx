/* @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { StrictMode, useEffect, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CollaborationProvider, useCollaboration } from './CollaborationContext';
import CollaborationAutoJoin from '../components/collaboration/CollaborationAutoJoin';

const {
  endSessionMock,
  startSessionMock,
  storeUserProfileMock,
  subscribeToSessionsMock,
  unsubscribeSessionsMock,
} = vi.hoisted(() => ({
  endSessionMock: vi.fn(),
  startSessionMock: vi.fn(),
  storeUserProfileMock: vi.fn(),
  subscribeToSessionsMock: vi.fn(),
  unsubscribeSessionsMock: vi.fn(),
}));

vi.mock('./AuthContext', () => ({
  useAuth: () => ({
    user: { uid: 'user-1', email: 'user@example.com' },
    isAuthenticated: true,
    displayName: 'User One',
  }),
}));

vi.mock('../services/sessionManager', () => ({
  default: {
    startSession: (...args: unknown[]) => startSessionMock(...args),
    endSession: (...args: unknown[]) => endSessionMock(...args),
    subscribeToSessions: (...args: unknown[]) => subscribeToSessionsMock(...args),
  },
}));

vi.mock('../services/userService', () => ({
  storeUserProfile: (...args: unknown[]) => storeUserProfileMock(...args),
}));

const TestConsumer = () => {
  const { joinCollaborativeSession } = useCollaboration() as {
    joinCollaborativeSession: (planId: string, displayName?: string) => Promise<boolean>;
  };

  return (
    <button
      onClick={async () => {
        await joinCollaborativeSession('plan-1', 'User One');
        await joinCollaborativeSession('plan-1', 'User One');
      }}
    >
      Join
    </button>
  );
};

const DisplayNameHydration = () => {
  const { setDisplayName } = useCollaboration() as {
    setDisplayName: (nextDisplayName: string) => void;
  };

  useEffect(() => {
    setDisplayName('User One Hydrated');
  }, [setDisplayName]);

  return null;
};

const CollaborationStatusConsumer = () => {
  const {
    joinCollaborativeSession,
    isCollaborating,
    collaborationAvailable,
    collaborationError,
  } = useCollaboration() as {
    joinCollaborativeSession: (planId: string, displayName?: string) => Promise<boolean>;
    isCollaborating: boolean;
    collaborationAvailable: boolean;
    collaborationError: string | null;
  };

  return (
    <div>
      <button
        onClick={async () => {
          await joinCollaborativeSession('plan-1', 'User One');
        }}
      >
        Join Once
      </button>
      <div data-testid="collaborating">{String(isCollaborating)}</div>
      <div data-testid="available">{String(collaborationAvailable)}</div>
      <div data-testid="error">{collaborationError ?? 'none'}</div>
    </div>
  );
};

describe('CollaborationProvider', () => {
  beforeEach(() => {
    startSessionMock.mockReset();
    endSessionMock.mockReset();
    storeUserProfileMock.mockReset();
    subscribeToSessionsMock.mockReset();
    unsubscribeSessionsMock.mockReset();

    startSessionMock.mockResolvedValue(true);
    endSessionMock.mockResolvedValue(true);
    subscribeToSessionsMock.mockImplementation((_planId: string, callback: (sessions: unknown[]) => void) => {
      callback([]);
      return unsubscribeSessionsMock;
    });
  });

  it('joins the same plan idempotently', async () => {
    render(
      <CollaborationProvider>
        <TestConsumer />
      </CollaborationProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Join' }));

    await waitFor(() => {
      expect(startSessionMock).toHaveBeenCalledTimes(1);
    });
    expect(subscribeToSessionsMock).toHaveBeenCalledTimes(1);
    expect(storeUserProfileMock).toHaveBeenCalledWith('user-1', 'User One', 'user@example.com');
  });

  it('does not rejoin the same room during StrictMode display-name hydration', async () => {
    const { unmount } = render(
      <StrictMode>
        <CollaborationProvider>
          <>
            <CollaborationAutoJoin roomId="plan-1" />
            <DisplayNameHydration />
          </>
        </CollaborationProvider>
      </StrictMode>
    );

    await waitFor(() => {
      expect(startSessionMock).toHaveBeenCalledTimes(1);
    });

    expect(subscribeToSessionsMock).toHaveBeenCalledTimes(1);
    expect(endSessionMock).not.toHaveBeenCalled();

    unmount();

    await waitFor(() => {
      expect(endSessionMock).toHaveBeenCalledTimes(1);
    });
    expect(unsubscribeSessionsMock).toHaveBeenCalledTimes(1);
  });

  it('marks collaboration unavailable when session startup is permission denied', async () => {
    startSessionMock.mockRejectedValueOnce(new Error('PERMISSION_DENIED: Permission denied'));

    render(
      <CollaborationProvider>
        <CollaborationStatusConsumer />
      </CollaborationProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Join Once' }));

    await waitFor(() => {
      expect(screen.getByTestId('available').textContent).toBe('false');
    });

    expect(screen.getByTestId('collaborating').textContent).toBe('false');
    expect(screen.getByTestId('error').textContent).toContain('Realtime collaboration is temporarily unavailable');
    expect(subscribeToSessionsMock).not.toHaveBeenCalled();
  });
});
