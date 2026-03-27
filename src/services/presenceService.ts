import {
  get,
  onDisconnect,
  onValue,
  ref,
  remove,
  set,
} from 'firebase/database';
import { database } from '../config/firebase';
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
  PRESENCE_STALE_TIMEOUT,
  arePresenceTargetsEqual,
  createPresenceTarget,
} from '../types/presence';
import {
  getPresencePath as getCollaborationPresencePath,
  getPresenceRoot,
} from './collaborationPaths';
import { isPermissionDeniedError } from './firebaseErrorUtils';

type FirebaseSnapshot = Awaited<ReturnType<typeof get>>;

interface PresenceSubscriptionOptions {
  onError?: (error: unknown) => void;
}

function getPresencePath(roomId: string, sessionId: string): string {
  return getCollaborationPresencePath(roomId, sessionId);
}

function getAllPresencePath(roomId: string): string {
  return getPresenceRoot(roomId);
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

  const presenceRef = ref(database, getPresencePath(roomId, sessionId));
  await set(presenceRef, {
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

  const presenceRef = ref(database, getPresencePath(roomId, sessionId));
  await remove(presenceRef);
}

export async function setupDisconnectHandler(roomId: string, sessionId: string): Promise<void> {
  if (!roomId || !sessionId) {
    return;
  }

  const presenceRef = ref(database, getPresencePath(roomId, sessionId));
  const disconnectRef = onDisconnect(presenceRef);
  await disconnectRef.remove();
}

export function subscribeToPresence(
  roomId: string,
  callback: (presenceMap: Map<string, UserPresenceData & { sessionId: string }>) => void,
  options: PresenceSubscriptionOptions = {}
): () => void {
  if (!roomId) {
    callback(new Map());
    return () => {};
  }

  const presenceRef = ref(database, getAllPresencePath(roomId));

  const handleValue = (snapshot: FirebaseSnapshot) => {
    const presenceMap = new Map<string, UserPresenceData & { sessionId: string }>();

    if (snapshot.exists()) {
      const now = Date.now();
      const data = snapshot.val() as Record<string, Partial<UserPresenceData>>;

      Object.entries(data).forEach(([sessionId, rawPresence]) => {
        const presence = normalizePresenceData(rawPresence);
        if (presence.lastUpdated && now - presence.lastUpdated < PRESENCE_STALE_TIMEOUT) {
          presenceMap.set(sessionId, {
            ...presence,
            sessionId,
          });
        }
      });
    }

    callback(presenceMap);
  };

  const unsubscribe = onValue(
    presenceRef,
    handleValue as Parameters<typeof onValue>[1],
    (error) => {
      options.onError?.(error);
      if (!options.onError || !isPermissionDeniedError(error)) {
        console.error('[PresenceService] Error subscribing to presence:', error);
      }
      callback(new Map());
    }
  );

  return unsubscribe;
}

export async function getPresence(roomId: string, sessionId: string): Promise<UserPresenceData | null> {
  if (!roomId || !sessionId) {
    return null;
  }

  try {
    const presenceRef = ref(database, getPresencePath(roomId, sessionId));
    const snapshot = await get(presenceRef);

    if (!snapshot.exists()) {
      return null;
    }

    return normalizePresenceData(snapshot.val() as Partial<UserPresenceData>);
  } catch (error) {
    console.error('[PresenceService] Error getting presence:', error);
    return null;
  }
}

export async function cleanupStalePresence(roomId: string): Promise<void> {
  if (!roomId) {
    return;
  }

  try {
    const presenceRef = ref(database, getAllPresencePath(roomId));
    const snapshot = await get(presenceRef);

    if (!snapshot.exists()) {
      return;
    }

    const now = Date.now();
    const data = snapshot.val() as Record<string, Partial<UserPresenceData>>;

    for (const [sessionId, rawPresence] of Object.entries(data)) {
      const presence = normalizePresenceData(rawPresence);
      if (presence.lastUpdated && now - presence.lastUpdated >= PRESENCE_STALE_TIMEOUT) {
        try {
          await clearPresence(roomId, sessionId);
        } catch (error) {
          console.error('[PresenceService] Error clearing stale presence:', error);
        }
      }
    }
  } catch (error) {
    console.error('[PresenceService] Error cleaning up stale presence:', error);
  }
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
