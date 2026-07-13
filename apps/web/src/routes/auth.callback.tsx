/**
 * OAuth callback. PKCE code-for-session exchange. Architecture §7.7.3, §7.7.4.
 * Caffeine-styled pending + error states with the shadcn Card primitive.
 */
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { AlertCircle, Loader2Icon } from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import { linkIfPossible } from '../lib/account-link.js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Logo } from '@/components/logo.js';

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
      <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-md flex-col justify-center px-6 py-10">
        <Card className="border-destructive/30">
          <CardHeader className="flex flex-col items-center gap-2 text-center">
            <Logo className="text-primary size-8" />
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertCircle /> Sign in failed
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <p role="alert" className="text-muted-foreground text-center text-sm">
              {error}
            </p>
            <Button asChild>
              <a href="/login">Try again</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  return (
    <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-md flex-col items-center justify-center gap-4 px-6 py-10">
      <Logo className="text-primary size-10" />
      <Loader2Icon className="text-muted-foreground size-6 animate-spin" />
      <p className="text-muted-foreground text-sm">Signing you in…</p>
    </div>
  );
};