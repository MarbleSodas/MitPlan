'use client';

import { useState } from 'react';
import { supabase } from '../../config/supabase';
import { useNavigate } from '../../lib/navigation';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

export default function ResetPasswordForm() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 6 || password !== confirmPassword) {
      setError(password !== confirmPassword ? 'Passwords do not match.' : 'Use at least 6 characters.');
      return;
    }
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    navigate('/dashboard', { replace: true });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <form onSubmit={submit} className="flex w-full max-w-sm flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-lg sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Set a new password</h1>
        <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="New password" />
        <Input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Confirm password" />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save password'}</Button>
      </form>
    </main>
  );
}
