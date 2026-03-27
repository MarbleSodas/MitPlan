/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MitigationPlanner from './MitigationPlanner';

const {
  authState,
  navigateMock,
  updatePhaseOverridesRealtimeMock,
  planHookState,
  bossHookState,
} = vi.hoisted(() => ({
  authState: {
    isAuthenticated: true,
  },
  navigateMock: vi.fn(),
  updatePhaseOverridesRealtimeMock: vi.fn(),
  planHookState: {
    realtimePlan: {
      name: 'Phase Override Plan',
      phaseOverrides: {},
    },
  },
  bossHookState: {
    hasPhaseOverrideSupport: false,
    sortedBossActions: [],
    timelinePhaseSummaries: [],
    skippedBossActions: [],
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useParams: () => ({ planId: 'plan-phase-test' }),
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
    realtimePlan: planHookState.realtimePlan,
    phaseOverrides: planHookState.realtimePlan.phaseOverrides,
    updatePhaseOverridesRealtime: updatePhaseOverridesRealtimeMock,
    loading: false,
    error: null,
  }),
}));

vi.mock('../../contexts/RealtimeBossContext', () => ({
  useRealtimeBossContext: () => ({
    sortedBossActions: bossHookState.sortedBossActions,
    selectedBossAction: null,
    toggleBossActionSelection: vi.fn(),
    currentBossLevel: 100,
    currentBaseHealth: { party: 1, tank: 1 },
    hasPhaseOverrideSupport: bossHookState.hasPhaseOverrideSupport,
    timelinePhaseSummaries: bossHookState.timelinePhaseSummaries,
    skippedBossActions: bossHookState.skippedBossActions,
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
    collaborators: [],
    sessionId: 'session-1',
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
vi.mock('../collaboration/CollaborationAutoJoin', () => ({ default: () => null }));
vi.mock('../collaboration/CollaborationStatusNotice', () => ({ default: () => null }));
vi.mock('../collaboration/PresenceSurface', () => ({ default: ({ children }: { children?: ReactNode }) => <div>{children}</div> }));
vi.mock('../collaboration/SectionPresencePill', () => ({ default: () => null }));
vi.mock('../common/KofiButton/KofiButton', () => ({ default: () => null }));
vi.mock('../common/DiscordButton/DiscordButton', () => ({ default: () => null }));
vi.mock('../common/ThemeToggle', () => ({ default: () => null }));
vi.mock('../common/HealingPotencyInput/HealingPotencyInput', () => ({ default: () => null }));
vi.mock('../common/PrecastToggle', () => ({ default: () => null }));
vi.mock('../layout/Footer', () => ({ default: () => null }));
vi.mock('../../features/jobs/JobSelector/JobSelector', () => ({ default: () => null }));
vi.mock('../BossActionItem/BossActionItem', () => ({
  default: ({
    action,
    phaseSummary,
    children,
  }: {
    action: { id: string; name: string };
    phaseSummary?: {
      phaseId: string;
      phaseName: string;
    } | null;
    children?: ReactNode;
  }) => (
    <div data-testid={`boss-action-${action.id}`}>
      {phaseSummary && (
        <div data-testid={`phase-time-strip-${phaseSummary.phaseId}`}>
          {phaseSummary.phaseName}
        </div>
      )}
      <span>{action.name}</span>
      {children}
    </div>
  ),
}));
vi.mock('../MitigationItem/MitigationItem', () => ({ default: () => null }));
vi.mock('../AssignedMitigations/AssignedMitigations', () => ({ default: () => null }));
vi.mock('./MobileBossTimeline', () => ({ default: () => null }));
vi.mock('./MitigationBottomSheet', () => ({ default: () => null }));
vi.mock('../common/FilterToggle', () => ({ default: () => null }));
vi.mock('../common/TankSelectionModal', () => ({ default: () => null }));
vi.mock('../DragAndDrop/Draggable', () => ({ default: ({ children }: { children?: ReactNode }) => <div>{children}</div> }));
vi.mock('../DragAndDrop/Droppable', () => ({ default: ({ children }: { children?: ReactNode }) => <div>{children}</div> }));
vi.mock('../common/PartyMinHealthInput/PartyMinHealthInput', () => ({ default: () => null }));

describe('MitigationPlanner timeline editing entry points', () => {
  beforeEach(() => {
    authState.isAuthenticated = true;
    navigateMock.mockReset();
    updatePhaseOverridesRealtimeMock.mockReset();
    planHookState.realtimePlan = {
      name: 'Phase Override Plan',
      phaseOverrides: {},
    };
    bossHookState.hasPhaseOverrideSupport = false;
    bossHookState.sortedBossActions = [];
    bossHookState.timelinePhaseSummaries = [];
    bossHookState.skippedBossActions = [];
  });

  afterEach(() => {
    cleanup();
  });

  it('does not render the legacy phase overrides panel', () => {
    render(<MitigationPlanner />);

    expect(screen.queryByText('Phase Overrides')).toBeNull();
  });

  it('shows read-only phase summaries inline and uses the dedicated Edit Timeline action', () => {
    bossHookState.hasPhaseOverrideSupport = true;
    bossHookState.sortedBossActions = [
      {
        id: 'anchor_1',
        name: 'Anchor Action',
        time: 30,
      },
    ];
    bossHookState.timelinePhaseSummaries = [
      {
        phaseId: 'phase_2',
        phaseName: 'Phase 2',
        order: 1,
        anchorActionId: 'anchor_1',
        canonicalStartTime: 30,
        effectiveStartTime: 30,
        inheritedOffset: 0,
        effectiveOffset: 0,
        overrideStartTime: null,
        hiddenActionCount: 0,
      },
    ];

    render(<MitigationPlanner />);

    const anchorCard = screen.getByTestId('boss-action-anchor_1');
    expect(within(anchorCard).getByTestId('phase-time-strip-phase_2')).toBeTruthy();
    expect(screen.queryByLabelText('Phase 2 start time')).toBeNull();

    fireEvent.click(screen.getAllByRole('button', { name: /edit timeline/i })[0]!);

    expect(navigateMock).toHaveBeenCalledWith('/plan/plan-phase-test/timeline');
    expect(updatePhaseOverridesRealtimeMock).not.toHaveBeenCalled();
  });

  it('hides the Edit Timeline action in read-only shared views', () => {
    authState.isAuthenticated = false;

    render(<MitigationPlanner isSharedPlan={true} />);

    expect(screen.queryByRole('button', { name: /edit timeline/i })).toBeNull();
  });
});
