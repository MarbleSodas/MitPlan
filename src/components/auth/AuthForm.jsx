import { useState } from 'react';

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
      <h2 className="text-center mb-6 text-gray-900 dark:text-gray-100 font-bold text-2xl leading-tight tracking-tight">{getTitle()}</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {mode === 'register' && (
          <div className="flex flex-col gap-1.5">
            <input className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-[10px] text-[0.95rem] font-medium bg-white dark:bg-neutral-900 text-gray-800 dark:text-gray-100 transition hover:border-blue-500 hover:shadow-[0_0_0_3px_rgba(59,130,246,0.03)] focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_4px_rgba(59,130,246,0.125)] disabled:bg-gray-50 disabled:border-gray-400 disabled:text-gray-400 placeholder:text-gray-500 placeholder:font-normal"
              type="text"
              placeholder="Display Name (optional)"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <input className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-[10px] text-[0.95rem] font-medium bg-white dark:bg-neutral-900 text-gray-800 dark:text-gray-100 transition hover:border-blue-500 hover:shadow-[0_0_0_3px_rgba(59,130,246,0.03)] focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_4px_rgba(59,130,246,0.125)] disabled:bg-gray-50 disabled:border-gray-400 disabled:text-gray-400 placeholder:text-gray-500 placeholder:font-normal"
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        {mode !== 'reset' && (
          <div className="flex flex-col gap-1.5">
            <input className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-[10px] text-[0.95rem] font-medium bg-white dark:bg-neutral-900 text-gray-800 dark:text-gray-100 transition hover:border-blue-500 hover:shadow-[0_0_0_3px_rgba(59,130,246,0.03)] focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_4px_rgba(59,130,246,0.125)] disabled:bg-gray-50 disabled:border-gray-400 disabled:text-gray-400 placeholder:text-gray-500 placeholder:font-normal"
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
            <input className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-[10px] text-[0.95rem] font-medium bg-white dark:bg-neutral-900 text-gray-800 dark:text-gray-100 transition hover:border-blue-500 hover:shadow-[0_0_0_3px_rgba(59,130,246,0.03)] focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_4px_rgba(59,130,246,0.125)] disabled:bg-gray-50 disabled:border-gray-400 disabled:text-gray-400 placeholder:text-gray-500 placeholder:font-normal"
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
        )}

        <div className="flex flex-col gap-3 mt-1">
          <button type="submit" disabled={loading || !isFormValid()} className="min-h-11 px-5 py-3 rounded-[10px] text-white font-semibold bg-blue-500 hover:bg-blue-600 transition shadow-sm hover:-translate-y-0.5 active:translate-y-0 disabled:bg-gray-400 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:shadow-[0_0_0_4px_rgba(59,130,246,0.2)]">
            {getButtonText()}
          </button>

          {mode === 'login' && (
            <>
              <div className="flex items-center gap-3 my-4">
                <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
                <span className="px-2 text-xs font-medium text-gray-500 dark:text-gray-400">or</span>
                <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
              </div>
              <button
                type="button"
                onClick={() => setMode('register')}
                className="min-h-11 px-5 py-3 rounded-[10px] font-medium border-2 border-gray-200 dark:border-gray-700 text-blue-600 hover:bg-gray-50 dark:hover:bg-neutral-800 transition hover:-translate-y-0.5 active:translate-y-0 disabled:text-gray-400 disabled:border-gray-400"
              >
                Create New Account
              </button>
            </>
          )}

          {mode === 'register' && (
            <>
              <div className="flex items-center gap-3 my-4">
                <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
                <span className="px-2 text-xs font-medium text-gray-500 dark:text-gray-400">or</span>
                <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
              </div>
              <button
                type="button"
                onClick={() => setMode('login')}
                className="min-h-11 px-5 py-3 rounded-[10px] font-medium border-2 border-gray-200 dark:border-gray-700 text-blue-600 hover:bg-gray-50 dark:hover:bg-neutral-800 transition hover:-translate-y-0.5 active:translate-y-0 disabled:text-gray-400 disabled:border-gray-400"
              >
                Already have an account? Sign In
              </button>
            </>
          )}

          {mode === 'reset' && (
            <button
              type="button"
              onClick={() => setMode('login')}
              className="min-h-11 px-5 py-3 rounded-[10px] font-medium border-2 border-gray-200 dark:border-gray-700 text-blue-600 hover:bg-gray-50 dark:hover:bg-neutral-800 transition hover:-translate-y-0.5 active:translate-y-0 disabled:text-gray-400 disabled:border-gray-400"
            >
              Back to Sign In
            </button>
          )}
        </div>

        {mode === 'login' && (
          <button
            type="button"
            onClick={() => setMode('reset')}
            className="mt-1 inline-flex w-fit items-center text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline rounded-md px-1.5 py-1 focus:outline-none focus:shadow-[0_0_0_3px_rgba(59,130,246,0.2)]"
          >
            Forgot Password?
          </button>
        )}
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
