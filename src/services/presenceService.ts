import sessionManager from './sessionManager';
import type {
  CollaborationInteraction,
  CursorPresence,
  PresenceTarget,
  PresenceTargetInput,
  UserPresenceData,
  ViewportPresence,
} from '../types/presence';
import {
  EMPTY_PRESENCE_DATA,
  arePresenceTargetsEqual,
  createPresenceTarget,
} from '../types/presence';

interface PresenceSubscriptionOptions {
  onError?: (error: unknown) => void;
}

function normalizeCursor(cursor: CursorPresence | null | undefined): CursorPresence | null {
  if (!cursor) {
    return null;
  }

  return {
    ...cursor,
    x: Math.round(cursor.x),
    y: Math.round(cursor.y),
    containerWidth: cursor.containerWidth == null ? null : Math.round(cursor.containerWidth),
    containerHeight: cursor.containerHeight == null ? null : Math.round(cursor.containerHeight),
  };
}

function normalizeViewport(viewport: ViewportPresence | null | undefined): ViewportPresence | null {
  if (!viewport) {
    return null;
  }

  return {
    surface: viewport.surface,
    panel: viewport.panel || null,
    section: viewport.section || null,
    scrollTop: viewport.scrollTop == null ? null : Math.round(viewport.scrollTop),
  };
}

export function normalizePresenceData(
  data: Partial<UserPresenceData> | null | undefined
): UserPresenceData {
  return {
    activeTarget: data?.activeTarget ? createPresenceTarget(data.activeTarget) : null,
    interaction: data?.interaction || null,
    cursor: normalizeCursor(data?.cursor),
    viewport: normalizeViewport(data?.viewport),
    lastUpdated: typeof data?.lastUpdated === 'number' ? data.lastUpdated : 0,
  };
}

export async function updatePresence(
  roomId: string,
  sessionId: string,
  presenceData: UserPresenceData
): Promise<void> {
  if (!roomId || !sessionId) {
    return;
  }

  await sessionManager.updateSessionPresence(sessionId, {
    ...normalizePresenceData(presenceData),
    lastUpdated: Date.now(),
  });
}

export async function setFullPresence(
  roomId: string,
  sessionId: string,
  presenceData: UserPresenceData
): Promise<void> {
  return updatePresence(roomId, sessionId, presenceData);
}

export async function clearPresence(roomId: string, sessionId: string): Promise<void> {
  if (!roomId || !sessionId) {
    return;
  }

  await sessionManager.updateSessionPresence(sessionId, {
    activeTarget: null,
    interaction: null,
    cursor: null,
    viewport: null,
    lastUpdated: Date.now(),
  });
}

export async function setupDisconnectHandler(roomId: string, sessionId: string): Promise<void> {
  if (!roomId || !sessionId) {
    return;
  }

  // Supabase Presence automatically removes this tab's state when its
  // private channel leaves. No persisted disconnect sentinel is required.
}

export function subscribeToPresence(
  roomId: string,
  callback: (presenceMap: Map<string, UserPresenceData & { sessionId: string }>) => void,
  _options: PresenceSubscriptionOptions = {}
): () => void {
  if (!roomId) {
    callback(new Map());
    return () => {};
  }

  return sessionManager.subscribeToPresence(roomId, (entries) => {
    const presenceMap = new Map<string, UserPresenceData & { sessionId: string }>();
    entries.forEach((rawPresence, sessionId) => {
      const presence = normalizePresenceData(rawPresence as Partial<UserPresenceData>);
      presenceMap.set(sessionId, {
        ...presence,
        sessionId,
      });
    });
    callback(presenceMap);
  });
}

export async function getPresence(roomId: string, sessionId: string): Promise<UserPresenceData | null> {
  if (!roomId || !sessionId) {
    return null;
  }

  const presence = sessionManager.getSessionPresence(sessionId);
  return presence
    ? normalizePresenceData(presence as Partial<UserPresenceData>)
    : null;
}

export async function cleanupStalePresence(roomId: string): Promise<void> {
  if (!roomId) {
    return;
  }

  // Presence join/leave semantics are authoritative; there are no persisted
  // heartbeat rows or stale records to clean.
}

export function applyPresencePatch(
  currentPresence: UserPresenceData | null,
  patch: Partial<UserPresenceData>
): UserPresenceData {
  const base = normalizePresenceData(currentPresence || EMPTY_PRESENCE_DATA);

  return {
    activeTarget:
      patch.activeTarget !== undefined
        ? (patch.activeTarget ? createPresenceTarget(patch.activeTarget) : null)
        : base.activeTarget,
    interaction:
      patch.interaction !== undefined ? patch.interaction || null : base.interaction,
    cursor:
      patch.cursor !== undefined ? normalizeCursor(patch.cursor) : base.cursor,
    viewport:
      patch.viewport !== undefined ? normalizeViewport(patch.viewport) : base.viewport,
    lastUpdated: Date.now(),
  };
}

export function areCursorPresencesEqual(
  a: CursorPresence | null | undefined,
  b: CursorPresence | null | undefined
): boolean {
  const normalizedA = normalizeCursor(a);
  const normalizedB = normalizeCursor(b);

  return JSON.stringify(normalizedA) === JSON.stringify(normalizedB);
}

export function areViewportPresencesEqual(
  a: ViewportPresence | null | undefined,
  b: ViewportPresence | null | undefined
): boolean {
  const normalizedA = normalizeViewport(a);
  const normalizedB = normalizeViewport(b);

  return JSON.stringify(normalizedA) === JSON.stringify(normalizedB);
}

export function arePresenceStatesEqual(
  a: UserPresenceData | null | undefined,
  b: UserPresenceData | null | undefined
): boolean {
  const normalizedA = normalizePresenceData(a);
  const normalizedB = normalizePresenceData(b);

  return (
    arePresenceTargetsEqual(normalizedA.activeTarget, normalizedB.activeTarget) &&
    normalizedA.interaction === normalizedB.interaction &&
    areCursorPresencesEqual(normalizedA.cursor, normalizedB.cursor) &&
    areViewportPresencesEqual(normalizedA.viewport, normalizedB.viewport)
  );
}

export function createTargetInteractionPatch(
  target: PresenceTargetInput | PresenceTarget | null,
  interaction: CollaborationInteraction | null
): Partial<UserPresenceData> {
  return {
    activeTarget: target ? createPresenceTarget(target) : null,
    interaction,
  };
}

class PresenceDebouncer {
  private timers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  debounce(key: string, fn: () => void, delay: number): void {
    const existingTimer = this.timers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      this.timers.delete(key);
      fn();
    }, Math.max(0, delay));

    this.timers.set(key, timer);
  }

  clear(key: string): void {
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }
  }

  clearAll(): void {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();
  }
}

export const presenceDebouncer = new PresenceDebouncer();

export default {
  updatePresence,
  setFullPresence,
  clearPresence,
  setupDisconnectHandler,
  subscribeToPresence,
  getPresence,
  cleanupStalePresence,
  applyPresencePatch,
  arePresenceStatesEqual,
  presenceDebouncer,
};
