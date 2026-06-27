/**
 * Account link. Architecture §7.7.4.
 * After a successful sign-in, check whether the new identity can be
 * linked to an existing auth.users row with a matching verified email.
 * The merge is server-side via the `merge_auth_users` RPC (§17.7.3).
 */
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase.js';

export const linkIfPossible = async (session: Session): Promise<void> => {
  const user = session.user;
  if (!user?.email) return; // unverified; skip
  const { data: identities } = await supabase.auth.getUserIdentities();
  if ((identities?.identities?.length ?? 0) > 1) return; // already multi-identity

  const res = await fetch('/api/v1/account-link/eligible', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      currentUserId: user.id,
      email: user.email,
      provider: identities?.identities?.[0]?.provider,
    }),
  });
  if (!res.ok) return;
  const { candidateUserId } = (await res.json()) as { candidateUserId: string | null };
  if (!candidateUserId || candidateUserId === user.id) return;
  await fetch('/api/v1/account-link/merge', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ candidateUserId }),
  });
};
