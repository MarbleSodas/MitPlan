import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Plan from '../models/Plan.js';

/**
 * Middleware to authenticate JWT token
 */
export const authenticate = async (req, res, next) => {
  try {
    let token;

    // Check for token in Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
    // Check for token in cookies
    else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if user exists
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Add user and token to request
    req.user = user;
    req.token = token;

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        message: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        message: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }

    console.error('Authentication error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Middleware to check if user is verified
 */
export const isVerified = (req, res, next) => {
  if (!req.user.isVerified) {
    return res.status(403).json({ message: 'Email not verified' });
  }

  next();
};

/**
 * Middleware to check if user has access to a plan
 */
export const hasPlanAccess = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get plan
    const plan = await Plan.findById(id);

    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }

    // Check if user is owner or has access
    if (plan.userId === userId || plan.sharedWith.includes(userId) || plan.isPublic) {
      req.plan = plan;
      next();
    } else {
      res.status(403).json({ message: 'You do not have access to this plan' });
    }
  } catch (error) {
    console.error('Plan access error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Middleware to check if user has edit access to a plan
 */
export const hasEditAccess = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get plan
    const plan = await Plan.findById(id);

    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }

    // Check if user is owner or has edit access
    if (plan.userId === userId ||
        (plan.sharedWith.includes(userId) && plan.permissions[userId]?.canEdit)) {
      req.plan = plan;
      next();
    } else {
      res.status(403).json({ message: 'You do not have edit access to this plan' });
    }
  } catch (error) {
    console.error('Plan edit access error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Middleware to check if user is the owner of a plan
 */
export const isPlanOwner = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get plan
    const plan = await Plan.findById(id);

    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }

    // Check if user is owner
    if (plan.userId === userId) {
      req.plan = plan;
      next();
    } else {
      res.status(403).json({ message: 'You are not the owner of this plan' });
    }
  } catch (error) {
    console.error('Plan owner check error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
