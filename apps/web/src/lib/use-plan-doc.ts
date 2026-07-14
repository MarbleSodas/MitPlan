/**
 * usePlanDoc — React binding for the PlanDoc CRDT.
 *
 * Provides read/subscribe and write commands for every PlanDoc data
 * structure: assignments (extended with caster/tank/precast), timeline
 * actions, party state, timeline settings, and plan name.
 *
 * The Y.Doc lifecycle is owned by usePlanSession, not this hook.
 */
import { useCallback, useEffect, useState } from 'react';
import * as Y from 'yjs';
import { PlanDoc } from '@xivmitplan/crdt';
import type {
  Assignment,
  PlanTimelineAction,
  PlanPartyState,
  TimelineSettings,
  TankPosition,
} from '@xivmitplan/validation/plan';
import type { AbilityInfo, TimelineEventInfo } from './data-source.js';
import type { EffectiveTimelineEvent } from './plan-timeline-adapter';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const READ_ASSIGNMENT = (m: Y.Map<unknown>): Assignment => {
  const obj = Object.fromEntries(m.entries()) as Record<string, unknown>;
  return {
    id: String(obj['id']),
    abilityId: String(obj['abilityId']),
    targetUserId: obj['targetUserId'] == null ? null : String(obj['targetUserId']),
    targetType: obj['targetType'] as Assignment['targetType'],
    eventId: String(obj['eventId']),
    notes: obj['notes'] == null ? null : (obj['notes'] as string | null),
    createdAt: String(obj['createdAt']),
    updatedAt: String(obj['updatedAt']),
    revision: Number(obj['revision']),
    legacyMitigationId: obj['legacyMitigationId'] == null ? null : String(obj['legacyMitigationId']),
    legacyMitigationName: obj['legacyMitigationName'] == null ? null : String(obj['legacyMitigationName']),
    legacyBossActionId: obj['legacyBossActionId'] == null ? null : String(obj['legacyBossActionId']),
    casterJobId: obj['casterJobId'] == null ? null : String(obj['casterJobId']),
    casterUserId: obj['casterUserId'] == null ? null : String(obj['casterUserId']),
    casterDisplayName: obj['casterDisplayName'] == null ? null : String(obj['casterDisplayName']),
    casterColor: obj['casterColor'] == null ? null : String(obj['casterColor']),
    tankPosition: obj['tankPosition'] == null ? null : (obj['tankPosition'] as TankPosition),
    precastSeconds: obj['precastSeconds'] == null ? null : Number(obj['precastSeconds']),
    instanceId: obj['instanceId'] == null ? null : Number(obj['instanceId']),
  };
};

const READ_TIMELINE_ACTION = (m: Y.Map<unknown>): PlanTimelineAction => {
  const obj = Object.fromEntries(m.entries()) as Record<string, unknown>;
  return {
    id: String(obj['id']),
    position: Number(obj['position']),
    timestampMs: Number(obj['timestampMs']),
    type: (obj['type'] ?? 'CUSTOM') as PlanTimelineAction['type'],
    name: String(obj['name'] ?? ''),
    durationMs: obj['durationMs'] == null ? null : Number(obj['durationMs']),
    hitTimesMs: Array.isArray(obj['hitTimesMs']) ? (obj['hitTimesMs'] as number[]) : [],
    targetKind: (obj['targetKind'] ?? 'PARTY') as PlanTimelineAction['targetKind'],
    sourceEventId: obj['sourceEventId'] == null ? null : String(obj['sourceEventId']),
    isCustom: obj['isCustom'] === true,
    notes: obj['notes'] == null ? null : String(obj['notes']),
    linkedAbilityId: obj['linkedAbilityId'] == null ? null : String(obj['linkedAbilityId']),
    damageType: obj['damageType'] == null ? null : (obj['damageType'] as 'physical' | 'magical' | 'both'),
    hitCount: obj['hitCount'] == null ? null : Number(obj['hitCount']),
    isDot: obj['isDot'] === true,
    targetsTank: (obj['targetsTank'] ?? 'NONE') as PlanTimelineAction['targetsTank'],
  };
};

