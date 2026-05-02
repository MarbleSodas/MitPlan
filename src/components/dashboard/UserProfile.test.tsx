/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import UserProfile from './UserProfile';

const {
  authState,
  deleteCurrentUserAccountMock,
  getIdTokenMock,
  logoutMock,
  navigateMock,
  reauthenticateWithCredentialMock,
  reauthenticateWithPopupMock,
  toastSuccessMock,
  updateProfileMock,
} = vi.hoisted(() => ({
  authState: {
    user: {
      uid: 'user-1',
      email: 'raider@example.com',
      displayName: 'Raider',
      providerData: [{ providerId: 'password' }],
    } as any,
  },
  deleteCurrentUserAccountMock: vi.fn(),
  getIdTokenMock: vi.fn(),
  logoutMock: vi.fn(),
  navigateMock: vi.fn(),
  reauthenticateWithCredentialMock: vi.fn(),
  reauthenticateWithPopupMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  updateProfileMock: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}));

vi.mock('firebase/auth', () => ({
  EmailAuthProvider: {
    credential: (email: string, password: string) => ({ email, password }),
  },
  reauthenticateWithCredential: (...args: unknown[]) => reauthenticateWithCredentialMock(...args),
  reauthenticateWithPopup: (...args: unknown[]) => reauthenticateWithPopupMock(...args),
  updateProfile: (...args: unknown[]) => updateProfileMock(...args),
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
  },
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: authState.user,
    logout: logoutMock,
  }),
}));

vi.mock('../../config/firebase', () => ({
  auth: {
    get currentUser() {
      return authState.user
        ? {
            ...authState.user,
            getIdToken: getIdTokenMock,
          }
        : null;
    },
  },
  googleProvider: { providerId: 'google.com' },
}));

vi.mock('../../services/accountDeletionService', () => ({
  deleteCurrentUserAccount: (...args: unknown[]) => deleteCurrentUserAccountMock(...args),
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children }: { open: boolean; children?: ReactNode }) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: { children?: ReactNode }) => <div role="dialog">{children}</div>,
  DialogHeader: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children?: ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children?: ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    disabled,
    onClick,
    type = 'button',
  }: {
    children?: ReactNode;
    disabled?: boolean;
    onClick?: () => void;
    type?: 'button' | 'submit' | 'reset';
  }) => (
    <button disabled={disabled} onClick={onClick} type={type}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

describe('UserProfile account deletion', () => {
  beforeEach(() => {
    authState.user = {
      uid: 'user-1',
      email: 'raider@example.com',
      displayName: 'Raider',
      providerData: [{ providerId: 'password' }],
    };
    deleteCurrentUserAccountMock.mockReset().mockResolvedValue({
      deleted: true,
      deletedPlans: 2,
      deletedTimelines: 1,
      scrubbedPlans: 0,
      scrubbedTimelines: 0,
    });
    getIdTokenMock.mockReset().mockResolvedValue('fresh-token');
    logoutMock.mockReset().mockResolvedValue(undefined);
    navigateMock.mockReset();
    reauthenticateWithCredentialMock.mockReset().mockResolvedValue(undefined);
    reauthenticateWithPopupMock.mockReset().mockResolvedValue(undefined);
    toastSuccessMock.mockReset();
    updateProfileMock.mockReset().mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
  });

  it('shows account deletion controls in account settings', () => {
    render(<UserProfile />);

    fireEvent.click(screen.getByText('Raider'));

    expect(screen.getByText('Account Settings')).toBeTruthy();
    expect(screen.getByText('Delete account')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Delete Account/i })).toBeTruthy();
  });

  it('keeps deletion disabled until the user enters password and DELETE', () => {
    render(<UserProfile />);

    fireEvent.click(screen.getByText('Raider'));
    fireEvent.click(screen.getByRole('button', { name: /Delete Account/i }));

    const submitButtons = screen.getAllByRole('button', { name: /Delete Account/i });
    const submitButton = submitButtons[submitButtons.length - 1];
    expect(submitButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret-password' } });
    fireEvent.change(screen.getByLabelText('Type DELETE to confirm'), { target: { value: 'delete' } });
    expect(submitButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Type DELETE to confirm'), { target: { value: 'DELETE' } });
    expect(submitButton).not.toBeDisabled();
  });

  it('reauthenticates password users before calling the deletion function', async () => {
    render(<UserProfile />);

    fireEvent.click(screen.getByText('Raider'));
    fireEvent.click(screen.getByRole('button', { name: /Delete Account/i }));
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret-password' } });
    fireEvent.change(screen.getByLabelText('Type DELETE to confirm'), { target: { value: 'DELETE' } });
    const deleteButtons = screen.getAllByRole('button', { name: /Delete Account/i });
    fireEvent.click(deleteButtons[deleteButtons.length - 1]);

    await waitFor(() => {
      expect(reauthenticateWithCredentialMock).toHaveBeenCalledWith(
        expect.objectContaining({ uid: 'user-1' }),
        { email: 'raider@example.com', password: 'secret-password' }
      );
      expect(deleteCurrentUserAccountMock).toHaveBeenCalled();
      expect(logoutMock).toHaveBeenCalled();
      expect(navigateMock).toHaveBeenCalledWith('/', { replace: true });
    });
  });

  it('reauthenticates Google users with a popup before deleting', async () => {
    authState.user = {
      uid: 'user-1',
      email: 'raider@example.com',
      displayName: 'Raider',
      providerData: [{ providerId: 'google.com' }],
    };

    render(<UserProfile />);

    fireEvent.click(screen.getByText('Raider'));
    fireEvent.click(screen.getByRole('button', { name: /Delete Account/i }));
    fireEvent.change(screen.getByLabelText('Type DELETE to confirm'), { target: { value: 'DELETE' } });
    const deleteButtons = screen.getAllByRole('button', { name: /Delete Account/i });
    fireEvent.click(deleteButtons[deleteButtons.length - 1]);

    await waitFor(() => {
      expect(reauthenticateWithPopupMock).toHaveBeenCalledWith(
        expect.objectContaining({ uid: 'user-1' }),
        { providerId: 'google.com' }
      );
      expect(deleteCurrentUserAccountMock).toHaveBeenCalled();
    });
  });

  it('keeps the user signed in when deletion fails', async () => {
    deleteCurrentUserAccountMock.mockRejectedValue(new Error('backend failure'));

    render(<UserProfile />);

    fireEvent.click(screen.getByText('Raider'));
    fireEvent.click(screen.getByRole('button', { name: /Delete Account/i }));
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret-password' } });
    fireEvent.change(screen.getByLabelText('Type DELETE to confirm'), { target: { value: 'DELETE' } });
    const deleteButtons = screen.getAllByRole('button', { name: /Delete Account/i });
    fireEvent.click(deleteButtons[deleteButtons.length - 1]);

    await screen.findByText('backend failure');
    expect(logoutMock).not.toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
