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

const CheckboxGroup = styled.div`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.small};
  margin: ${props => props.theme.spacing.xsmall} 0;
`;

const Checkbox = styled.input`
  margin: 0;
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: ${props => props.theme.colors.primary};
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

const LoginForm = ({ onRegisterClick, onForgotPasswordClick, onSuccess }) => {
  const { login, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form
    if (!email || !password) {
      setFormError('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      setFormError('');

      // Login user
      await login({ email, password, rememberMe });

      // Call success callback
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      setFormError(error.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormContainer>
      <Title>Login</Title>

      <Form onSubmit={handleSubmit}>
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
        </FormGroup>

        <CheckboxGroup>
          <Checkbox
            type="checkbox"
            id="rememberMe"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
          />
          <Label htmlFor="rememberMe" style={{ fontWeight: 'normal' }}>Remember me</Label>
        </CheckboxGroup>

        <Button type="submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </Button>

        {(formError || error) && (
          <ErrorMessage>{formError || error}</ErrorMessage>
        )}
      </Form>

      <LinkText>
        <Link onClick={onForgotPasswordClick}>Forgot password?</Link>
      </LinkText>

      <LinkText>
        Don't have an account? <Link onClick={onRegisterClick}>Register</Link>
      </LinkText>
    </FormContainer>
  );
};

export default LoginForm;