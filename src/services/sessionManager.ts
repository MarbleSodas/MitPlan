import { USER_COLORS, MAX_USERS_PER_PLAN } from '../types/presence';
import {
  acquirePlanChannel,
  type SharedPlanChannel,
} from './planRealtimeChannel';
import {
  COLLABORATION_UNAVAILABLE_MESSAGE,
  isPermissionDeniedError,
} from './backendErrorUtils';

interface SessionIdentity {
  userId: string;
  displayName: string;
  color?: string;
}

interface SessionPresence extends SessionIdentity {
  sessionId: string;
  color: string;
  isActive: true;
  connectedAt: number;
  activeTarget?: unknown;
  interaction?: unknown;
  viewport?: unknown;
  lastUpdated?: number;
}

interface ActiveSession {
  planId: string;
  sessionId: string;
  sharedChannel: SharedPlanChannel;
  presence: SessionPresence;
  listeners: Set<(sessions: SessionPresence[]) => void>;
  presenceListeners: Set<(entries: Map<string, Record<string, unknown>>) => void>;
  cursors: Map<string, unknown>;
  channelListenerCleanup: Array<() => void>;
}

const channelError = (error: unknown): Error & { code?: string } => {
  const source = error as { message?: string; code?: string } | null;
  const nextError = new Error(source?.message || COLLABORATION_UNAVAILABLE_MESSAGE) as Error & {
    code?: string;
  };
  nextError.code = source?.code || 'REALTIME_ERROR';
  return nextError;
};

class SessionManager {
  private activeSessions = new Map<string, ActiveSession>();
  private MAX_USERS = MAX_USERS_PER_PLAN;

  getColorForSession(planId: string, existingSessionCount: number): string {
    return USER_COLORS[existingSessionCount % USER_COLORS.length] ?? '#3b82f6';
  }

  private getSessionForPlan(planId: string): ActiveSession | null {
    return Array.from(this.activeSessions.values())
      .find((session) => session.planId === planId) || null;
  }

  private readPresence(session: ActiveSession): SessionPresence[] {
    const state = session.sharedChannel.channel.presenceState<Record<string, unknown>>();
    const entries: SessionPresence[] = [];

    Object.entries(state).forEach(([presenceKey, rawEntries]) => {
      const latest = rawEntries.at(-1) as Partial<SessionPresence> | undefined;
      if (!latest) return;
      entries.push({
        sessionId: String(latest.sessionId || presenceKey),
        userId: String(latest.userId || ''),
        displayName: String(latest.displayName || 'User'),
        color: String(latest.color || '#3b82f6'),
        isActive: true,
        connectedAt: Number(latest.connectedAt || Date.now()),
        activeTarget: latest.activeTarget,
        interaction: latest.interaction,
        viewport: latest.viewport,
        lastUpdated: Number(latest.lastUpdated || 0),
      });
    });

    return entries.sort((left, right) =>
      left.connectedAt - right.connectedAt ||
      left.sessionId.localeCompare(right.sessionId)
    );
  }

  private notify(session: ActiveSession): void {
    const sessions = this.readPresence(session);
    const activeSessionIds = new Set(sessions.map((entry) => entry.sessionId));
    session.cursors.forEach((_, cursorSessionId) => {
      if (!activeSessionIds.has(cursorSessionId)) session.cursors.delete(cursorSessionId);
    });
    session.listeners.forEach((listener) => listener(sessions));

    const presenceEntries = new Map<string, Record<string, unknown>>();
    sessions.forEach((entry) => {
      presenceEntries.set(entry.sessionId, {
        activeTarget: entry.activeTarget || null,
        interaction: entry.interaction || null,
        viewport: entry.viewport || null,
        cursor: session.cursors.get(entry.sessionId) || null,
        lastUpdated: entry.lastUpdated || entry.connectedAt,
      });
    });
    session.presenceListeners.forEach((listener) => listener(presenceEntries));
  }

  async getActiveSessionCount(planId: string): Promise<number> {
    const session = this.getSessionForPlan(planId);
    return session ? this.readPresence(session).length : 0;
  }

