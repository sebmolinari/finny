// Utility function to create consistent API errors
class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "ApiError";
  }
}

// Error handler middleware wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Validation error creator
const validationError = (message) => new ApiError(400, message);
const notFoundError = (message) => new ApiError(404, message);
const unauthorizedError = (message) => new ApiError(401, message);
const forbiddenError = (message) => new ApiError(403, message);

module.exports = {
  ApiError,
  asyncHandler,
  validationError,
  notFoundError,
  unauthorizedError,
  forbiddenError,
};
