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

const PasswordRequirements = styled.ul`
  font-size: 12px;
  color: ${props => props.theme.textSecondary};
  margin-top: 5px;
  padding-left: 20px;
`;

const ResetPasswordForm = ({ token, onLoginClick }) => {
  const { resetPassword, error } = useAuth();
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
    if (!password || !confirmPassword) {
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
      
      // Reset password
      await resetPassword({ token, password });
      
      // Show success message
      setSuccess(true);
      
      // Clear form
      setPassword('');
      setConfirmPassword('');
    } catch (error) {
      setFormError(error.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <FormContainer>
      <Title>Reset Password</Title>
      
      {success ? (
        <>
          <SuccessMessage>
            Password reset successful! You can now login with your new password.
          </SuccessMessage>
          
          <LinkText>
            <Link onClick={onLoginClick}>Back to Login</Link>
          </LinkText>
        </>
      ) : (
        <>
          <Form onSubmit={handleSubmit}>
            <FormGroup>
              <Label htmlFor="password">New Password</Label>
              <Input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your new password"
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
                placeholder="Confirm your new password"
                required
              />
            </FormGroup>
            
            <Button type="submit" disabled={loading}>
              {loading ? 'Resetting...' : 'Reset Password'}
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

export default ResetPasswordForm;