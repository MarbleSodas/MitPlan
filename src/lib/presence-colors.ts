/**
 * Shared presence/presence-cursor color palette for collaborative features.
 * Centralized so the same hues are used consistently across every surface
 * that renders remote users (Avoids magic-hex duplication across files).
 */
export const PRESENCE_COLORS = [
  '#3399ff',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#84cc16',
  '#f97316',
  '#ec4899',
  '#6366f1',
] as const;

export const DEFAULT_PRESENCE_COLOR = PRESENCE_COLORS[0];

export const getPresenceColor = (userId: string): string => {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PRESENCE_COLORS[Math.abs(hash) % PRESENCE_COLORS.length];
};
