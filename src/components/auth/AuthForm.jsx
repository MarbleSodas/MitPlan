import { useState } from 'react';
import styled from 'styled-components';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { auth } from '../../config/firebase';

const AuthContainer = styled.div`
  max-width: 380px;
  margin: 0 auto;
  padding: 1.5rem 1.5rem;
  background: transparent;
  border-radius: 16px;

`;

const Title = styled.h2`
  text-align: center;
  margin: 0 0 1.5rem 0;
  color: ${props => props.theme?.colors?.text || '#333333'};
  font-weight: 700;
  font-size: 1.5rem;
  line-height: 1.2;
  letter-spacing: -0.025em;

`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const Input = styled.input`
  padding: 0.75rem 1rem;
  border: 2px solid ${props => props.theme?.colors?.border || '#e1e5e9'};
  border-radius: 10px;
  font-size: 0.95rem;
  font-weight: 500;
  line-height: 1.5;
  transition: all 0.2s ease;
  background: ${props => props.theme?.colors?.inputBackground || '#ffffff'};
  color: ${props => props.theme?.colors?.text || '#333333'};
  width: 100%;
  box-sizing: border-box;

  &:hover {
    border-color: ${props => props.theme?.colors?.primary || '#3b82f6'};
    box-shadow: 0 0 0 3px ${props => props.theme?.colors?.primary || '#3b82f6'}08;
  }

  &:focus {
    outline: none;
    border-color: ${props => props.theme?.colors?.primary || '#3b82f6'};
    box-shadow: 0 0 0 4px ${props => props.theme?.colors?.primary || '#3b82f6'}20;
    transform: translateY(-1px);
  }

  &::placeholder {
    color: ${props => props.theme?.colors?.textSecondary || '#6b7280'};
    font-weight: 400;
  }

  &:disabled {
    background: ${props => props.theme?.colors?.hoverBackground || '#f9fafb'};
    border-color: ${props => props.theme?.colors?.disabled || '#9ca3af'};
    color: ${props => props.theme?.colors?.disabled || '#9ca3af'};
    cursor: not-allowed;
  }

`;

const Button = styled.button`
  padding: 0.75rem 1.25rem;
  background: ${props => props.theme?.colors?.primary || '#3b82f6'};
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.5;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  letter-spacing: 0.025em;

  &:hover:not(:disabled) {
    background: ${props => props.theme?.colors?.primaryHover || '#2563eb'};
    transform: translateY(-1px);
    box-shadow: 0 8px 25px ${props => props.theme?.colors?.primary || '#3b82f6'}40;
  }

  &:active:not(:disabled) {
    transform: translateY(0);
    box-shadow: 0 4px 15px ${props => props.theme?.colors?.primary || '#3b82f6'}30;
  }

  &:disabled {
    background: ${props => props.theme?.colors?.disabled || '#9ca3af'};
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
    opacity: 0.6;
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 4px ${props => props.theme?.colors?.primary || '#3b82f6'}30;
  }

`;

const SecondaryButton = styled(Button)`
  background: transparent;
  color: ${props => props.theme?.colors?.primary || '#3b82f6'};
  border: 2px solid ${props => props.theme?.colors?.border || '#e1e5e9'};
  font-weight: 500;

  &:hover:not(:disabled) {
    background: ${props => props.theme?.colors?.hoverBackground || '#f9fafb'};
    border-color: ${props => props.theme?.colors?.primary || '#3b82f6'};
    color: ${props => props.theme?.colors?.primary || '#3b82f6'};
    box-shadow: 0 4px 15px ${props => props.theme?.colors?.primary || '#3b82f6'}15;
  }

  &:active:not(:disabled) {
    background: ${props => props.theme?.colors?.primary || '#3b82f6'}10;
  }

  &:disabled {
    background: transparent;
    border-color: ${props => props.theme?.colors?.disabled || '#9ca3af'};
    color: ${props => props.theme?.colors?.disabled || '#9ca3af'};
  }
`;

const ErrorMessage = styled.div`
  color: ${props => props.theme?.colors?.error || '#ef4444'};
  text-align: center;
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  background: ${props => props.theme?.colors?.errorBackground || '#fef2f2'};
  border-radius: 10px;
  border: 1px solid ${props => props.theme?.colors?.errorBorder || '#fecaca'};
  font-weight: 500;
  font-size: 0.875rem;
  line-height: 1.4;
  animation: slideIn 0.3s ease;

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const SuccessMessage = styled.div`
  color: ${props => props.theme?.colors?.success || '#10b981'};
  text-align: center;
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  background: ${props => props.theme?.colors?.successBackground || '#f0fdf4'};
  border-radius: 10px;
  border: 1px solid ${props => props.theme?.colors?.successBorder || '#bbf7d0'};
  font-weight: 500;
  font-size: 0.875rem;
  line-height: 1.4;
  animation: slideIn 0.3s ease;

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const LinkButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.theme?.colors?.primary || '#3b82f6'};
  cursor: pointer;
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 500;
  margin-top: 0.25rem;
  padding: 0.375rem;
  border-radius: 6px;
  transition: all 0.2s ease;
  position: relative;

  &:hover {
    color: ${props => props.theme?.colors?.primaryHover || '#2563eb'};
    background: ${props => props.theme?.colors?.primary || '#3b82f6'}08;
    text-decoration: underline;
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 3px ${props => props.theme?.colors?.primary || '#3b82f6'}30;
  }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
`;

const ButtonGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 0.25rem;
`;

const Divider = styled.div`
  display: flex;
  align-items: center;
  margin: 1rem 0;

  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: ${props => props.theme?.colors?.border || '#e1e5e9'};
  }

  span {
    padding: 0 0.75rem;
    color: ${props => props.theme?.colors?.textSecondary || '#6b7280'};
    font-size: 0.8rem;
    font-weight: 500;
  }
`;

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
    <AuthContainer>
      <Title>{getTitle()}</Title>
      <Form onSubmit={handleSubmit}>
        {mode === 'register' && (
          <FormGroup>
            <Input
              type="text"
              placeholder="Display Name (optional)"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </FormGroup>
        )}

        <FormGroup>
          <Input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </FormGroup>

        {mode !== 'reset' && (
          <FormGroup>
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </FormGroup>
        )}

        {mode === 'register' && (
          <FormGroup>
            <Input
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </FormGroup>
        )}

        <ButtonGroup>
          <Button type="submit" disabled={loading || !isFormValid()}>
            {getButtonText()}
          </Button>

          {mode === 'login' && (
            <>
              <Divider>
                <span>or</span>
              </Divider>
              <SecondaryButton
                type="button"
                onClick={() => setMode('register')}
              >
                Create New Account
              </SecondaryButton>
            </>
          )}

          {mode === 'register' && (
            <>
              <Divider>
                <span>or</span>
              </Divider>
              <SecondaryButton
                type="button"
                onClick={() => setMode('login')}
              >
                Already have an account? Sign In
              </SecondaryButton>
            </>
          )}

          {mode === 'reset' && (
            <SecondaryButton
              type="button"
              onClick={() => setMode('login')}
            >
              Back to Sign In
            </SecondaryButton>
          )}
        </ButtonGroup>

        {mode === 'login' && (
          <LinkButton
            type="button"
            onClick={() => setMode('reset')}
          >
            Forgot Password?
          </LinkButton>
        )}
      </Form>
      
      {error && <ErrorMessage>{error}</ErrorMessage>}
      {success && <SuccessMessage>{success}</SuccessMessage>}
    </AuthContainer>
  );
};

export default AuthForm;
