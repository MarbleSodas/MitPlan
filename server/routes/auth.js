const express = require('express');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');

const { getConnection, r } = require('../config/database');
const { 
  generateToken, 
  generateRefreshToken, 
  verifyToken, 
  authenticateToken,
  storeSession 
} = require('../middleware/auth');

const router = express.Router();

// Email transporter setup
const createEmailTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

// Validation rules
const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  body('display_name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Display name must be between 2 and 50 characters')
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Register endpoint
router.post('/register', registerValidation, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Please check your input',
        details: errors.array()
      });
    }

    const { email, password, display_name } = req.body;
    const connection = getConnection();

    // Check if user already exists
    const existingUser = await r.db('mitplan_production')
      .table('users')
      .getAll(email, { index: 'email' })
      .nth(0)
      .default(null)
      .run(connection);

    if (existingUser) {
      return res.status(409).json({
        error: 'User Already Exists',
        message: 'An account with this email address already exists'
      });
    }

    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Create user
    const userId = uuidv4();
    const user = {
      id: userId,
      email,
      password_hash,
      display_name,
      google_id: null,
      avatar_url: null,
      created_at: new Date(),
      updated_at: new Date(),
      last_login: null,
      email_verified: false,
      preferences: {
        theme: 'dark',
        default_boss: 'ketuduke',
        notifications: true
      }
    };

    await r.db('mitplan_production')
      .table('users')
      .insert(user)
      .run(connection);

    // Generate email verification token
    const verificationToken = generateToken(userId);
    
    // Send verification email (if email service is configured)
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      try {
        const transporter = createEmailTransporter();
        const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${verificationToken}`;
        
        await transporter.sendMail({
          from: process.env.SMTP_USER,
          to: email,
          subject: 'Verify your MitPlan account',
          html: `
            <h2>Welcome to MitPlan!</h2>
            <p>Please click the link below to verify your email address:</p>
            <a href="${verificationUrl}" style="background-color: #3399ff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Verify Email</a>
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p>${verificationUrl}</p>
            <p>This link will expire in 7 days.</p>
          `
        });
        
        console.log(`📧 Verification email sent to ${email}`);
      } catch (emailError) {
        console.error('Error sending verification email:', emailError);
        // Don't fail registration if email fails
      }
    }

    res.status(201).json({
      message: 'Account created successfully',
      user: {
        id: userId,
        email,
        display_name,
        email_verified: false
      },
      verification_required: true
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create account'
    });
  }
});

// Login endpoint
router.post('/login', loginValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Please check your input',
        details: errors.array()
      });
    }

    const { email, password } = req.body;
    const connection = getConnection();

    // Find user
    const user = await r.db('mitplan_production')
      .table('users')
      .getAll(email, { index: 'email' })
      .nth(0)
      .default(null)
      .run(connection);

    if (!user) {
      return res.status(401).json({
        error: 'Invalid Credentials',
        message: 'Email or password is incorrect'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Invalid Credentials',
        message: 'Email or password is incorrect'
      });
    }

    // Update last login
    await r.db('mitplan_production')
      .table('users')
      .get(user.id)
      .update({ last_login: new Date() })
      .run(connection);

    // Generate tokens
    const accessToken = generateToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Store session
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const ipAddress = req.ip || req.connection.remoteAddress || 'Unknown';
    await storeSession(user.id, accessToken, userAgent, ipAddress);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        email_verified: user.email_verified,
        preferences: user.preferences
      },
      tokens: {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: '7d'
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to login'
    });
  }
});

// Logout endpoint
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const connection = getConnection();
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token) {
      const tokenHash = require('crypto').createHash('sha256').update(token).digest('hex');
      
      // Remove session from database
      await r.db('mitplan_production')
        .table('sessions')
        .filter({ jwt_token_hash: tokenHash })
        .delete()
        .run(connection);
    }

    res.json({
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to logout'
    });
  }
});

module.exports = router;
