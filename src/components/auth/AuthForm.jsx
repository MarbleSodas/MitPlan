import { useState, useLayoutEffect, useRef } from 'react';

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { auth } from '../../config/firebase';











const AuthForm = ({ onSuccess }) => {
  const [mode, setMode] = useState('login'); // 'login', 'register', 'reset'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Email validation regex
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Form validation
  const isFormValid = () => {
    if (!email.trim() || !isValidEmail(email)) return false;

    if (mode === 'reset') {
      return true; // Only email required for password reset
    }

    if (!password.trim() || password.length < 6) return false;

    if (mode === 'register') {
      if (!confirmPassword.trim()) return false;
      if (password !== confirmPassword) return false;
    }

    return true;
  };
  // Height transition for mode changes
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
      // Animate from previous height to new height
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


  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (mode === 'register') {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters');
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);

        // Update display name if provided
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
      setError(err.message);
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
    <div className="max-w-[380px] mx-auto p-6 rounded-2xl">
      <h2 className="text-center mb-6 text-[var(--color-text)] font-bold text-2xl leading-tight tracking-tight">{getTitle()}</h2>
      <form onSubmit={handleSubmit}>
        <div
          ref={containerRef}
          style={{ height: containerHeight, overflow: 'hidden', transition: 'height 300ms cubic-bezier(0.2, 0.8, 0.2, 1)', willChange: 'height' }}
        >
          <div ref={contentRef} key={mode} className="flex flex-col gap-4">
        {mode === 'register' && (
          <div className="flex flex-col gap-1.5">
            <input className="w-full px-4 py-3 border-2 rounded-[10px] text-[0.95rem] font-medium bg-[var(--color-cardBackground)] text-[var(--color-text)] border-[var(--color-border)] transition hover:border-[var(--color-primary)] hover:shadow-[0_0_0_3px_rgba(51,153,255,0.08)] focus:outline-none focus:border-[var(--color-primary)] focus:shadow-[0_0_0_4px_rgba(51,153,255,0.2)] disabled:opacity-60 placeholder:text-[var(--color-textSecondary)] placeholder:font-normal"
              type="text"
              placeholder="Display Name (optional)"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <input className="w-full px-4 py-3 border-2 rounded-[10px] text-[0.95rem] font-medium bg-[var(--color-cardBackground)] text-[var(--color-text)] border-[var(--color-border)] transition hover:border-[var(--color-primary)] hover:shadow-[0_0_0_3px_rgba(51,153,255,0.08)] focus:outline-none focus:border-[var(--color-primary)] focus:shadow-[0_0_0_4px_rgba(51,153,255,0.2)] disabled:opacity-60 placeholder:text-[var(--color-textSecondary)] placeholder:font-normal"
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        {mode !== 'reset' && (
          <div className="flex flex-col gap-1.5">
            <input className="w-full px-4 py-3 border-2 rounded-[10px] text-[0.95rem] font-medium bg-[var(--color-cardBackground)] text-[var(--color-text)] border-[var(--color-border)] transition hover:border-[var(--color-primary)] hover:shadow-[0_0_0_3px_rgba(51,153,255,0.08)] focus:outline-none focus:border-[var(--color-primary)] focus:shadow-[0_0_0_4px_rgba(51,153,255,0.2)] disabled:opacity-60 placeholder:text-[var(--color-textSecondary)] placeholder:font-normal"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        )}

        {mode === 'register' && (
          <div className="flex flex-col gap-1.5">
            <input className="w-full px-4 py-3 border-2 rounded-[10px] text-[0.95rem] font-medium bg-[var(--color-cardBackground)] text-[var(--color-text)] border-[var(--color-border)] transition hover:border-[var(--color-primary)] hover:shadow-[0_0_0_3px_rgba(51,153,255,0.08)] focus:outline-none focus:border-[var(--color-primary)] focus:shadow-[0_0_0_4px_rgba(51,153,255,0.2)] disabled:opacity-60 placeholder:text-[var(--color-textSecondary)] placeholder:font-normal"
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
        )}

        <div className="flex flex-col gap-3 mt-1">
          <button type="submit" disabled={loading || !isFormValid()} className="min-h-11 px-5 py-3 rounded-[10px] font-semibold bg-[var(--color-primary)] text-[var(--color-buttonText)] hover:brightness-110 transition shadow-sm hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:shadow-[0_0_0_4px_rgba(51,153,255,0.2)]">
            {getButtonText()}
          </button>

          {mode === 'login' && (
            <>
              <div className="flex items-center gap-3 my-4">
                <div className="h-px flex-1 bg-[var(--color-border)]" />
                <span className="px-2 text-xs font-medium text-[var(--color-textSecondary)]">or</span>
                <div className="h-px flex-1 bg-[var(--color-border)]" />
              </div>
              <button
                type="button"
                onClick={() => animateToMode('register')}
                className="min-h-11 px-5 py-3 rounded-[10px] font-medium border-2 border-[var(--color-border)] text-[var(--color-primary)] hover:bg-[var(--select-bg)] transition hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60"
              >
                Create New Account
              </button>
            </>
          )}

          {mode === 'register' && (
            <>
              <div className="flex items-center gap-3 my-4">
                <div className="h-px flex-1 bg-[var(--color-border)]" />
                <span className="px-2 text-xs font-medium text-[var(--color-textSecondary)]">or</span>
                <div className="h-px flex-1 bg-[var(--color-border)]" />
              </div>
              <button
                type="button"
                onClick={() => animateToMode('login')}
                className="min-h-11 px-5 py-3 rounded-[10px] font-medium border-2 border-[var(--color-border)] text-[var(--color-primary)] hover:bg-[var(--select-bg)] transition hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60"
              >
                Already have an account? Sign In
              </button>
            </>
          )}

          {mode === 'reset' && (
            <button
              type="button"
              onClick={() => animateToMode('login')}
              className="min-h-11 px-5 py-3 rounded-[10px] font-medium border-2 border-[var(--color-border)] text-[var(--color-primary)] hover:bg-[var(--select-bg)] transition hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60"
            >
              Back to Sign In
            </button>
          )}
        </div>

        {mode === 'login' && (
          <button
            type="button"
            onClick={() => animateToMode('reset')}
            className="mt-1 inline-flex w-fit items-center text-sm font-medium text-[var(--color-primary)] hover:brightness-110 hover:underline rounded-md px-1.5 py-1 focus:outline-none focus:shadow-[0_0_0_3px_rgba(51,153,255,0.2)]"
          >
            Forgot Password?
          </button>
        )}
          </div>
        </div>
      </form>

      {error && (
        <div className="mt-4 rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-500">
          {error}
        </div>
      )}
      {success && (
        <div className="mt-3 rounded-[10px] border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-600">
          {success}
        </div>
      )}
    </div>
  );
};

export default AuthForm;
