import { useState, useLayoutEffect, useRef } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { auth } from '../../config/firebase';
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

  const FIREBASE_ERROR_MAP = {
    'auth/user-not-found': { field: 'email', message: 'No account found with this email address' },
    'auth/invalid-email': { field: 'email', message: 'No account found with this email address' },
    'auth/email-already-in-use': { field: 'email', message: 'An account with this email already exists' },
    'auth/wrong-password': { field: 'password', message: 'Incorrect password' },
    'auth/weak-password': { field: 'password', message: 'Password is too weak. Use at least 6 characters' },
    'auth/invalid-credential': { field: 'both', message: 'Invalid email or password' },
    'auth/too-many-requests': { field: 'general', message: 'Too many attempts. Please try again later' },
    'auth/network-request-failed': { field: 'general', message: 'Network error. Check your connection' },
  };

  const parseFirebaseError = (err) => {
    const errorCode = err.code || '';
    return FIREBASE_ERROR_MAP[errorCode] || { field: 'general', message: err.message || 'An error occurred. Please try again' };
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

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);

        if (displayName.trim()) {
          await updateProfile(userCredential.user, {
            displayName: displayName.trim()
          });
        }

        onSuccess?.(userCredential.user);
      } else if (mode === 'login') {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        onSuccess?.(userCredential.user);
      } else if (mode === 'reset') {
        await sendPasswordResetEmail(auth, email);
        setSuccess('Password reset email sent! Check your inbox.');
      }
    } catch (err) {
      handleFieldError(parseFirebaseError(err));
    } finally {
      setLoading(false);
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
    <div className="max-w-[420px] mx-auto p-8 rounded-3xl bg-card shadow-2xl border border-border mt-14">
      <h2 className="text-center mb-8 text-foreground font-bold text-3xl leading-tight tracking-tight">{getTitle()}</h2>
      <form onSubmit={handleSubmit}>
        <div
          ref={containerRef}
          style={{ height: containerHeight, overflow: 'hidden', transition: 'height 300ms cubic-bezier(0.2, 0.8, 0.2, 1)', willChange: 'height' }}
        >
          <div ref={contentRef} key={mode} className="flex flex-col gap-4">
            {mode === 'register' && (
              <div className="flex flex-col gap-2">
                <Label className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Display Name
                  <span className="text-xs font-normal text-muted-foreground ml-auto">Optional</span>
                </Label>
                <Input
                  type="text"
                  placeholder="How should we call you?"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
                <p className="text-xs text-muted-foreground -mt-1">
                  This will be visible to others in shared plans
                </p>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Input
                className={cn(emailError && 'ring-2 ring-destructive/50 border-destructive')}
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError('');
                }}
                required
              />
              {emailError && (
                <div className="flex items-center gap-1.5 text-xs font-medium text-destructive animate-fade-in">
                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span><strong>Email:</strong> {emailError}</span>
                </div>
              )}
            </div>

            {mode !== 'reset' && (
              <div className="flex flex-col gap-1.5">
                <Input
                  className={cn(passwordError && 'ring-2 ring-destructive/50 border-destructive')}
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) setPasswordError('');
                  }}
                  required
                />
                {passwordError && (
                  <div className="flex items-center gap-1.5 text-xs font-medium text-destructive animate-fade-in">
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
                <Input
                  type="password"
                  placeholder="Confirm Password"
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
                className="bg-gradient-to-r from-primary to-chart-2 hover:shadow-lg hover:shadow-primary/30"
                size="lg"
              >
                {getButtonText()}
              </Button>

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
                    onClick={() => animateToMode('login')}
                  >
                    Already have an account? Sign In
                  </Button>
                </>
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
        <div className="mt-5 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3.5 text-sm font-semibold text-destructive animate-fade-in">
          {error}
        </div>
      )}
      {success && (
        <div className="mt-5 rounded-xl border border-[oklch(0.623_0.188_145.28)]/20 bg-[oklch(0.623_0.188_145.28)]/10 px-4 py-3.5 text-sm font-semibold text-[oklch(0.623_0.188_145.28)] animate-fade-in">
          {success}
        </div>
      )}
    </div>
  );
};

export default AuthForm;
