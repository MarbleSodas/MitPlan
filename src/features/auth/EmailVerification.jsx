import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useAuth } from '../../contexts/AuthContext';

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

const EmailVerification = ({ token, onLoginClick }) => {
  const { verifyEmail, resendVerificationEmail, error } = useAuth();
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [success, setSuccess] = useState(false);
  const [verificationError, setVerificationError] = useState('');
  const [email, setEmail] = useState('');

  // Verify email token if provided
  useEffect(() => {
    if (token) {
      const verifyToken = async () => {
        try {
          setVerifying(true);
          setVerificationError('');

          // Verify email
          await verifyEmail(token);

          // Show success message
          setSuccess(true);
        } catch (error) {
          setVerificationError(error.response?.data?.message || 'Failed to verify email');
        } finally {
          setVerifying(false);
        }
      };

      verifyToken();
    }
  }, [token, verifyEmail]);

  const handleResendVerification = async (e) => {
    e.preventDefault();

    if (!email) {
      setVerificationError('Please enter your email');
      return;
    }

    try {
      setLoading(true);
      setVerificationError('');

      // Resend verification email
      await resendVerificationEmail(email);

      // Show success message
      setSuccess(true);

      // Clear form
      setEmail('');
    } catch (error) {
      setVerificationError(error.response?.data?.message || 'Failed to resend verification email');
    } finally {
      setLoading(false);
    }
  };

  if (token) {
    // Token verification view
    return (
      <Container>
        <Title>Email Verification</Title>

        {verifying ? (
          <Message>Verifying your email...</Message>
        ) : success ? (
          <>
            <SuccessMessage>
              Your email has been verified successfully! You can now login to your account.
            </SuccessMessage>

            <LinkText>
              <Link onClick={onLoginClick}>Back to Login</Link>
            </LinkText>
          </>
        ) : (
          <>
            <ErrorMessage>
              {verificationError || 'Invalid or expired verification token'}
            </ErrorMessage>

            <Message>
              If your verification link has expired, you can request a new one below.
            </Message>

            <form onSubmit={handleResendVerification}>
              <div>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                />
              </div>

              <Button type="submit" disabled={loading}>
                {loading ? 'Sending...' : 'Resend Verification Email'}
              </Button>
            </form>

            <LinkText>
              <Link onClick={onLoginClick}>Back to Login</Link>
            </LinkText>
          </>
        )}
      </Container>
    );
  }

  // Resend verification view
  return (
    <Container>
      <Title>Resend Verification Email</Title>

      {success ? (
        <>
          <SuccessMessage>
            Verification email sent successfully! Please check your email.
          </SuccessMessage>

          <LinkText>
            <Link onClick={onLoginClick}>Back to Login</Link>
          </LinkText>
        </>
      ) : (
        <>
          <Message>
            Enter your email address below to receive a new verification link.
          </Message>

          <form onSubmit={handleResendVerification}>
            <div>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>

            <Button type="submit" disabled={loading}>
              {loading ? 'Sending...' : 'Resend Verification Email'}
            </Button>

            {(verificationError || error) && (
              <ErrorMessage>{verificationError || error}</ErrorMessage>
            )}
          </form>

          <LinkText>
            <Link onClick={onLoginClick}>Back to Login</Link>
          </LinkText>
        </>
      )}
    </Container>
  );
};

export default EmailVerification;