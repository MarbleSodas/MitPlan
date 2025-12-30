import { useState, useLayoutEffect, useRef } from 'react';

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { auth } from '../../config/firebase';
import { INPUT, BUTTON } from '../../styles/designSystem';











const AuthForm = ({ onSuccess }) => {
  const [mode, setMode] = useState('login'); // 'login', 'register', 'reset'
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
    <div className="max-w-[420px] mx-auto p-8 rounded-3xl glass-effect shadow-2xl border border-[var(--color-borderLight)] backdrop-blur-xl mt-14">
      <h2 className="text-center mb-8 text-[var(--color-text)] font-bold text-3xl leading-tight tracking-tight">{getTitle()}</h2>
      <form onSubmit={handleSubmit}>
        <div
          ref={containerRef}
          style={{ height: containerHeight, overflow: 'hidden', transition: 'height 300ms cubic-bezier(0.2, 0.8, 0.2, 1)', willChange: 'height' }}
        >
          <div ref={contentRef} key={mode} className="flex flex-col gap-4">
        {mode === 'register' && (
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text)]">
              <svg className="w-4 h-4 text-[var(--color-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Display Name
              <span className="text-xs font-normal text-[var(--color-textSecondary)] ml-auto">Optional</span>
            </label>
            <input className={INPUT.medium}
              type="text"
              placeholder="How should we call you?"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <p className="text-xs text-[var(--color-textSecondary)] -mt-1">
              This will be visible to others in shared plans
            </p>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <input className={`${INPUT.medium} transition-all duration-200 ${emailError ? 'ring-2 ring-red-400/50 border-red-400 dark:ring-red-500/40 dark:border-red-500' : ''}`}
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
            <div className="flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400 animate-fade-in">
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span><strong>Email:</strong> {emailError}</span>
            </div>
          )}
        </div>

        {mode !== 'reset' && (
          <div className="flex flex-col gap-1.5">
            <input className={`${INPUT.medium} transition-all duration-200 ${passwordError ? 'ring-2 ring-red-400/50 border-red-400 dark:ring-red-500/40 dark:border-red-500' : ''}`}
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
              <div className="flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400 animate-fade-in">
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
            <input className={INPUT.medium}
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
        )}

        <div className="flex flex-col gap-3 mt-2">
          <button
            type="submit"
            disabled={loading || !isFormValid()}
            className={`${BUTTON.primary.large} bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] hover:shadow-lg hover:shadow-[var(--color-primary)]/30 transition-all duration-300`}
          >
            {getButtonText()}
          </button>

          {mode === 'login' && (
            <>
              <div className="flex items-center gap-3 my-5">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[var(--color-border)] to-transparent" />
                <span className="px-3 text-xs font-semibold text-[var(--color-textSecondary)] uppercase tracking-wider">or</span>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[var(--color-border)] to-transparent" />
              </div>
              <button
                type="button"
                onClick={() => animateToMode('register')}
                className={`${BUTTON.secondary.large} hover:shadow-md transition-all duration-300`}
              >
                Create New Account
              </button>
            </>
          )}

          {mode === 'register' && (
            <>
              <div className="flex items-center gap-3 my-5">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[var(--color-border)] to-transparent" />
                <span className="px-3 text-xs font-semibold text-[var(--color-textSecondary)] uppercase tracking-wider">or</span>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[var(--color-border)] to-transparent" />
              </div>
              <button
                type="button"
                onClick={() => animateToMode('login')}
                className="min-h-11 px-5 py-3 rounded-lg font-medium border-2 border-[var(--color-border)] text-[var(--color-primary)] hover:bg-[var(--select-bg)] hover:border-[var(--color-primary)] transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60"
              >
                Already have an account? Sign In
              </button>
            </>
          )}

          {mode === 'reset' && (
            <button
              type="button"
              onClick={() => animateToMode('login')}
              className="min-h-11 px-5 py-3 rounded-lg font-medium border-2 border-[var(--color-border)] text-[var(--color-primary)] hover:bg-[var(--select-bg)] hover:border-[var(--color-primary)] transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60"
            >
              Back to Sign In
            </button>
          )}
        </div>

        {mode === 'login' && (
          <button
            type="button"
            onClick={() => animateToMode('reset')}
            className="mt-2 inline-flex w-fit items-center text-sm font-semibold text-[var(--color-primary)] hover:text-[var(--color-accent)] hover:underline rounded-md px-2 py-1.5 focus:outline-none focus:shadow-[0_0_0_3px_rgba(99,102,241,0.2)] transition-colors duration-200"
          >
            Forgot Password?
          </button>
        )}
          </div>
        </div>
      </form>

      {error && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800/50 px-4 py-3.5 text-sm font-semibold text-red-600 dark:text-red-400 shadow-sm animate-fade-in">
          {error}
        </div>
      )}
      {success && (
        <div className="mt-5 rounded-xl border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800/50 px-4 py-3.5 text-sm font-semibold text-green-700 dark:text-green-400 shadow-sm animate-fade-in">
          {success}
        </div>
      )}
    </div>
  );
};

export default AuthForm;
