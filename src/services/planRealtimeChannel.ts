import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../config/supabase';

export const browserConnectionKey =
  globalThis.crypto?.randomUUID?.() ||
  `connection_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

type StatusListener = (status: string, error?: Error) => void;
type PayloadListener = (payload: Record<string, unknown>) => void;
type VoidListener = () => void;

interface ChannelEntry {
  channel: RealtimeChannel;
  ready: Promise<void>;
  refs: number;
  statusListeners: Set<StatusListener>;
  changeListeners: Set<PayloadListener>;
  cursorListeners: Set<PayloadListener>;
  presenceListeners: Set<VoidListener>;
}

export interface SharedPlanChannel {
  channel: RealtimeChannel;
  ready: Promise<void>;
  onStatus: (listener: StatusListener) => () => void;
  onChange: (listener: PayloadListener) => () => void;
  onCursor: (listener: PayloadListener) => () => void;
  onPresenceSync: (listener: VoidListener) => () => void;
  release: () => Promise<void>;
}

const entries = new Map<string, ChannelEntry>();

// Keep private-channel authorization synchronized with Auth token refreshes.
// This is process-scoped; individual plan channels remain tab-scoped.
(supabase as typeof supabase & {
  auth?: {
    onAuthStateChange?: (
      callback: (event: string, session: { access_token?: string } | null) => void
    ) => unknown;
  };
}).auth?.onAuthStateChange?.((_event, session) => {
  void supabase.realtime.setAuth(session?.access_token);
});

const normalizeError = (error: unknown): Error => {
  if (error instanceof Error) return error;
  const record = error as { message?: string } | null;
  return new Error(record?.message || 'Realtime channel failed');
};

function createEntry(planId: string): ChannelEntry {
  const statusListeners = new Set<StatusListener>();
  const changeListeners = new Set<PayloadListener>();
  const cursorListeners = new Set<PayloadListener>();
  const presenceListeners = new Set<VoidListener>();
  let resolveReady: (() => void) | null = null;
  let rejectReady: ((error: Error) => void) | null = null;
  const ready = new Promise<void>((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });

  const channel = supabase
    .channel(`plan:${planId}`, {
      config: {
        private: true,
        presence: { key: browserConnectionKey },
        broadcast: { self: false, ack: false },
      },
    })
    .on('broadcast', { event: 'plan_change' }, (message) => {
      changeListeners.forEach((listener) =>
        listener(message as unknown as Record<string, unknown>)
      );
    })
    .on('broadcast', { event: 'cursor' }, ({ payload }) => {
      cursorListeners.forEach((listener) =>
        listener((payload || {}) as Record<string, unknown>)
      );
    })
    .on('presence', { event: 'sync' }, () => {
      presenceListeners.forEach((listener) => listener());
    })
    .on('presence', { event: 'join' }, () => {
      presenceListeners.forEach((listener) => listener());
    })
    .on('presence', { event: 'leave' }, () => {
      presenceListeners.forEach((listener) => listener());
    });

  const entry: ChannelEntry = {
    channel,
    ready,
    refs: 0,
    statusListeners,
    changeListeners,
    cursorListeners,
    presenceListeners,
  };
  entries.set(planId, entry);

  void supabase.realtime.setAuth().then(() => {
    channel.subscribe((status, subscribeError) => {
      if (status === 'SUBSCRIBED') {
        resolveReady?.();
        resolveReady = null;
        rejectReady = null;
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        const error = normalizeError(subscribeError);
        rejectReady?.(error);
        resolveReady = null;
        rejectReady = null;
        statusListeners.forEach((listener) => listener('error', error));
      }
      statusListeners.forEach((listener) => listener(status));
    });
  }).catch((error) => {
    const normalized = normalizeError(error);
    rejectReady?.(normalized);
    statusListeners.forEach((listener) => listener('error', normalized));
  });

  return entry;
}

export function acquirePlanChannel(planId: string): SharedPlanChannel {
  const entry = entries.get(planId) || createEntry(planId);
  entry.refs += 1;
  let released = false;

  return {
    channel: entry.channel,
    ready: entry.ready,
    onStatus: (listener) => {
      entry.statusListeners.add(listener);
      return () => entry.statusListeners.delete(listener);
    },
    onChange: (listener) => {
      entry.changeListeners.add(listener);
      return () => entry.changeListeners.delete(listener);
    },
    onCursor: (listener) => {
      entry.cursorListeners.add(listener);
      return () => entry.cursorListeners.delete(listener);
    },
    onPresenceSync: (listener) => {
      entry.presenceListeners.add(listener);
      return () => entry.presenceListeners.delete(listener);
    },
    release: async () => {
      if (released) return;
      released = true;
      entry.refs -= 1;
      if (entry.refs > 0) return;
      entries.delete(planId);
      await supabase.removeChannel(entry.channel);
    },
  };
}
