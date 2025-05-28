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

const RegisterForm = ({ onSuccess, onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const { register, isLoading } = useAuth();

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

    // Display name validation
    if (!formData.displayName) {
      errors.displayName = 'Display name is required';
    } else if (formData.displayName.length < 2) {
      errors.displayName = 'Display name must be at least 2 characters';
    } else if (formData.displayName.length > 50) {
      errors.displayName = 'Display name must be less than 50 characters';
    }

    // Password validation
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters long';
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      errors.password = 'Password must contain at least one lowercase letter, one uppercase letter, and one number';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
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
      const result = await register(
        formData.email,
        formData.password,
        formData.displayName
      );
      
      if (result.success) {
        onSuccess(result);
      }
      // Error handling is done in AuthContext
    } catch (error) {
      console.error('Registration error:', error);
    }
  };

  // Handle Google login success
  const handleGoogleSuccess = () => {
    onSuccess({ success: true });
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
        <FormLabel htmlFor="displayName">Display Name</FormLabel>
        <FormInput
          id="displayName"
          name="displayName"
          type="text"
          value={formData.displayName}
          onChange={handleChange}
          placeholder="Enter your display name"
          disabled={isLoading}
          error={formErrors.displayName}
          autoComplete="name"
          required
        />
        {formErrors.displayName && (
          <ErrorMessage>
            ⚠️ {formErrors.displayName}
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
          placeholder="Create a password"
          disabled={isLoading}
          error={formErrors.password}
          autoComplete="new-password"
          required
        />
        {formErrors.password && (
          <ErrorMessage>
            ⚠️ {formErrors.password}
          </ErrorMessage>
        )}
      </FormGroup>

      <FormGroup>
        <FormLabel htmlFor="confirmPassword">Confirm Password</FormLabel>
        <FormInput
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          value={formData.confirmPassword}
          onChange={handleChange}
          placeholder="Confirm your password"
          disabled={isLoading}
          error={formErrors.confirmPassword}
          autoComplete="new-password"
          required
        />
        {formErrors.confirmPassword && (
          <ErrorMessage>
            ⚠️ {formErrors.confirmPassword}
          </ErrorMessage>
        )}
      </FormGroup>

      <ButtonGroup>
        <AuthSubmitButton type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <LoadingSpinner /> Creating Account...
            </>
          ) : (
            'Create Account'
          )}
        </AuthSubmitButton>

        <TextButton
          type="button"
          onClick={onSwitchToLogin}
          disabled={isLoading}
        >
          Already have an account? Sign in
        </TextButton>
      </ButtonGroup>

      <Divider>
        <span>or</span>
      </Divider>

      <GoogleLoginButton
        onSuccess={handleGoogleSuccess}
        disabled={isLoading}
        text="Sign up with Google"
      />
    </FormContainer>
  );
};

export default RegisterForm;
