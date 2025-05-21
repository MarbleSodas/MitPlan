import React, { useState } from 'react';
import styled from 'styled-components';
import { useAuth } from '../../contexts/AuthContext';

const FormContainer = styled.div`
  max-width: 400px;
  width: 100%;
  margin: 0 auto;
  padding: ${props => props.theme.spacing.large};
  background-color: ${props => props.theme.colors.cardBackground};
  border-radius: ${props => props.theme.borderRadius.large};
  box-shadow: ${props => props.theme.shadows.medium};
  transition: background-color 0.3s ease, box-shadow 0.3s ease;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.medium};
    max-width: 100%;
  }
`;

const Title = styled.h2`
  text-align: center;
  margin-bottom: ${props => props.theme.spacing.large};
  color: ${props => props.theme.colors.text};
  font-size: ${props => props.theme.fontSizes.xlarge};
  font-weight: 600;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: ${props => props.theme.fontSizes.large};
    margin-bottom: ${props => props.theme.spacing.medium};
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${props => props.theme.spacing.medium};
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${props => props.theme.spacing.xsmall};
`;

const Label = styled.label`
  font-weight: 500;
  color: ${props => props.theme.colors.text};
  font-size: ${props => props.theme.fontSizes.medium};
`;

const Input = styled.input`
  padding: ${props => props.theme.spacing.medium};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.medium};
  background-color: ${props => props.theme.mode === 'dark' ? '#2a2a2a' : props.theme.colors.cardBackground};
  color: ${props => props.theme.colors.text};
  font-size: ${props => props.theme.fontSizes.medium};
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

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
  margin-top: ${props => props.theme.spacing.small};

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

const ErrorMessage = styled.div`
  color: ${props => props.theme.colors.error};
  font-size: ${props => props.theme.fontSizes.small};
  margin-top: ${props => props.theme.spacing.small};
  padding: ${props => props.theme.spacing.small};
  background-color: ${props => props.theme.mode === 'dark' ? 'rgba(255, 102, 102, 0.1)' : 'rgba(255, 0, 0, 0.05)'};
  border-radius: ${props => props.theme.borderRadius.small};
  border-left: 3px solid ${props => props.theme.colors.error};
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

const PasswordRequirements = styled.ul`
  font-size: ${props => props.theme.fontSizes.small};
  color: ${props => props.theme.colors.lightText};
  margin: ${props => props.theme.spacing.xsmall} 0 0 0;
  padding-left: ${props => props.theme.spacing.large};

  li {
    margin-bottom: ${props => props.theme.spacing.xsmall};

    &:last-child {
      margin-bottom: 0;
    }
  }
`;

const RegisterForm = ({ onLoginClick }) => {
  const { register, error } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState(false);

  const validatePassword = (password) => {
    const minLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*]/.test(password);

    return minLength && hasUppercase && hasLowercase && hasNumber && hasSpecial;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form
    if (!username || !email || !password || !confirmPassword) {
      setFormError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match');
      return;
    }

    if (!validatePassword(password)) {
      setFormError('Password does not meet requirements');
      return;
    }

    try {
      setLoading(true);
      setFormError('');

      // Register user
      await register({ username, email, password });

      // Show success message
      setSuccess(true);

      // Clear form
      setUsername('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
    } catch (error) {
      setFormError(error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormContainer>
      <Title>Register</Title>

      {success ? (
        <>
          <SuccessMessage>
            Registration successful! Please check your email to verify your account.
          </SuccessMessage>

          <LinkText>
            <Link onClick={onLoginClick}>Back to Login</Link>
          </LinkText>
        </>
      ) : (
        <>
          <Form onSubmit={handleSubmit}>
            <FormGroup>
              <Label htmlFor="username">Username</Label>
              <Input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
                minLength={3}
              />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="email">Email</Label>
              <Input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="password">Password</Label>
              <Input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
              <PasswordRequirements>
                <li>At least 8 characters</li>
                <li>At least one uppercase letter</li>
                <li>At least one lowercase letter</li>
                <li>At least one number</li>
                <li>At least one special character (!@#$%^&*)</li>
              </PasswordRequirements>
            </FormGroup>

            <FormGroup>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
              />
            </FormGroup>

            <Button type="submit" disabled={loading}>
              {loading ? 'Registering...' : 'Register'}
            </Button>

            {(formError || error) && (
              <ErrorMessage>{formError || error}</ErrorMessage>
            )}
          </Form>

          <LinkText>
            Already have an account? <Link onClick={onLoginClick}>Login</Link>
          </LinkText>
        </>
      )}
    </FormContainer>
  );
};

export default RegisterForm;