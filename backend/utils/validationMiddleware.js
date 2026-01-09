const { validationResult } = require("express-validator");

/**
 * Middleware to handle validation errors from express-validator
 * This should be used after validation chains in routes
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: "Validation failed",
      errors: errors.array().map((err) => ({
        field: err.path || err.param,
        message: err.msg,
        value: err.value,
      })),
    });
  }
  next();
};

/**
 * Helper function to create a validation middleware chain
 * @param {Array} validations - Array of express-validator validation chains
 * @returns {Array} - Array including validations and error handler
 */
const validate = (validations) => {
  return [...validations, handleValidationErrors];
};

module.exports = {
  handleValidationErrors,
  validate,
};
