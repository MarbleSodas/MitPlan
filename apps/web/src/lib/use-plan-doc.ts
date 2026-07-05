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
 *
 * Meta (id + name) is seeded once on first mount when the doc has no
 * name yet. Subsequent changes to `initialName` do NOT clobber the
 * user's manual rename or a remote peer's edit — the hook observes
 * doc.meta so remote renames propagate to the React state.
 */
import { useCallback, useEffect, useState } from 'react';
import * as Y from 'yjs';
import { PlanDoc } from '@xivmitplan/crdt';
import type { Assignment } from '@xivmitplan/validation/plan';
import type { AbilityInfo, TimelineEventInfo } from './data-source.js';

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

const readMetaName = (doc: PlanDoc): string => {
  const n = doc.meta.get('name');
  return typeof n === 'string' ? n : '';
};

export interface UsePlanDocResult {
  doc: PlanDoc | null;
  assignments: Assignment[];
  addAssignment: (input: {
    ability: AbilityInfo;
    event: TimelineEventInfo;
    targetType?: Assignment['targetType'];
    notes?: string | null;
  }) => string | null;
  removeAssignment: (id: string) => void;
  planName: string;
  setPlanName: (name: string) => void;
  ready: boolean;
}

export const usePlanDoc = (
  doc: PlanDoc | null,
  planId: string,
  initialName = '',
): UsePlanDocResult => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [planName, setPlanNameState] = useState('');

  useEffect(() => {
    if (!doc) return;

    // Seed meta.id + meta.name ONCE when the doc first becomes
    // available, and only when the meta doesn't already have a
    // value. Subsequent renders must NOT overwrite a user-typed name
    // or a remote peer's edit (the meta observer below propagates
    // those).
    if (!doc.meta.get('id')) doc.meta.set('id', planId);
    if (!doc.meta.get('name')) {
      const nextName = initialName || `Plan ${planId.slice(0, 8)}`;
      doc.meta.set('name', nextName);
      setPlanNameState(nextName);
    } else {
      setPlanNameState(readMetaName(doc));
    }

    // One shared observer: assignments deep + meta shallow.
    // Both are wired to the doc's lifetime, so combining them keeps
    // the cleanup surface tight and the lint rule satisfied without
    // needing an eslint-disable.
    const refreshAssignments = () => {
      const next: Assignment[] = [];
      doc.assignments.forEach((m: Y.Map<unknown>) => next.push(READ_ASSIGNMENT(m)));
      // Sort by createdAt to give a stable order while the live
      // ordering (by event position) is computed in the timeline
      // rail. We resolve positions in TimelineRail + AssignmentRow.
      next.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      setAssignments(next);
    };
    const refreshMeta = () => setPlanNameState(readMetaName(doc));
    refreshAssignments();
    doc.assignments.observeDeep(refreshAssignments);
    doc.meta.observe(refreshMeta);
    return () => {
      doc.assignments.unobserveDeep(refreshAssignments);
      doc.meta.unobserve(refreshMeta);
    };
    // initialName is intentionally read-only here — see the comment above.
  }, [doc, planId]);

  const addAssignment = useCallback<UsePlanDocResult['addAssignment']>(
    ({ ability, event, targetType = 'PARTY', notes = null }) => {
      if (!doc) return null;
      const id = crypto.randomUUID();
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
      // No setPlanNameState — the meta observer above will fire and
      // update the React state, keeping a single source of truth.
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