/**
 * usePlanDoc — the React binding for the PlanDoc CRDT.
 *
 * These tests prove the claim the user asked for: "clicking adds a
 * mit to the live doc." We mount the hook with a fresh PlanDoc, call
 * addAssignment, observe the assignments list update, then call
 * removeAssignment and confirm the Y.Map mutates accordingly.
 */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { createPlanDoc, PlanDoc } from '@xivmitplan/crdt';
import { usePlanDoc } from './use-plan-doc';
import { SAMPLE_ABILITIES, SAMPLE_EVENTS, FRU_P1_ID } from './sample-data';

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
    const ability = SAMPLE_ABILITIES[0]!; // The Blackest Night
    const event = SAMPLE_EVENTS[FRU_P1_ID]![1]!; // Brightened Light
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

  it('removeAssignment deletes the row from both state and Y.Map', () => {
    const { result } = renderHook(() => usePlanDoc(doc, 'plan-3'));
    const ability = SAMPLE_ABILITIES[0]!;
    const event = SAMPLE_EVENTS[FRU_P1_ID]![1]!;
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
    act(() => {
      const m = new Y.Map<unknown>();
      m.set('id', 'remote-1');
      m.set('abilityId', SAMPLE_ABILITIES[0]!.id);
      m.set('targetUserId', null);
      m.set('targetType', 'PARTY');
      m.set('eventId', SAMPLE_EVENTS[FRU_P1_ID]![1]!.id);
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