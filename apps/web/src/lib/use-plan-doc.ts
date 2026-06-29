/**
 * usePlanDoc — React binding for the PlanDoc CRDT.
 *
 * Takes an externally-owned `PlanDoc` (the same one the realtime
 * provider syncs) and subscribes to its `assignments` Y.Map. Any local
 * edit triggers a re-render; any remote edit (from the realtime
 * provider's `applyUpdate`) triggers the same re-render.
 *
 * The Y.Doc lifecycle is owned by the plan editor route, NOT this
 * hook. That separation is deliberate: the realtime provider is wired
 * to the same doc, the hook just observes it.
 */
import { useCallback, useEffect, useState } from 'react';
import * as Y from 'yjs';
import { PlanDoc } from '@xivmitplan/crdt';
import type { Assignment } from '@xivmitplan/validation/plan';
import type { SampleAbility, SampleEvent } from './sample-data.js';
import { newPlanId } from './sample-data.js';

const READ_ASSIGNMENT = (m: Y.Map<unknown>): Assignment => {
  const obj = Object.fromEntries(m.entries()) as Record<string, unknown>;
  return {
    id: String(obj['id']),
    abilityId: String(obj['abilityId']),
    targetUserId: obj['targetUserId'] === null ? null : String(obj['targetUserId']),
    targetType: obj['targetType'] as Assignment['targetType'],
    eventId: String(obj['eventId']),
    notes: obj['notes'] === null ? null : (obj['notes'] as string | null),
    createdAt: String(obj['createdAt']),
    updatedAt: String(obj['updatedAt']),
    revision: Number(obj['revision']),
  };
};

export interface UsePlanDocResult {
  doc: PlanDoc | null;
  assignments: Assignment[];
  addAssignment: (input: {
    ability: SampleAbility;
    event: SampleEvent;
    targetType?: Assignment['targetType'];
    notes?: string | null;
  }) => string | null;
  removeAssignment: (id: string) => void;
  planName: string;
  setPlanName: (name: string) => void;
  ready: boolean;
}

export const usePlanDoc = (doc: PlanDoc | null, planId: string): UsePlanDocResult => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [planName, setPlanNameState] = useState('');

  useEffect(() => {
    if (!doc) return;
    doc.meta.set('id', planId);
    setPlanNameState(`Plan ${planId.slice(0, 8)}`);

    const refresh = () => {
      const next: Assignment[] = [];
      doc.assignments.forEach((m: Y.Map<unknown>) => next.push(READ_ASSIGNMENT(m)));
      // Sort by event position so the rail reads top-to-bottom
      // in timeline order. We resolve the position via the sample
      // data (Phase 0); the production path reads from doc.events.
      next.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      setAssignments(next);
    };
    refresh();
    doc.assignments.observeDeep(refresh);
    return () => {
      doc.assignments.unobserveDeep(refresh);
    };
  }, [doc, planId]);

  const addAssignment = useCallback<UsePlanDocResult['addAssignment']>(
    ({ ability, event, targetType = 'PARTY', notes = null }) => {
      if (!doc) return null;
      const id = newPlanId();
      const now = new Date().toISOString();
      const assignment: Assignment = {
        id,
        abilityId: ability.id,
        targetUserId: null,
        targetType,
        eventId: event.id,
        notes,
        createdAt: now,
        updatedAt: now,
        revision: 0,
      };
      const m = new Y.Map<unknown>();
      for (const [k, v] of Object.entries(assignment)) m.set(k, v);
      doc.assignments.set(id, m);
      return id;
    },
    [doc],
  );

  const removeAssignment = useCallback(
    (id: string) => {
      if (!doc) return;
      doc.assignments.delete(id);
    },
    [doc],
  );

  const setPlanName = useCallback(
    (name: string) => {
      if (!doc) return;
      doc.meta.set('name', name);
      setPlanNameState(name);
    },
    [doc],
  );

  return {
    doc,
    assignments,
    addAssignment,
    removeAssignment,
    planName,
    setPlanName,
    ready: doc !== null,
  };
};