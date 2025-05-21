import User from '../models/User.js';
import VerificationToken from '../models/VerificationToken.js';
import PasswordResetToken from '../models/PasswordResetToken.js';
import { sendVerificationEmail, sendPasswordResetEmail, sendNotificationEmail } from '../services/emailService.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { validationResult } from 'express-validator';

/**
 * Register a new user
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const register = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, username, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Create user
    const user = await User.create({ email, username, password });

    // Create verification token
    const verificationToken = await VerificationToken.create(user.id);

    // Send verification email
    await sendVerificationEmail(email, verificationToken.token);

    res.status(201).json({
      message: 'User registered successfully. Please check your email to verify your account.',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Verify email
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: 'Token is required' });
    }

    // Verify token
    const verification = await VerificationToken.verify(token);

    if (!verification) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    // Mark user as verified
    await User.markAsVerified(verification.userId);

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Resend verification email
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Find user
    const user = await User.findByEmail(email);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: 'Email is already verified' });
    }

    // Create verification token
    const verificationToken = await VerificationToken.create(user.id);

    // Send verification email
    await sendVerificationEmail(email, verificationToken.token);

    res.json({ message: 'Verification email sent successfully' });
  } catch (error) {
    console.error('Resend verification email error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Login user
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const login = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, rememberMe } = req.body;

    // Verify credentials
    const user = await User.verifyPassword(email, password);

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Create JWT token
    const tokenExpiration = rememberMe ? '30d' : '1d';
    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET,
      { expiresIn: tokenExpiration }
    );

    // Set cookie
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000
    };

    res.cookie('token', token, cookieOptions);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Logout user
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const logout = (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logout successful' });
};

/**
 * Get current user
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getCurrentUser = (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      username: req.user.username,
      isVerified: req.user.isVerified,
      preferences: req.user.preferences
    }
  });
};

/**
 * Request password reset
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Find user
    const user = await User.findByEmail(email);

    if (!user) {
      // Don't reveal that the user doesn't exist
      return res.json({ message: 'If a user with that email exists, a password reset link has been sent' });
    }

    // Create reset token
    const resetToken = await PasswordResetToken.create(user.id);

    // Send reset email
    await sendPasswordResetEmail(email, resetToken.token);

    res.json({ message: 'If a user with that email exists, a password reset link has been sent' });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Reset password
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ message: 'Token and password are required' });
    }

    // Verify token
    const verification = await PasswordResetToken.verify(token);

    if (!verification) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    // Update password
    await User.update(verification.userId, { password });

    // Delete token
    await PasswordResetToken.delete(verification.tokenId);

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Update user profile
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const updateProfile = async (req, res) => {
  try {
    const { username, email, currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Create update object
    const updateData = {};

    // Update username if provided
    if (username) {
      updateData.username = username;
    }

    // Update email if provided
    if (email && email !== req.user.email) {
      // Check if email is already in use
      const existingUser = await User.findByEmail(email);
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({ message: 'Email is already in use' });
      }

      updateData.email = email;
      updateData.isVerified = false;
    }

    // Update password if provided
    if (currentPassword && newPassword) {
      // Verify current password
      const user = await User.findByEmail(req.user.email);
      const isMatch = await bcrypt.compare(currentPassword, user.password);

      if (!isMatch) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }

      updateData.password = newPassword;
    }

    // Update user
    if (Object.keys(updateData).length > 0) {
      const updatedUser = await User.update(userId, updateData);

      // Send verification email if email was changed
      if (updateData.email) {
        const verificationToken = await VerificationToken.create(userId);
        await sendVerificationEmail(updateData.email, verificationToken.token);
      }

      res.json({
        message: 'Profile updated successfully',
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          username: updatedUser.username,
          isVerified: updatedUser.isVerified,
          preferences: updatedUser.preferences
        }
      });
    } else {
      res.status(400).json({ message: 'No updates provided' });
    }
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Update user preferences
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const updatePreferences = async (req, res) => {
  try {
    const { preferences } = req.body;
    const userId = req.user.id;

    if (!preferences) {
      return res.status(400).json({ message: 'Preferences are required' });
    }

    // Update user preferences
    const updatedUser = await User.update(userId, {
      preferences: {
        ...req.user.preferences,
        ...preferences
      }
    });

    res.json({
      message: 'Preferences updated successfully',
      preferences: updatedUser.preferences
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Refresh JWT token
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const refreshToken = async (req, res) => {
  try {
    // User is already attached to request by auth middleware
    const user = req.user;

    // Create new JWT token
    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Set cookie
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000
    };

    res.cookie('token', token, cookieOptions);

    res.json({
      message: 'Token refreshed successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        isVerified: user.isVerified,
        preferences: user.preferences
      }
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Change password
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }

    // Verify current password
    const user = await User.findById(userId);
    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Update password
    await User.update(userId, { password: newPassword });

    // Send notification email
    await sendNotificationEmail(
      user.email,
      'Password Changed',
      'Your password has been changed successfully. If you did not make this change, please contact support immediately.'
    );

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export {
  register,
  verifyEmail,
  resendVerificationEmail,
  login,
  logout,
  getCurrentUser,
  requestPasswordReset,
  resetPassword,
  updateProfile,
  updatePreferences,
  refreshToken,
  changePassword
};