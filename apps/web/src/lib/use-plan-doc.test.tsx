/**
 * usePlanDoc — the React binding for the PlanDoc CRDT.
 *
 * These tests prove the claim the user asked for: "clicking adds a
 * mit to the live doc." We mount the hook with a fresh PlanDoc, call
 * addAssignment, observe the assignments list update, then call
 * removeAssignment and confirm the Y.Map mutates accordingly.
 *
 * Phase 1 update: `addAssignment` now takes AbilityInfo + TimelineEventInfo
 * (from `data-source`) instead of the legacy SampleAbility / SampleEvent
 * shapes. These tests build the typed inputs from the sample-data
 * fixtures so the test stays a pure in-memory exercise (no Supabase).
 */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { createPlanDoc, PlanDoc } from '@xivmitplan/crdt';
import { usePlanDoc } from './use-plan-doc';
import { SAMPLE_ABILITIES, SAMPLE_EVENTS, FRU_P1_ID } from './sample-data';
import type { AbilityInfo, TimelineEventInfo } from './data-source';

/** Build a deterministic, valid-shaped UUID for a sample ability so
 * fixture ids match the format production rows use. */
const abilityId = (s: (typeof SAMPLE_ABILITIES)[number]): string => {
  const idx = SAMPLE_ABILITIES.findIndex((a) => a.id === s.id);
  return `60000000-0000-0000-0000-${(idx + 1).toString(16).padStart(12, '0')}`;
};

const toAbilityInfo = (s: (typeof SAMPLE_ABILITIES)[number]): AbilityInfo => ({
  id: abilityId(s),
  jobId: '50000000-0000-0000-0000-000000000001',
  jobAbbrev: s.jobAbbrev,
  abilityId: s.id.replace('a-', ''),
  mode: 'CURRENT',
  name: s.name,
  description: s.description,
  effectPct: s.effectPct > 0 ? s.effectPct : null,
  recastS: s.recastS,
  durationS: s.durationS,
  isInvuln: s.category === 'invuln',
  isHeal: s.category === 'healer-cd',
  isShield: s.category === 'shield',
  category: s.category,
  damageType: s.damageType,
  target: s.target,
  charges: s.charges,
  effectiveFrom: '7.0',
  effectiveTo: null,
});

const toEventInfo = (s: (typeof SAMPLE_EVENTS)[string][number]): TimelineEventInfo => ({
  id: s.id,
  position: s.positionMs,
  timestampMs: s.positionMs,
  type: s.type,
  name: s.name,
  durationMs: null,
  hitTimesMs: [],
  targetKind: s.type === 'BUSTER' ? 'MAIN_TANK' : s.type === 'RAIDWIDE' ? 'ALL' : 'PARTY',
  confidence: 1,
  notes: null,
});

describe('usePlanDoc', () => {
  let doc: PlanDoc;

  beforeEach(() => {
    doc = createPlanDoc();
  });

  afterEach(() => {
    doc.doc.destroy();
  });

  it('starts with zero assignments and a default plan name', () => {
    const { result } = renderHook(() => usePlanDoc(doc, 'plan-1'));
    expect(result.current.assignments).toEqual([]);
    expect(result.current.planName).toBe('Plan plan-1'.slice(0, 13));
    expect(result.current.ready).toBe(true);
  });

  it('addAssignment writes into the Y.Map and surfaces the change', () => {
    const { result } = renderHook(() => usePlanDoc(doc, 'plan-2'));
    const ability = toAbilityInfo(SAMPLE_ABILITIES[0]!); // The Blackest Night
    const event = toEventInfo(SAMPLE_EVENTS[FRU_P1_ID]![1]!); // Hello World
    let returnedId: string | null = null;
    act(() => {
      returnedId = result.current.addAssignment({ ability, event });
    });
    expect(returnedId).not.toBeNull();
    expect(result.current.assignments).toHaveLength(1);
    expect(result.current.assignments[0]?.abilityId).toBe(ability.id);
    expect(result.current.assignments[0]?.eventId).toBe(event.id);
    // The underlying Y.Map was actually mutated — read it back directly.
    expect(doc.assignments.size).toBe(1);
    const persisted = doc.assignments.get(returnedId!);
    expect(persisted).toBeInstanceOf(Y.Map);
  });

  it('derives the assignment target from the event when no target is selected', () => {
    const { result } = renderHook(() => usePlanDoc(doc, 'plan-targets'));
    const ability = toAbilityInfo(SAMPLE_ABILITIES[0]!);
    const event = {
      ...toEventInfo(SAMPLE_EVENTS[FRU_P1_ID]![2]!),
      targetKind: 'MAIN_TANK' as const,
    };

    act(() => {
      result.current.addAssignment({ ability, event });
    });

    expect(result.current.assignments[0]?.targetType).toBe('MAIN_TANK');
  });

  it('removeAssignment deletes the row from both state and Y.Map', () => {
    const { result } = renderHook(() => usePlanDoc(doc, 'plan-3'));
    const ability = toAbilityInfo(SAMPLE_ABILITIES[0]!);
    const event = toEventInfo(SAMPLE_EVENTS[FRU_P1_ID]![1]!);
    let id: string | null = null;
    act(() => {
      id = result.current.addAssignment({ ability, event });
    });
    expect(result.current.assignments).toHaveLength(1);
    expect(doc.assignments.size).toBe(1);
    act(() => {
      result.current.removeAssignment(id!);
    });
    expect(result.current.assignments).toHaveLength(0);
    expect(doc.assignments.size).toBe(0);
  });

  it('setPlanName persists into doc.meta', () => {
    const { result } = renderHook(() => usePlanDoc(doc, 'plan-4'));
    act(() => {
      result.current.setPlanName('FRU prog day 3');
    });
    expect(result.current.planName).toBe('FRU prog day 3');
    expect(doc.meta.get('name')).toBe('FRU prog day 3');
  });

  it('reactively observes edits applied directly to the Y.Map (the realtime path)', () => {
    const { result } = renderHook(() => usePlanDoc(doc, 'plan-5'));
    expect(result.current.assignments).toHaveLength(0);
    // Simulate a remote client pushing an assignment via the realtime
    // provider's applyUpdate. We write directly into the Y.Map because
    // that's the same code path applyUpdate triggers under the hood.
    const abilityId = toAbilityInfo(SAMPLE_ABILITIES[0]!).id;
    const eventId = toEventInfo(SAMPLE_EVENTS[FRU_P1_ID]![1]!).id;
    act(() => {
      const m = new Y.Map<unknown>();
      m.set('id', 'remote-1');
      m.set('abilityId', abilityId);
      m.set('targetUserId', null);
      m.set('targetType', 'PARTY');
      m.set('eventId', eventId);
      m.set('notes', null);
      m.set('createdAt', new Date().toISOString());
      m.set('updatedAt', new Date().toISOString());
      m.set('revision', 0);
      doc.assignments.set('remote-1', m);
    });
    expect(result.current.assignments).toHaveLength(1);
    expect(result.current.assignments[0]?.id).toBe('remote-1');
  });
});
