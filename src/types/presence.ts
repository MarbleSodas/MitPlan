export type CollaborationSurface = 'planner' | 'timeline';

export type CollaborationInteraction = 'hovering' | 'selected' | 'editing';

export type PresenceEntityType =
  | 'assignment'
  | 'bossAction'
  | 'healthSetting'
  | 'job'
  | 'mitigation'
  | 'planMeta'
  | 'tankPosition'
  | 'timelineBossTag'
  | 'timelineEvent'
  | 'timelineLibrary'
  | 'timelineMeta';

export type ElementType = 'bossAction' | 'mitigation' | 'job' | 'tankPosition';

export interface PresenceTargetInput {
  surface: CollaborationSurface;
  entityType: PresenceEntityType;
  entityId: string;
  field?: string | null;
  slotId?: string | null;
  panel?: string | null;
  section?: string | null;
}

export interface PresenceTarget extends PresenceTargetInput {
  key: string;
}

export interface CursorPresence {
  surface: CollaborationSurface;
  x: number;
  y: number;
  panel?: string | null;
  containerWidth?: number | null;
  containerHeight?: number | null;
}

export interface ViewportPresence {
  surface: CollaborationSurface;
  panel?: string | null;
  section?: string | null;
  scrollTop?: number | null;
}

export interface UserPresenceData {
  activeTarget: PresenceTarget | null;
  interaction: CollaborationInteraction | null;
  cursor: CursorPresence | null;
  viewport: ViewportPresence | null;
  lastUpdated: number;
}

export interface UserPresence extends UserPresenceData {
  sessionId: string;
  userId: string;
  displayName: string;
  color: string;
}

export interface TargetPresence {
  sessionId: string;
  userId: string;
  displayName: string;
  color: string;
  isCurrentUser: boolean;
  interaction: CollaborationInteraction | null;
  target: PresenceTarget;
}

export interface PresenceContextValue {
  presenceMap: Map<string, UserPresence>;
  isConnected: boolean;
  collaborationAvailable: boolean;
  collaborationError: string | null;
  currentSessionId: string | null;
  setActiveTarget: (target: PresenceTargetInput | PresenceTarget | null) => void;
  setInteraction: (interaction: CollaborationInteraction | null) => void;
  setCursor: (cursor: CursorPresence | null) => void;
  setViewport: (viewport: ViewportPresence | null) => void;
  getPresenceForTarget: (targetKey: string) => TargetPresence[];
  isTargetActiveByOthers: (targetKey: string, interaction?: CollaborationInteraction) => boolean;
  getMyPresence: () => UserPresenceData | null;
}

export const USER_COLORS: readonly string[] = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1',
  '#14b8a6', '#eab308', '#f43f5e', '#a855f7', '#0ea5e9',
  '#22c55e', '#fb923c', '#e879f9', '#38bdf8', '#4ade80',
  '#fbbf24', '#fb7185', '#c084fc', '#2dd4bf',
] as const;

export const MAX_USERS_PER_PLAN = 24;

export const PRESENCE_THROTTLE = {
  activity: 0,
  cursor: 75,
  viewport: 300,
} as const;

export const PRESENCE_STALE_TIMEOUT = 30000;
export const PRESENCE_HEARTBEAT_INTERVAL = 10000;

export const EMPTY_PRESENCE_DATA: UserPresenceData = {
  activeTarget: null,
  interaction: null,
  cursor: null,
  viewport: null,
  lastUpdated: 0,
};

const PLANNER_SECTION_BY_ENTITY: Partial<Record<PresenceEntityType, string>> = {
  assignment: 'timeline',
  bossAction: 'timeline',
  healthSetting: 'jobs',
  job: 'jobs',
  mitigation: 'mitigations',
  planMeta: 'planMeta',
  tankPosition: 'jobs',
};

const PLANNER_PANEL_BY_ENTITY: Partial<Record<PresenceEntityType, string>> = {
  assignment: 'timeline',
  bossAction: 'timeline',
  healthSetting: 'jobs',
  job: 'jobs',
  mitigation: 'mitigations',
  planMeta: 'header',
  tankPosition: 'jobs',
};

