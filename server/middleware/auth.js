const jwt = require('jsonwebtoken');
const { getConnection, r } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { userId, type: 'access' },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

// Generate refresh token
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
};

// Verify JWT token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

// Authentication middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Access token required'
      });
    }

    const decoded = verifyToken(token);
    
    if (decoded.type !== 'access') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid token type'
      });
    }

    // Check if user exists and is active
    const connection = getConnection();
    const user = await r.db('mitplan_production')
      .table('users')
      .get(decoded.userId)
      .run(connection);

    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not found'
      });
    }

    // Add user info to request
    req.user = {
      id: user.id,
      email: user.email,
      display_name: user.display_name,
      email_verified: user.email_verified
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired token'
    });
  }
};

// Optional authentication middleware (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = verifyToken(token);
    
    if (decoded.type !== 'access') {
      req.user = null;
      return next();
    }

    const connection = getConnection();
    const user = await r.db('mitplan_production')
      .table('users')
      .get(decoded.userId)
      .run(connection);

    req.user = user ? {
      id: user.id,
      email: user.email,
      display_name: user.display_name,
      email_verified: user.email_verified
    } : null;

    next();
  } catch (error) {
    // If there's an error with optional auth, just continue without user
    req.user = null;
    next();
  }
};

// Store session in database
const storeSession = async (userId, token, userAgent, ipAddress) => {
  try {
    const connection = getConnection();
    const tokenHash = require('crypto').createHash('sha256').update(token).digest('hex');
    
    const session = {
      id: require('uuid').v4(),
      user_id: userId,
      jwt_token_hash: tokenHash,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      ip_address: ipAddress,
      user_agent: userAgent,
      created_at: new Date()
    };

    await r.db('mitplan_production')
      .table('sessions')
      .insert(session)
      .run(connection);

    return session.id;
  } catch (error) {
    console.error('Error storing session:', error);
    throw error;
  }
};

// Clean up expired sessions
const cleanupExpiredSessions = async () => {
  try {
    const connection = getConnection();
    const result = await r.db('mitplan_production')
      .table('sessions')
      .filter(r.row('expires_at').lt(new Date()))
      .delete()
      .run(connection);
    
    if (result.deleted > 0) {
      console.log(`🧹 Cleaned up ${result.deleted} expired sessions`);
    }
  } catch (error) {
    console.error('Error cleaning up sessions:', error);
  }
};

// Run cleanup every hour
setInterval(cleanupExpiredSessions, 60 * 60 * 1000);

module.exports = {
  generateToken,
  generateRefreshToken,
  verifyToken,
  authenticateToken,
  optionalAuth,
  storeSession,
  cleanupExpiredSessions
};
