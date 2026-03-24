const logger = require("../utils/logger");
const { AppError } = require("../errors/AppError");

/**
 * Centralized Express error handler.
 *
 * Any route or service can `throw new SomeAppError(message)` and this
 * middleware will translate it to the right HTTP status + JSON body.
 * Non-AppError exceptions (unexpected crashes) fall through as 500.
 *
 * Register last in server.js:
 *   app.use(errorHandler);
 */
const errorHandler = (err, req, res, next) => {
  // Determine status code: AppError carries its own, fallback to 500
  const statusCode = err instanceof AppError ? err.statusCode : err.status || 500;

  logger.error(`${err.name || "Error"}: ${err.message}`);
  logger.error(`  Path: ${req.method} ${req.path}`);
  if (process.env.NODE_ENV === "development") {
    logger.error(`  Stack: ${err.stack}`);
  }

  const response = {
    message: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  };

  res.status(statusCode).json(response);
};

module.exports = errorHandler;