const TIMELINE_SECTION_BY_ENTITY: Partial<Record<PresenceEntityType, string>> = {
  timelineBossTag: 'metadata',
  timelineEvent: 'timeline',
  timelineLibrary: 'library',
  timelineMeta: 'metadata',
};

const TIMELINE_PANEL_BY_ENTITY: Partial<Record<PresenceEntityType, string>> = {
  timelineBossTag: 'metadata',
  timelineEvent: 'timeline',
  timelineLibrary: 'library',
  timelineMeta: 'metadata',
};

export function getUserColor(index: number): string {
  return USER_COLORS[index % USER_COLORS.length] ?? '#3b82f6';
}

export function getColorFromUserId(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length] ?? '#3b82f6';
}

export function getInitials(displayName: string): string {
  if (!displayName) {
    return '??';
  }

  let cleanName = displayName;
  if (
    (cleanName.startsWith('"') && cleanName.endsWith('"')) ||
    (cleanName.startsWith("'") && cleanName.endsWith("'"))
  ) {
    cleanName = cleanName.slice(1, -1);
  }

  return cleanName
    .split(' ')
    .map((word) => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function buildPresenceTargetKey(input: PresenceTargetInput): string {
  return [
    input.surface,
    input.entityType,
    input.entityId,
    input.field || '',
    input.slotId || '',
  ].join('|');
}

export function createPresenceTarget(input: PresenceTargetInput): PresenceTarget {
  return {
    ...input,
    key: buildPresenceTargetKey(input),
    panel:
      input.panel ??
      (input.surface === 'planner'
        ? PLANNER_PANEL_BY_ENTITY[input.entityType] || null
        : TIMELINE_PANEL_BY_ENTITY[input.entityType] || null),
    section:
      input.section ??
      (input.surface === 'planner'
        ? PLANNER_SECTION_BY_ENTITY[input.entityType] || null
        : TIMELINE_SECTION_BY_ENTITY[input.entityType] || null),
  };
}

export function normalizePresenceTarget(
  input: PresenceTargetInput | PresenceTarget | null
): PresenceTarget | null {
  if (!input) {
    return null;
  }

  if ('key' in input) {
    return createPresenceTarget(input);
  }

  return createPresenceTarget(input);
}

export function arePresenceTargetsEqual(
  a: PresenceTarget | PresenceTargetInput | null,
  b: PresenceTarget | PresenceTargetInput | null
): boolean {
  const normalizedA = normalizePresenceTarget(a);
  const normalizedB = normalizePresenceTarget(b);

  return normalizedA?.key === normalizedB?.key;
}

export function deriveViewportFromTarget(target: PresenceTarget | null): ViewportPresence | null {
  if (!target) {
    return null;
  }

  return {
    surface: target.surface,
    panel: target.panel || null,
    section: target.section || null,
    scrollTop: null,
  };
}

export function getTargetDisplayLabel(target: PresenceTarget | null): string | null {
  if (!target) {
    return null;
  }

  switch (target.entityType) {
    case 'assignment':
      return 'assignment';
    case 'bossAction':
      return 'timeline';
    case 'healthSetting':
      return 'health settings';
    case 'job':
      return 'jobs';
    case 'mitigation':
      return 'mitigations';
    case 'planMeta':
      return 'plan details';
    case 'tankPosition':
      return 'tank positions';
    case 'timelineBossTag':
      return 'boss tags';
    case 'timelineEvent':
      return 'timeline event';
    case 'timelineLibrary':
      return 'action library';
    case 'timelineMeta':
      return 'timeline details';
    default:
      return target.entityType;
  }
}

export function describePresenceActivity(presence: UserPresenceData | null): string | null {
  if (!presence) {
    return null;
  }

  const targetLabel = getTargetDisplayLabel(presence.activeTarget);

  if (presence.interaction === 'editing' && targetLabel) {
    return `Editing ${targetLabel}`;
  }

  if (presence.interaction === 'selected' && targetLabel) {
    return `Focused on ${targetLabel}`;
  }

  if (presence.interaction === 'hovering' && targetLabel) {
    return `Browsing ${targetLabel}`;
  }

  if (presence.viewport?.section) {
    return `In ${presence.viewport.section}`;
  }

  return null;
}

export type ElementSelection = TargetPresence;
