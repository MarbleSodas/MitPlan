/**
 * usePresence. Lightweight Supabase Realtime Presence hook for the
 * plan editor. Opens a dedicated presence channel per plan and
 * tracks which users are currently viewing the plan.
 *
 * This is separate from the Yjs broadcast provider — it only uses
 * Supabase's built-in presence protocol (heartbeat-based join/leave).
 *
 * Returns the list of **remote** users (excludes the local user) so
 * the caller can render an "X people are viewing" badge without the
 * local user counting themselves.
 */
import { useEffect, useState } from 'react';
import { supabase, useSession } from './supabase';

export type PresenceUser = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  joinedAt: number;
};

/**
 * Track presence on `plan-presence:${planId}`. Returns the list of
 * remote users currently online (excludes the local user). Heartbeat
 * is automatic via Supabase's presence protocol (~10s default).
 *
 * The presence channel is separate from the realtime ACL gate on
 * `plan:*` — anyone with at least read access to the plan (owner,
 * editor, viewer) can join. The local user is excluded from the
 * returned list so callers can render a "No one else is here" state.
 */
export function usePresence(planId: string | null): PresenceUser[] {
  const [users, setUsers] = useState<PresenceUser[]>([]);
  const session = useSession();

  useEffect(() => {
    // Gate on both planId AND an authenticated session — opening the
    // channel before we know who we are would leak the local user's
    // identity on a future reconnect.
    if (!planId) return;
    if (session.loading) return;
    const localUserId = session.user?.id ?? null;
    if (!localUserId) return;

    const channel = supabase.channel(`plan-presence:${planId}`, {
      config: { presence: { key: localUserId } },
    });

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const all: PresenceUser[] = [];
      for (const presences of Object.values(state)) {
        for (const p of presences) {
          const u = p as unknown as PresenceUser;
          all.push(u);
        }
      }
      // Deduplicate by userId (multiple tabs from same user) + drop
      // the local user so callers can render a "who else is here" list.
      const seen = new Map<string, PresenceUser>();
      for (const u of all) {
        if (u.userId === localUserId) continue;
        if (!seen.has(u.userId)) seen.set(u.userId, u);
      }
      setUsers(Array.from(seen.values()));
    });

    channel.subscribe(async (status) => {
      if (status !== 'SUBSCRIBED') return;
      const { data } = await supabase.auth.getSession();
      const sessionUser = data.session?.user;
      if (!sessionUser) return;

      await channel.track({
        userId: sessionUser.id,
        displayName:
          sessionUser.user_metadata?.full_name ??
          sessionUser.email?.split('@')[0] ??
          'Anonymous',
        avatarUrl: sessionUser.user_metadata?.avatar_url ?? null,
        joinedAt: Date.now(),
      });
    });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [planId, session.loading, session.user?.id]);

  return users;
}
