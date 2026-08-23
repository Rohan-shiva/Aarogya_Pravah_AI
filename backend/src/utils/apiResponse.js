/**
 * Standardized API Response Helper
 */

class ApiResponse {
  static success(res, message = 'Success', data = null, statusCode = 200, meta = null) {
    const response = {
      success: true,
      statusCode,
      message,
      data,
    };

    if (meta) {
      response.meta = meta;
    }

    return res.status(statusCode).json(response);
  }

  static created(res, message = 'Resource created successfully', data = null, meta = null) {
    return this.success(res, message, data, 201, meta);
  }

  static error(res, message = 'An error occurred', statusCode = 500, errors = null) {
    const response = {
      success: false,
      statusCode,
      message,
    };

    if (errors) {
      response.errors = Array.isArray(errors) ? errors : [errors];
    }

    return res.status(statusCode).json(response);
  }

  static badRequest(res, message = 'Invalid request parameters', errors = null) {
    return this.error(res, message, 400, errors);
  }

  static unauthorized(res, message = 'Authentication required or invalid credentials') {
    return this.error(res, message, 401);
  }

  static forbidden(res, message = 'You do not have permission to perform this action') {
    return this.error(res, message, 403);
  }

  static notFound(res, message = 'Requested resource not found') {
    return this.error(res, message, 404);
  }

  static conflict(res, message = 'Resource conflict or duplicate entry') {
    return this.error(res, message, 409);
  }
}

module.exports = ApiResponse;
