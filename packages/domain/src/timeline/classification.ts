/**
 * Boss-action classification (slimmed).
 *
 * Replaces `main`'s `utils/boss/bossActionUtils.ts` + multi-hit
 * sequencing. The v1.0 Plan editor only needs a stable, domain-owned
 * mapping from a timeline event's `type`/`targetKind` to a human label,
 * an accent tone, and whether the event expects a mitigation
 * assignment. The legacy→canonical mapping half of the old util is
 * intentionally dropped (per ADR-0001 #1 — Learn/Live features are
 * out of scope for Plan mode).
 */
export type TimelineEventType =
  | 'MECHANIC'
  | 'BUSTER'
  | 'RAIDWIDE'
  | 'MECHANIC_START'
  | 'MECHANIC_END'
  | 'CUSTOM';

export type TimelineTargetKind = 'MAIN_TANK' | 'OFF_TANK' | 'PARTY' | 'HEALER' | 'TARGETED' | 'ALL';

export interface EventClass {
  /** Human-readable label for the event type. */
  label: string;
  /** Accent tone for the card (maps to Tailwind color tokens). */
  tone: 'destructive' | 'warn' | 'info' | 'neutral';
  /** True when this event expects a mitigation assignment. */
  mitigatable: boolean;
}

export const EVENT_CLASS: Record<TimelineEventType, EventClass> = {
  BUSTER: { label: 'Tank Buster', tone: 'destructive', mitigatable: true },
  RAIDWIDE: { label: 'Raidwide', tone: 'warn', mitigatable: true },
  MECHANIC: { label: 'Mechanic', tone: 'info', mitigatable: false },
  MECHANIC_START: { label: 'Mechanic Start', tone: 'neutral', mitigatable: false },
  MECHANIC_END: { label: 'Mechanic End', tone: 'neutral', mitigatable: false },
  CUSTOM: { label: 'Custom action', tone: 'info', mitigatable: true },
};

export const TARGET_LABEL: Record<TimelineTargetKind, string> = {
  MAIN_TANK: 'MT',
  OFF_TANK: 'OT',
  PARTY: 'Party',
  HEALER: 'Healer',
  TARGETED: 'Targeted',
  ALL: 'All',
};
