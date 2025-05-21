import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

const Container = styled.div`
  max-width: 400px;
  width: 100%;
  margin: 0 auto;
  padding: ${props => props.theme.spacing.large};
  background-color: ${props => props.theme.colors.cardBackground};
  border-radius: ${props => props.theme.borderRadius.large};
  box-shadow: ${props => props.theme.shadows.medium};
  text-align: center;
  transition: background-color 0.3s ease, box-shadow 0.3s ease;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.medium};
    max-width: 100%;
  }
`;

const Title = styled.h2`
  margin-bottom: ${props => props.theme.spacing.large};
  color: ${props => props.theme.colors.text};
  font-size: ${props => props.theme.fontSizes.xlarge};
  font-weight: 600;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: ${props => props.theme.fontSizes.large};
    margin-bottom: ${props => props.theme.spacing.medium};
  }
`;

const Message = styled.p`
  margin-bottom: ${props => props.theme.spacing.medium};
  color: ${props => props.theme.colors.text};
  font-size: ${props => props.theme.fontSizes.medium};
  line-height: 1.5;
`;

const ErrorMessage = styled.div`
  color: ${props => props.theme.colors.error};
  font-size: ${props => props.theme.fontSizes.small};
  margin-top: ${props => props.theme.spacing.small};
  padding: ${props => props.theme.spacing.small};
  background-color: ${props => props.theme.mode === 'dark' ? 'rgba(255, 102, 102, 0.1)' : 'rgba(255, 0, 0, 0.05)'};
  border-radius: ${props => props.theme.borderRadius.small};
  border-left: 3px solid ${props => props.theme.colors.error};
  text-align: left;
`;

const SuccessMessage = styled.div`
  color: ${props => props.theme.colors.success};
  font-size: ${props => props.theme.fontSizes.medium};
  margin-top: ${props => props.theme.spacing.medium};
  padding: ${props => props.theme.spacing.medium};
  background-color: ${props => props.theme.mode === 'dark' ? 'rgba(102, 187, 102, 0.1)' : 'rgba(40, 167, 69, 0.05)'};
  border-radius: ${props => props.theme.borderRadius.medium};
  border-left: 3px solid ${props => props.theme.colors.success};
  text-align: center;
`;

const Button = styled.button`
  padding: ${props => props.theme.spacing.medium};
  background-color: ${props => props.theme.colors.primary};
  color: white;
  border: none;
  border-radius: ${props => props.theme.borderRadius.medium};
  cursor: pointer;
  font-weight: 600;
  font-size: ${props => props.theme.fontSizes.medium};
  transition: background-color 0.2s ease, transform 0.1s ease;
  width: 100%;
  margin-top: ${props => props.theme.spacing.medium};

  &:hover {
    background-color: ${props => props.theme.colors.primary};
    transform: translateY(-2px);
    box-shadow: ${props => props.theme.shadows.medium};
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    background-color: ${props => props.theme.mode === 'dark' ? '#444444' : '#cccccc'};
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

const LinkText = styled.p`
  text-align: center;
  margin-top: ${props => props.theme.spacing.medium};
  font-size: ${props => props.theme.fontSizes.medium};
  color: ${props => props.theme.colors.lightText};
`;

const Link = styled.a`
  color: ${props => props.theme.colors.primary};
  text-decoration: none;
  cursor: pointer;
  font-weight: 500;
  transition: color 0.2s ease;

  &:hover {
    color: ${props => props.theme.mode === 'dark' ? '#5aafff' : '#2980b9'};
    text-decoration: underline;
  }
`;

const Input = styled.input`
  padding: ${props => props.theme.spacing.medium};
  width: 100%;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.medium};
  background-color: ${props => props.theme.mode === 'dark' ? '#2a2a2a' : props.theme.colors.cardBackground};
  color: ${props => props.theme.colors.text};
  font-size: ${props => props.theme.fontSizes.medium};
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  box-sizing: border-box;
  margin-bottom: ${props => props.theme.spacing.medium};

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
    box-shadow: ${props => props.theme.shadows.focus};
  }

  &::placeholder {
    color: ${props => props.theme.colors.lightText};
    opacity: 0.7;
  }
