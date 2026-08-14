import type { MitigationAssignments, PlanTimelineLayout } from '../types';

export const TIMELINE_EVIDENCE_DEFAULTS = {
  minimumDistinctPublicClears: 30,
  minimumStableEventSupport: 0.8,
  minimumBranchReports: 5,
  minimumBranchSupport: 0.15,
  maximumUnexplainedDriftSeconds: 8,
} as const;

type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface EvidenceWaiver {
  id: string;
  reviewStatus: 'pending' | 'accepted' | 'rejected';
  reviewedBy?: string | null;
  reason: string;
}

export interface TimelineEvidenceInput {
  distinctPublicClearCount: number;
  reportRevisionCount: number;
  stableEventSupportRatios: number[];
  branchEvidence: Array<{ reportCount: number; supportRatio: number }>;
  maximumUnexplainedDriftSeconds: number | null;
  unsupportedEventCount: number;
  waivers?: EvidenceWaiver[];
}

export interface TimelinePublicationValidation {
  publishable: boolean;
  blockers: string[];
  acceptedWaivers: string[];
}

const canonicalize = (value: unknown): JsonValue => {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') {
    return value as null | boolean | string;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Timeline documents cannot contain non-finite numbers');
    return value;
  }
  if (Array.isArray(value)) return value.map(canonicalize);
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalize(item)])
    );
  }
  throw new Error(`Timeline documents cannot contain ${typeof value} values`);
};

export const canonicalTimelineJson = (value: unknown): string =>
  JSON.stringify(canonicalize(value));

export async function hashTimelineDocument(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalTimelineJson(value));
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

const acceptedWaiverFor = (
  waivers: EvidenceWaiver[],
  blockerKey: string
): EvidenceWaiver | undefined =>
  waivers.find((waiver) =>
    waiver.reviewStatus === 'accepted' &&
    Boolean(waiver.reviewedBy) &&
    waiver.reason.trim().length >= 12 &&
    (waiver.id.includes(blockerKey) || waiver.id.includes('all-evidence'))
  );

export function validateTimelineEvidence(
  evidence: TimelineEvidenceInput
): TimelinePublicationValidation {
  const blockers: Array<{ key: string; message: string }> = [];
  const waivers = evidence.waivers || [];

  if (evidence.distinctPublicClearCount < TIMELINE_EVIDENCE_DEFAULTS.minimumDistinctPublicClears) {
    blockers.push({
      key: 'public-clears',
      message: `Requires ${TIMELINE_EVIDENCE_DEFAULTS.minimumDistinctPublicClears} distinct public clears.`,
    });
  }
  if (evidence.reportRevisionCount < evidence.distinctPublicClearCount) {
    blockers.push({
      key: 'report-revisions',
      message: 'Every sampled report must retain a report revision identifier.',
    });
  }
  if (evidence.stableEventSupportRatios.some(
    (ratio) => ratio < TIMELINE_EVIDENCE_DEFAULTS.minimumStableEventSupport
  )) {
    blockers.push({
      key: 'stable-support',
      message: `Stable events require ${TIMELINE_EVIDENCE_DEFAULTS.minimumStableEventSupport} support.`,
    });
  }
  if (evidence.branchEvidence.some(({ reportCount, supportRatio }) =>
    reportCount < TIMELINE_EVIDENCE_DEFAULTS.minimumBranchReports ||
    supportRatio < TIMELINE_EVIDENCE_DEFAULTS.minimumBranchSupport
  )) {
    blockers.push({
      key: 'branch-support',
      message: 'Each route branch requires five reports and 0.15 sample support.',
    });
  }
  if (
    evidence.maximumUnexplainedDriftSeconds === null ||
    evidence.maximumUnexplainedDriftSeconds >
      TIMELINE_EVIDENCE_DEFAULTS.maximumUnexplainedDriftSeconds
  ) {
    blockers.push({
      key: 'timing-drift',
      message: 'Unexplained timing drift must not exceed eight seconds.',
    });
  }
  if (evidence.unsupportedEventCount > 0) {
    blockers.push({
      key: 'source-coverage',
      message: 'Every published event requires source evidence.',
    });
  }

  const unwaived = blockers.filter(({ key }) => !acceptedWaiverFor(waivers, key));
  return {
    publishable: unwaived.length === 0,
    blockers: unwaived.map(({ message }) => message),
    acceptedWaivers: blockers
      .map(({ key }) => acceptedWaiverFor(waivers, key)?.id)
      .filter((id): id is string => Boolean(id)),
  };
}

