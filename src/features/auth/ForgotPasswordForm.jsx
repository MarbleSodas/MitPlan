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

const ForgotPasswordForm = ({ onLoginClick }) => {
  const { requestPasswordReset, error } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form
    if (!email) {
      setFormError('Please enter your email');
      return;
    }

    try {
      setLoading(true);
      setFormError('');

      // Request password reset
      await requestPasswordReset(email);

      // Show success message
      setSuccess(true);

      // Clear form
      setEmail('');
    } catch (error) {
      setFormError(error.response?.data?.message || 'Failed to request password reset');
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormContainer>
      <Title>Forgot Password</Title>

      {success ? (
        <>
          <SuccessMessage>
            If an account with that email exists, a password reset link has been sent.
            Please check your email.
          </SuccessMessage>

          <LinkText>
            <Link onClick={onLoginClick}>Back to Login</Link>
          </LinkText>
        </>
      ) : (
        <>
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

            <Button type="submit" disabled={loading}>
              {loading ? 'Sending...' : 'Reset Password'}
            </Button>

            {(formError || error) && (
              <ErrorMessage>{formError || error}</ErrorMessage>
            )}
          </Form>

          <LinkText>
            <Link onClick={onLoginClick}>Back to Login</Link>
          </LinkText>
        </>
      )}
    </FormContainer>
  );
};

export default ForgotPasswordForm;