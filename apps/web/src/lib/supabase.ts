/**
 * Supabase client + auth hook. Architecture §7.7.
 *
 * Module-load is forgiving: if `VITE_SUPABASE_URL` or
 * `VITE_SUPABASE_ANON_KEY` are unset (test environments, fresh clones),
 * the client is constructed with placeholders so module imports don't
 * throw. Real API calls will fail at request time with a clear error
 * from supabase-js; production deployments must set the env vars via
 * `.env.local` (development) or the build-time `import.meta.env` values
 * injected by Vite.
 */
import { createClient, type Session, type User } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

const SUPABASE_URL = (import.meta.env['VITE_SUPABASE_URL'] as string | undefined) ?? '';
const SUPABASE_ANON_KEY = (import.meta.env['VITE_SUPABASE_ANON_KEY'] as string | undefined) ?? '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // eslint-disable-next-line no-console
  console.warn(
    '[supabase] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not set. ' +
      'API calls will fail at request time. Copy .env.example to .env.local ' +
      'and fill in the values for local development.',
  );
}

export const supabase = createClient(
  SUPABASE_URL || 'http://localhost.invalid',
  SUPABASE_ANON_KEY || 'invalid-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      flowType: 'pkce',
      // The /auth/callback route manually calls exchangeCodeForSession,
      // so disable Supabase's automatic URL-session detection. Otherwise
      // the client consumes the PKCE code verifier on init and the
      // callback's exchange fails with "PKCE code verifier not found".
      detectSessionInUrl: false,
    },
  },
);

export interface SessionUser extends User {
  displayName?: string;
}

export interface SessionState {
  loading: boolean;
  user: SessionUser | null;
  session: Session | null;
}

/** React hook. Subscribes to onAuthStateChange. */
export const useSession = (): SessionState => {
  const [state, setState] = useState<SessionState>({
    loading: true,
    user: null,
    session: null,
  });

  useEffect(() => {
    let mounted = true;
    const applySession = (session: Session | null) => {
      if (!mounted) return;
      setState({
        loading: false,
        user: (session?.user as SessionUser | undefined) ?? null,
        session,
      });
    };

    void supabase.auth
      .getSession()
      .then(({ data }) => applySession(data.session))
      .catch(() => applySession(null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
};
