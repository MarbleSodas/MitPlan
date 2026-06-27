/**
 * Supabase client + auth hook. Architecture §7.7.
 */
import { createClient, type Session, type User } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

const SUPABASE_URL = (import.meta.env['VITE_SUPABASE_URL'] as string | undefined) ?? '';
const SUPABASE_ANON_KEY = (import.meta.env['VITE_SUPABASE_ANON_KEY'] as string | undefined) ?? '';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});

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
    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setState({
        loading: false,
        user: (data.session?.user as SessionUser | undefined) ?? null,
        session: data.session,
      });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({
        loading: false,
        user: (session?.user as SessionUser | undefined) ?? null,
        session,
      });
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
};
