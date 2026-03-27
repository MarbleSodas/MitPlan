/* @vitest-environment jsdom */

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import adaptiveTimeline from '../data/timelines/the-tyrant-m11s.timeline.json';
import sugarRiotTimeline from '../data/timelines/sugar-riot.timeline.json';
import { normalizeTimelineRecord } from '../utils/timeline/adaptiveTimelineUtils';
import { RealtimeBossProvider, useRealtimeBossContext } from './RealtimeBossContext';

const { getTimelineMock } = vi.hoisted(() => ({
  getTimelineMock: vi.fn(),
}));

const planState = {
  phaseOverrides: {},
  timelineLayout: null,
  sourceTimelineId: 'adaptive-m11s',
};

vi.mock('./RealtimePlanContext', () => ({
  useRealtimePlan: () => ({
    bossId: 'ketuduke',
    updateBossRealtime: vi.fn(),
    isInitialized: true,
    realtimePlan: {
      sourceTimelineId: planState.sourceTimelineId,
      timelineLayout: planState.timelineLayout,
      phaseOverrides: planState.phaseOverrides,
    },
  }),
}));

vi.mock('../services/timelineService', () => ({
  getTimeline: (...args: unknown[]) => getTimelineMock(...args),
}));

function Probe() {
  const { sortedBossActions, currentBossLevel, skippedBossActions, timelinePhaseSummaries } = useRealtimeBossContext();
  const overridePhase = timelinePhaseSummaries?.find((summary) => summary.phaseId === 'phase_river');

  return (
    <div>
      <span data-testid="count">{sortedBossActions.length}</span>
      <span data-testid="first">{sortedBossActions[0]?.name || ''}</span>
      <span data-testid="branch">{sortedBossActions[0]?.branchId || ''}</span>
      <span data-testid="level">{currentBossLevel}</span>
      <span data-testid="skipped">{skippedBossActions?.length || 0}</span>
      <span data-testid="phase-time">{overridePhase?.effectiveStartTime || ''}</span>
    </div>
  );
}

describe('RealtimeBossContext adaptive timeline support', () => {
  beforeEach(() => {
    getTimelineMock.mockReset();
    planState.phaseOverrides = {};
    planState.timelineLayout = null;
    planState.sourceTimelineId = 'adaptive-m11s';
    getTimelineMock.mockResolvedValue(normalizeTimelineRecord({
      id: 'adaptive-m11s',
      ...adaptiveTimeline,
    }));
  });

  afterEach(() => {
    cleanup();
  });

  it('loads resolved flat boss actions from an adaptive source timeline', async () => {
    render(
      <RealtimeBossProvider>
        <Probe />
      </RealtimeBossProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('count').textContent).toBe('39');
    });

    expect(screen.getByTestId('first').textContent).toBe('Crown of Arcadia');
    expect(screen.getByTestId('branch').textContent).toBe('fight-0-branch-0');
    expect(screen.getByTestId('level').textContent).toBe('100');
  });

  it('applies phase overrides from the plan and exposes skipped actions', async () => {
    planState.phaseOverrides = {
      phase_river: {
        startTime: 350,
      },
    };
    getTimelineMock.mockResolvedValue(normalizeTimelineRecord({
      id: 'adaptive-sugar-riot',
      ...sugarRiotTimeline,
    }));

    render(
      <RealtimeBossProvider>
        <Probe />
      </RealtimeBossProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('phase-time').textContent).toBe('350');
    });

    expect(Number(screen.getByTestId('count').textContent)).toBeLessThan(sugarRiotTimeline.actions.length);
    expect(Number(screen.getByTestId('skipped').textContent)).toBeGreaterThan(0);
  });

  it('prefers the plan-owned timeline layout over fetching the source timeline again', async () => {
    planState.timelineLayout = normalizeTimelineRecord({
      bossId: 'adaptive-m11s',
      ...adaptiveTimeline,
      healthConfig: {
        party: 190000,
        defaultTank: 300000,
        mainTank: 305000,
        offTank: 300000,
      },
    });
    planState.sourceTimelineId = 'adaptive-m11s';

    render(
      <RealtimeBossProvider>
        <Probe />
      </RealtimeBossProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('count').textContent).toBe('39');
    });

    expect(screen.getByTestId('level').textContent).toBe('100');
    expect(getTimelineMock).not.toHaveBeenCalled();
  });
});
