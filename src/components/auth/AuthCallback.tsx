'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../config/supabase';
import { useNavigate, useSearchParams } from '../../lib/navigation';

const safeNext = (value: string | null) => (
  value && value.startsWith('/') && !value.startsWith('//') ? value : '/dashboard'
);

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState('');

  useEffect(() => {
    const finish = async () => {
      const code = searchParams.get('code');
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) throw exchangeError;
      }
      navigate(safeNext(searchParams.get('next')), { replace: true });
    };
    void finish().catch((callbackError) => {
      setError(callbackError?.message || 'Could not complete sign in.');
    });
  }, [navigate, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      {error || 'Completing sign in...'}
    </div>
  );
}
