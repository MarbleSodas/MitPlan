import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useAuth } from '../../contexts/AuthContext';

const Container = styled.div`
  max-width: 400px;
  margin: 0 auto;
  padding: 20px;
  background-color: ${props => props.theme.cardBackground};
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  text-align: center;
`;

const Title = styled.h2`
  margin-bottom: 20px;
  color: ${props => props.theme.textPrimary};
`;

const Message = styled.p`
  margin-bottom: 20px;
  color: ${props => props.theme.textPrimary};
`;

const ErrorMessage = styled.div`
  color: ${props => props.theme.error};
  font-size: 14px;
  margin-top: 10px;
  padding: 10px;
  background-color: ${props => props.theme.errorBackground};
  border-radius: 4px;
`;

const SuccessMessage = styled.div`
  color: ${props => props.theme.success};
  font-size: 14px;
  margin-top: 10px;
  padding: 10px;
  background-color: ${props => props.theme.successBackground};
  border-radius: 4px;
`;

const Button = styled.button`
  padding: 10px 20px;
  background-color: ${props => props.theme.primary};
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: ${props => props.theme.primaryHover};
  }
  
  &:disabled {
    background-color: ${props => props.theme.disabled};
    cursor: not-allowed;
  }
`;

const LinkText = styled.p`
  margin-top: 15px;
  font-size: 14px;
  color: ${props => props.theme.textSecondary};
`;

const Link = styled.a`
  color: ${props => props.theme.primary};
  text-decoration: none;
  cursor: pointer;
  
  &:hover {
    text-decoration: underline;
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
              <div style={{ marginBottom: '15px' }}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  style={{
                    padding: '10px',
                    width: '100%',
                    borderRadius: '4px',
                    border: '1px solid #ccc',
                    boxSizing: 'border-box'
                  }}
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
            <div style={{ marginBottom: '15px' }}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                style={{
                  padding: '10px',
                  width: '100%',
                  borderRadius: '4px',
                  border: '1px solid #ccc',
                  boxSizing: 'border-box'
                }}
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