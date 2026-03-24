/**
 * Base application error. All custom errors extend this class.
 * The global error handler in middleware/errorHandler.js reads statusCode
 * to set the HTTP response status, so throwing these from a service or model
 * automatically produces the correct HTTP status without any route-level logic.
 */
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

/** 400 — request is syntactically or semantically invalid */
class ValidationError extends AppError {
  constructor(message) {
    super(message, 400);
  }
}

/** 401 — not authenticated */
class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super(message, 401);
  }
}

/** 403 — authenticated but not allowed */
class ForbiddenError extends AppError {
  constructor(message = "Access denied") {
    super(message, 403);
  }
}

/** 404 — resource does not exist */
class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(message, 404);
  }
}

/** 409 — resource already exists or state conflict */
class ConflictError extends AppError {
  constructor(message) {
    super(message, 409);
  }
}

module.exports = {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
};
