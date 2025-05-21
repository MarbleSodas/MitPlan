import React, { useState } from 'react';
import styled from 'styled-components';
import { useAuth } from '../../contexts/AuthContext';

const FormContainer = styled.div`
  max-width: 400px;
  margin: 0 auto;
  padding: 20px;
  background-color: ${props => props.theme.cardBackground};
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
`;

const Title = styled.h2`
  text-align: center;
  margin-bottom: 20px;
  color: ${props => props.theme.textPrimary};
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 15px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
`;

const Label = styled.label`
  font-weight: 500;
  color: ${props => props.theme.textPrimary};
`;

const Input = styled.input`
  padding: 10px;
  border: 1px solid ${props => props.theme.borderColor};
  border-radius: 4px;
  background-color: ${props => props.theme.inputBackground};
  color: ${props => props.theme.textPrimary};
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.primary};
  }
`;

const Button = styled.button`
  padding: 10px;
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

const ErrorMessage = styled.div`
  color: ${props => props.theme.error};
  font-size: 14px;
  margin-top: 10px;
`;

const SuccessMessage = styled.div`
  color: ${props => props.theme.success};
  font-size: 14px;
  margin-top: 10px;
  padding: 10px;
  background-color: ${props => props.theme.successBackground};
  border-radius: 4px;
`;

const LinkText = styled.p`
  text-align: center;
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