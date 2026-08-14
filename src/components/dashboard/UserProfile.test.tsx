/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import UserProfile from './UserProfile';

const {
  authState,
  deleteCurrentUserAccountMock,
  logoutMock,
  navigateMock,
  signInWithPasswordMock,
  toastSuccessMock,
  updateUserMock,
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
  logoutMock: vi.fn(),
  navigateMock: vi.fn(),
  signInWithPasswordMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  updateUserMock: vi.fn(),
}));

vi.mock('@/lib/navigation', () => ({
  useNavigate: () => navigateMock,
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

vi.mock('../../config/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: (...args: unknown[]) => signInWithPasswordMock(...args),
      updateUser: (...args: unknown[]) => updateUserMock(...args),
    },
  },
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
    logoutMock.mockReset().mockResolvedValue(undefined);
    navigateMock.mockReset();
    signInWithPasswordMock.mockReset().mockResolvedValue({ data: {}, error: null });
    toastSuccessMock.mockReset();
    updateUserMock.mockReset().mockResolvedValue({ data: {}, error: null });
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
      expect(signInWithPasswordMock).toHaveBeenCalledWith({
        email: 'raider@example.com',
        password: 'secret-password',
      });
      expect(deleteCurrentUserAccountMock).toHaveBeenCalled();
      expect(logoutMock).toHaveBeenCalled();
      expect(navigateMock).toHaveBeenCalledWith('/', { replace: true });
    });
  });

  it('uses the active OAuth session when deleting a Google account', async () => {
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
      expect(signInWithPasswordMock).not.toHaveBeenCalled();
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
