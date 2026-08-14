/* @vitest-environment jsdom */

import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SharePlanModal from './SharePlanModal';

const {
  createInviteMock,
  createShareMock,
  revokeShareMock,
  revokeInvitesMock,
} = vi.hoisted(() => ({
  createInviteMock: vi.fn(),
  createShareMock: vi.fn(),
  revokeShareMock: vi.fn(),
  revokeInvitesMock: vi.fn(),
}));

vi.mock('../../services/normalizedPlanService', () => ({
  createPlanInvite: (...args: unknown[]) => createInviteMock(...args),
  createPlanShareLink: (...args: unknown[]) => createShareMock(...args),
  revokePlanShareLinks: (...args: unknown[]) => revokeShareMock(...args),
  revokePlanInvites: (...args: unknown[]) => revokeInvitesMock(...args),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children }: { open: boolean; children: ReactNode }) => open ? <div>{children}</div> : null,
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

describe('SharePlanModal', () => {
  beforeEach(() => {
    createInviteMock.mockReset().mockResolvedValue({ token: 'invite-token' });
    createShareMock.mockReset().mockResolvedValue({ token: 'view-token' });
    revokeShareMock.mockReset().mockResolvedValue(true);
    revokeInvitesMock.mockReset().mockResolvedValue(true);
  });

  it('creates an authenticated editor invite without enabling public editing', async () => {
    render(
      <SharePlanModal
        isOpen
        onClose={vi.fn()}
        onPlanChanged={vi.fn()}
        plan={{ id: 'plan-1', name: 'Sample Plan' }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Create invite' }));
    await waitFor(() => {
      expect(createInviteMock).toHaveBeenCalledWith('plan-1', 'EDITOR');
    });
    expect(screen.getByDisplayValue(/\/plan\/invite\/invite-token$/)).toBeTruthy();
  });

  it('rotates and revokes refresh-only anonymous view links', async () => {
    const onPlanChanged = vi.fn();
    render(
      <SharePlanModal
        isOpen
        onClose={vi.fn()}
        onPlanChanged={onPlanChanged}
        plan={{ id: 'plan-1', name: 'Sample Plan' }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Create or rotate' }));
    await waitFor(() => expect(createShareMock).toHaveBeenCalledWith('plan-1'));
    expect(screen.getByDisplayValue(/\/plan\/view\/view-token$/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Revoke all view links' }));
    await waitFor(() => expect(revokeShareMock).toHaveBeenCalledWith('plan-1'));
    expect(onPlanChanged).toHaveBeenCalledTimes(2);
  });
});
