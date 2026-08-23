const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiResponse = require('../utils/apiResponse');

/**
 * Protect routes - Verify JWT in Authorization header
 */
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return ApiResponse.unauthorized(res, 'Access denied. No authorization token provided.');
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'super_secret_smart_queue_jwt_key_hackathon_2026_change_in_production'
    );

    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return ApiResponse.unauthorized(res, 'The user associated with this token no longer exists.');
    }

    if (!user.isActive) {
      return ApiResponse.forbidden(res, 'User account has been deactivated. Please contact an administrator.');
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return ApiResponse.unauthorized(res, 'Token has expired. Please log in again.');
    }
    return ApiResponse.unauthorized(res, 'Invalid authorization token.');
  }
};

/**
 * Role-based authorization middleware
 * @param  {...string} roles Allowed roles (e.g., 'STAFF', 'DOCTOR')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return ApiResponse.unauthorized(res, 'Authentication required before authorization check.');
    }

    if (!roles.includes(req.user.role)) {
      return ApiResponse.forbidden(
        res,
        `Access denied. Role '${req.user.role}' is not authorized to access this resource. Required: ${roles.join(' or ')}`
      );
    }

    next();
  };
};

module.exports = {
  protect,
  authorize,
};