  async startSession(
    planId: string,
    sessionId: string,
    userData: SessionIdentity
  ): Promise<boolean> {
    try {
      const existing = this.activeSessions.get(sessionId);
      if (existing?.planId === planId) return true;
      if (existing) await this.endSession(sessionId);

      const color = userData.color || this.getColorForSession(
        planId,
        await this.getActiveSessionCount(planId)
      );
      const presence: SessionPresence = {
        sessionId,
        userId: userData.userId,
        displayName: userData.displayName,
        color,
        isActive: true,
        connectedAt: Date.now(),
        activeTarget: null,
        interaction: null,
        viewport: null,
        lastUpdated: Date.now(),
      };

      const sharedChannel = acquirePlanChannel(planId);

      const activeSession: ActiveSession = {
        planId,
        sessionId,
        sharedChannel,
        presence,
        listeners: new Set(),
        presenceListeners: new Set(),
        cursors: new Map(),
        channelListenerCleanup: [],
      };
      this.activeSessions.set(sessionId, activeSession);
      activeSession.channelListenerCleanup.push(sharedChannel.onPresenceSync(() => {
        const current = this.activeSessions.get(sessionId);
        if (current) this.notify(current);
      }));
      activeSession.channelListenerCleanup.push(sharedChannel.onCursor((payload) => {
        const current = this.activeSessions.get(sessionId);
        const cursorSessionId = String(payload?.sessionId || '');
        if (!current || !cursorSessionId) return;
        if (payload?.cursor) current.cursors.set(cursorSessionId, payload.cursor);
        else current.cursors.delete(cursorSessionId);
        this.notify(current);
      }));
      await sharedChannel.ready;
      await sharedChannel.channel.track(presence);

      if (this.readPresence(activeSession).length > this.MAX_USERS) {
        await this.endSession(sessionId);
        throw new Error(`Plan has reached maximum collaborator limit (${this.MAX_USERS} users)`);
      }

      this.notify(activeSession);
      return true;
    } catch (error) {
      if (isPermissionDeniedError(error)) {
        const permissionError = new Error(COLLABORATION_UNAVAILABLE_MESSAGE) as Error & {
          code?: string;
        };
        permissionError.code = 'PERMISSION_DENIED';
        throw permissionError;
      }
      console.error('Error starting realtime presence session:', error);
      throw channelError(error);
    }
  }

  async updateSessionPresence(
    sessionId: string,
    patch: Record<string, unknown>
  ): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    const { cursor, ...presencePatch } = patch;
    const viewport = presencePatch.viewport as Record<string, unknown> | null | undefined;
    session.presence = {
      ...session.presence,
      sessionId,
      userId: session.presence.userId,
      displayName: String(presencePatch.displayName || session.presence.displayName),
      color: session.presence.color,
      isActive: true,
      activeTarget: 'activeTarget' in presencePatch
        ? presencePatch.activeTarget
        : session.presence.activeTarget ?? null,
      interaction: 'interaction' in presencePatch
        ? presencePatch.interaction
        : session.presence.interaction ?? null,
      viewport: viewport === null
        ? null
        : viewport
          ? {
              surface: viewport.surface || null,
              panel: viewport.panel || null,
              section: viewport.section || null,
            }
          : session.presence.viewport,
      lastUpdated: Date.now(),
    };
    await session.sharedChannel.channel.track(session.presence);

    if ('cursor' in patch) {
      await session.sharedChannel.channel.send({
        type: 'broadcast',
        event: 'cursor',
        payload: { sessionId, cursor: cursor || null },
      });
    }
    this.notify(session);
  }

  async endSession(sessionId: string): Promise<boolean> {
    const session = this.activeSessions.get(sessionId);
    if (!session) return false;
    this.activeSessions.delete(sessionId);
    session.channelListenerCleanup.forEach((cleanup) => cleanup());

    try {
      await session.sharedChannel.channel.untrack();
      await session.sharedChannel.release();
      return true;
    } catch (error) {
      if (!isPermissionDeniedError(error)) {
        console.error('Error ending realtime presence session:', error);
      }
      return false;
    }
  }

  async getActiveSessions(planId: string): Promise<SessionPresence[]> {
    const session = this.getSessionForPlan(planId);
    return session ? this.readPresence(session) : [];
  }

  subscribeToSessions(
    planId: string,
    callback: (sessions: SessionPresence[]) => void,
    options: { onError?: (error: unknown) => void } = {}
  ): () => void {
    const session = this.getSessionForPlan(planId);
    if (!session) {
      const error = new Error('Presence channel is not connected');
      options.onError?.(error);
      callback([]);
      return () => {};
    }

    session.listeners.add(callback);
    callback(this.readPresence(session));
    return () => session.listeners.delete(callback);
  }

  subscribeToPresence(
    planId: string,
    callback: (entries: Map<string, Record<string, unknown>>) => void
  ): () => void {
    const session = this.getSessionForPlan(planId);
    if (!session) {
      callback(new Map());
      return () => {};
    }
    session.presenceListeners.add(callback);
    this.notify(session);
    return () => session.presenceListeners.delete(callback);
  }

  getSessionPresence(sessionId: string): Record<string, unknown> | null {
    const presence = this.activeSessions.get(sessionId)?.presence;
    return presence ? { ...presence } : null;
  }

  async cleanup(): Promise<void> {
    const sessionIds = Array.from(this.activeSessions.keys());
    await Promise.all(sessionIds.map((sessionId) => this.endSession(sessionId)));
  }
}

const sessionManager = new SessionManager();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    void sessionManager.cleanup();
  });
}

export default sessionManager;
