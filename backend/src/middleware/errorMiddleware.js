const ApiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');

/**
 * 404 Not Found Middleware
 */
const notFoundHandler = (req, res, next) => {
  return ApiResponse.notFound(res, `Route not found: ${req.method} ${req.originalUrl}`);
};

/**
 * Central Global Error Handler
 */
const errorHandler = (err, req, res, next) => {
  logger.error(`[Error Handler] ${err.name || 'Error'}: ${err.message}`, {
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.originalUrl,
    method: req.method,
  });

  // Handle Mongoose Bad ObjectId (CastError)
  if (err.name === 'CastError') {
    return ApiResponse.badRequest(res, `Invalid ID format for parameter: ${err.path}`);
  }

  // Handle Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((val) => val.message);
    return ApiResponse.badRequest(res, 'Validation error', messages);
  }

  // Handle Mongoose Duplicate Key Error (E11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return ApiResponse.conflict(res, `Duplicate field value entered for '${field}'. Please use another value.`);
  }

  // Handle Multer upload errors
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return ApiResponse.badRequest(res, 'Uploaded file exceeds maximum limit of 15MB.');
    }
    return ApiResponse.badRequest(res, `File upload error: ${err.message}`);
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return ApiResponse.unauthorized(res, 'Invalid authorization token.');
  }
  if (err.name === 'TokenExpiredError') {
    return ApiResponse.unauthorized(res, 'Authorization token has expired. Please log in again.');
  }

  // Generic internal server error
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  return ApiResponse.error(res, message, statusCode);
};

module.exports = {
  notFoundHandler,
  errorHandler,
};
