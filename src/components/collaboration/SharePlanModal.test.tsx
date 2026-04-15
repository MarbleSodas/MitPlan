/* @vitest-environment jsdom */

import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SharePlanModal from './SharePlanModal';

const {
  authState,
  makePlanPublicMock,
  enablePlanShareViewMock,
  rotatePlanShareViewTokenMock,
  revokePlanShareViewMock,
} = vi.hoisted(() => ({
  authState: {
    uid: 'owner-1',
  },
  makePlanPublicMock: vi.fn(),
  enablePlanShareViewMock: vi.fn(),
  rotatePlanShareViewTokenMock: vi.fn(),
  revokePlanShareViewMock: vi.fn(),
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: authState.uid ? { uid: authState.uid } : null,
  }),
}));

vi.mock('../../services/realtimePlanService', () => ({
  getShareableEditLink: vi.fn((planId: string) => `https://example.com/plan/shared/${planId}`),
  getShareableViewLink: vi.fn((viewToken: string) => `https://example.com/plan/view/${viewToken}`),
  makePlanPublic: (...args: unknown[]) => makePlanPublicMock(...args),
  enablePlanShareView: (...args: unknown[]) => enablePlanShareViewMock(...args),
  rotatePlanShareViewToken: (...args: unknown[]) => rotatePlanShareViewTokenMock(...args),
  revokePlanShareView: (...args: unknown[]) => revokePlanShareViewMock(...args),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
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
    authState.uid = 'owner-1';
    makePlanPublicMock.mockReset();
    enablePlanShareViewMock.mockReset();
    rotatePlanShareViewTokenMock.mockReset();
    revokePlanShareViewMock.mockReset();
    makePlanPublicMock.mockResolvedValue({ isPublic: true });
    enablePlanShareViewMock.mockResolvedValue({ viewToken: 'snapshot-1' });
    rotatePlanShareViewTokenMock.mockResolvedValue({ viewToken: 'snapshot-2' });
    revokePlanShareViewMock.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('enables the public edit link through makePlanPublic', async () => {
    const onPlanChanged = vi.fn();

    render(
      <SharePlanModal
        isOpen={true}
        onClose={vi.fn()}
        onPlanChanged={onPlanChanged}
        plan={{
          id: 'plan-1',
          name: 'Sample Plan',
          isPublic: false,
          shareSettings: {
            viewToken: null,
            viewEnabled: false,
          },
        }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Enable Edit Link' }));

    await waitFor(() => {
      expect(makePlanPublicMock).toHaveBeenCalledWith('plan-1', true, 'owner-1');
    });
    expect(onPlanChanged).toHaveBeenCalled();
  });

  it('shows active links and regenerates the snapshot link when requested', async () => {
    const onPlanChanged = vi.fn();

    render(
      <SharePlanModal
        isOpen={true}
        onClose={vi.fn()}
        onPlanChanged={onPlanChanged}
        plan={{
          id: 'plan-1',
          name: 'Sample Plan',
          isPublic: true,
          shareSettings: {
            viewToken: 'snapshot-1',
            viewEnabled: true,
          },
        }}
      />
    );

    expect(screen.getByDisplayValue('https://example.com/plan/shared/plan-1')).toBeTruthy();
    expect(screen.getByDisplayValue('https://example.com/plan/view/snapshot-1')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Regenerate Snapshot' }));

    await waitFor(() => {
      expect(rotatePlanShareViewTokenMock).toHaveBeenCalledWith('plan-1', 'owner-1');
    });
    expect(onPlanChanged).toHaveBeenCalled();
    expect(screen.getByDisplayValue('https://example.com/plan/view/snapshot-2')).toBeTruthy();
  });
});