const eventKey = (event: Record<string, unknown>): string =>
  String(event.eventKey || event.id || '');

const timeFields = new Set(['time', 'timeMs', 'canonicalTimeMs', 'phaseOffsetMs']);
const withoutTime = (event: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(Object.entries(event).filter(([key]) => !timeFields.has(key)));

export interface TimelineUpgradePreview {
  unchanged: string[];
  moved: string[];
  metadataChanged: string[];
  added: string[];
  removed: string[];
  ambiguous: string[];
  assignmentsFollowingAutomatically: string[];
  assignmentsRequiringReview: string[];
}

export function buildTimelineUpgradePreview(
  current: PlanTimelineLayout,
  target: PlanTimelineLayout,
  assignments: MitigationAssignments
): TimelineUpgradePreview {
  const group = (events: Array<Record<string, unknown>>) => {
    const grouped = new Map<string, Array<Record<string, unknown>>>();
    events.forEach((event) => {
      const key = eventKey(event);
      if (!key) return;
      grouped.set(key, [...(grouped.get(key) || []), event]);
    });
    return grouped;
  };
  const currentEvents = group((current.actions || []) as unknown as Array<Record<string, unknown>>);
  const targetEvents = group((target.actions || []) as unknown as Array<Record<string, unknown>>);
  const keys = new Set([...currentEvents.keys(), ...targetEvents.keys()]);
  const preview: TimelineUpgradePreview = {
    unchanged: [],
    moved: [],
    metadataChanged: [],
    added: [],
    removed: [],
    ambiguous: [],
    assignmentsFollowingAutomatically: [],
    assignmentsRequiringReview: [],
  };

  [...keys].sort().forEach((key) => {
    const before = currentEvents.get(key) || [];
    const after = targetEvents.get(key) || [];
    if (before.length > 1 || after.length > 1) preview.ambiguous.push(key);
    else if (before.length === 0) preview.added.push(key);
    else if (after.length === 0) preview.removed.push(key);
    else if (canonicalTimelineJson(before[0]) === canonicalTimelineJson(after[0])) {
      preview.unchanged.push(key);
    } else if (
      canonicalTimelineJson(withoutTime(before[0])) ===
      canonicalTimelineJson(withoutTime(after[0]))
    ) {
      preview.moved.push(key);
    } else {
      preview.metadataChanged.push(key);
    }
  });

  const assignedKeys = Object.keys(assignments || {});
  preview.assignmentsFollowingAutomatically = assignedKeys.filter(
    (key) => preview.unchanged.includes(key)
  );
  preview.assignmentsRequiringReview = assignedKeys.filter(
    (key) => !preview.unchanged.includes(key)
  );
  return preview;
}

export interface EffectivePhase {
  phaseId: string;
  canonicalStartMs: number;
  effectiveStartMs: number;
  inheritedOffsetMs: number;
}

export function resolvePhaseAnchors(
  phases: Array<{ id: string; canonicalStartMs: number }>,
  overrides: Record<string, { anchorTimeMs?: number; startTimeMs?: number }>
): EffectivePhase[] {
  let inheritedOffsetMs = 0;
  return phases.map((phase) => {
    const explicitAnchor = overrides[phase.id]?.anchorTimeMs ??
      overrides[phase.id]?.startTimeMs;
    if (Number.isFinite(explicitAnchor)) {
      inheritedOffsetMs = Number(explicitAnchor) - phase.canonicalStartMs;
    }
    return {
      phaseId: phase.id,
      canonicalStartMs: phase.canonicalStartMs,
      effectiveStartMs: phase.canonicalStartMs + inheritedOffsetMs,
      inheritedOffsetMs,
    };
  });
}
