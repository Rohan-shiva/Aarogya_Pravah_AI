const { validationResult } = require('express-validator');
const ApiResponse = require('../utils/apiResponse');

/**
 * Middleware to check for express-validator errors and return structured 400 Bad Request
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg,
      value: err.value,
    }));
    return ApiResponse.badRequest(res, 'Validation failed for request parameters', formattedErrors);
  }
  next();
};

module.exports = validate;
