/**
 * Login page. Architecture §7.7.1 (provider matrix).
 * Discord primary CTA, Google secondary, email/password tertiary.
 * Caffeine-styled — Discord = primary (honey amber on dark, roasted
 * brown on light), Google = outline, email = muted.
 */
import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Mail, Loader2Icon } from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/logo.js';

const getSafeNext = (next: string | null) =>
  next?.startsWith('/') && !next.startsWith('//') ? next : '/plan';

const GoogleMark = () => (
  <svg className="size-4" viewBox="0 0 48 48" aria-hidden>
    <path
      fill="#FFC107"
      d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
    />
    <path
      fill="#FF3D00"
      d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
    />
    <path
      fill="#4CAF50"
      d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
    />
    <path
      fill="#1976D2"
      d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
    />
  </svg>
);

const DiscordMark = () => (
  <svg className="size-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M19.27 5.33C17.94 4.71 16.5 4.26 15 4a.09.09 0 0 0-.07.03c-.18.33-.39.76-.53 1.09a16.09 16.09 0 0 0-4.8 0c-.14-.34-.35-.76-.54-1.09c-.01-.02-.04-.03-.07-.03c-1.5.26-2.93.71-4.27 1.33c-.01 0-.02.01-.03.02c-2.72 4.07-3.47 8.03-3.1 11.95c0 .02.01.04.03.05c1.8 1.32 3.53 2.12 5.24 2.65c.03.01.06 0 .07-.02c.4-.55.76-1.13 1.07-1.74c.02-.04 0-.08-.04-.09c-.57-.22-1.11-.48-1.64-.78c-.04-.02-.04-.08-.01-.11c.11-.08.22-.17.33-.25c.02-.02.05-.02.07-.01c3.44 1.57 7.15 1.57 10.55 0c.02-.01.05-.01.07.01c.11.09.22.17.33.26c.04.03.04.09-.01.11c-.52.31-1.07.56-1.64.78c-.04.01-.05.06-.04.09c.32.61.68 1.19 1.07 1.74c.03.01.06.02.09.01c1.72-.53 3.45-1.33 5.25-2.65c.02-.01.03-.03.03-.05c.44-4.53-.73-8.46-3.1-11.95c-.01-.01-.02-.02-.04-.02zM8.52 14.91c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12c0 1.17-.84 2.12-1.89 2.12zm6.97 0c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12c0 1.17-.83 2.12-1.89 2.12z" />
  </svg>
);

export const LoginPage = () => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const next = getSafeNext(search.get('next'));

  const oauth = async (provider: 'discord' | 'google') => {
    setError(null);
    setLoading(true);
    try {
      const { error: e } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (e) setError(e.message);
    } catch {
      setError('Unable to start sign-in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const email = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      const { error: e2 } = await supabase.auth.signInWithPassword({
        email: String(form.get('email') ?? ''),
        password: String(form.get('password') ?? ''),
      });
      if (e2) setError(e2.message);
      else navigate(next, { replace: true });
    } catch {
      setError('Unable to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-sm flex-col justify-center gap-8 px-6 py-10">
      <header className="flex flex-col items-center gap-3">
        <Logo className="text-primary size-10" />
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-muted-foreground text-center text-sm">
          Sign in to plan FFXIV raid mitigations with your static group.
        </p>
      </header>

      <div className="flex flex-col gap-2">
        <Button
          size="lg"
          className="w-full"
          onClick={() => oauth('discord')}
          disabled={loading}
        >
          <DiscordMark /> Continue with Discord
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="w-full"
          onClick={() => oauth('google')}
          disabled={loading}
        >
          <GoogleMark /> Continue with Google
        </Button>
      </div>

      <details className="group">
        <summary className="text-muted-foreground hover:text-foreground cursor-pointer text-center text-xs underline-offset-4 transition-colors hover:underline">
          Or sign in with email
        </summary>
        <form onSubmit={email} className="mt-4 flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              minLength={8}
            />
          </div>
          <Button type="submit" variant="secondary" disabled={loading}>
            {loading ? <Loader2Icon className="animate-spin" /> : <Mail />}
            {loading ? 'Signing in…' : 'Sign in with email'}
          </Button>
        </form>
      </details>

      {error && (
        <p
          role="alert"
          className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-center text-sm"
        >
          {error}
        </p>
      )}
    </div>
  );
};
