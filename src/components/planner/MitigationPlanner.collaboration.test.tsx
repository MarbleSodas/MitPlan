/* @vitest-environment jsdom */

import { cleanup, render, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MitigationPlanner from './MitigationPlanner';

const {
  authState,
  joinCollaborativeSessionMock,
  leaveCollaborativeSessionMock,
  navigateMock,
} = vi.hoisted(() => ({
  authState: {
    isAuthenticated: true,
  },
  joinCollaborativeSessionMock: vi.fn(),
  leaveCollaborativeSessionMock: vi.fn(),
  navigateMock: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useParams: () => ({ planId: 'plan-123' }),
  };
});

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: authState.isAuthenticated,
  }),
}));

vi.mock('../../contexts/RealtimeAppProvider', () => ({
  default: ({ children }: { children: ReactNode }) => children,
}));

vi.mock('../../contexts/RealtimePlanContext', () => ({
  useRealtimePlan: () => ({
    realtimePlan: { name: 'Plan 123' },
    loading: false,
    error: null,
  }),
}));

vi.mock('../../contexts/RealtimeBossContext', () => ({
  useRealtimeBossContext: () => ({
    sortedBossActions: [],
    selectedBossAction: null,
    toggleBossActionSelection: vi.fn(),
    currentBossLevel: 100,
    currentBaseHealth: { party: 1, tank: 1 },
  }),
}));

vi.mock('../../contexts/RealtimeJobContext', () => ({
  useRealtimeJobContext: () => ({
    selectedJobs: {},
  }),
}));

vi.mock('../../contexts/EnhancedMitigationContext', () => ({
  useEnhancedMitigation: () => ({
    assignments: {},
    addMitigation: vi.fn(),
    removeMitigation: vi.fn(),
    checkAbilityAvailability: () => ({ canAssign: () => true }),
    getActiveMitigations: () => [],
    pendingAssignments: [],
    updateMitigationPrecast: vi.fn(),
  }),
}));

vi.mock('../../contexts/CollaborationContext', () => ({
  useCollaboration: () => ({
    joinCollaborativeSession: joinCollaborativeSessionMock,
    leaveCollaborativeSession: leaveCollaborativeSessionMock,
    collaborators: [],
    isCollaborating: true,
    displayName: 'User One',
    isInitialized: true,
  }),
}));

vi.mock('../../contexts/PresenceContext', () => ({
  usePresenceOptional: () => null,
}));

vi.mock('../../contexts/UserJobAssignmentContext', () => ({
  useUserJobAssignmentOptional: () => null,
}));

vi.mock('../../contexts', () => ({
  useFilterContext: () => ({
    filterMitigations: (mitigations: unknown[]) => mitigations,
  }),
  useTankPositionContext: () => ({
    tankPositions: { mainTank: null, offTank: null },
  }),
  useTankSelectionModalContext: () => ({
    openTankSelectionModal: vi.fn(),
  }),
}));

vi.mock('../../contexts/ClassSelectionModalContext.jsx', () => ({
  useClassSelectionModalContext: () => ({
    openClassSelectionModal: vi.fn(),
  }),
}));

vi.mock('../collaboration/CollaboratorsList', () => ({ default: () => null }));
vi.mock('../collaboration/ActiveUsersDisplay', () => ({ default: () => null }));
vi.mock('../common/KofiButton/KofiButton', () => ({ default: () => null }));
vi.mock('../common/DiscordButton/DiscordButton', () => ({ default: () => null }));
vi.mock('../common/ThemeToggle', () => ({ default: () => null }));
vi.mock('../common/HealingPotencyInput/HealingPotencyInput', () => ({ default: () => null }));
vi.mock('../common/PrecastToggle', () => ({ default: () => null }));
vi.mock('../layout/Footer', () => ({ default: () => null }));
vi.mock('../../features/jobs/JobSelector/JobSelector', () => ({ default: () => null }));
vi.mock('../BossActionItem/BossActionItem', () => ({ default: ({ children }: { children?: ReactNode }) => <div>{children}</div> }));
vi.mock('../MitigationItem/MitigationItem', () => ({ default: () => null }));
vi.mock('../AssignedMitigations/AssignedMitigations', () => ({ default: () => null }));
vi.mock('./MobileBossTimeline', () => ({ default: () => null }));
vi.mock('./MitigationBottomSheet', () => ({ default: () => null }));
vi.mock('../common/FilterToggle', () => ({ default: () => null }));
vi.mock('../common/TankSelectionModal', () => ({ default: () => null }));
vi.mock('../DragAndDrop/Draggable', () => ({ default: ({ children }: { children?: ReactNode }) => <div>{children}</div> }));
vi.mock('../DragAndDrop/Droppable', () => ({ default: ({ children }: { children?: ReactNode }) => <div>{children}</div> }));
vi.mock('../common/PartyMinHealthInput/PartyMinHealthInput', () => ({ default: () => null }));

describe('MitigationPlanner collaboration behavior', () => {
  beforeEach(() => {
    authState.isAuthenticated = true;
    joinCollaborativeSessionMock.mockReset();
    leaveCollaborativeSessionMock.mockReset();
    navigateMock.mockReset();
    joinCollaborativeSessionMock.mockResolvedValue(true);
    leaveCollaborativeSessionMock.mockResolvedValue(true);
  });

  afterEach(() => {
    cleanup();
  });

  it('does not join collaboration from the guest shared view', () => {
    authState.isAuthenticated = false;

    render(<MitigationPlanner isSharedPlan={true} />);
    expect(joinCollaborativeSessionMock).not.toHaveBeenCalled();
  });

  it('joins collaboration for signed-in users on the shared route', async () => {
    render(<MitigationPlanner isSharedPlan={true} />);

    await waitFor(() => {
      expect(joinCollaborativeSessionMock).toHaveBeenCalledWith('plan-123', 'User One');
    });
  });

  it('joins collaboration for authenticated editors without rejoining on cleanup-only churn', async () => {
    const { unmount } = render(<MitigationPlanner />);

    await waitFor(() => {
      expect(joinCollaborativeSessionMock).toHaveBeenCalledWith('plan-123', 'User One');
    });

    unmount();
    expect(joinCollaborativeSessionMock).toHaveBeenCalledTimes(1);
    expect(leaveCollaborativeSessionMock).not.toHaveBeenCalled();
  });
});
