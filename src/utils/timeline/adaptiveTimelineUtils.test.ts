import { describe, expect, it } from 'vitest';
import type { BossAction } from '../../types';
import {
  normalizeTimelineRecord,
  processMultiHitTankBusterSequences,
  resolveTimelineActions,
} from './adaptiveTimelineUtils';

describe('adaptiveTimelineUtils', () => {
  it('wraps a legacy flat timeline into a default adaptive branch', () => {
    const legacyActions: BossAction[] = [
      {
        id: 'legacy_1',
        name: 'Legacy Raidwide',
        time: 12,
        damageType: 'magical',
      },
      {
        id: 'legacy_2',
        name: 'Legacy Tankbuster',
        time: 24,
        damageType: 'physical',
        isTankBuster: true,
      },
    ];

    const normalized = normalizeTimelineRecord({
      id: 'legacy-timeline',
      name: 'Legacy Timeline',
      bossId: 'legacy-boss',
      actions: legacyActions,
    });

    expect(normalized.format).toBe('legacy_flat');
    expect(normalized.resolution?.defaultBranchId).toContain('legacy-default-branch');
    expect(normalized.adaptiveModel?.branches).toHaveLength(1);
    expect(normalized.actions).toHaveLength(2);
    expect(normalized.actions[0]?.branchId).toBe(normalized.resolution?.defaultBranchId);
    expect(normalized.actions[0]?.sourceKind).toBe('legacy_action');
  });

  it('resolves adaptive branch events into planner-safe flat actions', () => {
    const actions = resolveTimelineActions({
      name: 'Adaptive',
      bossId: 'boss',
      resolution: {
        defaultBranchId: 'branch-a',
      },
      adaptiveModel: {
        branches: [
          {
            id: 'branch-a',
            events: [
              { id: 'b', name: 'Later', time: 30 },
              { id: 'a', name: 'Earlier', time: 10 },
            ],
          },
        ],
      },
    });

    expect(actions.map((action) => action.id)).toEqual(['a', 'b']);
    expect(actions.every((action) => typeof action.time === 'number')).toBe(true);
    expect(actions.every((action) => action.branchId === 'branch-a')).toBe(true);
  });

  it('preserves phase metadata and bumps the schema version for phase-aware timelines', () => {
    const normalized = normalizeTimelineRecord({
      id: 'phase-aware',
      name: 'Phase Aware',
      bossId: 'boss',
      actions: [
        { id: 'anchor', name: 'Anchor', time: 12, phaseId: 'phase_1', isPhaseAnchor: true },
      ],
      phases: [
        {
          id: 'phase_1',
          name: 'Phase 1',
          order: 0,
          anchorActionId: 'anchor',
          branchIds: ['legacy-default-branch-boss'],
          source: 'manual',
          skipWindowMode: 'hide_pre_anchor',
        },
      ],
      analysisSources: [
        {
          kind: 'manual',
          title: 'Test source',
        },
      ],
    });

    expect(normalized.schemaVersion).toBe(2);
    expect(normalized.phases).toHaveLength(1);
    expect(normalized.phases[0]?.anchorActionId).toBe('anchor');
    expect(normalized.analysisSources).toHaveLength(1);
  });

  it('collapses repeated hits into a multi-hit planner action', () => {
    const collapsed = processMultiHitTankBusterSequences([
      {
        id: 'hk_1',
        name: 'Heartbreak Kick',
        time: 10,
        unmitigatedDamage: 100,
        damageType: 'physical',
        isTankBuster: true,
      },
      {
        id: 'hk_2',
        name: 'Heartbreak Kick',
        time: 12,
        unmitigatedDamage: 110,
        damageType: 'physical',
        isTankBuster: true,
      },
      {
        id: 'hk_3',
        name: 'Heartbreak Kick',
        time: 14,
        unmitigatedDamage: 120,
        damageType: 'physical',
        isTankBuster: true,
      },
    ]);

    expect(collapsed).toHaveLength(1);
    expect(collapsed[0]?.isMultiHit).toBe(true);
    expect(collapsed[0]?.hitCount).toBe(3);
    expect(collapsed[0]?.unmitigatedDamage).toBe(330);
    expect(collapsed[0]?.timeRange).toEqual([10, 14]);
  });
});
