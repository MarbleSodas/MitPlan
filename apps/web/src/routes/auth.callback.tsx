/**
 * OAuth callback. PKCE code-for-session exchange. Architecture §7.7.3, §7.7.4.
 */
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { supabase } from '../lib/supabase.js';
import { linkIfPossible } from '../lib/account-link.js';

export const AuthCallback = () => {
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'pending' | 'ok' | 'error'>('pending');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = search.get('code');
    const next = search.get('next') ?? '/plan';
    if (!code) {
      setError('Missing OAuth code');
      setStatus('error');
      return;
    }
    (async () => {
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError || !data.session) {
        setError(exchangeError?.message ?? 'Session exchange failed');
        setStatus('error');
        return;
      }
      await linkIfPossible(data.session);
      setStatus('ok');
      navigate(next, { replace: true });
    })();
  }, [search, navigate]);

  if (status === 'error') {
    return (
      <div className="auth-callback-error">
        <h1>Sign in failed</h1>
        <p role="alert">{error}</p>
        <a href="/login">Try again</a>
      </div>
    );
  }
  return (
    <div className="auth-callback-pending">
      <p>Signing you in…</p>
    </div>
  );
};
