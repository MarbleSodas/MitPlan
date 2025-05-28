import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  FormContainer,
  FormGroup,
  FormLabel,
  FormInput,
  AuthSubmitButton,
  TextButton,
  ButtonGroup,
  Divider,
  LoadingSpinner,
  ErrorMessage
} from '../styled/AuthComponents';
import GoogleLoginButton from './GoogleLoginButton';

const LoginForm = ({ onSuccess, onForgotPassword }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const { login, isLoading } = useAuth();

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear field error when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Validate form
  const validateForm = () => {
    const errors = {};

    // Email validation
    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      errors.password = 'Password is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      const result = await login(formData.email, formData.password);
      
      if (result.success) {
        onSuccess();
      }
      // Error handling is done in AuthContext
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  // Handle Google login success
  const handleGoogleSuccess = () => {
    onSuccess();
  };

  return (
    <FormContainer onSubmit={handleSubmit}>
      <FormGroup>
        <FormLabel htmlFor="email">Email Address</FormLabel>
        <FormInput
          id="email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="Enter your email"
          disabled={isLoading}
          error={formErrors.email}
          autoComplete="email"
          required
        />
        {formErrors.email && (
          <ErrorMessage>
            ⚠️ {formErrors.email}
          </ErrorMessage>
        )}
      </FormGroup>

      <FormGroup>
        <FormLabel htmlFor="password">Password</FormLabel>
        <FormInput
          id="password"
          name="password"
          type="password"
          value={formData.password}
          onChange={handleChange}
          placeholder="Enter your password"
          disabled={isLoading}
          error={formErrors.password}
          autoComplete="current-password"
          required
        />
        {formErrors.password && (
          <ErrorMessage>
            ⚠️ {formErrors.password}
          </ErrorMessage>
        )}
      </FormGroup>

      <ButtonGroup>
        <AuthSubmitButton type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <LoadingSpinner /> Signing In...
            </>
          ) : (
            'Sign In'
          )}
        </AuthSubmitButton>

        <TextButton
          type="button"
          onClick={onForgotPassword}
          disabled={isLoading}
        >
          Forgot your password?
        </TextButton>
      </ButtonGroup>

      <Divider>
        <span>or</span>
      </Divider>

      <GoogleLoginButton
        onSuccess={handleGoogleSuccess}
        disabled={isLoading}
      />
    </FormContainer>
  );
};

export default LoginForm;
