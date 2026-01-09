const { body } = require("express-validator");
const { VALID_VALUES } = require("../../constants/validValues");

/**
 * Validation rules for updating user settings
 */
const updateSettingsValidation = [
  body("date_format")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Date format cannot be empty"),

  body("theme")
    .optional()
    .trim()
    .isIn(VALID_VALUES.THEMES)
    .withMessage(`Theme must be one of: ${VALID_VALUES.THEMES.join(", ")}`),

  body("timezone")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Timezone cannot be empty"),

  body("language")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Language cannot be empty"),

  body("liquidity_asset_id")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("Liquidity asset must be a valid asset ID")
    .toInt(),

  body("fx_rate_asset_id")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("FX rate asset must be a valid asset ID")
    .toInt(),

  body("rebalancing_tolerance")
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage("Rebalancing tolerance must be between 0 and 100")
    .toFloat(),

  body("email_notifications_enabled")
    .optional()
    .isIn([0, 1, true, false])
    .withMessage(
      "Email notifications enabled must be a boolean (0, 1, true, or false)"
    )
    .toInt(),

  body("email_frequency")
    .optional()
    .trim()
    .isIn(["daily", "weekly", "monthly"])
    .withMessage("Email frequency must be one of: daily, weekly, monthly"),

  body("validate_cash_balance")
    .optional()
    .isIn([0, 1, true, false])
    .withMessage(
      "Validate cash balance must be a boolean (0, 1, true, or false)"
    )
    .toInt(),

  body("validate_sell_balance")
    .optional()
    .isIn([0, 1, true, false])
    .withMessage(
      "Validate sell balance must be a boolean (0, 1, true, or false)"
    )
    .toInt(),
];

module.exports = {
  updateSettingsValidation,
};
