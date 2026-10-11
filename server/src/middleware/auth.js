const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_queue_prediction_system_2025_secure';

/**
 * Middleware to authenticate JWT token from Authorization header or cookie
 */
const authenticateToken = (req, res, next) => {
  let token = null;

  // Extract from Authorization header: Bearer <token>
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No authentication token provided.',
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, role, ... }
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Authentication token has expired. Please log in again.',
      });
    }
    return res.status(403).json({
      success: false,
      message: 'Invalid authentication token.',
    });
  }
};

/**
 * Middleware to check if user has one of the allowed roles
 * @param  {...string} roles Allowed roles ('user', 'staff', 'admin')
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access requires one of the following roles: ${roles.join(', ')}. Your role is: ${req.user.role}`,
      });
    }

    next();
  };
};

/**
 * Optional authentication: decodes token if provided, but does not block if missing
 */
const optionalAuth = (req, res, next) => {
  let token = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    } catch (e) {
      // Ignore expired/invalid token for optional auth
    }
  }
  next();
};

module.exports = {
  authenticateToken,
  optionalAuth,
  requireRole,
  JWT_SECRET,
};

