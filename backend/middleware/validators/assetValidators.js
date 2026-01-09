const { body, param, query } = require("express-validator");
const { VALID_VALUES } = require("../../constants/validValues");

/**
 * Validation rules for creating/updating an asset
 */
const assetValidation = [
  body("symbol")
    .trim()
    .notEmpty()
    .withMessage("Symbol is required")
    .isLength({ min: 1, max: 15 })
    .withMessage("Symbol must be between 1 and 15 characters")
    .toUpperCase(),

  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ min: 1, max: 255 })
    .withMessage("Name must be between 1 and 255 characters"),

  body("asset_type")
    .notEmpty()
    .withMessage("Asset type is required")
    .isIn(VALID_VALUES.ASSET_TYPES)
    .withMessage(
      `Invalid asset type. Valid types: ${VALID_VALUES.ASSET_TYPES.join(", ")}`
    ),

  body("currency")
    .notEmpty()
    .withMessage("Currency is required")
    .isIn(VALID_VALUES.CURRENCIES)
    .withMessage(
      `Invalid currency. Valid currencies: ${VALID_VALUES.CURRENCIES.join(
        ", "
      )}`
    ),

  body("price_source")
    .optional({ checkFalsy: true })
    .isIn(VALID_VALUES.PRICE_SOURCES)
    .withMessage(
      `Invalid price source. Valid sources: ${VALID_VALUES.PRICE_SOURCES.join(
        ", "
      )}`
    ),

  body("price_symbol")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 50 })
    .withMessage("Price symbol must not exceed 50 characters"),

  body("price_factor")
    .optional({ checkFalsy: true })
    .isFloat({ gt: 0 })
    .withMessage("Price factor must be a number greater than 0")
    .toFloat(),

  body("active")
    .optional()
    .isBoolean({ loose: true })
    .withMessage("Active must be a boolean")
    .toBoolean(),
];

/**
 * Validation rules for adding/updating asset price data
 */
const assetPriceValidation = [
  param("id")
    .notEmpty()
    .withMessage("Asset ID is required")
    .isInt({ min: 1 })
    .withMessage("Asset ID must be a positive integer")
    .toInt(),

  body("price")
    .notEmpty()
    .withMessage("Price is required")
    .isFloat({ gt: 0 })
    .withMessage("Price must be a positive number")
    .toFloat(),

  body("date")
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage("Date must be in ISO 8601 format (YYYY-MM-DD)"),
  //.toDate(),

  body("source")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 50 })
    .withMessage("Source must not exceed 50 characters"),
];

/**
 * Validation rules for bulk importing asset price data
 */
const bulkImportPricesValidation = [
  param("id")
    .notEmpty()
    .withMessage("Asset ID is required")
    .isInt({ min: 1 })
    .withMessage("Asset ID must be a positive integer")
    .toInt(),

  body("prices")
    .notEmpty()
    .withMessage("Prices array is required")
    .isArray({ min: 1 })
    .withMessage("Prices must be a non-empty array"),

  body("prices.*.date")
    .notEmpty()
    .withMessage("Each price entry must have a date")
    .isISO8601()
    .withMessage("Date must be in ISO 8601 format (YYYY-MM-DD)"),

  body("prices.*.price")
    .notEmpty()
    .withMessage("Each price entry must have a price")
    .isFloat({ gt: 0 })
    .withMessage("Price must be a positive number"),

  body("prices.*.source")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 50 })
    .withMessage("Source must not exceed 50 characters"),
];

module.exports = {
  assetValidation,
  assetPriceValidation,
  bulkImportPricesValidation,
};
