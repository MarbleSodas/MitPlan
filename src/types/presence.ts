export type ElementType = 'bossAction' | 'mitigation' | 'job' | 'tankPosition';

export type TankPosition = 'MT' | 'OT';

export interface UserPresenceData {
  selectedBossActionId: string | null;
  focusedMitigationId: string | null;
  focusedJobId: string | null;
  focusedTankPosition: TankPosition | null;
  lastUpdated: number;
}

export interface UserPresence extends UserPresenceData {
  sessionId: string;
  userId: string;
  displayName: string;
  color: string;
}

export interface ElementSelection {
  sessionId: string;
  userId: string;
  displayName: string;
  color: string;
  isCurrentUser: boolean;
}

export interface PresenceContextValue {
  presenceMap: Map<string, UserPresence>;
  isConnected: boolean;
  currentSessionId: string | null;
  updateMySelection: (type: ElementType, elementId: string | null) => void;
  getSelectionsForElement: (type: ElementType, elementId: string) => ElementSelection[];
  isElementSelectedByOthers: (type: ElementType, elementId: string) => boolean;
  getMyPresence: () => UserPresenceData | null;
}

export const USER_COLORS: readonly string[] = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1',
  '#14b8a6', '#eab308', '#f43f5e', '#a855f7', '#0ea5e9',
  '#22c55e', '#fb923c', '#e879f9', '#38bdf8', '#4ade80',
  '#fbbf24', '#fb7185', '#c084fc', '#2dd4bf',
];

export const MAX_USERS_PER_PLAN = 24;

export const PRESENCE_DEBOUNCE = {
  bossAction: 0,
  mitigation: 100,
  job: 150,
  tankPosition: 150,
} as const;

export const PRESENCE_STALE_TIMEOUT = 30000;

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
  if (!displayName) return '??';
  
  let cleanName = displayName;
  if ((cleanName.startsWith('"') && cleanName.endsWith('"')) ||
      (cleanName.startsWith("'") && cleanName.endsWith("'"))) {
    cleanName = cleanName.slice(1, -1);
  }
  
  return cleanName
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export const EMPTY_PRESENCE_DATA: UserPresenceData = {
  selectedBossActionId: null,
  focusedMitigationId: null,
  focusedJobId: null,
  focusedTankPosition: null,
  lastUpdated: 0,
};