const readMetaName = (doc: PlanDoc): string => {
  const n = doc.meta.get('name');
  return typeof n === 'string' ? n : '';
};

const effectiveTargetKind = (event: TimelineEventInfo | EffectiveTimelineEvent): string => {
  return (event as TimelineEventInfo).targetKind ?? (event as EffectiveTimelineEvent).targetKind;
};

const targetTypeForEvent = (event: TimelineEventInfo | EffectiveTimelineEvent): Assignment['targetType'] => {
  const kind = effectiveTargetKind(event);
  switch (kind) {
    case 'MAIN_TANK': return 'MAIN_TANK';
    case 'OFF_TANK': return 'OFF_TANK';
    case 'HEALER':
    case 'TARGETED': return 'PLAYER';
    case 'PARTY':
    case 'ALL':
    default: return 'PARTY';
  }
};

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export interface UsePlanDocResult {
  doc: PlanDoc | null;

  // Assignments
  assignments: Assignment[];
  addAssignment: (input: {
    ability: AbilityInfo;
    event: TimelineEventInfo | EffectiveTimelineEvent;
    targetType?: Assignment['targetType'];
    notes?: string | null;
    casterJobId?: string | null;
    casterUserId?: string | null;
    tankPosition?: TankPosition | null;
    precastSeconds?: number | null;
  }) => string | null;
  updateAssignment: (id: string, updates: Partial<Assignment>) => void;
  removeAssignment: (id: string) => void;

  // Plan name
  planName: string;
  setPlanName: (name: string) => void;

  // Timeline actions
  timelineActions: PlanTimelineAction[];
  addTimelineAction: (action: Omit<PlanTimelineAction, 'id'>) => string;
  updateTimelineAction: (id: string, updates: Partial<PlanTimelineAction>) => void;
  removeTimelineAction: (id: string) => void;
  reorderTimelineActions: (orderedIds: string[]) => void;

  // Party state
  partyState: PlanPartyState;
  setSelectedJob: (userId: string, jobId: string) => void;
  setTankPosition: (userId: string, position: TankPosition) => void;
  addClaim: (userId: string, jobId: string, displayName?: string, color?: string) => void;
  removeClaim: (userId: string) => void;

  // Timeline settings
  timelineSettings: TimelineSettings;
  setTimelineSettings: (settings: Partial<TimelineSettings>) => void;

  // Ready
  ready: boolean;
}

