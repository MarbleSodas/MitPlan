import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  FormContainer,
  FormGroup,
  FormLabel,
  FormInput,
  PrimaryButton,
  SecondaryButton,
  ButtonGroup,
  LoadingSpinner,
  ErrorMessage,
  SuccessMessage
} from '../styled/AuthComponents';

const ForgotPasswordForm = ({ onSuccess, onBackToLogin }) => {
  const { resetPassword } = useAuth();
  const [formData, setFormData] = useState({
    email: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null);

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

    // Clear messages when user starts typing
    if (message) {
      setMessage(null);
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

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const result = await resetPassword(formData.email);

      if (result.success) {
        setMessage({
          type: 'success',
          text: 'If an account with this email exists, you will receive password reset instructions shortly.'
        });

        // Call success callback after a delay
        setTimeout(() => {
          if (onSuccess) {
            onSuccess();
          }
        }, 2000);
      } else {
        setMessage({
          type: 'error',
          text: result.message || 'Failed to send password reset email. Please try again.'
        });
      }

    } catch (error) {
      console.error('Password reset error:', error);
      setMessage({
        type: 'error',
        text: 'Failed to send password reset email. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <FormContainer onSubmit={handleSubmit}>
      <div style={{ marginBottom: '24px' }}>
        <p style={{
          margin: 0,
          color: 'var(--text-color)',
          fontSize: '14px',
          lineHeight: '1.5'
        }}>
          Enter your email address and we'll send you instructions to reset your password.
        </p>
      </div>

      {message && (
        <div style={{ marginBottom: '16px' }}>
          {message.type === 'success' ? (
            <SuccessMessage>
              ✅ {message.text}
            </SuccessMessage>
          ) : (
            <ErrorMessage>
              ⚠️ {message.text}
            </ErrorMessage>
          )}
        </div>
      )}

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

      <ButtonGroup>
        <PrimaryButton type="submit" disabled={isLoading || message?.type === 'success'}>
          {isLoading ? (
            <>
              <LoadingSpinner /> Sending...
            </>
          ) : message?.type === 'success' ? (
            'Email Sent ✓'
          ) : (
            'Send Reset Instructions'
          )}
        </PrimaryButton>

        <SecondaryButton
          type="button"
          onClick={onBackToLogin}
          disabled={isLoading}
        >
          Back to Sign In
        </SecondaryButton>
      </ButtonGroup>
    </FormContainer>
  );
};

export default ForgotPasswordForm;
