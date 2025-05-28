// Authentication components
export { default as AuthModal } from './AuthModal';
export { default as AuthButton } from './AuthButton';
export { default as LoginForm } from './LoginForm';
export { default as RegisterForm } from './RegisterForm';
export { default as ForgotPasswordForm } from './ForgotPasswordForm';
export { default as GoogleLoginButton } from './GoogleLoginButton';
export { default as UserProfile } from './UserProfile';
export { default as AccountSettings } from './AccountSettings';

// Re-export auth context hook for convenience
export { useAuth } from '../../contexts/AuthContext';
