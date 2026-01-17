const { body, param } = require("express-validator");
const { VALID_VALUES } = require("../../constants/validValues");

/**
 * Validation rules for updating user status
 */
const updateUserStatusValidation = [
  param("id")
    .notEmpty()
    .withMessage("User ID is required")
    .isInt({ min: 1 })
    .withMessage("User ID must be a positive integer")
    .toInt(),

  body("active")
    .notEmpty()
    .withMessage("Active status is required")
    .isBoolean({ loose: true })
    .withMessage("Active must be a boolean")
    .toBoolean(),
];

/**
 * Validation rules for updating user role
 */
const updateUserRoleValidation = [
  param("id")
    .notEmpty()
    .withMessage("User ID is required")
    .isInt({ min: 1 })
    .withMessage("User ID must be a positive integer")
    .toInt(),

  body("role")
    .notEmpty()
    .withMessage("Role is required")
    .isIn(VALID_VALUES.USER_ROLES)
    .withMessage(
      `Invalid role. Valid roles: ${VALID_VALUES.USER_ROLES.join(", ")}`,
    ),
];

module.exports = {
  updateUserStatusValidation,
  updateUserRoleValidation,
};
