const { query } = require("express-validator");

/**
 * Validation rules for market trends endpoint
 */
const marketTrendsValidation = [
  query("days")
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage("Days must be an integer between 1 and 365")
    .toInt(),
];

/**
 * Validation rules for portfolio performance endpoint
 */
const portfolioPerformanceValidation = [
  query("days")
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage("Days must be an integer between 1 and 365")
    .toInt(),
];

/**
 * Validation rules for tax report endpoint
 */
const taxReportValidation = [
  query("year")
    .notEmpty()
    .withMessage("Year is required")
    .isInt({ min: 1900, max: 2100 })
    .withMessage("Year must be an integer between 1900 and 2100")
    .toInt(),

  query("exclude_asset_types")
    .optional()
    .isString()
    .withMessage("Exclude asset types must be a comma-separated string"),

  query("exclude_brokers")
    .optional()
    .isString()
    .withMessage("Exclude brokers must be a comma-separated string"),
];

/**
 * Validation rules for income analytics endpoint
 */
const incomeValidation = [
  query("year")
    .optional()
    .isInt({ min: 1900, max: 2100 })
    .withMessage("Year must be an integer between 1900 and 2100")
    .toInt(),
];

module.exports = {
  marketTrendsValidation,
  portfolioPerformanceValidation,
  taxReportValidation,
  incomeValidation,
};