export const usePlanDoc = (
  doc: PlanDoc | null,
  planId: string,
  initialName = '',
  canEdit = true,
): UsePlanDocResult => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [planName, setPlanNameState] = useState('');
  const [timelineActions, setTimelineActions] = useState<PlanTimelineAction[]>([]);
  const [partyState, setPartyState] = useState<PlanPartyState>({
    selectedJobs: {},
    tankPositions: {},
    claims: [],
  });
  const [timelineSettings, setTimelineSettingsState] = useState<TimelineSettings>({
    tags: [],
  });

  useEffect(() => {
    if (!doc) return;

    if (!doc.meta.get('id')) doc.meta.set('id', planId);
    if (!doc.meta.get('name')) {
      const nextName = initialName || `Plan ${planId.slice(0, 8)}`;
      doc.meta.set('name', nextName);
      setPlanNameState(nextName);
    } else {
      setPlanNameState(readMetaName(doc));
    }

    const refreshAssignments = () => {
      const next: Assignment[] = [];
      doc.assignments.forEach((m: Y.Map<unknown>) => next.push(READ_ASSIGNMENT(m)));
      next.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      setAssignments(next);
    };

    const refreshMeta = () => setPlanNameState(readMetaName(doc));

    const refreshTimelineActions = () => {
      const next: PlanTimelineAction[] = [];
      doc.timelineActions.forEach((m: Y.Map<unknown>) => next.push(READ_TIMELINE_ACTION(m)));
      next.sort((a, b) => a.position - b.position);
      setTimelineActions(next);
    };

    const refreshParty = () => {
      const raw = Object.fromEntries(doc.party.entries()) as Record<string, unknown>;
      setPartyState({
        selectedJobs: (raw['selectedJobs'] as Record<string, string>) ?? {},
        tankPositions: (raw['tankPositions'] as Record<string, TankPosition>) ?? {},
        claims: Array.isArray(raw['claims']) ? raw['claims'] as PlanPartyState['claims'] : [],
      });
    };

    const refreshSettings = () => {
      const raw = Object.fromEntries(doc.timelineSettings.entries()) as Record<string, unknown>;
      setTimelineSettingsState({
        tankHp: raw['tankHp'] as number | null | undefined,
        tankDefense: raw['tankDefense'] as TimelineSettings['tankDefense'],
        healerHp: raw['healerHp'] as number | null | undefined,
        partyHp: raw['partyHp'] as number | null | undefined,
        description: raw['description'] as string | null | undefined,
        tags: Array.isArray(raw['tags']) ? raw['tags'] as string[] : [],
        level: raw['level'] as TimelineSettings['level'],
      });
    };

    refreshAssignments();
    refreshTimelineActions();
    refreshParty();
    refreshSettings();

    doc.assignments.observeDeep(refreshAssignments);
    doc.meta.observe(refreshMeta);
    doc.timelineActions.observeDeep(refreshTimelineActions);
    doc.party.observe(refreshParty);
    doc.timelineSettings.observe(refreshSettings);

    return () => {
      doc.assignments.unobserveDeep(refreshAssignments);
      doc.meta.unobserve(refreshMeta);
      doc.timelineActions.unobserveDeep(refreshTimelineActions);
      doc.party.unobserve(refreshParty);
      doc.timelineSettings.unobserve(refreshSettings);
    };
  }, [doc, planId, initialName]);

  // ── Assignment commands ──

  const addAssignment = useCallback<UsePlanDocResult['addAssignment']>(
    ({ ability, event, targetType, notes = null, casterJobId, casterUserId, tankPosition, precastSeconds }) => {
      if (!doc || !canEdit) return null;
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const eventId = (event as TimelineEventInfo).id ?? (event as EffectiveTimelineEvent).id;
      const assignment: Assignment = {
        id,
        abilityId: ability.id,
        targetUserId: null,
        targetType: targetType ?? targetTypeForEvent(event),
        eventId,
        notes,
        createdAt: now,
        updatedAt: now,
        revision: 0,
        casterJobId: casterJobId ?? null,
        casterUserId: casterUserId ?? null,
        casterDisplayName: null,
        casterColor: null,
        tankPosition: tankPosition ?? null,
        precastSeconds: precastSeconds ?? null,
        instanceId: null,
      };
      const m = new Y.Map<unknown>();
      for (const [k, v] of Object.entries(assignment)) m.set(k, v);
      doc.assignments.set(id, m);
      return id;
    },
    [doc, canEdit],
  );

  const updateAssignment = useCallback(
    (id: string, updates: Partial<Assignment>) => {
      if (!doc || !canEdit) return;
      const existing = doc.assignments.get(id);
      if (!existing) return;
      const now = new Date().toISOString();
      existing.set('updatedAt', now);
      existing.set('revision', (Number(existing.get('revision')) + 1));
      for (const [k, v] of Object.entries(updates)) {
        if (k === 'id' || k === 'createdAt') continue;
        existing.set(k, v);
      }
    },
    [doc, canEdit],
  );

  const removeAssignment = useCallback(
    (id: string) => {
      if (!doc || !canEdit) return;
      doc.assignments.delete(id);
    },
    [doc, canEdit],
  );

  // ── Plan name ──

  const setPlanName = useCallback(
    (name: string) => {
      if (!doc || !canEdit) return;
      doc.meta.set('name', name);
    },
    [doc, canEdit],
  );

  // ── Timeline action commands ──

  const addTimelineAction = useCallback(
    (input: Omit<PlanTimelineAction, 'id'>): string => {
      const id = crypto.randomUUID();
      if (!doc || !canEdit) return id;
      const action: PlanTimelineAction = { ...input, id };
      const m = new Y.Map<unknown>();
      for (const [k, v] of Object.entries(action)) m.set(k, v);
      doc.timelineActions.push([m]);
      return id;
    },
    [doc, canEdit],
  );

  const updateTimelineAction = useCallback(
    (id: string, updates: Partial<PlanTimelineAction>) => {
      if (!doc || !canEdit) return;
      for (let i = 0; i < doc.timelineActions.length; i++) {
        const m = doc.timelineActions.get(i);
        if (m && m.get('id') === id) {
          for (const [k, v] of Object.entries(updates)) {
            if (k === 'id') continue;
            m.set(k, v);
          }
          break;
        }
      }
    },
    [doc, canEdit],
  );

  const removeTimelineAction = useCallback(
    (id: string) => {
      if (!doc || !canEdit) return;
      for (let i = 0; i < doc.timelineActions.length; i++) {
        const m = doc.timelineActions.get(i);
        if (m && m.get('id') === id) {
          doc.timelineActions.delete(i);
          break;
        }
      }
    },
    [doc, canEdit],
  );

  const reorderTimelineActions = useCallback(
    (orderedIds: string[]) => {
      if (!doc || !canEdit) return;
      const map = new Map<string, Y.Map<unknown>>();
      for (let i = 0; i < doc.timelineActions.length; i++) {
        const m = doc.timelineActions.get(i);
        if (m) map.set(String(m.get('id')), m);
      }
      doc.doc.transact(() => {
        doc.timelineActions.delete(0, doc.timelineActions.length);
        for (const id of orderedIds) {
          const m = map.get(id);
          if (m) doc.timelineActions.push([m]);
        }
      });
    },
    [doc, canEdit],
  );

  // ── Party state commands ──

  const setSelectedJob = useCallback(
    (userId: string, jobId: string) => {
      if (!doc || !canEdit) return;
      const current = (doc.party.get('selectedJobs') as Record<string, string>) ?? {};
      doc.party.set('selectedJobs', { ...current, [userId]: jobId });
    },
    [doc, canEdit],
  );

  const setTankPosition = useCallback(
    (userId: string, position: TankPosition) => {
      if (!doc || !canEdit) return;
      const current = (doc.party.get('tankPositions') as Record<string, TankPosition>) ?? {};
      doc.party.set('tankPositions', { ...current, [userId]: position });
    },
    [doc, canEdit],
  );

  const addClaim = useCallback(
    (userId: string, jobId: string, displayName?: string, color?: string) => {
      if (!doc || !canEdit) return;
      const claims = Array.isArray(doc.party.get('claims'))
        ? [...(doc.party.get('claims') as PlanPartyState['claims'])]
        : [];
      const existingIdx = claims.findIndex((c) => c.userId === userId);
      const claim = { userId, jobId, displayName: displayName ?? null, color: color ?? null };
      if (existingIdx >= 0) {
        claims[existingIdx] = claim;
      } else {
        claims.push(claim);
      }
      doc.party.set('claims', claims);
    },
    [doc, canEdit],
  );

  const removeClaim = useCallback(
    (userId: string) => {
      if (!doc || !canEdit) return;
      const claims = Array.isArray(doc.party.get('claims'))
        ? [...(doc.party.get('claims') as PlanPartyState['claims'])]
        : [];
      doc.party.set('claims', claims.filter((c) => c.userId !== userId));
    },
    [doc, canEdit],
  );

  // ── Timeline settings ──

  const setTimelineSettings = useCallback(
    (updates: Partial<TimelineSettings>) => {
      if (!doc || !canEdit) return;
      for (const [k, v] of Object.entries(updates)) {
        doc.timelineSettings.set(k, v);
      }
    },
    [doc, canEdit],
  );

  return {
    doc,
    assignments,
    addAssignment,
    updateAssignment,
    removeAssignment,
    planName,
    setPlanName,
    timelineActions,
    addTimelineAction,
    updateTimelineAction,
    removeTimelineAction,
    reorderTimelineActions,
    partyState,
    setSelectedJob,
    setTankPosition,
    addClaim,
    removeClaim,
    timelineSettings,
    setTimelineSettings,
    ready: doc !== null,
  };
};
