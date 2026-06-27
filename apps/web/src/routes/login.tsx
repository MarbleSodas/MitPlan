/**
 * Login page. Architecture §7.7.1 (provider matrix).
 * Discord primary CTA, Google secondary, email/password tertiary.
 */
import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { supabase } from '../lib/supabase.js';

export const LoginPage = () => {
  const [error, setError] = useState<string | null>(null);
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const next = search.get('next') ?? '/plan';

  const oauth = async (provider: 'discord' | 'google') => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (error) setError(error.message);
  };

  const email = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const { error } = await supabase.auth.signInWithPassword({
      email: String(form.get('email') ?? ''),
      password: String(form.get('password') ?? ''),
    });
    if (error) setError(error.message);
    else navigate(next, { replace: true });
  };

  return (
    <div className="login">
      <h1>Sign in</h1>
      <p className="muted">Plan and learn FFXIV raid mitigations.</p>
      <div className="login-ctas">
        <button className="cta-discord" onClick={() => oauth('discord')}>
          Sign in with Discord
        </button>
        <button className="cta-google" onClick={() => oauth('google')}>
          Sign in with Google
        </button>
      </div>
      <details className="login-more">
        <summary>More options</summary>
        <form onSubmit={email}>
          <label>
            Email
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            Password
            <input name="password" type="password" autoComplete="current-password" required minLength={8} />
          </label>
          <button type="submit">Sign in with email</button>
        </form>
      </details>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};
