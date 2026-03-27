import { describe, expect, it } from 'vitest';
import { resolvePhaseAwareTimeline } from './phaseOverrideResolver';

const phaseAwareTimeline = {
  id: 'phase-aware',
  name: 'Phase Aware Test',
  bossId: 'test-boss',
  format: 'adaptive_damage' as const,
  schemaVersion: 2,
  resolution: {
    defaultBranchId: 'branch-0',
  },
  phases: [
    {
      id: 'phase_1',
      name: 'Phase 1',
      order: 0,
      anchorActionId: 'phase_1_anchor',
      branchIds: ['branch-0'],
      source: 'manual' as const,
      skipWindowMode: 'hide_pre_anchor' as const,
    },
    {
      id: 'phase_2',
      name: 'Phase 2',
      order: 1,
      anchorActionId: 'phase_2_anchor',
      branchIds: ['branch-0'],
      source: 'manual' as const,
      skipWindowMode: 'hide_pre_anchor' as const,
    },
    {
      id: 'phase_3',
      name: 'Phase 3',
      order: 2,
      anchorActionId: 'phase_3_anchor',
      branchIds: ['branch-0'],
      source: 'manual' as const,
      skipWindowMode: 'hide_pre_anchor' as const,
    },
  ],
  adaptiveModel: {
    branches: [
      {
        id: 'branch-0',
        events: [
          { id: 'phase_1_anchor', name: 'Phase 1 Anchor', time: 10, phaseId: 'phase_1', branchId: 'branch-0', isPhaseAnchor: true },
          { id: 'phase_1_skip', name: 'Phase 1 Skip', time: 22, phaseId: 'phase_1', branchId: 'branch-0', skipEligible: true },
          { id: 'phase_1_keep', name: 'Phase 1 Keep', time: 24, phaseId: 'phase_1', branchId: 'branch-0', skipEligible: false },
          { id: 'phase_2_anchor', name: 'Phase 2 Anchor', time: 30, phaseId: 'phase_2', branchId: 'branch-0', isPhaseAnchor: true },
          { id: 'phase_2_followup', name: 'Phase 2 Follow-up', time: 35, phaseId: 'phase_2', branchId: 'branch-0', skipEligible: true },
          { id: 'phase_3_anchor', name: 'Phase 3 Anchor', time: 60, phaseId: 'phase_3', branchId: 'branch-0', isPhaseAnchor: true },
          { id: 'phase_3_followup', name: 'Phase 3 Follow-up', time: 65, phaseId: 'phase_3', branchId: 'branch-0', skipEligible: true },
        ],
      },
    ],
  },
};

describe('phaseOverrideResolver', () => {
  it('inherits earlier phase offsets forward when later phases do not override them', () => {
    const resolved = resolvePhaseAwareTimeline(phaseAwareTimeline, {
      phase_2: { startTime: 35 },
    });

    const byId = new Map(resolved.actions.map((action) => [action.id, action]));

    expect(byId.get('phase_2_anchor')?.time).toBe(35);
    expect(byId.get('phase_2_followup')?.time).toBe(40);
    expect(byId.get('phase_3_anchor')?.time).toBe(65);
    expect(byId.get('phase_3_followup')?.time).toBe(70);
    expect(resolved.phaseSummaries[2]?.effectiveOffset).toBe(5);
  });

  it('rebases later phases to their own explicit override instead of inheriting the previous offset', () => {
    const resolved = resolvePhaseAwareTimeline(phaseAwareTimeline, {
      phase_2: { startTime: 35 },
      phase_3: { startTime: 52 },
    });

    const byId = new Map(resolved.actions.map((action) => [action.id, action]));

    expect(byId.get('phase_2_anchor')?.time).toBe(35);
    expect(byId.get('phase_3_anchor')?.time).toBe(52);
    expect(byId.get('phase_3_followup')?.time).toBe(57);
    expect(resolved.phaseSummaries[2]?.effectiveOffset).toBe(-8);
  });

  it('hides skip-eligible prior-phase actions when a later phase is pulled earlier', () => {
    const resolved = resolvePhaseAwareTimeline(phaseAwareTimeline, {
      phase_2: { startTime: 20 },
    });

    expect(resolved.actions.some((action) => action.id === 'phase_1_skip')).toBe(false);
    expect(resolved.skippedActions.some((action) => action.id === 'phase_1_skip')).toBe(true);
    expect(resolved.phaseSummaries[1]?.hiddenActionCount).toBe(1);
  });

  it('keeps non-skip-eligible prior-phase actions visible even when the next phase moves earlier', () => {
    const resolved = resolvePhaseAwareTimeline(phaseAwareTimeline, {
      phase_2: { startTime: 20 },
    });

    const byId = new Map(resolved.actions.map((action) => [action.id, action]));

    expect(byId.get('phase_1_keep')?.time).toBe(24);
    expect(byId.get('phase_2_anchor')?.time).toBe(20);
    expect(resolved.skippedActions.some((action) => action.id === 'phase_1_keep')).toBe(false);
  });
});
