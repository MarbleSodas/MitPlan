import { useState, useLayoutEffect, useRef } from 'react';
import { supabase } from '../../config/supabase';
import { toAppUser } from '../../types/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const AuthForm = ({ onSuccess }) => {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [success, setSuccess] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

  const AUTH_ERROR_MAP = {
    invalid_credentials: {
      field: 'general',
      message: 'The email or password is incorrect.',
    },
    email_address_invalid: { field: 'email', message: 'Enter a valid email address' },
    user_already_exists: { field: 'email', message: 'An account with this email already exists' },
    email_exists: { field: 'email', message: 'An account with this email already exists' },
    weak_password: { field: 'password', message: 'Password is too weak. Use at least 6 characters' },
    over_email_send_rate_limit: { field: 'general', message: 'Too many attempts. Please try again later' },
  };

  const parseAuthError = (err) => {
    const errorCode = err.code || '';
    return AUTH_ERROR_MAP[errorCode] || { field: 'general', message: err.message || 'An error occurred. Please try again' };
  };

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const isFormValid = () => {
    if (!email.trim() || !isValidEmail(email)) return false;

    if (mode === 'reset') {
      return true;
    }

    if (!password.trim() || password.length < 6) return false;

    if (mode === 'register') {
      if (!confirmPassword.trim()) return false;
      if (password !== confirmPassword) return false;
    }

    return true;
  };

  const containerRef = useRef(null);
  const contentRef = useRef(null);
  const prevHeightRef = useRef(null);
  const [containerHeight, setContainerHeight] = useState('auto');

  const animateToMode = (nextMode) => {
    const el = containerRef.current;
    if (el) {
      const h = el.offsetHeight;
      prevHeightRef.current = h;
      setContainerHeight(h);
    }
    setMode(nextMode);
  };

  useLayoutEffect(() => {
    const containerEl = containerRef.current;
    const contentEl = contentRef.current;
    if (!containerEl || !contentEl) return;

    const newHeight = contentEl.offsetHeight;

    if (prevHeightRef.current != null) {
      requestAnimationFrame(() => {
        setContainerHeight(newHeight);
      });

      const onEnd = () => {
        setContainerHeight('auto');
        prevHeightRef.current = null;
        containerEl.removeEventListener('transitionend', onEnd);
      };
      containerEl.addEventListener('transitionend', onEnd);
    } else {
      setContainerHeight('auto');
    }
  }, [mode]);

  const clearFieldErrors = () => {
    setEmailError('');
    setPasswordError('');
    setError('');
  };

  const handleFieldError = (parsedError) => {
    const { field, message } = parsedError;
    
    if (field === 'email') {
      setEmailError(message);
    } else if (field === 'password') {
      setPasswordError(message);
    } else if (field === 'both') {
      setEmailError(message);
      setPasswordError(message);
    } else {
      setError(message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    clearFieldErrors();
    setSuccess('');

    try {
      if (mode === 'register') {
        if (password !== confirmPassword) {
          setPasswordError('Passwords do not match');
          return;
        }
        if (password.length < 6) {
          setPasswordError('Password must be at least 6 characters');
          return;
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: displayName.trim() ? { display_name: displayName.trim() } : undefined,
          },
        });
        if (signUpError) throw signUpError;
        onSuccess?.(toAppUser(data.user));
      } else if (mode === 'login') {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        onSuccess?.(toAppUser(data.user));
      } else if (mode === 'reset') {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/reset-password`,
        });
        if (resetError) throw resetError;
        setSuccess('Password reset email sent! Check your inbox.');
      }
    } catch (err) {
      handleFieldError(parseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    clearFieldErrors();
    setSuccess('');

    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        },
      });
      if (oauthError) throw oauthError;
    } catch (err) {
      handleFieldError(parseAuthError(err));
    } finally {
      setGoogleLoading(false);
    }
  };

  const getTitle = () => {
    switch (mode) {
      case 'register': return 'Create Account';
      case 'reset': return 'Reset Password';
      default: return 'Sign In';
    }
  };

  const getButtonText = () => {
    if (loading) return 'Loading...';
    switch (mode) {
      case 'register': return 'Create Account';
      case 'reset': return 'Send Reset Email';
      default: return 'Sign In';
    }
  };

  return (
    <div className="mx-auto w-full max-w-[400px] rounded-xl border border-border bg-card p-5 shadow-lg sm:p-8">
      <h2 className="mb-6 text-center text-2xl font-semibold leading-tight tracking-tight text-foreground">{getTitle()}</h2>
      <form onSubmit={handleSubmit}>
        <div
          ref={containerRef}
          style={{ height: containerHeight, overflow: 'hidden', transition: 'height 300ms cubic-bezier(0.2, 0.8, 0.2, 1)', willChange: 'height' }}
        >
          <div ref={contentRef} key={mode} className="flex flex-col gap-4">
            {mode === 'register' && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="auth-display-name" className="flex items-center gap-2">
                  Display Name
                  <span className="text-xs font-normal text-muted-foreground ml-auto">Optional</span>
                </Label>
                <Input
                  type="text"
                  id="auth-display-name"
                  name="displayName"
                  autoComplete="name"
                  placeholder="Example: Eugene"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
                <p className="text-xs text-muted-foreground -mt-1">
                  This will be visible to others in shared plans
                </p>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="auth-email">Email address</Label>
              <Input
                id="auth-email"
                name="email"
                autoComplete="email"
                className={cn(emailError && 'ring-2 ring-destructive/50 border-destructive')}
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError('');
                }}
                required
                aria-invalid={Boolean(emailError)}
                aria-describedby={emailError ? 'auth-email-error' : undefined}
              />
              {emailError && (
                <div id="auth-email-error" role="alert" className="flex items-center gap-1.5 text-xs font-medium text-destructive animate-fade-in">
                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span><strong>Email:</strong> {emailError}</span>
                </div>
              )}
            </div>

            {mode !== 'reset' && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="auth-password">Password</Label>
                <Input
                  id="auth-password"
                  name="password"
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  className={cn(passwordError && 'ring-2 ring-destructive/50 border-destructive')}
                  type="password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) setPasswordError('');
                  }}
                  required
                  aria-invalid={Boolean(passwordError)}
                  aria-describedby={passwordError ? 'auth-password-error' : undefined}
                />
                {passwordError && (
                  <div id="auth-password-error" role="alert" className="flex items-center gap-1.5 text-xs font-medium text-destructive animate-fade-in">
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span><strong>Password:</strong> {passwordError}</span>
                  </div>
                )}
              </div>
            )}

            {mode === 'register' && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="auth-confirm-password">Confirm password</Label>
                <Input
                  id="auth-confirm-password"
                  name="confirmPassword"
                  autoComplete="new-password"
                  type="password"
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="flex flex-col gap-3 mt-2">
              <Button
                type="submit"
                disabled={loading || !isFormValid()}
                size="lg"
              >
                {getButtonText()}
              </Button>

              {(mode === 'login' || mode === 'register') && (
                <>
                  <div className="flex items-center gap-3 my-3">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
                    <span className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">or continue with</span>
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    disabled={googleLoading}
                    onClick={handleGoogleSignIn}
                    className="flex items-center justify-center gap-3 hover:bg-accent hover:text-accent-foreground"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    {googleLoading ? 'Signing in...' : 'Google'}
                  </Button>
                </>
              )}

              {mode === 'login' && (
                <>
                  <div className="flex items-center gap-3 my-5">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
                    <span className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">or</span>
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={() => animateToMode('register')}
                  >
                    Create New Account
                  </Button>
                </>
              )}

              {mode === 'register' && (
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => animateToMode('login')}
                  className="mt-2"
                >
                  Already have an account? Sign In
                </Button>
              )}

              {mode === 'reset' && (
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => animateToMode('login')}
                >
                  Back to Sign In
                </Button>
              )}
            </div>

            {mode === 'login' && (
              <Button
                type="button"
                variant="link"
                className="mt-2 w-fit"
                onClick={() => animateToMode('reset')}
              >
                Forgot Password?
              </Button>
            )}
          </div>
        </div>
      </form>

      {error && (
        <div role="alert" className="mt-5 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3.5 text-sm font-semibold text-destructive animate-fade-in">
          {error}
        </div>
      )}
      {success && (
        <div role="status" className="mt-5 rounded-xl border border-success/20 bg-success/10 px-4 py-3.5 text-sm font-semibold text-success animate-fade-in">
          {success}
        </div>
      )}
    </div>
  );
};

export default AuthForm;