`;

const FormGroup = styled.div`
  margin-bottom: ${props => props.theme.spacing.medium};
  text-align: left;
`;

const Label = styled.label`
  display: block;
  margin-bottom: ${props => props.theme.spacing.small};
  color: ${props => props.theme.colors.text};
  font-size: ${props => props.theme.fontSizes.medium};
  font-weight: 500;
`;

const PasswordReset = () => {
  const { requestPasswordReset, resetPassword, error } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resetError, setResetError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [token, setToken] = useState('');
  const [mode, setMode] = useState('request'); // 'request' or 'reset'
  
  const navigate = useNavigate();
  const location = useLocation();
  
  // Check for token in URL
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tokenParam = searchParams.get('token');
    
    if (tokenParam) {
      setToken(tokenParam);
      setMode('reset');
    }
  }, [location]);
  
  const handleRequestReset = async (e) => {
    e.preventDefault();
    
    if (!email) {
      setResetError('Please enter your email');
      return;
    }
    
    try {
      setLoading(true);
      setResetError('');
      
      // Request password reset
      await requestPasswordReset(email);
      
      // Show success message
      setSuccess(true);
      
      // Clear form
      setEmail('');
    } catch (error) {
      setResetError(error.response?.data?.message || 'Failed to request password reset');
    } finally {
      setLoading(false);
    }
  };
  
  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    if (!password) {
      setResetError('Please enter a new password');
      return;
    }
    
    if (password !== confirmPassword) {
      setResetError('Passwords do not match');
      return;
    }
    
    try {
      setLoading(true);
      setResetError('');
      
      // Reset password
      await resetPassword(token, password);
      
      // Show success message
      setSuccess(true);
      
      // Clear form
      setPassword('');
      setConfirmPassword('');
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error) {
      setResetError(error.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };
  
  const handleLoginClick = () => {
    navigate('/login');
  };
  
  if (mode === 'request') {
    // Request password reset view
    return (
      <Container>
        <Title>Reset Password</Title>
        
        {success ? (
          <>
            <SuccessMessage>
              Password reset instructions have been sent to your email. Please check your inbox.
            </SuccessMessage>
            
            <LinkText>
              <Link onClick={handleLoginClick}>Back to Login</Link>
            </LinkText>
          </>
        ) : (
          <>
            <Message>
              Enter your email address below to receive a password reset link.
            </Message>
            
            <form onSubmit={handleRequestReset}>
              <FormGroup>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                />
              </FormGroup>
              
              <Button type="submit" disabled={loading}>
                {loading ? 'Sending...' : 'Request Password Reset'}
              </Button>
              
              {(resetError || error) && (
                <ErrorMessage>{resetError || error}</ErrorMessage>
              )}
            </form>
            
            <LinkText>
              <Link onClick={handleLoginClick}>Back to Login</Link>
            </LinkText>
          </>
        )}
      </Container>
    );
  }
  
  // Reset password view
  return (
    <Container>
      <Title>Reset Password</Title>
      
      {success ? (
        <>
          <SuccessMessage>
            Your password has been reset successfully! You will be redirected to the login page.
          </SuccessMessage>
          
          <LinkText>
            <Link onClick={handleLoginClick}>Back to Login</Link>
          </LinkText>
        </>
      ) : (
        <>
          <Message>
            Enter your new password below.
          </Message>
          
          <form onSubmit={handleResetPassword}>
            <FormGroup>
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
                required
              />
            </FormGroup>
            
            <FormGroup>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
              />
            </FormGroup>
            
            <Button type="submit" disabled={loading}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </Button>
            
            {(resetError || error) && (
              <ErrorMessage>{resetError || error}</ErrorMessage>
            )}
          </form>
        </>
      )}
    </Container>
  );
};

export default PasswordReset;
