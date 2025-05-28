const express = require('express');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');

const { getConnection, r } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const connection = getConnection();
    const user = await r.db('mitplan_production')
      .table('users')
      .get(req.user.id)
      .without('password_hash')
      .run(connection);

    if (!user) {
      return res.status(404).json({
        error: 'User Not Found',
        message: 'User profile not found'
      });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
        email_verified: user.email_verified,
        preferences: user.preferences,
        created_at: user.created_at,
        last_login: user.last_login
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get user profile'
    });
  }
});

// Update user profile
router.put('/profile', [
  authenticateToken,
  body('display_name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Display name must be between 2 and 50 characters'),
  body('avatar_url')
    .optional()
    .isURL()
    .withMessage('Avatar URL must be a valid URL')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Please check your input',
        details: errors.array()
      });
    }

    const { display_name, avatar_url } = req.body;
    const connection = getConnection();

    const updateData = {
      updated_at: new Date()
    };

    if (display_name !== undefined) {
      updateData.display_name = display_name;
    }

    if (avatar_url !== undefined) {
      updateData.avatar_url = avatar_url;
    }

    const result = await r.db('mitplan_production')
      .table('users')
      .get(req.user.id)
      .update(updateData, { returnChanges: true })
      .run(connection);

    if (result.replaced === 0) {
      return res.status(404).json({
        error: 'User Not Found',
        message: 'User profile not found'
      });
    }

    const updatedUser = result.changes[0].new_val;

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        display_name: updatedUser.display_name,
        avatar_url: updatedUser.avatar_url,
        email_verified: updatedUser.email_verified,
        preferences: updatedUser.preferences
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update profile'
    });
  }
});

// Change password
router.post('/change-password', [
  authenticateToken,
  body('current_password')
    .notEmpty()
    .withMessage('Current password is required'),
  body('new_password')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Please check your input',
        details: errors.array()
      });
    }

    const { current_password, new_password } = req.body;
    const connection = getConnection();

    // Get user with password hash
    const user = await r.db('mitplan_production')
      .table('users')
      .get(req.user.id)
      .run(connection);

    if (!user) {
      return res.status(404).json({
        error: 'User Not Found',
        message: 'User not found'
      });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(current_password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Invalid Password',
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const new_password_hash = await bcrypt.hash(new_password, saltRounds);

    // Update password
    await r.db('mitplan_production')
      .table('users')
      .get(req.user.id)
      .update({
        password_hash: new_password_hash,
        updated_at: new Date()
      })
      .run(connection);

    res.json({
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to change password'
    });
  }
});

// Get user preferences
router.get('/preferences', authenticateToken, async (req, res) => {
  try {
    const connection = getConnection();
    const user = await r.db('mitplan_production')
      .table('users')
      .get(req.user.id)
      .pluck('preferences')
      .run(connection);

    if (!user) {
      return res.status(404).json({
        error: 'User Not Found',
        message: 'User not found'
      });
    }

    res.json({
      preferences: user.preferences || {
        theme: 'dark',
        default_boss: 'ketuduke',
        notifications: true
      }
    });

  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get preferences'
    });
  }
});

// Update user preferences
router.put('/preferences', [
  authenticateToken,
  body('theme')
    .optional()
    .isIn(['light', 'dark'])
    .withMessage('Theme must be either "light" or "dark"'),
  body('default_boss')
    .optional()
    .isString()
    .withMessage('Default boss must be a string'),
  body('notifications')
    .optional()
    .isBoolean()
    .withMessage('Notifications must be a boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Please check your input',
        details: errors.array()
      });
    }

    const { theme, default_boss, notifications } = req.body;
    const connection = getConnection();

    // Get current preferences
    const user = await r.db('mitplan_production')
      .table('users')
      .get(req.user.id)
      .pluck('preferences')
      .run(connection);

    if (!user) {
      return res.status(404).json({
        error: 'User Not Found',
        message: 'User not found'
      });
    }

    const currentPreferences = user.preferences || {};
    const updatedPreferences = { ...currentPreferences };

    if (theme !== undefined) updatedPreferences.theme = theme;
    if (default_boss !== undefined) updatedPreferences.default_boss = default_boss;
    if (notifications !== undefined) updatedPreferences.notifications = notifications;

    await r.db('mitplan_production')
      .table('users')
      .get(req.user.id)
      .update({
        preferences: updatedPreferences,
        updated_at: new Date()
      })
      .run(connection);

    res.json({
      message: 'Preferences updated successfully',
      preferences: updatedPreferences
    });

  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update preferences'
    });
  }
});

module.exports = router;
