/* @vitest-environment jsdom */

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MobileBossTimeline from './MobileBossTimeline';

vi.mock('../../contexts/RealtimePlanContext', () => ({
  useRealtimePlan: () => ({
    realtimePlan: null,
  }),
}));

describe('MobileBossTimeline phase summary UI', () => {
  const onSelectAction = vi.fn();

  const sortedBossActions = [
    {
      id: 'anchor_1',
      name: 'Anchor Action',
      time: 30,
      description: 'Anchor description',
      icon: 'A',
    },
  ];

  const phaseSummaryByAnchorActionId = new Map([
    ['anchor_1', {
      phaseId: 'phase_2',
      phaseName: 'Phase 2',
      order: 1,
      anchorActionId: 'anchor_1',
      canonicalStartTime: 30,
      effectiveStartTime: 24,
      inheritedOffset: 0,
      effectiveOffset: -6,
      overrideStartTime: 24,
      hiddenActionCount: 1,
    }],
  ]);

  beforeEach(() => {
    onSelectAction.mockReset();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders a read-only phase summary strip instead of inline override controls', () => {
    render(
      <MobileBossTimeline
        sortedBossActions={sortedBossActions}
        selectedBossAction={null}
        assignments={{}}
        getActiveMitigations={() => []}
        selectedJobs={{}}
        currentBossLevel={100}
        baseHealth={{ party: 143000, tank: 225000 }}
        phaseSummaryByAnchorActionId={phaseSummaryByAnchorActionId}
        skippedActionsByPhaseId={{}}
        phaseOverrides={{}}
        onSelectAction={onSelectAction}
      />
    );

    expect(screen.getByTestId('phase-time-strip-phase_2')).toBeTruthy();
    expect(screen.getByText('Phase 2')).toBeTruthy();
    expect(screen.getByText('Starts 0:24.0')).toBeTruthy();
    expect(screen.getByText('was 0:30.0')).toBeTruthy();
    expect(screen.getByText('-6.0s')).toBeTruthy();
    expect(screen.queryByLabelText('Phase 2 start time')).toBeNull();
    expect(screen.queryByTestId('phase-override-confirm-phase_2')).toBeNull();
  });

  it('does not render the phase summary strip for the opener phase', () => {
    render(
      <MobileBossTimeline
        sortedBossActions={sortedBossActions}
        selectedBossAction={null}
        assignments={{}}
        getActiveMitigations={() => []}
        selectedJobs={{}}
        currentBossLevel={100}
        baseHealth={{ party: 143000, tank: 225000 }}
        phaseSummaryByAnchorActionId={new Map([
          ['anchor_1', {
            phaseId: 'phase_1',
            phaseName: 'Phase 1',
            order: 0,
            anchorActionId: 'anchor_1',
            canonicalStartTime: 30,
            effectiveStartTime: 24,
            inheritedOffset: 0,
            effectiveOffset: -6,
            overrideStartTime: 24,
            hiddenActionCount: 1,
          }],
        ])}
        skippedActionsByPhaseId={{}}
        phaseOverrides={{}}
        onSelectAction={onSelectAction}
      />
    );

    expect(screen.queryByTestId('phase-time-strip-phase_1')).toBeNull();
    expect(screen.getByText('30s')).toBeTruthy();
  });
});
