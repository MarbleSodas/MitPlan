import {
  ref,
  set,
  get,
  remove,
  onValue,
  off,
  onDisconnect,
  serverTimestamp
} from 'firebase/database';
import { database } from '../config/firebase';
import type { UserPresenceData, ElementType, TankPosition } from '../types/presence';
import { EMPTY_PRESENCE_DATA, PRESENCE_STALE_TIMEOUT } from '../types/presence';

const PRESENCE_PATH = 'plans';

function getPresencePath(planId: string, sessionId: string): string {
  return `${PRESENCE_PATH}/${planId}/collaboration/presence/${sessionId}`;
}

function getAllPresencePath(planId: string): string {
  return `${PRESENCE_PATH}/${planId}/collaboration/presence`;
}

export async function updatePresence(
  planId: string,
  sessionId: string,
  presenceData: Partial<UserPresenceData>
): Promise<void> {
  if (!planId || !sessionId) return;

  try {
    const presenceRef = ref(database, getPresencePath(planId, sessionId));
    const updateData = {
      ...presenceData,
      lastUpdated: Date.now()
    };
    await set(presenceRef, updateData);
  } catch (error) {
    console.error('[PresenceService] Error updating presence:', error);
  }
}

export async function setFullPresence(
  planId: string,
  sessionId: string,
  presenceData: UserPresenceData
): Promise<void> {
  if (!planId || !sessionId) return;

  try {
    const presenceRef = ref(database, getPresencePath(planId, sessionId));
    await set(presenceRef, presenceData);
  } catch (error) {
    console.error('[PresenceService] Error setting full presence:', error);
  }
}

export async function clearPresence(planId: string, sessionId: string): Promise<void> {
  if (!planId || !sessionId) return;

  try {
    const presenceRef = ref(database, getPresencePath(planId, sessionId));
    await remove(presenceRef);
  } catch (error) {
    console.error('[PresenceService] Error clearing presence:', error);
  }
}

export async function setupDisconnectHandler(planId: string, sessionId: string): Promise<void> {
  if (!planId || !sessionId) return;

  try {
    const presenceRef = ref(database, getPresencePath(planId, sessionId));
    const disconnectRef = onDisconnect(presenceRef);
    await disconnectRef.remove();
  } catch (error) {
    console.error('[PresenceService] Error setting up disconnect handler:', error);
  }
}

export function subscribeToPresence(
  planId: string,
  callback: (presenceMap: Map<string, UserPresenceData & { sessionId: string }>) => void
): () => void {
  if (!planId) {
    callback(new Map());
    return () => {};
  }

  const presenceRef = ref(database, getAllPresencePath(planId));

  const handleValue = (snapshot: ReturnType<typeof get> extends Promise<infer T> ? T : never) => {
    const presenceMap = new Map<string, UserPresenceData & { sessionId: string }>();

    if (snapshot.exists()) {
      const data = snapshot.val();
      const now = Date.now();

      Object.entries(data).forEach(([sessionId, presenceData]) => {
        const presence = presenceData as UserPresenceData;
        if (presence.lastUpdated && (now - presence.lastUpdated) < PRESENCE_STALE_TIMEOUT) {
          presenceMap.set(sessionId, { ...presence, sessionId });
        }
      });
    }

    callback(presenceMap);
  };

  const unsubscribe = onValue(presenceRef, handleValue as Parameters<typeof onValue>[1], (error) => {
    console.error('[PresenceService] Error subscribing to presence:', error);
    callback(new Map());
  });

  return () => {
    off(presenceRef, 'value', unsubscribe as Parameters<typeof off>[2]);
  };
}

export async function getPresence(planId: string, sessionId: string): Promise<UserPresenceData | null> {
  if (!planId || !sessionId) return null;

  try {
    const presenceRef = ref(database, getPresencePath(planId, sessionId));
    const snapshot = await get(presenceRef);
    
    if (snapshot.exists()) {
      return snapshot.val() as UserPresenceData;
    }
    return null;
  } catch (error) {
    console.error('[PresenceService] Error getting presence:', error);
    return null;
  }
}

export async function cleanupStalePresence(planId: string): Promise<void> {
  if (!planId) return;

  try {
    const presenceRef = ref(database, getAllPresencePath(planId));
    const snapshot = await get(presenceRef);

    if (!snapshot.exists()) return;

    const now = Date.now();
    const data = snapshot.val();

    for (const [sessionId, presenceData] of Object.entries(data)) {
      const presence = presenceData as UserPresenceData;
      if (presence.lastUpdated && (now - presence.lastUpdated) >= PRESENCE_STALE_TIMEOUT) {
        await clearPresence(planId, sessionId);
      }
    }
  } catch (error) {
    console.error('[PresenceService] Error cleaning up stale presence:', error);
  }
}

export function createPresenceUpdate(
  type: ElementType,
  elementId: string | null,
  currentPresence: UserPresenceData | null
): UserPresenceData {
  const base = currentPresence || { ...EMPTY_PRESENCE_DATA };
  
  const update: UserPresenceData = {
    ...base,
    lastUpdated: Date.now()
  };

  switch (type) {
    case 'bossAction':
      update.selectedBossActionId = elementId;
      break;
    case 'mitigation':
      update.focusedMitigationId = elementId;
      break;
    case 'job':
      update.focusedJobId = elementId;
      break;
    case 'tankPosition':
      update.focusedTankPosition = elementId as TankPosition | null;
      break;
  }

  return update;
}

export function getElementIdFromPresence(
  presence: UserPresenceData,
  type: ElementType
): string | null {
  switch (type) {
    case 'bossAction':
      return presence.selectedBossActionId;
    case 'mitigation':
      return presence.focusedMitigationId;
    case 'job':
      return presence.focusedJobId;
    case 'tankPosition':
      return presence.focusedTankPosition;
  }
}

class PresenceDebouncer {
  private timers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  debounce(key: string, fn: () => void, delay: number): void {
    const existingTimer = this.timers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    if (delay === 0) {
      fn();
      return;
    }

    const timer = setTimeout(() => {
      this.timers.delete(key);
      fn();
    }, delay);

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
    this.timers.forEach(timer => clearTimeout(timer));
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
  createPresenceUpdate,
  getElementIdFromPresence,
  presenceDebouncer
};
